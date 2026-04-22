const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
const { requireFeature } = require('../middleware/packages');

const router = express.Router();

// Personel yönetimi Pro+ paket gerektirir
router.use(authMiddleware, requireFeature('staff'));

// GET /api/staff - Personel listele
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const staff = db.prepare(
      'SELECT id, restaurant_id, name, role, active, created_at FROM staff WHERE restaurant_id = ? AND active = 1 ORDER BY created_at DESC'
    ).all(req.restaurantId);

    res.json(staff);
  } catch (err) {
    console.error('Personel listeleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/staff - Personel ekle
router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, role, pin } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Personel adı gereklidir.' });
    }

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO staff (restaurant_id, name, role, pin) VALUES (?, ?, ?, ?)'
    ).run(req.restaurantId, name, role || 'garson', pin || null);

    const staff = db.prepare(
      'SELECT id, restaurant_id, name, role, active, created_at FROM staff WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Personel eklendi.', staff });
  } catch (err) {
    console.error('Personel ekleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/staff/:id - Personeli pasife al
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const staff = db.prepare(
      'SELECT * FROM staff WHERE id = ? AND restaurant_id = ?'
    ).get(id, req.restaurantId);

    if (!staff) {
      return res.status(404).json({ error: 'Personel bulunamadı.' });
    }

    db.prepare('UPDATE staff SET active = 0 WHERE id = ?').run(id);

    res.json({ message: 'Personel pasife alındı.' });
  } catch (err) {
    console.error('Personel silme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/staff/assign - Garson masa ataması
router.post('/assign', authMiddleware, (req, res) => {
  try {
    const { staff_id, table_id } = req.body;

    if (!staff_id || !table_id) {
      return res.status(400).json({ error: 'staff_id ve table_id gereklidir.' });
    }

    const db = getDb();

    const staff = db.prepare(
      'SELECT * FROM staff WHERE id = ? AND restaurant_id = ? AND active = 1'
    ).get(staff_id, req.restaurantId);

    if (!staff) {
      return res.status(404).json({ error: 'Personel bulunamadı.' });
    }

    const table = db.prepare(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ? AND active = 1'
    ).get(table_id, req.restaurantId);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    // Mevcut atamayı kaldır
    db.prepare(
      'DELETE FROM table_assignments WHERE table_id = ?'
    ).run(table_id);

    const result = db.prepare(
      'INSERT INTO table_assignments (staff_id, table_id) VALUES (?, ?)'
    ).run(staff_id, table_id);

    const assignment = db.prepare(
      'SELECT * FROM table_assignments WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Atama yapıldı.', assignment });
  } catch (err) {
    console.error('Masa atama hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/staff/assignments - Atamaları listele
router.get('/assignments', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const assignments = db.prepare(
      `SELECT ta.*, s.name as staff_name, s.role as staff_role, t.table_number
       FROM table_assignments ta
       JOIN staff s ON ta.staff_id = s.id
       JOIN tables t ON ta.table_id = t.id
       WHERE s.restaurant_id = ? AND s.active = 1 AND t.active = 1
       ORDER BY t.table_number`
    ).all(req.restaurantId);

    res.json(assignments);
  } catch (err) {
    console.error('Atama listeleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
