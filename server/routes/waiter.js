const express = require('express');
const { getPool } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/waiter/call - Garson çağır (müşteri, auth yok)
router.post('/call', async (req, res) => {
  try {
    const { table_id } = req.body;

    if (!table_id) {
      return res.status(400).json({ error: 'table_id gereklidir.' });
    }

    const pool = getPool();

    const { rows: tableRows } = await pool.query(
      'SELECT id FROM tables WHERE id = $1 AND active = 1',
      [table_id]
    );

    if (tableRows.length === 0) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    // Aynı masadan zaten bekleyen çağrı var mı kontrol et
    const { rows: existingRows } = await pool.query(
      "SELECT * FROM waiter_calls WHERE table_id = $1 AND status = 'pending' LIMIT 1",
      [table_id]
    );

    if (existingRows[0]) {
      return res.json({ message: 'Garson zaten çağrıldı.', call: existingRows[0] });
    }

    const { rows } = await pool.query(
      "INSERT INTO waiter_calls (table_id, status, created_at) VALUES ($1, 'pending', NOW()) RETURNING *",
      [table_id]
    );

    res.status(201).json({ message: 'Garson çağrıldı.', call: rows[0] });
  } catch (err) {
    console.error('Garson çağırma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/waiter/calls - Bekleyen çağrıları listele (auth gerekli)
router.get('/calls', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT wc.*, t.table_number
       FROM waiter_calls wc
       JOIN tables t ON wc.table_id = t.id
       WHERE t.restaurant_id = $1 AND wc.status = 'pending'
       ORDER BY wc.created_at ASC`,
      [req.restaurantId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Garson çağrıları listeleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/waiter/history - Tüm çağrı geçmişi (bekleme süreleriyle)
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { rows: calls } = await pool.query(
      `SELECT wc.*, t.table_number, t.name as table_name
       FROM waiter_calls wc
       JOIN tables t ON wc.table_id = t.id
       WHERE t.restaurant_id = $1
       ORDER BY wc.created_at DESC
       LIMIT 200`,
      [req.restaurantId]
    );

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
router.put('/calls/:id/dismiss', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT wc.id FROM waiter_calls wc
       JOIN tables t ON wc.table_id = t.id
       WHERE wc.id = $1 AND t.restaurant_id = $2`,
      [id, req.restaurantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Çağrı bulunamadı.' });
    }

    await pool.query(
      "UPDATE waiter_calls SET status = 'done', dismissed_at = $1 WHERE id = $2",
      [new Date().toISOString(), id]
    );

    res.json({ message: 'Çağrı kapatıldı.' });
  } catch (err) {
    console.error('Garson çağrısı kapatma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
