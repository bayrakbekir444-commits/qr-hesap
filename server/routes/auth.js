const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../db/init');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');
const { getPackage, PACKAGES } = require('../middleware/packages');

const router = express.Router();

const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Restoran adı ve şifre gereklidir.' });
    }

    const pool = getPool();
    // TRIM ile case-insensitive arama (yazım hatalarını affetsin)
    const { rows } = await pool.query(
      'SELECT * FROM restaurants WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))',
      [name]
    );
    const restaurant = rows[0];

    if (!restaurant) {
      return res.status(401).json({ error: 'Restoran bulunamadı.' });
    }

    const validPassword = bcrypt.compareSync(password, restaurant.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Geçersiz şifre.' });
    }

    const token = jwt.sign(
      { restaurantId: restaurant.id, restaurantName: restaurant.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Giriş başarılı.',
      token,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
      },
    });
  } catch (err) {
    console.error('Giriş hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/auth/forgot — Şifremi unuttum kodu üret
router.post('/forgot', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Restoran adı gereklidir.' });

    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM restaurants WHERE name = $1', [name]);
    const restaurant = rows[0];
    if (!restaurant) {
      // Güvenlik: aynı yanıt ver
      return res.json({ message: 'Eğer restoran kayıtlıysa, sistem sorumlusuna kod gönderildi.' });
    }

    const code = genCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await pool.query(
      'INSERT INTO password_resets (restaurant_id, code, expires_at) VALUES ($1, $2, $3)',
      [restaurant.id, code, expiresAt]
    );

    // Production'da SMS/email gönder. Şu an sunucu konsoluna yaz.
    console.log('');
    console.log('================================================');
    console.log(`🔑 ŞİFRE SIFIRLAMA KODU: ${code}`);
    console.log(`   Restoran: ${restaurant.name}`);
    console.log(`   Geçerlilik: 15 dakika`);
    console.log('================================================');
    console.log('');

    res.json({ message: 'Eğer restoran kayıtlıysa, sistem sorumlusuna kod gönderildi.' });
  } catch (err) {
    console.error('Forgot hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/auth/reset — Kod ile yeni şifre belirle
router.post('/reset', async (req, res) => {
  try {
    const { name, code, newPassword } = req.body;
    if (!name || !code || !newPassword) {
      return res.status(400).json({ error: 'Restoran adı, kod ve yeni şifre gereklidir.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı.' });
    }

    const pool = getPool();
    const { rows: rRows } = await pool.query('SELECT * FROM restaurants WHERE name = $1', [name]);
    const restaurant = rRows[0];
    if (!restaurant) {
      return res.status(404).json({ error: 'Restoran bulunamadı.' });
    }

    const { rows: resetRows } = await pool.query(
      `SELECT * FROM password_resets
       WHERE restaurant_id = $1 AND code = $2 AND used = 0
       ORDER BY id DESC LIMIT 1`,
      [restaurant.id, code]
    );
    const reset = resetRows[0];

    if (!reset) {
      return res.status(400).json({ error: 'Geçersiz kod.' });
    }

    if (new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Kod süresi dolmuş. Yeni kod iste.' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await pool.query('UPDATE restaurants SET password_hash = $1 WHERE id = $2', [newHash, restaurant.id]);
    await pool.query('UPDATE password_resets SET used = 1 WHERE id = $1', [reset.id]);

    res.json({ message: 'Şifre güncellendi. Yeni şifrenizle giriş yapabilirsiniz.' });
  } catch (err) {
    console.error('Reset hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/auth/restaurant — Mevcut restoran bilgisi
router.get('/restaurant', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, name, logo_url, description, phone, email, hide_branding, package_type FROM restaurants WHERE id = $1',
      [req.restaurantId]
    );
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/auth/restaurant/branding — Whitelabel toggle
router.put('/restaurant/branding', authMiddleware, async (req, res) => {
  try {
    const { hide_branding } = req.body;
    const pool = getPool();
    const value = hide_branding ? 1 : 0;
    await pool.query(
      'UPDATE restaurants SET hide_branding = $1 WHERE id = $2',
      [value, req.restaurantId]
    );
    res.json({ message: 'Güncellendi.', hide_branding: !!value });
  } catch (err) {
    console.error('Branding toggle hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/auth/restaurant — Restoran bilgilerini güncelle
router.put('/restaurant', authMiddleware, async (req, res) => {
  try {
    const { logo_url, description, phone, email } = req.body;
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE restaurants
       SET logo_url = $1, description = $2, phone = $3, email = $4
       WHERE id = $5
       RETURNING id, name, logo_url, description, phone, email`,
      [
        logo_url || null,
        description || null,
        phone || null,
        email || null,
        req.restaurantId,
      ]
    );
    res.json({ message: 'Güncellendi.', restaurant: rows[0] });
  } catch {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/auth/package — Mevcut paket bilgisi
router.get('/package', authMiddleware, async (req, res) => {
  try {
    const pkg = await getPackage(req.restaurantId);
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int as c FROM tables WHERE restaurant_id = $1 AND active = 1',
      [req.restaurantId]
    );
    const tableCount = rows[0].c;

    res.json({
      type: pkg.type,
      label: pkg.config.label,
      monthly_fee: pkg.config.monthly_fee,
      max_tables: pkg.config.max_tables,
      current_tables: tableCount,
      features: pkg.config.features,
      expires_at: pkg.expires_at,
      expired: pkg.expired,
      all_packages: PACKAGES,
    });
  } catch (err) {
    console.error('Paket hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
