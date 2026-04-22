const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/waiter/call - Garson çağır (müşteri, auth yok)
router.post('/call', (req, res) => {
  try {
    const { table_id } = req.body;

    if (!table_id) {
      return res.status(400).json({ error: 'table_id gereklidir.' });
    }

    const db = getDb();

    const table = db.prepare(
      'SELECT * FROM tables WHERE id = ? AND active = 1'
    ).get(table_id);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    // Aynı masadan zaten bekleyen çağrı var mı kontrol et
    const existingCall = db.prepare(
      "SELECT * FROM waiter_calls WHERE table_id = ? AND status = 'pending' LIMIT 1"
    ).get(table_id);

    if (existingCall) {
      return res.json({ message: 'Garson zaten çağrıldı.', call: existingCall });
    }

    const now = new Date().toISOString();
    const result = db.prepare(
      'INSERT INTO waiter_calls (table_id, status, created_at) VALUES (?, ?, ?)'
    ).run(table_id, 'pending', now);

    const call = db.prepare('SELECT * FROM waiter_calls WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ message: 'Garson çağrıldı.', call });
  } catch (err) {
    console.error('Garson çağırma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/waiter/calls - Bekleyen çağrıları listele (auth gerekli)
router.get('/calls', authMiddleware, (req, res) => {
  try {
    const db = getDb();

    const calls = db.prepare(
      `SELECT wc.*, t.table_number
       FROM waiter_calls wc
       JOIN tables t ON wc.table_id = t.id
       WHERE t.restaurant_id = ? AND wc.status = 'pending'
       ORDER BY wc.created_at ASC`
    ).all(req.restaurantId);

    res.json(calls);
  } catch (err) {
    console.error('Garson çağrıları listeleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/waiter/history - Tüm çağrı geçmişi (bekleme süreleriyle)
router.get('/history', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const calls = db.prepare(
      `SELECT wc.*, t.table_number, t.name as table_name
       FROM waiter_calls wc
       JOIN tables t ON wc.table_id = t.id
       WHERE t.restaurant_id = ?
       ORDER BY wc.created_at DESC
       LIMIT 200`
    ).all(req.restaurantId);

    // Bekleme süresi hesapla
    const withDuration = calls.map((c) => {
      let waitSeconds = null;
      if (c.status === 'done' && c.dismissed_at) {
        waitSeconds = Math.floor(
          (new Date(c.dismissed_at) - new Date(c.created_at)) / 1000
        );
      } else if (c.status === 'pending') {
        waitSeconds = Math.floor((Date.now() - new Date(c.created_at)) / 1000);
      }
      return { ...c, wait_seconds: waitSeconds };
    });

    res.json(withDuration);
  } catch (err) {
    console.error('Geçmiş hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/waiter/calls/:id/dismiss - Çağrıyı kapat (auth gerekli)
router.put('/calls/:id/dismiss', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const call = db.prepare(
      `SELECT wc.* FROM waiter_calls wc
       JOIN tables t ON wc.table_id = t.id
       WHERE wc.id = ? AND t.restaurant_id = ?`
    ).get(id, req.restaurantId);

    if (!call) {
      return res.status(404).json({ error: 'Çağrı bulunamadı.' });
    }

    db.prepare(
      "UPDATE waiter_calls SET status = 'done', dismissed_at = ? WHERE id = ?"
    ).run(new Date().toISOString(), id);

    res.json({ message: 'Çağrı kapatıldı.' });
  } catch (err) {
    console.error('Garson çağrısı kapatma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
