const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/orders/new-alerts - Son 30 saniyede güncellenen siparişler
router.get('/new-alerts', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

    const orders = db.prepare(
      `SELECT o.*, t.table_number
       FROM orders o
       JOIN tables t ON o.table_id = t.id
       WHERE t.restaurant_id = ?
       AND o.status = 'open'
       AND o.updated_at >= ?
       ORDER BY o.updated_at DESC`
    ).all(req.restaurantId, thirtySecondsAgo);

    const result = orders.map((order) => {
      const items = db.prepare(
        `SELECT oi.*, mi.name as item_name
         FROM order_items oi
         JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE oi.order_id = ?`
      ).all(order.id);

      const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

      return {
        ...order,
        items,
        total,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Yeni sipariş uyarıları hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/orders/merge - Masaları birleştir
router.post('/merge', authMiddleware, (req, res) => {
  try {
    const { source_table_id, target_table_id } = req.body;

    if (!source_table_id || !target_table_id) {
      return res.status(400).json({ error: 'source_table_id ve target_table_id gereklidir.' });
    }

    if (source_table_id === target_table_id) {
      return res.status(400).json({ error: 'Kaynak ve hedef masa aynı olamaz.' });
    }

    const db = getDb();

    // Masaların bu restorana ait olduğunu kontrol et
    const sourceTable = db.prepare(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ?'
    ).get(source_table_id, req.restaurantId);

    const targetTable = db.prepare(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ?'
    ).get(target_table_id, req.restaurantId);

    if (!sourceTable || !targetTable) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    const sourceOrder = db.prepare(
      "SELECT * FROM orders WHERE table_id = ? AND status = 'open' LIMIT 1"
    ).get(source_table_id);

    if (!sourceOrder) {
      return res.status(404).json({ error: 'Kaynak masada açık sipariş bulunamadı.' });
    }

    const now = new Date().toISOString();

    // Hedef masada açık sipariş yoksa oluştur
    let targetOrder = db.prepare(
      "SELECT * FROM orders WHERE table_id = ? AND status = 'open' LIMIT 1"
    ).get(target_table_id);

    if (!targetOrder) {
      const result = db.prepare(
        'INSERT INTO orders (table_id, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run(target_table_id, 'open', now, now);
      targetOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
    }

    // Kaynak siparişin kalemlerini hedef siparişe taşı
    const mergeTransaction = db.transaction(() => {
      db.prepare(
        'UPDATE order_items SET order_id = ? WHERE order_id = ?'
      ).run(targetOrder.id, sourceOrder.id);

      // Kaynak siparişi kapat
      db.prepare(
        "UPDATE orders SET status = 'closed', updated_at = ? WHERE id = ?"
      ).run(now, sourceOrder.id);

      // Hedef siparişi güncelle
      db.prepare(
        'UPDATE orders SET updated_at = ? WHERE id = ?'
      ).run(now, targetOrder.id);
    });

    mergeTransaction();

    // Yeni toplamı hesapla
    const totals = db.prepare(
      'SELECT SUM(quantity * unit_price) as total FROM order_items WHERE order_id = ?'
    ).get(targetOrder.id);

    res.json({
      message: 'Masalar birleştirildi.',
      target_order_id: targetOrder.id,
      total: totals.total || 0,
    });
  } catch (err) {
    console.error('Masa birleştirme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/orders/:tableId - Açık siparişi getir
router.get('/:tableId', authMiddleware, (req, res) => {
  try {
    const { tableId } = req.params;
    const db = getDb();

    // Masanın bu restorana ait olduğunu kontrol et
    const table = db.prepare(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ?'
    ).get(tableId, req.restaurantId);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    const order = db.prepare(
      "SELECT * FROM orders WHERE table_id = ? AND status = 'open' LIMIT 1"
    ).get(tableId);

    if (!order) {
      return res.json({ order: null, items: [], total: 0 });
    }

    const items = db.prepare(
      `SELECT oi.*, mi.name as item_name
       FROM order_items oi
       JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = ?`
    ).all(order.id);

    const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    res.json({ order, items, total });
  } catch (err) {
    console.error('Sipariş getirme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/orders/:tableId/items - Sipariş kalemi ekle (yoksa sipariş oluştur)
router.post('/:tableId/items', authMiddleware, (req, res) => {
  try {
    const { tableId } = req.params;
    const { items } = req.body; // [{ menu_item_id, quantity, note }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'En az bir ürün gereklidir.' });
    }

    const db = getDb();

    // Masanın bu restorana ait olduğunu kontrol et
    const table = db.prepare(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ?'
    ).get(tableId, req.restaurantId);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    // Açık sipariş var mı?
    let order = db.prepare(
      "SELECT * FROM orders WHERE table_id = ? AND status = 'open' LIMIT 1"
    ).get(tableId);

    const now = new Date().toISOString();

    if (!order) {
      const result = db.prepare(
        'INSERT INTO orders (table_id, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run(tableId, 'open', now, now);
      order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
    }

    // Ürünleri ekle
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, note) VALUES (?, ?, ?, ?, ?)'
    );

    const addedItems = [];

    const addItems = db.transaction(() => {
      for (const item of items) {
        const menuItem = db.prepare(
          'SELECT * FROM menu_items WHERE id = ? AND restaurant_id = ? AND active = 1'
        ).get(item.menu_item_id, req.restaurantId);

        if (!menuItem) {
          throw new Error(`Ürün bulunamadı: ${item.menu_item_id}`);
        }

        const result = insertItem.run(
          order.id,
          item.menu_item_id,
          item.quantity || 1,
          menuItem.price,
          item.note || null
        );

        addedItems.push({
          id: result.lastInsertRowid,
          menu_item_id: item.menu_item_id,
          item_name: menuItem.name,
          quantity: item.quantity || 1,
          unit_price: menuItem.price,
          note: item.note || null,
        });
      }

      // Sipariş güncelleme zamanını güncelle
      db.prepare('UPDATE orders SET updated_at = ? WHERE id = ?').run(now, order.id);
    });

    try {
      addItems();
    } catch (txErr) {
      return res.status(400).json({ error: txErr.message });
    }

    // Güncel toplamı hesapla
    const allItems = db.prepare(
      'SELECT * FROM order_items WHERE order_id = ?'
    ).all(order.id);
    const total = allItems.reduce((sum, oi) => sum + oi.quantity * oi.unit_price, 0);

    res.status(201).json({
      message: 'Ürünler siparişe eklendi.',
      order_id: order.id,
      added_items: addedItems,
      total,
      new_order_alert: true,
    });
  } catch (err) {
    console.error('Sipariş ekleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/orders/customer/:qrToken/items - Müşteri sipariş ekle (auth yok)
router.post('/customer/:qrToken/items', (req, res) => {
  try {
    const { qrToken } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'En az bir ürün gereklidir.' });
    }

    const db = getDb();

    // QR token ile masayı bul
    const table = db.prepare(
      'SELECT * FROM tables WHERE qr_token = ? AND active = 1'
    ).get(qrToken);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı veya aktif değil.' });
    }

    // Açık sipariş var mı?
    let order = db.prepare(
      "SELECT * FROM orders WHERE table_id = ? AND status = 'open' LIMIT 1"
    ).get(table.id);

    const now = new Date().toISOString();

    if (!order) {
      const result = db.prepare(
        'INSERT INTO orders (table_id, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run(table.id, 'open', now, now);
      order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
    }

    // Ürünleri ekle
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, note) VALUES (?, ?, ?, ?, ?)'
    );

    const addedItems = [];

    const addItems = db.transaction(() => {
      for (const item of items) {
        const menuItem = db.prepare(
          'SELECT * FROM menu_items WHERE id = ? AND restaurant_id = ? AND active = 1'
        ).get(item.menu_item_id, table.restaurant_id);

        if (!menuItem) {
          throw new Error(`Ürün bulunamadı: ${item.menu_item_id}`);
        }

        const result = insertItem.run(
          order.id,
          item.menu_item_id,
          item.quantity || 1,
          menuItem.price,
          item.note || null
        );

        addedItems.push({
          id: result.lastInsertRowid,
          menu_item_id: item.menu_item_id,
          item_name: menuItem.name,
          quantity: item.quantity || 1,
          unit_price: menuItem.price,
          note: item.note || null,
        });
      }

      // Sipariş güncelleme zamanını güncelle
      db.prepare('UPDATE orders SET updated_at = ? WHERE id = ?').run(now, order.id);
    });

    try {
      addItems();
    } catch (txErr) {
      return res.status(400).json({ error: txErr.message });
    }

    // Güncel toplamı hesapla
    const allItems = db.prepare(
      'SELECT * FROM order_items WHERE order_id = ?'
    ).all(order.id);
    const total = allItems.reduce((sum, oi) => sum + oi.quantity * oi.unit_price, 0);

    res.status(201).json({
      message: 'Ürünler siparişe eklendi.',
      order_id: order.id,
      added_items: addedItems,
      total,
      new_order_alert: true,
    });
  } catch (err) {
    console.error('Müşteri sipariş ekleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/orders/menu/:menuQrToken/items - Müşteri menü QR ile sipariş ekle (auth yok)
router.post('/menu/:menuQrToken/items', (req, res) => {
  try {
    const { menuQrToken } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'En az bir ürün gereklidir.' });
    }

    const db = getDb();

    // Menü QR token ile masayı bul
    const table = db.prepare(
      'SELECT * FROM tables WHERE menu_qr_token = ? AND active = 1'
    ).get(menuQrToken);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı veya aktif değil.' });
    }

    // Açık sipariş var mı?
    let order = db.prepare(
      "SELECT * FROM orders WHERE table_id = ? AND status = 'open' LIMIT 1"
    ).get(table.id);

    const now = new Date().toISOString();

    if (!order) {
      const result = db.prepare(
        'INSERT INTO orders (table_id, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run(table.id, 'open', now, now);
      order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
    }

    // Ürünleri ekle
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, note) VALUES (?, ?, ?, ?, ?)'
    );

    const addedItems = [];

    const addItems = db.transaction(() => {
      for (const item of items) {
        const menuItem = db.prepare(
          'SELECT * FROM menu_items WHERE id = ? AND restaurant_id = ? AND active = 1'
        ).get(item.menu_item_id, table.restaurant_id);

        if (!menuItem) {
          throw new Error(`Ürün bulunamadı: ${item.menu_item_id}`);
        }

        const result = insertItem.run(
          order.id,
          item.menu_item_id,
          item.quantity || 1,
          menuItem.price,
          item.note || null
        );

        addedItems.push({
          id: result.lastInsertRowid,
          menu_item_id: item.menu_item_id,
          item_name: menuItem.name,
          quantity: item.quantity || 1,
          unit_price: menuItem.price,
          note: item.note || null,
        });
      }

      // Sipariş güncelleme zamanını güncelle
      db.prepare('UPDATE orders SET updated_at = ? WHERE id = ?').run(now, order.id);
    });

    try {
      addItems();
    } catch (txErr) {
      return res.status(400).json({ error: txErr.message });
    }

    // Güncel toplamı hesapla
    const allItems = db.prepare(
      'SELECT * FROM order_items WHERE order_id = ?'
    ).all(order.id);
    const total = allItems.reduce((sum, oi) => sum + oi.quantity * oi.unit_price, 0);

    res.status(201).json({
      message: 'Ürünler siparişe eklendi.',
      order_id: order.id,
      added_items: addedItems,
      total,
      new_order_alert: true,
    });
  } catch (err) {
    console.error('Menü QR müşteri sipariş ekleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/orders/:tableId/items/:itemId - Sipariş kalemini sil
router.delete('/:tableId/items/:itemId', authMiddleware, (req, res) => {
  try {
    const { tableId, itemId } = req.params;
    const db = getDb();

    const table = db.prepare(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ?'
    ).get(tableId, req.restaurantId);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    const order = db.prepare(
      "SELECT * FROM orders WHERE table_id = ? AND status = 'open' LIMIT 1"
    ).get(tableId);

    if (!order) {
      return res.status(404).json({ error: 'Açık sipariş bulunamadı.' });
    }

    const orderItem = db.prepare(
      'SELECT * FROM order_items WHERE id = ? AND order_id = ?'
    ).get(itemId, order.id);

    if (!orderItem) {
      return res.status(404).json({ error: 'Sipariş kalemi bulunamadı.' });
    }

    db.prepare('DELETE FROM order_items WHERE id = ?').run(itemId);

    const now = new Date().toISOString();
    db.prepare('UPDATE orders SET updated_at = ? WHERE id = ?').run(now, order.id);

    res.json({ message: 'Sipariş kalemi silindi.' });
  } catch (err) {
    console.error('Sipariş kalemi silme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/orders/:tableId/close - Siparişi kapat
router.put('/:tableId/close', authMiddleware, (req, res) => {
  try {
    const { tableId } = req.params;
    const db = getDb();

    const table = db.prepare(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ?'
    ).get(tableId, req.restaurantId);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    const order = db.prepare(
      "SELECT * FROM orders WHERE table_id = ? AND status = 'open' LIMIT 1"
    ).get(tableId);

    if (!order) {
      return res.status(404).json({ error: 'Açık sipariş bulunamadı.' });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE orders SET status = 'closed', updated_at = ? WHERE id = ?").run(now, order.id);

    // Sipariş toplamını hesapla
    const totals = db.prepare(
      'SELECT SUM(quantity * unit_price) as total FROM order_items WHERE order_id = ?'
    ).get(order.id);

    res.json({
      message: 'Sipariş kapatıldı.',
      order_id: order.id,
      total: totals.total || 0,
    });
  } catch (err) {
    console.error('Sipariş kapatma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
