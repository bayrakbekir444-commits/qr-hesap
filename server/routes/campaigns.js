const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/campaigns - Aktif kampanyaları listele (auth yok, müşteriye gösterilir)
router.get('/', (req, res) => {
  try {
    const db = getDb();

    // restaurant_id query param ile filtreleme (müşteri tarafı için)
    const { restaurant_id } = req.query;

    let campaigns;
    if (restaurant_id) {
      campaigns = db.prepare(
        'SELECT * FROM campaigns WHERE restaurant_id = ? AND active = 1 ORDER BY created_at DESC'
      ).all(restaurant_id);
    } else {
      // Auth header varsa kendi restoranının kampanyalarını göster
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../middleware/auth');
        try {
          const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
          campaigns = db.prepare(
            'SELECT * FROM campaigns WHERE restaurant_id = ? AND active = 1 ORDER BY created_at DESC'
          ).all(decoded.restaurantId);
        } catch {
          campaigns = [];
        }
      } else {
        campaigns = [];
      }
    }

    res.json(campaigns);
  } catch (err) {
    console.error('Kampanya listeleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/campaigns/validate/:code - Kupon kodu doğrula (auth yok)
router.get('/validate/:code', (req, res) => {
  try {
    const { code } = req.params;
    const { restaurant_id } = req.query;
    if (!code || !restaurant_id) {
      return res.status(400).json({ error: 'Kod ve restaurant_id gerekli.' });
    }
    const db = getDb();
    const campaign = db.prepare(
      'SELECT * FROM campaigns WHERE restaurant_id = ? AND code = ? AND active = 1'
    ).get(restaurant_id, code.toUpperCase());

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
router.post('/', authMiddleware, (req, res) => {
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

    const db = getDb();
    const now = new Date().toISOString();

    const codeUpper = code ? code.toUpperCase().trim() : null;
    const result = db.prepare(
      'INSERT INTO campaigns (restaurant_id, name, discount_type, discount_value, code, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)'
    ).run(req.restaurantId, name, discount_type, discount_value, codeUpper, now);

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ message: 'Kampanya oluşturuldu.', campaign });
  } catch (err) {
    console.error('Kampanya oluşturma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/campaigns/:id - Kampanyayı sil (auth gerekli)
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const campaign = db.prepare(
      'SELECT * FROM campaigns WHERE id = ? AND restaurant_id = ?'
    ).get(id, req.restaurantId);

    if (!campaign) {
      return res.status(404).json({ error: 'Kampanya bulunamadı.' });
    }

    db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);

    res.json({ message: 'Kampanya silindi.' });
  } catch (err) {
    console.error('Kampanya silme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
