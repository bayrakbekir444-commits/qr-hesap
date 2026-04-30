const express = require('express');
const { getPool } = require('../db/init');
const { userAuthMiddleware } = require('../middleware/userAuth');

const router = express.Router();

// GET /api/notifications - Bildirim listesi
router.get('/', userAuthMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    res.json({ notifications: rows });
  } catch (err) {
    console.error('Bildirim listesi hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/notifications/unread-count - Okunmamış bildirim sayısı
router.get('/unread-count', userAuthMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND "read" = 0',
      [req.userId]
    );

    res.json({ unread_count: rows[0].count });
  } catch (err) {
    console.error('Bildirim sayısı hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/notifications/:id/read - Okundu olarak işaretle
router.put('/:id/read', userAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const { rows } = await pool.query(
      'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bildirim bulunamadı.' });
    }

    await pool.query('UPDATE notifications SET "read" = 1 WHERE id = $1', [id]);

    res.json({ message: 'Bildirim okundu olarak işaretlendi.' });
  } catch (err) {
    console.error('Bildirim güncelleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
