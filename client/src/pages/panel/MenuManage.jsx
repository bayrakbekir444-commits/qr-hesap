import React, { useEffect, useState } from 'react';
import api, { formatTL } from '../../utils/api';
import Loading from '../../components/Loading';

export default function MenuManage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [catForm, setCatForm] = useState({ name: '', editId: null });
  const [itemForm, setItemForm] = useState({ name: '', name_en: '', name_ar: '', price: '', categoryId: '', editId: null, image_url: '', is_special: false, special_discount: 0 });
  const [showItemForm, setShowItemForm] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/menu');
      // Backend: [{ id, name, items: [...] }]
      setCategories(res.data);
      const allItems = [];
      res.data.forEach((cat) => {
        (cat.items || []).forEach((it) => allItems.push(it));
      });
      setItems(allItems);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    try {
      if (catForm.editId) {
        await api.put(`/menu/categories/${catForm.editId}`, { name: catForm.name });
      } else {
        await api.post('/menu/categories', { name: catForm.name });
      }
      setCatForm({ name: '', editId: null });
      fetchData();
    } catch { /* ignore */ }
  };

  const handleDeleteCat = async (id) => {
    if (!confirm('Bu kategoriyi silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/menu/categories/${id}`);
      fetchData();
    } catch { /* ignore */ }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim() || !itemForm.price || !itemForm.categoryId) return;
    try {
      const payload = {
        name: itemForm.name,
        name_en: itemForm.name_en || '',
        name_ar: itemForm.name_ar || '',
        price: Number(itemForm.price),
        category_id: Number(itemForm.categoryId),
        image_url: itemForm.image_url || null,
        is_special: itemForm.is_special ? 1 : 0,
        special_discount: Number(itemForm.special_discount) || 0,
      };
      if (itemForm.editId) {
        await api.put(`/menu/items/${itemForm.editId}`, payload);
      } else {
        await api.post('/menu/items', payload);
      }
      setItemForm({ name: '', name_en: '', name_ar: '', price: '', categoryId: '', editId: null, image_url: '', is_special: false, special_discount: 0 });
      setShowItemForm(false);
      fetchData();
    } catch { /* ignore */ }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Bu urunu silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/menu/items/${id}`);
      fetchData();
    } catch { /* ignore */ }
  };

  const editItem = (item) => {
    setItemForm({
      name: item.name,
      name_en: item.name_en || '',
      name_ar: item.name_ar || '',
      price: item.price,
      categoryId: item.categoryId || item.category_id,
      editId: item.id,
      image_url: item.image_url || '',
      is_special: !!item.is_special,
      special_discount: item.special_discount || 0,
    });
    setShowItemForm(true);
  };

  const toggleStock = async (item) => {
    try {
      await api.patch(`/menu/items/${item.id}/toggle`);
      fetchData();
    } catch {}
  };

  if (loading) return <Loading />;

  return (
    <div className="menu-manage">
      <h1 className="panel-page-title">Menu Yonetimi</h1>

      {/* Categories Section */}
      <div className="panel-card">
        <h3>Kategoriler</h3>
        <form className="inline-form" onSubmit={handleCatSubmit}>
          <input
            type="text"
            placeholder="Kategori adi"
            value={catForm.name}
            onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
          />
          <button type="submit" className="btn btn-accent btn-sm">
            {catForm.editId ? 'Guncelle' : 'Ekle'}
          </button>
          {catForm.editId && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCatForm({ name: '', editId: null })}>
              Iptal
            </button>
          )}
        </form>
        <div className="tag-list">
          {categories.map((cat) => (
            <div key={cat.id} className="tag-item">
              <span>{cat.name}</span>
              <div className="tag-actions">
                <button onClick={() => setCatForm({ name: cat.name, editId: cat.id })} className="btn-icon" title="Duzenle">&#9998;</button>
                <button onClick={() => handleDeleteCat(cat.id)} className="btn-icon danger" title="Sil">&#10005;</button>
              </div>
            </div>
          ))}
          {categories.length === 0 && <p className="empty-text">Henuz kategori eklenmemis.</p>}
        </div>
      </div>

      {/* Menu Items Section */}
      <div className="panel-card">
        <div className="card-header-row">
          <h3>Menu Urunleri</h3>
          <button className="btn btn-accent btn-sm" onClick={() => {
            setItemForm({ name: '', price: '', categoryId: categories[0]?.id || '', editId: null });
            setShowItemForm(!showItemForm);
          }}>
            {showItemForm ? 'Kapat' : '+ Yeni Urun'}
          </button>
        </div>

        {showItemForm && (
          <form className="item-form" onSubmit={handleItemSubmit}>
            <div className="form-group">
              <label>Ürün Adı (TR)</label>
              <input
                type="text"
                placeholder="Adana Kebap"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Ürün Adı (EN)</label>
                <input
                  type="text"
                  placeholder="Adana Kebab"
                  value={itemForm.name_en}
                  onChange={(e) => setItemForm({ ...itemForm, name_en: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Ürün Adı (AR)</label>
                <input
                  type="text"
                  placeholder="كباب أضنة"
                  value={itemForm.name_ar}
                  onChange={(e) => setItemForm({ ...itemForm, name_ar: e.target.value })}
                  dir="rtl"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Fiyat (kuruş)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="4500 (= 45₺)"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Kategori</label>
                <select
                  value={itemForm.categoryId}
                  onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                >
                  <option value="">Secin</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Fotoğraf URL (opsiyonel)</label>
              <input
                type="url"
                placeholder="https://.../yemek.jpg"
                value={itemForm.image_url}
                onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="is_special"
                  checked={itemForm.is_special}
                  onChange={(e) => setItemForm({ ...itemForm, is_special: e.target.checked })}
                />
                <label htmlFor="is_special" style={{ margin: 0, cursor: 'pointer' }}>
                  ⭐ Günün Özel Yemeği
                </label>
              </div>
              {itemForm.is_special && (
                <div className="form-group">
                  <label>İndirim (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    placeholder="10"
                    value={itemForm.special_discount}
                    onChange={(e) => setItemForm({ ...itemForm, special_discount: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-accent btn-sm">
                {itemForm.editId ? 'Guncelle' : 'Ekle'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowItemForm(false)}>
                Iptal
              </button>
            </div>
          </form>
        )}

        {categories.map((cat) => {
          const catItems = items.filter((it) => (it.categoryId || it.category_id) === cat.id);
          if (catItems.length === 0) return null;
          return (
            <div key={cat.id} className="menu-category-section">
              <h4 className="menu-category-title">{cat.name}</h4>
              <table className="panel-table">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Fiyat</th>
                    <th>Durum</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map((item) => (
                    <tr key={item.id} style={!item.active ? { opacity: 0.5 } : {}}>
                      <td>
                        {item.image_url && (
                          <img src={item.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, marginRight: 8, verticalAlign: 'middle' }} />
                        )}
                        {item.name}
                        {item.is_special ? <span style={{ marginLeft: 6, color: '#d97706' }}>⭐</span> : null}
                      </td>
                      <td>{formatTL(item.price)}</td>
                      <td>
                        <button
                          onClick={() => toggleStock(item)}
                          style={{
                            background: item.active ? '#dcfce7' : '#fee2e2',
                            color: item.active ? '#166534' : '#991b1b',
                            border: 'none',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}>
                          {item.active ? '✓ Stokta' : '✕ Tükendi'}
                        </button>
                      </td>
                      <td>
                        <button className="btn-icon" onClick={() => editItem(item)} title="Duzenle">&#9998;</button>
                        <button className="btn-icon danger" onClick={() => handleDeleteItem(item.id)} title="Sil">&#10005;</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {items.length === 0 && <p className="empty-text">Henuz urun eklenmemis.</p>}
      </div>
    </div>
  );
}
