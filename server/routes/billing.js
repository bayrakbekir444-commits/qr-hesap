const express = require('express');
const { getPool } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const FIELDS = [
  'company_type', 'legal_name', 'tax_number', 'tax_office',
  'identity_number', 'iban', 'authorized_name', 'authorized_surname',
  'authorized_email', 'authorized_phone', 'authorized_identity',
  'address_city', 'address_district', 'address_full', 'address_postal_code',
  'website',
];

// GET /api/billing — restoranın mevcut ödeme bilgileri
router.get('/', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM restaurant_billing WHERE restaurant_id = $1',
      [req.restaurantId]
    );
    res.json(rows[0] || { restaurant_id: req.restaurantId, status: 'incomplete' });
  } catch (err) {
    console.error('Billing get hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/billing — restoran ödeme bilgilerini kaydet/güncelle
router.put('/', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};

    // Temel validation
    const companyType = String(body.company_type || '').trim().toLowerCase();
    if (!['sahis', 'limited', 'anonim'].includes(companyType)) {
      return res.status(400).json({ error: 'Geçerli bir şirket türü seçin (Şahıs, Limited, Anonim).' });
    }
    const iban = String(body.iban || '').replace(/\s+/g, '').toUpperCase();
    if (!/^TR\d{24}$/.test(iban)) {
      return res.status(400).json({ error: 'Geçerli bir IBAN girin (TR ile başlamalı, 26 karakter).' });
    }
    if (companyType === 'sahis') {
      const id = String(body.identity_number || '').replace(/\D/g, '');
      if (!/^\d{11}$/.test(id)) {
        return res.status(400).json({ error: 'Şahıs şirketleri için 11 haneli T.C. kimlik no girin.' });
      }
    } else {
      const tax = String(body.tax_number || '').replace(/\D/g, '');
      if (!/^\d{10}$/.test(tax)) {
        return res.status(400).json({ error: 'Limited/Anonim için 10 haneli vergi numarası girin.' });
      }
    }
    if (!body.legal_name?.trim()) {
      return res.status(400).json({ error: 'İşletme/Şirket adı girin.' });
    }
    if (!body.authorized_name?.trim() || !body.authorized_surname?.trim()) {
      return res.status(400).json({ error: 'Yetkili kişinin adı ve soyadını girin.' });
    }
    if (!body.authorized_email?.trim() || !body.authorized_phone?.trim()) {
      return res.status(400).json({ error: 'Yetkili kişinin email ve telefon bilgisini girin.' });
    }
    if (!body.address_city?.trim() || !body.address_full?.trim()) {
      return res.status(400).json({ error: 'İl ve açık adres girin.' });
    }

    // Normalize edilmiş değerler
    const values = {
      company_type: companyType,
      legal_name: body.legal_name.trim(),
      tax_number: companyType !== 'sahis' ? String(body.tax_number || '').replace(/\D/g, '') : null,
      tax_office: body.tax_office?.trim() || null,
      identity_number: companyType === 'sahis' ? String(body.identity_number || '').replace(/\D/g, '') : null,
      iban,
      authorized_name: body.authorized_name.trim(),
      authorized_surname: body.authorized_surname.trim(),
      authorized_email: body.authorized_email.trim(),
      authorized_phone: body.authorized_phone.trim(),
      authorized_identity: String(body.authorized_identity || '').replace(/\D/g, '') || null,
      address_city: body.address_city.trim(),
      address_district: body.address_district?.trim() || null,
      address_full: body.address_full.trim(),
      address_postal_code: body.address_postal_code?.trim() || null,
      website: body.website?.trim() || null,
    };

    const pool = getPool();
    // UPSERT (Postgres)
    const cols = Object.keys(values);
    const placeholders = cols.map((_, i) => `$${i + 2}`).join(', ');
    const updates = cols.map((c) => `${c} = EXCLUDED.${c}`).join(', ');
    const sql = `
      INSERT INTO restaurant_billing (restaurant_id, ${cols.join(', ')}, status, accepted_at, updated_at)
      VALUES ($1, ${placeholders}, 'pending', NOW(), NOW())
      ON CONFLICT (restaurant_id) DO UPDATE
      SET ${updates}, status = 'pending', accepted_at = COALESCE(restaurant_billing.accepted_at, NOW()), updated_at = NOW()
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [req.restaurantId, ...cols.map((c) => values[c])]);

    res.json({ message: 'Ödeme bilgileri kaydedildi. Onay bekleniyor.', billing: rows[0] });
  } catch (err) {
    console.error('Billing save hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
