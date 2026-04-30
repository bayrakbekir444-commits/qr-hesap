const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../db/init');
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
router.get('/restaurants', adminMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT r.id, r.name, r.email, r.phone, r.package_type, r.package_expires_at, r.created_at,
              (SELECT COUNT(*)::int FROM tables t WHERE t.restaurant_id = r.id AND t.active = 1) as table_count,
              (SELECT COUNT(*)::int FROM orders o JOIN tables t ON o.table_id = t.id WHERE t.restaurant_id = r.id AND o.status = 'closed') as total_orders
       FROM restaurants r
       ORDER BY r.id`
    );

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
router.put('/restaurants/:id/package', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { package_type, months } = req.body;
    if (!['temel', 'pro', 'zincir'].includes(package_type)) {
      return res.status(400).json({ error: 'Geçersiz paket.' });
    }
    const pool = getPool();
    const { rows: existRows } = await pool.query('SELECT id FROM restaurants WHERE id = $1', [id]);
    if (existRows.length === 0) return res.status(404).json({ error: 'Restoran bulunamadı.' });

    const expires = new Date();
    expires.setMonth(expires.getMonth() + (parseInt(months, 10) || 1));
    const expiresStr = expires.toISOString().split('T')[0];

    await pool.query(
      'UPDATE restaurants SET package_type = $1, package_expires_at = $2 WHERE id = $3',
      [package_type, expiresStr, id]
    );

    res.json({ message: 'Paket güncellendi.', package_type, expires_at: expiresStr });
  } catch {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/admin/restaurants/:id — Restoranı sil (DİKKAT)
router.delete('/restaurants/:id', adminMiddleware, async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { rows: existRows } = await client.query('SELECT id FROM restaurants WHERE id = $1', [id]);
    if (existRows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Restoran bulunamadı.' });
    }

    await client.query('BEGIN');

    // Önce ilişkili verileri sil
    const { rows: tables } = await client.query('SELECT id FROM tables WHERE restaurant_id = $1', [id]);
    for (const t of tables) {
      const { rows: orders } = await client.query('SELECT id FROM orders WHERE table_id = $1', [t.id]);
      for (const o of orders) {
        await client.query('DELETE FROM order_items WHERE order_id = $1', [o.id]);
        await client.query('DELETE FROM payments WHERE order_id = $1', [o.id]);
      }
      await client.query('DELETE FROM orders WHERE table_id = $1', [t.id]);
    }
    await client.query('DELETE FROM tables WHERE restaurant_id = $1', [id]);
    await client.query('DELETE FROM menu_items WHERE restaurant_id = $1', [id]);
    await client.query('DELETE FROM categories WHERE restaurant_id = $1', [id]);
    await client.query('DELETE FROM staff WHERE restaurant_id = $1', [id]);
    await client.query('DELETE FROM campaigns WHERE restaurant_id = $1', [id]);
    await client.query('DELETE FROM restaurants WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ message: 'Restoran silindi.' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Restoran silme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
});

// POST /api/admin/restaurants — Yeni restoran oluştur
router.post('/restaurants', adminMiddleware, async (req, res) => {
  try {
    const { name, password, package_type = 'temel', months = 1 } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: 'İsim ve şifre gerekli.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter.' });
    }
    const pool = getPool();
    const { rows: existRows } = await pool.query('SELECT id FROM restaurants WHERE name = $1', [name]);
    if (existRows.length > 0) {
      return res.status(409).json({ error: 'Bu isimde restoran zaten var.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const expires = new Date();
    expires.setMonth(expires.getMonth() + parseInt(months, 10));
    const expiresStr = expires.toISOString().split('T')[0];

    const { rows } = await pool.query(
      `INSERT INTO restaurants (name, password_hash, package_type, package_expires_at)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, hash, package_type, expiresStr]
    );

    res.status(201).json({ message: 'Restoran oluşturuldu.', id: rows[0].id });
  } catch (err) {
    console.error('Restoran oluşturma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/admin/stats — Genel istatistik
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const [r1, r2, r3, r4] = await Promise.all([
      pool.query('SELECT COUNT(*)::int as c FROM restaurants'),
      pool.query('SELECT COUNT(*)::int as c FROM tables WHERE active = 1'),
      pool.query("SELECT COUNT(*)::int as c FROM orders WHERE status = 'closed'"),
      pool.query(
        `SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0)::bigint as total
         FROM order_items oi JOIN orders o ON oi.order_id = o.id
         WHERE o.status = 'closed'`
      ),
    ]);

    const stats = {
      total_restaurants: r1.rows[0].c,
      total_tables: r2.rows[0].c,
      total_orders: r3.rows[0].c,
      revenue_all_time: Number(r4.rows[0].total) || 0,
    };
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
