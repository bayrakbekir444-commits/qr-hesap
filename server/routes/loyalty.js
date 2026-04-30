const express = require('express');
const { getPool } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/loyalty - Tüm sadakat üyelerini listele (auth)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM loyalty WHERE restaurant_id = $1 ORDER BY total_spent DESC',
      [req.restaurantId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Sadakat listesi hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/loyalty/:phone - Sadakat bilgisi (auth yok)
router.get('/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const pool = getPool();

    const { rows: memberRows } = await pool.query(
      'SELECT * FROM loyalty WHERE phone = $1',
      [phone]
    );
    const member = memberRows[0];

    if (!member) {
      return res.json({ member: null, transactions: [] });
    }

    const { rows: transactions } = await pool.query(
      'SELECT * FROM loyalty_transactions WHERE loyalty_id = $1 ORDER BY created_at DESC LIMIT 50',
      [member.id]
    );

    res.json({ member, transactions });
  } catch (err) {
    console.error('Sadakat bilgisi hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/loyalty/earn - Puan kazan (auth yok, ödeme sonrası çağrılır)
router.post('/earn', async (req, res) => {
  try {
    const { phone, amount, restaurant_id } = req.body;

    if (!phone || !amount || !restaurant_id) {
      return res.status(400).json({ error: 'phone, amount ve restaurant_id gereklidir.' });
    }

    const pool = getPool();
    const pointsEarned = Math.floor(amount / 10); // Her 10 TL için 1 puan

    if (pointsEarned <= 0) {
      return res.json({ message: 'Puan kazanmak için yeterli tutar yok.', points_earned: 0 });
    }

    // Üyelik var mı kontrol et
    const { rows: existingRows } = await pool.query(
      'SELECT * FROM loyalty WHERE phone = $1 AND restaurant_id = $2',
      [phone, restaurant_id]
    );
    let member = existingRows[0];

    if (!member) {
      const { rows } = await pool.query(
        `INSERT INTO loyalty (phone, restaurant_id, points, total_spent)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [phone, restaurant_id, pointsEarned, amount]
      );
      member = rows[0];
    } else {
      const { rows } = await pool.query(
        `UPDATE loyalty SET points = points + $1, total_spent = total_spent + $2
         WHERE id = $3
         RETURNING *`,
        [pointsEarned, amount, member.id]
      );
      member = rows[0];
    }

    // İşlem kaydı
    await pool.query(
      'INSERT INTO loyalty_transactions (loyalty_id, points, type, description) VALUES ($1, $2, $3, $4)',
      [member.id, pointsEarned, 'earn', `${amount} TL harcama - ${pointsEarned} puan kazanıldı`]
    );

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
router.post('/redeem', authMiddleware, async (req, res) => {
  try {
    const { phone, points } = req.body;

    if (!phone || !points || points <= 0) {
      return res.status(400).json({ error: 'phone ve geçerli points değeri gereklidir.' });
    }

    const pool = getPool();

    const { rows: memberRows } = await pool.query(
      'SELECT * FROM loyalty WHERE phone = $1 AND restaurant_id = $2',
      [phone, req.restaurantId]
    );
    const member = memberRows[0];

    if (!member) {
      return res.status(404).json({ error: 'Sadakat üyesi bulunamadı.' });
    }

    if (member.points < points) {
      return res.status(400).json({ error: 'Yeterli puan yok.', available_points: member.points });
    }

    const { rows: updatedRows } = await pool.query(
      'UPDATE loyalty SET points = points - $1 WHERE id = $2 RETURNING *',
      [points, member.id]
    );

    await pool.query(
      'INSERT INTO loyalty_transactions (loyalty_id, points, type, description) VALUES ($1, $2, $3, $4)',
      [member.id, -points, 'redeem', `${points} puan kullanıldı`]
    );

    res.json({
      message: 'Puan kullanıldı.',
      points_redeemed: points,
      remaining_points: updatedRows[0].points,
    });
  } catch (err) {
    console.error('Puan kullanma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
