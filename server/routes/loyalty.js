const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/loyalty - Tüm sadakat üyelerini listele (auth)
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const members = db.prepare(
      'SELECT * FROM loyalty WHERE restaurant_id = ? ORDER BY total_spent DESC'
    ).all(req.restaurantId);

    res.json(members);
  } catch (err) {
    console.error('Sadakat listesi hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/loyalty/:phone - Sadakat bilgisi (auth yok)
router.get('/:phone', (req, res) => {
  try {
    const { phone } = req.params;
    const db = getDb();

    const member = db.prepare(
      'SELECT * FROM loyalty WHERE phone = ?'
    ).get(phone);

    if (!member) {
      return res.json({ member: null, transactions: [] });
    }

    const transactions = db.prepare(
      'SELECT * FROM loyalty_transactions WHERE loyalty_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(member.id);

    res.json({ member, transactions });
  } catch (err) {
    console.error('Sadakat bilgisi hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/loyalty/earn - Puan kazan (auth yok, ödeme sonrası çağrılır)
router.post('/earn', (req, res) => {
  try {
    const { phone, amount, restaurant_id } = req.body;

    if (!phone || !amount || !restaurant_id) {
      return res.status(400).json({ error: 'phone, amount ve restaurant_id gereklidir.' });
    }

    const db = getDb();
    const pointsEarned = Math.floor(amount / 10); // Her 10 TL için 1 puan

    if (pointsEarned <= 0) {
      return res.json({ message: 'Puan kazanmak için yeterli tutar yok.', points_earned: 0 });
    }

    // Üyelik var mı kontrol et
    let member = db.prepare(
      'SELECT * FROM loyalty WHERE phone = ? AND restaurant_id = ?'
    ).get(phone, restaurant_id);

    if (!member) {
      const result = db.prepare(
        'INSERT INTO loyalty (phone, restaurant_id, points, total_spent) VALUES (?, ?, ?, ?)'
      ).run(phone, restaurant_id, pointsEarned, amount);
      member = db.prepare('SELECT * FROM loyalty WHERE id = ?').get(result.lastInsertRowid);
    } else {
      db.prepare(
        'UPDATE loyalty SET points = points + ?, total_spent = total_spent + ? WHERE id = ?'
      ).run(pointsEarned, amount, member.id);
      member = db.prepare('SELECT * FROM loyalty WHERE id = ?').get(member.id);
    }

    // İşlem kaydı
    db.prepare(
      'INSERT INTO loyalty_transactions (loyalty_id, points, type, description) VALUES (?, ?, ?, ?)'
    ).run(member.id, pointsEarned, 'earn', `${amount} TL harcama - ${pointsEarned} puan kazanıldı`);

    res.json({
      message: 'Puan kazanıldı.',
      points_earned: pointsEarned,
      total_points: member.points,
      total_spent: member.total_spent,
    });
  } catch (err) {
    console.error('Puan kazanma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/loyalty/redeem - Puan kullan (auth)
router.post('/redeem', authMiddleware, (req, res) => {
  try {
    const { phone, points } = req.body;

    if (!phone || !points || points <= 0) {
      return res.status(400).json({ error: 'phone ve geçerli points değeri gereklidir.' });
    }

    const db = getDb();

    const member = db.prepare(
      'SELECT * FROM loyalty WHERE phone = ? AND restaurant_id = ?'
    ).get(phone, req.restaurantId);

    if (!member) {
      return res.status(404).json({ error: 'Sadakat üyesi bulunamadı.' });
    }

    if (member.points < points) {
      return res.status(400).json({ error: 'Yeterli puan yok.', available_points: member.points });
    }

    db.prepare(
      'UPDATE loyalty SET points = points - ? WHERE id = ?'
    ).run(points, member.id);

    db.prepare(
      'INSERT INTO loyalty_transactions (loyalty_id, points, type, description) VALUES (?, ?, ?, ?)'
    ).run(member.id, -points, 'redeem', `${points} puan kullanıldı`);

    const updated = db.prepare('SELECT * FROM loyalty WHERE id = ?').get(member.id);

    res.json({
      message: 'Puan kullanıldı.',
      points_redeemed: points,
      remaining_points: updated.points,
    });
  } catch (err) {
    console.error('Puan kullanma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
