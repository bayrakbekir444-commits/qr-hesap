const express = require('express');
const { getPool } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
const { requireFeature } = require('../middleware/packages');

const router = express.Router();

// Personel yönetimi Pro+ paket gerektirir
router.use(authMiddleware, requireFeature('staff'));

// GET /api/staff - Personel listele
router.get('/', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, restaurant_id, name, role, active, created_at FROM staff WHERE restaurant_id = $1 AND active = 1 ORDER BY created_at DESC',
      [req.restaurantId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Personel listeleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/staff - Personel ekle
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, role, pin } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Personel adı gereklidir.' });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO staff (restaurant_id, name, role, pin)
       VALUES ($1, $2, $3, $4)
       RETURNING id, restaurant_id, name, role, active, created_at`,
      [req.restaurantId, name, role || 'garson', pin || null]
    );

    res.status(201).json({ message: 'Personel eklendi.', staff: rows[0] });
  } catch (err) {
    console.error('Personel ekleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/staff/:id - Personeli pasife al
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const { rows } = await pool.query(
      'SELECT id FROM staff WHERE id = $1 AND restaurant_id = $2',
      [id, req.restaurantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Personel bulunamadı.' });
    }

    await pool.query('UPDATE staff SET active = 0 WHERE id = $1', [id]);

    res.json({ message: 'Personel pasife alındı.' });
  } catch (err) {
    console.error('Personel silme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/staff/assign - Garson masa ataması
router.post('/assign', authMiddleware, async (req, res) => {
  try {
    const { staff_id, table_id } = req.body;

    if (!staff_id || !table_id) {
      return res.status(400).json({ error: 'staff_id ve table_id gereklidir.' });
    }

    const pool = getPool();

    const { rows: staffRows } = await pool.query(
      'SELECT id FROM staff WHERE id = $1 AND restaurant_id = $2 AND active = 1',
      [staff_id, req.restaurantId]
    );

    if (staffRows.length === 0) {
      return res.status(404).json({ error: 'Personel bulunamadı.' });
    }

    const { rows: tableRows } = await pool.query(
      'SELECT id FROM tables WHERE id = $1 AND restaurant_id = $2 AND active = 1',
      [table_id, req.restaurantId]
    );

    if (tableRows.length === 0) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    // Mevcut atamayı kaldır
    await pool.query('DELETE FROM table_assignments WHERE table_id = $1', [table_id]);

    const { rows } = await pool.query(
      'INSERT INTO table_assignments (staff_id, table_id) VALUES ($1, $2) RETURNING *',
      [staff_id, table_id]
    );

    res.status(201).json({ message: 'Atama yapıldı.', assignment: rows[0] });
  } catch (err) {
    console.error('Masa atama hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/staff/assignments - Atamaları listele
router.get('/assignments', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT ta.*, s.name as staff_name, s.role as staff_role, t.table_number
       FROM table_assignments ta
       JOIN staff s ON ta.staff_id = s.id
       JOIN tables t ON ta.table_id = t.id
       WHERE s.restaurant_id = $1 AND s.active = 1 AND t.active = 1
       ORDER BY t.table_number`,
      [req.restaurantId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Atama listeleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
