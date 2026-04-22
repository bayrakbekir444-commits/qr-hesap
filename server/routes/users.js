const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/init');
const { userAuthMiddleware, USER_JWT_SECRET } = require('../middleware/userAuth');

const router = express.Router();

// POST /api/users/register
router.post('/register', (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Ad, email ve şifre gereklidir.' });
    }

    const db = getDb();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Bu email adresi zaten kayıtlı.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const createUserAndWallet = db.transaction(() => {
      const userResult = db.prepare(
        'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)'
      ).run(name, email, phone || null, passwordHash);

      const userId = userResult.lastInsertRowid;

      db.prepare('INSERT INTO wallets (user_id, balance) VALUES (?, 0)').run(userId);

      return userId;
    });

    const userId = createUserAndWallet();

    const token = jwt.sign(
      { userId, userName: name },
      USER_JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Kayıt başarılı.',
      token,
      user: { id: userId, name, email, phone: phone || null },
    });
  } catch (err) {
    console.error('Kayıt hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/users/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre gereklidir.' });
    }

    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Geçersiz email veya şifre.' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Geçersiz email veya şifre.' });
    }

    const token = jwt.sign(
      { userId: user.id, userName: user.name },
      USER_JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Giriş başarılı.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error('Giriş hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/users/profile
router.get('/profile', userAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, phone, created_at FROM users WHERE id = ?').get(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Profil hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/users/profile
router.put('/profile', userAuthMiddleware, (req, res) => {
  try {
    const { name, phone } = req.body;
    const db = getDb();

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    if (name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.userId);
    }
    if (phone !== undefined) {
      db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(phone, req.userId);
    }

    const updated = db.prepare('SELECT id, name, email, phone, created_at FROM users WHERE id = ?').get(req.userId);

    res.json({ message: 'Profil güncellendi.', user: updated });
  } catch (err) {
    console.error('Profil güncelleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
