const express = require('express');
const { getPool } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/menu - Kategoriler ve ürünleri listele
router.get('/', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { rows: categories } = await pool.query(
      'SELECT * FROM categories WHERE restaurant_id = $1 ORDER BY sort_order, id',
      [req.restaurantId]
    );

    // Panelde stoksuz ürünler de görünsün (inactive=0 dahil)
    const { rows: items } = await pool.query(
      'SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY id',
      [req.restaurantId]
    );

    const result = categories.map((cat) => ({
      ...cat,
      items: items.filter((item) => item.category_id === cat.id),
    }));

    res.json(result);
  } catch (err) {
    console.error('Menü listeleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/menu/categories - Kategori oluştur
router.post('/categories', authMiddleware, async (req, res) => {
  try {
    const { name, sort_order, name_en, name_ar } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Kategori adı gereklidir.' });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO categories (restaurant_id, name, sort_order, name_en, name_ar)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.restaurantId, name, sort_order || 0, name_en || '', name_ar || '']
    );

    res.status(201).json({ message: 'Kategori oluşturuldu.', category: rows[0] });
  } catch (err) {
    console.error('Kategori oluşturma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/menu/categories/:id - Kategori güncelle
router.put('/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sort_order } = req.body;
    const pool = getPool();

    const { rows: catRows } = await pool.query(
      'SELECT * FROM categories WHERE id = $1 AND restaurant_id = $2',
      [id, req.restaurantId]
    );
    const cat = catRows[0];

    if (!cat) {
      return res.status(404).json({ error: 'Kategori bulunamadı.' });
    }

    const { rows } = await pool.query(
      'UPDATE categories SET name = $1, sort_order = $2 WHERE id = $3 RETURNING *',
      [
        name !== undefined ? name : cat.name,
        sort_order !== undefined ? sort_order : cat.sort_order,
        id,
      ]
    );

    res.json({ message: 'Kategori güncellendi.', category: rows[0] });
  } catch (err) {
    console.error('Kategori güncelleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/menu/categories/:id - Kategori sil
router.delete('/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const { rows: catRows } = await pool.query(
      'SELECT * FROM categories WHERE id = $1 AND restaurant_id = $2',
      [id, req.restaurantId]
    );

    if (catRows.length === 0) {
      return res.status(404).json({ error: 'Kategori bulunamadı.' });
    }

    // İçindeki ürünleri pasife al
    await pool.query('UPDATE menu_items SET active = 0 WHERE category_id = $1', [id]);
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);

    res.json({ message: 'Kategori silindi.' });
  } catch (err) {
    console.error('Kategori silme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/menu/items - Ürün oluştur
router.post('/items', authMiddleware, async (req, res) => {
  try {
    const { category_id, name, price, name_en, name_ar, image_url, is_special, special_discount } = req.body;

    if (!category_id || !name || price === undefined) {
      return res.status(400).json({ error: 'Kategori, ürün adı ve fiyat gereklidir.' });
    }

    const pool = getPool();

    const { rows: catRows } = await pool.query(
      'SELECT id FROM categories WHERE id = $1 AND restaurant_id = $2',
      [category_id, req.restaurantId]
    );

    if (catRows.length === 0) {
      return res.status(404).json({ error: 'Kategori bulunamadı.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO menu_items (restaurant_id, category_id, name, price, name_en, name_ar, image_url, is_special, special_discount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.restaurantId,
        category_id,
        name,
        price,
        name_en || '',
        name_ar || '',
        image_url || null,
        is_special ? 1 : 0,
        special_discount || 0,
      ]
    );

    res.status(201).json({ message: 'Ürün oluşturuldu.', item: rows[0] });
  } catch (err) {
    console.error('Ürün oluşturma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PATCH /api/menu/items/:id/toggle — Stok aç/kapat (quick toggle)
router.patch('/items/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const { rows: itemRows } = await pool.query(
      'SELECT * FROM menu_items WHERE id = $1 AND restaurant_id = $2',
      [id, req.restaurantId]
    );
    const item = itemRows[0];
    if (!item) return res.status(404).json({ error: 'Ürün bulunamadı.' });

    const newActive = item.active ? 0 : 1;
    await pool.query('UPDATE menu_items SET active = $1 WHERE id = $2', [newActive, id]);
    res.json({ active: newActive });
  } catch (err) {
    console.error('Toggle hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/menu/items/:id - Ürün güncelle
router.put('/items/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category_id, active, name_en, name_ar, image_url, is_special, special_discount } = req.body;

    const pool = getPool();

    const { rows: itemRows } = await pool.query(
      'SELECT * FROM menu_items WHERE id = $1 AND restaurant_id = $2',
      [id, req.restaurantId]
    );
    const item = itemRows[0];

    if (!item) {
      return res.status(404).json({ error: 'Ürün bulunamadı.' });
    }

    const { rows } = await pool.query(
      `UPDATE menu_items
       SET name = $1, price = $2, category_id = $3, active = $4,
           name_en = $5, name_ar = $6, image_url = $7, is_special = $8, special_discount = $9
       WHERE id = $10
       RETURNING *`,
      [
        name !== undefined ? name : item.name,
        price !== undefined ? price : item.price,
        category_id !== undefined ? category_id : item.category_id,
        active !== undefined ? active : item.active,
        name_en !== undefined ? name_en : (item.name_en || ''),
        name_ar !== undefined ? name_ar : (item.name_ar || ''),
        image_url !== undefined ? image_url : item.image_url,
        is_special !== undefined ? (is_special ? 1 : 0) : item.is_special,
        special_discount !== undefined ? special_discount : item.special_discount,
        id,
      ]
    );

    res.json({ message: 'Ürün güncellendi.', item: rows[0] });
  } catch (err) {
    console.error('Ürün güncelleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/menu/items/:id - Ürünü pasife al (soft delete)
router.delete('/items/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const { rows: itemRows } = await pool.query(
      'SELECT id FROM menu_items WHERE id = $1 AND restaurant_id = $2',
      [id, req.restaurantId]
    );

    if (itemRows.length === 0) {
      return res.status(404).json({ error: 'Ürün bulunamadı.' });
    }

    await pool.query('UPDATE menu_items SET active = 0 WHERE id = $1', [id]);

    res.json({ message: 'Ürün pasife alındı.' });
  } catch (err) {
    console.error('Ürün silme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
