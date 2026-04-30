const express = require('express');
const { getPool } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/campaigns - Aktif kampanyaları listele (auth yok, müşteriye gösterilir)
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { restaurant_id } = req.query;

    let campaigns = [];
    if (restaurant_id) {
      const { rows } = await pool.query(
        'SELECT * FROM campaigns WHERE restaurant_id = $1 AND active = 1 ORDER BY created_at DESC',
        [restaurant_id]
      );
      campaigns = rows;
    } else {
      // Auth header varsa kendi restoranının kampanyalarını göster
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../middleware/auth');
        try {
          const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
          const { rows } = await pool.query(
            'SELECT * FROM campaigns WHERE restaurant_id = $1 AND active = 1 ORDER BY created_at DESC',
            [decoded.restaurantId]
          );
          campaigns = rows;
        } catch {
          campaigns = [];
        }
      }
    }

    res.json(campaigns);
  } catch (err) {
    console.error('Kampanya listeleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/campaigns/validate/:code - Kupon kodu doğrula (auth yok)
router.get('/validate/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { restaurant_id } = req.query;
    if (!code || !restaurant_id) {
      return res.status(400).json({ error: 'Kod ve restaurant_id gerekli.' });
    }
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM campaigns WHERE restaurant_id = $1 AND code = $2 AND active = 1',
      [restaurant_id, code.toUpperCase()]
    );
    const campaign = rows[0];

    if (!campaign) {
      return res.status(404).json({ error: 'Geçersiz kupon kodu.' });
    }
    res.json({
      valid: true,
      id: campaign.id,
      name: campaign.name,
      discount_type: campaign.discount_type,
      discount_value: campaign.discount_value,
    });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/campaigns - Kampanya oluştur (auth gerekli)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, discount_type, discount_value, code } = req.body;

    if (!name || !discount_type || discount_value === undefined) {
      return res.status(400).json({ error: 'name, discount_type ve discount_value gereklidir.' });
    }

    if (!['percentage', 'fixed'].includes(discount_type)) {
      return res.status(400).json({ error: "discount_type 'percentage' veya 'fixed' olmalıdır." });
    }

    if (typeof discount_value !== 'number' || discount_value <= 0) {
      return res.status(400).json({ error: 'discount_value pozitif bir sayı olmalıdır.' });
    }

    if (discount_type === 'percentage' && discount_value > 100) {
      return res.status(400).json({ error: 'Yüzdelik indirim 100\'den büyük olamaz.' });
    }

    const pool = getPool();
    const codeUpper = code ? code.toUpperCase().trim() : null;
    const { rows } = await pool.query(
      `INSERT INTO campaigns (restaurant_id, name, discount_type, discount_value, code, active, created_at)
       VALUES ($1, $2, $3, $4, $5, 1, NOW())
       RETURNING *`,
      [req.restaurantId, name, discount_type, discount_value, codeUpper]
    );

    res.status(201).json({ message: 'Kampanya oluşturuldu.', campaign: rows[0] });
  } catch (err) {
    console.error('Kampanya oluşturma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/campaigns/:id - Kampanyayı sil (auth gerekli)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const { rows } = await pool.query(
      'SELECT id FROM campaigns WHERE id = $1 AND restaurant_id = $2',
      [id, req.restaurantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Kampanya bulunamadı.' });
    }

    await pool.query('DELETE FROM campaigns WHERE id = $1', [id]);

    res.json({ message: 'Kampanya silindi.' });
  } catch (err) {
    console.error('Kampanya silme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
