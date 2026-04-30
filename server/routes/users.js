const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../db/init');
const { userAuthMiddleware, USER_JWT_SECRET } = require('../middleware/userAuth');

const router = express.Router();

// POST /api/users/register
router.post('/register', async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      client.release();
      return res.status(400).json({ error: 'Ad, email ve şifre gereklidir.' });
    }

    const { rows: existRows } = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existRows.length > 0) {
      client.release();
      return res.status(409).json({ error: 'Bu email adresi zaten kayıtlı.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    await client.query('BEGIN');
    const { rows: userRows } = await client.query(
      `INSERT INTO users (name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [name, email, phone || null, passwordHash]
    );
    const userId = userRows[0].id;

    await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0)', [userId]);
    await client.query('COMMIT');

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
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Kayıt hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre gereklidir.' });
    }

    const pool = getPool();

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
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
router.get('/profile', userAuthMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, name, email, phone, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    res.json({ user: rows[0] });
  } catch (err) {
    console.error('Profil hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/users/profile
router.put('/profile', userAuthMiddleware, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const pool = getPool();

    const { rows: existRows } = await pool.query('SELECT id FROM users WHERE id = $1', [req.userId]);
    if (existRows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    if (name) {
      await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name, req.userId]);
    }
    if (phone !== undefined) {
      await pool.query('UPDATE users SET phone = $1 WHERE id = $2', [phone, req.userId]);
    }

    const { rows } = await pool.query(
      'SELECT id, name, email, phone, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    res.json({ message: 'Profil güncellendi.', user: rows[0] });
  } catch (err) {
    console.error('Profil güncelleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
