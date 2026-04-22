const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/reviews - Değerlendirme ekle (auth yok, müşteri)
router.post('/', (req, res) => {
  try {
    const { order_id, rating, comment } = req.body;

    if (!order_id || !rating) {
      return res.status(400).json({ error: 'order_id ve rating gereklidir.' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating 1-5 arasında olmalıdır.' });
    }

    const db = getDb();

    // Siparişin var olduğunu kontrol et
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);

    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }

    // Sipariş üzerinden restaurant_id bul
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(order.table_id);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    // Aynı sipariş için zaten değerlendirme var mı
    const existingReview = db.prepare(
      'SELECT * FROM reviews WHERE order_id = ?'
    ).get(order_id);

    if (existingReview) {
      return res.status(409).json({ error: 'Bu sipariş için zaten değerlendirme yapılmış.' });
    }

    const now = new Date().toISOString();
    const result = db.prepare(
      'INSERT INTO reviews (restaurant_id, order_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(table.restaurant_id, order_id, rating, comment || null, now);

    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ message: 'Değerlendirme eklendi.', review });
  } catch (err) {
    console.error('Değerlendirme ekleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/reviews - Değerlendirmeleri listele (auth gerekli)
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();

    const reviews = db.prepare(
      `SELECT r.*, o.table_id, t.table_number
       FROM reviews r
       JOIN orders o ON r.order_id = o.id
       JOIN tables t ON o.table_id = t.id
       WHERE r.restaurant_id = ?
       ORDER BY r.created_at DESC`
    ).all(req.restaurantId);

    res.json(reviews);
  } catch (err) {
    console.error('Değerlendirme listeleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
