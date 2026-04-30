const express = require('express');
const { getPool } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Helper: Açık sipariş varsa bul, yoksa oluştur (transaction içinde kullan veya tek sorgu)
async function ensureOpenOrder(client, tableId) {
  const { rows: orderRows } = await client.query(
    "SELECT * FROM orders WHERE table_id = $1 AND status = 'open' LIMIT 1",
    [tableId]
  );
  if (orderRows[0]) return orderRows[0];

  const { rows } = await client.query(
    "INSERT INTO orders (table_id, status, created_at, updated_at) VALUES ($1, 'open', NOW(), NOW()) RETURNING *",
    [tableId]
  );
  return rows[0];
}

// Sipariş kalemi ekleme transaction'ı (auth ya da public)
async function addItemsToOrder({ pool, tableId, restaurantId, items }) {
  const client = await pool.connect();
  const addedItems = [];
  let order;
  try {
    await client.query('BEGIN');
    order = await ensureOpenOrder(client, tableId);

    for (const item of items) {
      const { rows: menuRows } = await client.query(
        'SELECT * FROM menu_items WHERE id = $1 AND restaurant_id = $2 AND active = 1',
        [item.menu_item_id, restaurantId]
      );
      const menuItem = menuRows[0];
      if (!menuItem) {
        throw new Error(`Ürün bulunamadı: ${item.menu_item_id}`);
      }

      const { rows: insertedRows } = await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, note)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          order.id,
          item.menu_item_id,
          item.quantity || 1,
          menuItem.price,
          item.note || null,
        ]
      );

      addedItems.push({
        id: insertedRows[0].id,
        menu_item_id: item.menu_item_id,
        item_name: menuItem.name,
        quantity: item.quantity || 1,
        unit_price: menuItem.price,
        note: item.note || null,
      });
    }

    await client.query('UPDATE orders SET updated_at = NOW() WHERE id = $1', [order.id]);
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }

  // Güncel toplamı hesapla
  const { rows: allItems } = await pool.query(
    'SELECT quantity, unit_price FROM order_items WHERE order_id = $1',
    [order.id]
  );
  const total = allItems.reduce((sum, oi) => sum + oi.quantity * oi.unit_price, 0);

  return { order, addedItems, total };
}

