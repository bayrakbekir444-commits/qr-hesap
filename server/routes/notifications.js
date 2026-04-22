const express = require('express');
const { getDb } = require('../db/init');
const { userAuthMiddleware } = require('../middleware/userAuth');

const router = express.Router();

// GET /api/notifications - Bildirim listesi
router.get('/', userAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const notifications = db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.userId);

    res.json({ notifications });
  } catch (err) {
    console.error('Bildirim listesi hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/notifications/unread-count - Okunmamış bildirim sayısı
router.get('/unread-count', userAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0'
    ).get(req.userId);

    res.json({ unread_count: result.count });
  } catch (err) {
    console.error('Bildirim sayısı hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/notifications/:id/read - Okundu olarak işaretle
router.put('/:id/read', userAuthMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const notification = db.prepare(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?'
    ).get(id, req.userId);

    if (!notification) {
      return res.status(404).json({ error: 'Bildirim bulunamadı.' });
    }

    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);

    res.json({ message: 'Bildirim okundu olarak işaretlendi.' });
  } catch (err) {
    console.error('Bildirim güncelleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
