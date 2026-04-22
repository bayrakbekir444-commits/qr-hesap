const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/init');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');
const { getPackage, PACKAGES } = require('../middleware/packages');

const router = express.Router();

const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Restoran adı ve şifre gereklidir.' });
    }

    const db = getDb();
    const restaurant = db.prepare('SELECT * FROM restaurants WHERE name = ?').get(name);

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
router.post('/forgot', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Restoran adı gereklidir.' });

    const db = getDb();
    const restaurant = db.prepare('SELECT * FROM restaurants WHERE name = ?').get(name);
    if (!restaurant) {
      // Güvenlik: aynı yanıt ver
      return res.json({ message: 'Eğer restoran kayıtlıysa, sistem sorumlusuna kod gönderildi.' });
    }

    const code = genCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    db.prepare(
      'INSERT INTO password_resets (restaurant_id, code, expires_at) VALUES (?, ?, ?)'
    ).run(restaurant.id, code, expiresAt);

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
router.post('/reset', (req, res) => {
  try {
    const { name, code, newPassword } = req.body;
    if (!name || !code || !newPassword) {
      return res.status(400).json({ error: 'Restoran adı, kod ve yeni şifre gereklidir.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı.' });
    }

    const db = getDb();
    const restaurant = db.prepare('SELECT * FROM restaurants WHERE name = ?').get(name);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restoran bulunamadı.' });
    }

    const reset = db.prepare(
      `SELECT * FROM password_resets
       WHERE restaurant_id = ? AND code = ? AND used = 0
       ORDER BY id DESC LIMIT 1`
    ).get(restaurant.id, code);

    if (!reset) {
      return res.status(400).json({ error: 'Geçersiz kod.' });
    }

    if (new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Kod süresi dolmuş. Yeni kod iste.' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE restaurants SET password_hash = ? WHERE id = ?').run(newHash, restaurant.id);
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(reset.id);

    res.json({ message: 'Şifre güncellendi. Yeni şifrenizle giriş yapabilirsiniz.' });
  } catch (err) {
    console.error('Reset hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/auth/restaurant — Mevcut restoran bilgisi
router.get('/restaurant', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const r = db.prepare(
      'SELECT id, name, logo_url, description, phone, email FROM restaurants WHERE id = ?'
    ).get(req.restaurantId);
    res.json(r);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/auth/restaurant — Restoran bilgilerini güncelle
router.put('/restaurant', authMiddleware, (req, res) => {
  try {
    const { logo_url, description, phone, email } = req.body;
    const db = getDb();
    db.prepare(
      'UPDATE restaurants SET logo_url = ?, description = ?, phone = ?, email = ? WHERE id = ?'
    ).run(
      logo_url || null,
      description || null,
      phone || null,
      email || null,
      req.restaurantId
    );
    const r = db.prepare(
      'SELECT id, name, logo_url, description, phone, email FROM restaurants WHERE id = ?'
    ).get(req.restaurantId);
    res.json({ message: 'Güncellendi.', restaurant: r });
  } catch {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/auth/package — Mevcut paket bilgisi
router.get('/package', authMiddleware, (req, res) => {
  try {
    const pkg = getPackage(req.restaurantId);
    const db = getDb();
    const tableCount = db.prepare(
      'SELECT COUNT(*) as c FROM tables WHERE restaurant_id = ? AND active = 1'
    ).get(req.restaurantId).c;

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