// GET /api/orders/new-alerts - Son 5 dakikada güncellenen siparişler
router.get('/new-alerts', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    // Son 5 dakika için Postgres native NOW() kullan
    const { rows: orders } = await pool.query(
      `SELECT o.*, t.table_number
       FROM orders o
       JOIN tables t ON o.table_id = t.id
       WHERE t.restaurant_id = $1
       AND o.status = 'open'
       AND o.updated_at >= NOW() - INTERVAL '5 minutes'
       ORDER BY o.updated_at DESC`,
      [req.restaurantId]
    );

    const result = [];
    for (const order of orders) {
      const { rows: items } = await pool.query(
        `SELECT oi.*, mi.name as item_name
         FROM order_items oi
         JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE oi.order_id = $1`,
        [order.id]
      );

      const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

      result.push({
        ...order,
        items,
        total,
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Yeni sipariş uyarıları hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/orders/merge - Masaları birleştir
router.post('/merge', authMiddleware, async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const { source_table_id, target_table_id } = req.body;

    if (!source_table_id || !target_table_id) {
      client.release();
      return res.status(400).json({ error: 'source_table_id ve target_table_id gereklidir.' });
    }

    if (source_table_id === target_table_id) {
      client.release();
      return res.status(400).json({ error: 'Kaynak ve hedef masa aynı olamaz.' });
    }

    const { rows: sourceTables } = await client.query(
      'SELECT id FROM tables WHERE id = $1 AND restaurant_id = $2',
      [source_table_id, req.restaurantId]
    );
    const { rows: targetTables } = await client.query(
      'SELECT id FROM tables WHERE id = $1 AND restaurant_id = $2',
      [target_table_id, req.restaurantId]
    );

    if (sourceTables.length === 0 || targetTables.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    const { rows: sourceOrderRows } = await client.query(
      "SELECT * FROM orders WHERE table_id = $1 AND status = 'open' LIMIT 1",
      [source_table_id]
    );
    const sourceOrder = sourceOrderRows[0];

    if (!sourceOrder) {
      client.release();
      return res.status(404).json({ error: 'Kaynak masada açık sipariş bulunamadı.' });
    }

    await client.query('BEGIN');

    // Hedef siparişi bul/oluştur
    const targetOrder = await ensureOpenOrder(client, target_table_id);

    // Kaynak siparişin kalemlerini hedef siparişe taşı
    await client.query('UPDATE order_items SET order_id = $1 WHERE order_id = $2', [
      targetOrder.id,
      sourceOrder.id,
    ]);

    // Kaynak siparişi kapat
    await client.query(
      "UPDATE orders SET status = 'closed', updated_at = NOW() WHERE id = $1",
      [sourceOrder.id]
    );

    // Hedef siparişi güncelle
    await client.query('UPDATE orders SET updated_at = NOW() WHERE id = $1', [targetOrder.id]);

    await client.query('COMMIT');

    // Yeni toplam
    const { rows: tRows } = await client.query(
      'SELECT COALESCE(SUM(quantity * unit_price), 0)::bigint as total FROM order_items WHERE order_id = $1',
      [targetOrder.id]
    );

    res.json({
      message: 'Masalar birleştirildi.',
      target_order_id: targetOrder.id,
      total: Number(tRows[0].total) || 0,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Masa birleştirme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
});

// GET /api/orders/:tableId - Açık siparişi getir
router.get('/:tableId', authMiddleware, async (req, res) => {
  try {
    const { tableId } = req.params;
    const pool = getPool();

    const { rows: tableRows } = await pool.query(
      'SELECT id FROM tables WHERE id = $1 AND restaurant_id = $2',
      [tableId, req.restaurantId]
    );

    if (tableRows.length === 0) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    const { rows: orderRows } = await pool.query(
      "SELECT * FROM orders WHERE table_id = $1 AND status = 'open' LIMIT 1",
      [tableId]
    );
    const order = orderRows[0];

    if (!order) {
      return res.json({ order: null, items: [], total: 0 });
    }

    const { rows: items } = await pool.query(
      `SELECT oi.*, mi.name as item_name
       FROM order_items oi
       JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = $1`,
      [order.id]
    );

    const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    res.json({ order, items, total });
  } catch (err) {
    console.error('Sipariş getirme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/orders/:tableId/items - Sipariş kalemi ekle (yoksa sipariş oluştur)
router.post('/:tableId/items', authMiddleware, async (req, res) => {
  try {
    const { tableId } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'En az bir ürün gereklidir.' });
    }

    const pool = getPool();

    const { rows: tableRows } = await pool.query(
      'SELECT id FROM tables WHERE id = $1 AND restaurant_id = $2',
      [tableId, req.restaurantId]
    );

    if (tableRows.length === 0) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    let result;
    try {
      result = await addItemsToOrder({
        pool,
        tableId,
        restaurantId: req.restaurantId,
        items,
      });
    } catch (txErr) {
      return res.status(400).json({ error: txErr.message });
    }

    res.status(201).json({
      message: 'Ürünler siparişe eklendi.',
      order_id: result.order.id,
      added_items: result.addedItems,
      total: result.total,
      new_order_alert: true,
    });
  } catch (err) {
    console.error('Sipariş ekleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/orders/customer/:qrToken/items - Müşteri sipariş ekle (auth yok)
router.post('/customer/:qrToken/items', async (req, res) => {
  try {
    const { qrToken } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'En az bir ürün gereklidir.' });
    }

    const pool = getPool();

    const { rows: tableRows } = await pool.query(
      'SELECT * FROM tables WHERE qr_token = $1 AND active = 1',
      [qrToken]
    );
    const table = tableRows[0];

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı veya aktif değil.' });
    }

    let result;
    try {
      result = await addItemsToOrder({
        pool,
        tableId: table.id,
        restaurantId: table.restaurant_id,
        items,
      });
    } catch (txErr) {
      return res.status(400).json({ error: txErr.message });
    }

    res.status(201).json({
      message: 'Ürünler siparişe eklendi.',
      order_id: result.order.id,
      added_items: result.addedItems,
      total: result.total,
      new_order_alert: true,
    });
  } catch (err) {
    console.error('Müşteri sipariş ekleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/orders/menu/:menuQrToken/items - Müşteri menü QR ile sipariş ekle (auth yok)
router.post('/menu/:menuQrToken/items', async (req, res) => {
  try {
    const { menuQrToken } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'En az bir ürün gereklidir.' });
    }

    const pool = getPool();

    const { rows: tableRows } = await pool.query(
      'SELECT * FROM tables WHERE menu_qr_token = $1 AND active = 1',
      [menuQrToken]
    );
    const table = tableRows[0];

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı veya aktif değil.' });
    }

    let result;
    try {
      result = await addItemsToOrder({
        pool,
        tableId: table.id,
        restaurantId: table.restaurant_id,
        items,
      });
    } catch (txErr) {
      return res.status(400).json({ error: txErr.message });
    }

    res.status(201).json({
      message: 'Ürünler siparişe eklendi.',
      order_id: result.order.id,
      added_items: result.addedItems,
      total: result.total,
      new_order_alert: true,
    });
  } catch (err) {
    console.error('Menü QR müşteri sipariş ekleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/orders/:tableId/items/:itemId - Sipariş kalemini sil
router.delete('/:tableId/items/:itemId', authMiddleware, async (req, res) => {
  try {
    const { tableId, itemId } = req.params;
    const pool = getPool();

    const { rows: tableRows } = await pool.query(
      'SELECT id FROM tables WHERE id = $1 AND restaurant_id = $2',
      [tableId, req.restaurantId]
    );

    if (tableRows.length === 0) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    const { rows: orderRows } = await pool.query(
      "SELECT * FROM orders WHERE table_id = $1 AND status = 'open' LIMIT 1",
      [tableId]
    );
    const order = orderRows[0];

    if (!order) {
      return res.status(404).json({ error: 'Açık sipariş bulunamadı.' });
    }

    const { rows: orderItemRows } = await pool.query(
      'SELECT id FROM order_items WHERE id = $1 AND order_id = $2',
      [itemId, order.id]
    );

    if (orderItemRows.length === 0) {
      return res.status(404).json({ error: 'Sipariş kalemi bulunamadı.' });
    }

    await pool.query('DELETE FROM order_items WHERE id = $1', [itemId]);
    await pool.query('UPDATE orders SET updated_at = NOW() WHERE id = $1', [order.id]);

    res.json({ message: 'Sipariş kalemi silindi.' });
  } catch (err) {
    console.error('Sipariş kalemi silme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/orders/:tableId/close - Siparişi kapat
router.put('/:tableId/close', authMiddleware, async (req, res) => {
  try {
    const { tableId } = req.params;
    const pool = getPool();

    const { rows: tableRows } = await pool.query(
      'SELECT id FROM tables WHERE id = $1 AND restaurant_id = $2',
      [tableId, req.restaurantId]
    );

    if (tableRows.length === 0) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    const { rows: orderRows } = await pool.query(
      "SELECT * FROM orders WHERE table_id = $1 AND status = 'open' LIMIT 1",
      [tableId]
    );
    const order = orderRows[0];

    if (!order) {
      return res.status(404).json({ error: 'Açık sipariş bulunamadı.' });
    }

    await pool.query(
      "UPDATE orders SET status = 'closed', updated_at = NOW() WHERE id = $1",
      [order.id]
    );

    const { rows: tRows } = await pool.query(
      'SELECT COALESCE(SUM(quantity * unit_price), 0)::bigint as total FROM order_items WHERE order_id = $1',
      [order.id]
    );

    res.json({
      message: 'Sipariş kapatıldı.',
      order_id: order.id,
      total: Number(tRows[0].total) || 0,
    });
  } catch (err) {
    console.error('Sipariş kapatma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
