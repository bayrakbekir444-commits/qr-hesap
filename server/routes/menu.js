const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/menu - Kategoriler ve ürünleri listele
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const categories = db.prepare(
      'SELECT * FROM categories WHERE restaurant_id = ? ORDER BY sort_order, id'
    ).all(req.restaurantId);

    // Panelde stoksuz ürünler de görünsün (inactive=0 dahil)
    const items = db.prepare(
      'SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY id'
    ).all(req.restaurantId);

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
router.post('/categories', authMiddleware, (req, res) => {
  try {
    const { name, sort_order, name_en, name_ar } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Kategori adı gereklidir.' });
    }

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO categories (restaurant_id, name, sort_order, name_en, name_ar) VALUES (?, ?, ?, ?, ?)'
    ).run(req.restaurantId, name, sort_order || 0, name_en || '', name_ar || '');

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ message: 'Kategori oluşturuldu.', category });
  } catch (err) {
    console.error('Kategori oluşturma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/menu/categories/:id - Kategori güncelle
router.put('/categories/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { name, sort_order } = req.body;
    const db = getDb();

    const cat = db.prepare(
      'SELECT * FROM categories WHERE id = ? AND restaurant_id = ?'
    ).get(id, req.restaurantId);

    if (!cat) {
      return res.status(404).json({ error: 'Kategori bulunamadı.' });
    }

    db.prepare(
      'UPDATE categories SET name = ?, sort_order = ? WHERE id = ?'
    ).run(
      name !== undefined ? name : cat.name,
      sort_order !== undefined ? sort_order : cat.sort_order,
      id
    );

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json({ message: 'Kategori güncellendi.', category: updated });
  } catch (err) {
    console.error('Kategori güncelleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/menu/categories/:id - Kategori sil
router.delete('/categories/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const cat = db.prepare(
      'SELECT * FROM categories WHERE id = ? AND restaurant_id = ?'
    ).get(id, req.restaurantId);

    if (!cat) {
      return res.status(404).json({ error: 'Kategori bulunamadı.' });
    }

    // İçindeki ürünleri pasife al
    db.prepare('UPDATE menu_items SET active = 0 WHERE category_id = ?').run(id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    res.json({ message: 'Kategori silindi.' });
  } catch (err) {
    console.error('Kategori silme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/menu/items - Ürün oluştur
router.post('/items', authMiddleware, (req, res) => {
  try {
    const { category_id, name, price, name_en, name_ar, image_url, is_special, special_discount } = req.body;

    if (!category_id || !name || price === undefined) {
      return res.status(400).json({ error: 'Kategori, ürün adı ve fiyat gereklidir.' });
    }

    const db = getDb();

    const category = db.prepare(
      'SELECT * FROM categories WHERE id = ? AND restaurant_id = ?'
    ).get(category_id, req.restaurantId);

    if (!category) {
      return res.status(404).json({ error: 'Kategori bulunamadı.' });
    }

    const result = db.prepare(
      'INSERT INTO menu_items (restaurant_id, category_id, name, price, name_en, name_ar, image_url, is_special, special_discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.restaurantId, category_id, name, price, name_en || '', name_ar || '', image_url || null, is_special ? 1 : 0, special_discount || 0);

    const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ message: 'Ürün oluşturuldu.', item });
  } catch (err) {
    console.error('Ürün oluşturma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PATCH /api/menu/items/:id/toggle — Stok aç/kapat (quick toggle)
router.patch('/items/:id/toggle', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const item = db.prepare(
      'SELECT * FROM menu_items WHERE id = ? AND restaurant_id = ?'
    ).get(id, req.restaurantId);
    if (!item) return res.status(404).json({ error: 'Ürün bulunamadı.' });

    const newActive = item.active ? 0 : 1;
    db.prepare('UPDATE menu_items SET active = ? WHERE id = ?').run(newActive, id);
    res.json({ active: newActive });
  } catch (err) {
    console.error('Toggle hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/menu/items/:id - Ürün güncelle
router.put('/items/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category_id, active, name_en, name_ar, image_url, is_special, special_discount } = req.body;

    const db = getDb();

    const item = db.prepare(
      'SELECT * FROM menu_items WHERE id = ? AND restaurant_id = ?'
    ).get(id, req.restaurantId);

    if (!item) {
      return res.status(404).json({ error: 'Ürün bulunamadı.' });
    }

    db.prepare(
      'UPDATE menu_items SET name = ?, price = ?, category_id = ?, active = ?, name_en = ?, name_ar = ?, image_url = ?, is_special = ?, special_discount = ? WHERE id = ?'
    ).run(
      name !== undefined ? name : item.name,
      price !== undefined ? price : item.price,
      category_id !== undefined ? category_id : item.category_id,
      active !== undefined ? active : item.active,
      name_en !== undefined ? name_en : (item.name_en || ''),
      name_ar !== undefined ? name_ar : (item.name_ar || ''),
      image_url !== undefined ? image_url : item.image_url,
      is_special !== undefined ? (is_special ? 1 : 0) : item.is_special,
      special_discount !== undefined ? special_discount : item.special_discount,
      id
    );

    const updated = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);

    res.json({ message: 'Ürün güncellendi.', item: updated });
  } catch (err) {
    console.error('Ürün güncelleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/menu/items/:id - Ürünü pasife al (soft delete)
router.delete('/items/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const item = db.prepare(
      'SELECT * FROM menu_items WHERE id = ? AND restaurant_id = ?'
    ).get(id, req.restaurantId);

    if (!item) {
      return res.status(404).json({ error: 'Ürün bulunamadı.' });
    }

    db.prepare('UPDATE menu_items SET active = 0 WHERE id = ?').run(id);

    res.json({ message: 'Ürün pasife alındı.' });
  } catch (err) {
    console.error('Ürün silme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
