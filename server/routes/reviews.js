const express = require('express');
const { getPool } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/reviews - Değerlendirme ekle (auth yok, müşteri)
router.post('/', async (req, res) => {
  try {
    const { order_id, rating, comment } = req.body;

    if (!order_id || !rating) {
      return res.status(400).json({ error: 'order_id ve rating gereklidir.' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating 1-5 arasında olmalıdır.' });
    }

    const pool = getPool();

    // Siparişin var olduğunu kontrol et
    const { rows: orderRows } = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
    const order = orderRows[0];

    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }

    // Sipariş üzerinden restaurant_id bul
    const { rows: tableRows } = await pool.query('SELECT * FROM tables WHERE id = $1', [order.table_id]);
    const table = tableRows[0];

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    // Aynı sipariş için zaten değerlendirme var mı
    const { rows: existRows } = await pool.query(
      'SELECT id FROM reviews WHERE order_id = $1',
      [order_id]
    );

    if (existRows.length > 0) {
      return res.status(409).json({ error: 'Bu sipariş için zaten değerlendirme yapılmış.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO reviews (restaurant_id, order_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [table.restaurant_id, order_id, rating, comment || null]
    );

    res.status(201).json({ message: 'Değerlendirme eklendi.', review: rows[0] });
  } catch (err) {
    console.error('Değerlendirme ekleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/reviews - Değerlendirmeleri listele (auth gerekli)
// Restoranın tüm yorumları + masa numarası + sipariş tarihi (max 100)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT r.*, t.table_number, o.created_at AS order_date
       FROM reviews r
       JOIN orders o ON r.order_id = o.id
       JOIN tables t ON o.table_id = t.id
       WHERE t.restaurant_id = $1
       ORDER BY r.created_at DESC
       LIMIT 100`,
      [req.restaurantId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Değerlendirme listeleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
