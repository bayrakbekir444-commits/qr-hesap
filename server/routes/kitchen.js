const express = require('express');
const { getPool } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
const { emitToRestaurant } = require('../utils/realtime');

const router = express.Router();

const VALID_STATUSES = ['pending', 'preparing', 'ready', 'served', 'cancelled'];

// GET /api/kitchen/items
// Mutfak ekranı için aktif kalemleri listele.
// Default: cancelled ve served olmayan, son 12 saat içinde eklenen.
// query: status (filter), since (ISO date)
router.get('/items', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { status, since } = req.query;

    const conditions = ['t.restaurant_id = $1', "o.status = 'open'"];
    const params = [req.restaurantId];

    if (status && VALID_STATUSES.includes(status)) {
      conditions.push(`COALESCE(oi.kitchen_status, 'pending') = $${params.length + 1}`);
      params.push(status);
    } else {
      // Default: bitenler (served/cancelled) hariç. NULL kitchen_status = pending kabul et.
      conditions.push(`COALESCE(oi.kitchen_status, 'pending') NOT IN ('served', 'cancelled')`);
    }

    const { rows } = await pool.query(
      `SELECT
         oi.id,
         oi.order_id,
         oi.menu_item_id,
         oi.quantity,
         oi.unit_price,
         oi.note,
         COALESCE(oi.kitchen_status, 'pending') AS kitchen_status,
         oi.kitchen_updated_at,
         COALESCE(oi.created_at, o.created_at, NOW()) AS created_at,
         mi.name AS item_name,
         o.table_id,
         t.table_number,
         t.name AS table_name
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN tables t ON o.table_id = t.id
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY COALESCE(oi.created_at, o.created_at) ASC`,
      params
    );

    res.json({ items: rows });
  } catch (err) {
    console.error('Mutfak listele hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/kitchen/items/:id/status
// Body: { status: 'preparing' | 'ready' | 'served' | 'cancelled' }
router.put('/items/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Geçersiz durum.' });
    }

    const pool = getPool();

    // Restoran sahipliği kontrolü
    const { rows: ownRows } = await pool.query(
      `SELECT oi.id
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN tables t ON o.table_id = t.id
       WHERE oi.id = $1 AND t.restaurant_id = $2`,
      [id, req.restaurantId]
    );
    if (ownRows.length === 0) {
      return res.status(404).json({ error: 'Kalem bulunamadı.' });
    }

    const { rows } = await pool.query(
      `UPDATE order_items
       SET kitchen_status = $1, kitchen_updated_at = NOW()
       WHERE id = $2
       RETURNING id, order_id, kitchen_status, kitchen_updated_at`,
      [status, id]
    );

    emitToRestaurant(req.restaurantId, 'kitchen:status_changed', {
      item_id: rows[0].id,
      order_id: rows[0].order_id,
      status: rows[0].kitchen_status,
      at: rows[0].kitchen_updated_at,
    });

    res.json(rows[0]);
  } catch (err) {
    console.error('Mutfak status hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/kitchen/orders/:orderId/status
// Tüm siparişin kalemlerini aynı duruma çevir (toplu işlem)
router.put('/orders/:orderId/status', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Geçersiz durum.' });
    }

    const pool = getPool();
    const { rows: ownRows } = await pool.query(
      `SELECT o.id FROM orders o
       JOIN tables t ON o.table_id = t.id
       WHERE o.id = $1 AND t.restaurant_id = $2`,
      [orderId, req.restaurantId]
    );
    if (ownRows.length === 0) {
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }

    const { rowCount } = await pool.query(
      `UPDATE order_items
       SET kitchen_status = $1, kitchen_updated_at = NOW()
       WHERE order_id = $2`,
      [status, orderId]
    );

    emitToRestaurant(req.restaurantId, 'kitchen:order_status_changed', {
      order_id: parseInt(orderId, 10),
      status,
      affected: rowCount,
      at: new Date().toISOString(),
    });

    res.json({ updated: rowCount });
  } catch (err) {
    console.error('Mutfak sipariş status hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
