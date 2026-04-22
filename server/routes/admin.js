const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/init');
const { JWT_SECRET } = require('../middleware/auth');
const { adminMiddleware, ADMIN_USERNAME, ADMIN_PASSWORD } = require('../middleware/admin');
const { PACKAGES } = require('../middleware/packages');

const router = express.Router();

// POST /api/admin/login — Admin giriş
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli.' });
    }
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Geçersiz kimlik bilgileri.' });
    }
    const token = jwt.sign({ isAdmin: true, username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Giriş başarılı.', token });
  } catch {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/admin/restaurants — Tüm restoranlar (istatistiklerle)
router.get('/restaurants', adminMiddleware, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(
      `SELECT r.id, r.name, r.email, r.phone, r.package_type, r.package_expires_at, r.created_at,
              (SELECT COUNT(*) FROM tables t WHERE t.restaurant_id = r.id AND t.active = 1) as table_count,
              (SELECT COUNT(*) FROM orders o JOIN tables t ON o.table_id = t.id WHERE t.restaurant_id = r.id AND o.status = 'closed') as total_orders
       FROM restaurants r
       ORDER BY r.id`
    ).all();

    const result = rows.map((r) => {
      const cfg = PACKAGES[r.package_type || 'temel'];
      const expired = r.package_expires_at ? new Date(r.package_expires_at) < new Date() : false;
      return {
        ...r,
        package_label: cfg.label,
        monthly_fee: cfg.monthly_fee,
        max_tables: cfg.max_tables,
        expired,
      };
    });

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/admin/restaurants/:id/package — Paket değiştir
router.put('/restaurants/:id/package', adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { package_type, months } = req.body;
    if (!['temel', 'pro', 'zincir'].includes(package_type)) {
      return res.status(400).json({ error: 'Geçersiz paket.' });
    }
    const db = getDb();
    const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(id);
    if (!restaurant) return res.status(404).json({ error: 'Restoran bulunamadı.' });

    const expires = new Date();
    expires.setMonth(expires.getMonth() + (parseInt(months, 10) || 1));
    const expiresStr = expires.toISOString().split('T')[0];

    db.prepare(
      'UPDATE restaurants SET package_type = ?, package_expires_at = ? WHERE id = ?'
    ).run(package_type, expiresStr, id);

    res.json({ message: 'Paket güncellendi.', package_type, expires_at: expiresStr });
  } catch {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/admin/restaurants/:id — Restoranı sil (DİKKAT)
router.delete('/restaurants/:id', adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(id);
    if (!restaurant) return res.status(404).json({ error: 'Restoran bulunamadı.' });

    // Önce ilişkili verileri sil (FK cascade yoksa)
    const tables = db.prepare('SELECT id FROM tables WHERE restaurant_id = ?').all(id);
    tables.forEach((t) => {
      const orders = db.prepare('SELECT id FROM orders WHERE table_id = ?').all(t.id);
      orders.forEach((o) => {
        db.prepare('DELETE FROM order_items WHERE order_id = ?').run(o.id);
        db.prepare('DELETE FROM payments WHERE order_id = ?').run(o.id);
      });
      db.prepare('DELETE FROM orders WHERE table_id = ?').run(t.id);
    });
    db.prepare('DELETE FROM tables WHERE restaurant_id = ?').run(id);
    db.prepare('DELETE FROM menu_items WHERE restaurant_id = ?').run(id);
    db.prepare('DELETE FROM categories WHERE restaurant_id = ?').run(id);
    db.prepare('DELETE FROM staff WHERE restaurant_id = ?').run(id);
    db.prepare('DELETE FROM campaigns WHERE restaurant_id = ?').run(id);
    db.prepare('DELETE FROM restaurants WHERE id = ?').run(id);

    res.json({ message: 'Restoran silindi.' });
  } catch (err) {
    console.error('Restoran silme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/admin/restaurants — Yeni restoran oluştur
router.post('/restaurants', adminMiddleware, (req, res) => {
  try {
    const { name, password, package_type = 'temel', months = 1 } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: 'İsim ve şifre gerekli.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter.' });
    }
    const db = getDb();
    const existing = db.prepare('SELECT id FROM restaurants WHERE name = ?').get(name);
    if (existing) {
      return res.status(409).json({ error: 'Bu isimde restoran zaten var.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const expires = new Date();
    expires.setMonth(expires.getMonth() + parseInt(months, 10));
    const expiresStr = expires.toISOString().split('T')[0];

    const result = db.prepare(
      'INSERT INTO restaurants (name, password_hash, package_type, package_expires_at) VALUES (?, ?, ?, ?)'
    ).run(name, hash, package_type, expiresStr);

    res.status(201).json({ message: 'Restoran oluşturuldu.', id: result.lastInsertRowid });
  } catch (err) {
    console.error('Restoran oluşturma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/admin/stats — Genel istatistik
router.get('/stats', adminMiddleware, (req, res) => {
  try {
    const db = getDb();
    const stats = {
      total_restaurants: db.prepare('SELECT COUNT(*) as c FROM restaurants').get().c,
      total_tables: db.prepare('SELECT COUNT(*) as c FROM tables WHERE active = 1').get().c,
      total_orders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'closed'").get().c,
      revenue_all_time: db.prepare(
        `SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total
         FROM order_items oi JOIN orders o ON oi.order_id = o.id
         WHERE o.status = 'closed'`
      ).get().total,
    };
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
