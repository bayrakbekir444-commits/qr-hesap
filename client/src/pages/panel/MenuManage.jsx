import React, { useEffect, useState } from 'react';
import api, { formatTL } from '../../utils/api';
import Loading from '../../components/Loading';

export default function MenuManage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [catForm, setCatForm] = useState({ name: '', editId: null });
  const [itemForm, setItemForm] = useState({ name: '', name_en: '', name_ar: '', price: '', categoryId: '', editId: null, image_url: '', is_special: false, special_discount: 0, stock_count: '' });
  const [showItemForm, setShowItemForm] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [stockEdits, setStockEdits] = useState({}); // { itemId: 'value' }

  // Drag-drop state
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const fetchData = async () => {
    try {
      const res = await api.get('/menu');
      setCategories(res.data);
      const allItems = [];
      res.data.forEach((cat) => {
        (cat.items || []).forEach((it) => allItems.push(it));
      });
      setItems(allItems);
      setActiveCategoryId((prev) => {
        if (prev && res.data.some((c) => c.id === prev)) return prev;
        return res.data[0]?.id || null;
      });
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
      const stockVal = itemForm.stock_count === '' || itemForm.stock_count === null
        ? null
        : Number(itemForm.stock_count);
      const payload = {
        name: itemForm.name,
        name_en: itemForm.name_en || '',
        name_ar: itemForm.name_ar || '',
        price: Number(itemForm.price),
        category_id: Number(itemForm.categoryId),
        image_url: itemForm.image_url || null,
        is_special: itemForm.is_special ? 1 : 0,
        special_discount: Number(itemForm.special_discount) || 0,
        stock_count: stockVal,
      };
      if (itemForm.editId) {
        await api.put(`/menu/items/${itemForm.editId}`, payload);
      } else {
        await api.post('/menu/items', payload);
      }
      setItemForm({ name: '', name_en: '', name_ar: '', price: '', categoryId: '', editId: null, image_url: '', is_special: false, special_discount: 0, stock_count: '' });
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
      stock_count: item.stock_count == null ? '' : String(item.stock_count),
    });
    setShowItemForm(true);
  };

  const toggleStock = async (item) => {
    try {
      await api.patch(`/menu/items/${item.id}/toggle`);
      fetchData();
    } catch {}
  };

  const saveStockCount = async (item) => {
    const raw = stockEdits[item.id];
    if (raw === undefined) return;
    const trimmed = String(raw).trim();
    let value;
    if (trimmed === '' || trimmed === '∞') {
      value = null; // sınırsız
    } else {
      const parsed = parseInt(trimmed, 10);
      if (!Number.isFinite(parsed) || parsed < 0) return;
      value = parsed;
    }
    try {
      await api.put(`/menu/items/${item.id}`, { stock_count: value });
      setStockEdits((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      fetchData();
    } catch {}
  };

  const clearStock = async (item) => {
    try {
      await api.put(`/menu/items/${item.id}`, { stock_count: null });
      fetchData();
    } catch {}
  };

  // Kategori drag-drop handlers
  const handleDragStart = (e, id) => {
    setDragId(id);
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(id));
    } catch {}
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    if (dragOverId !== id) setDragOverId(id);
    try { e.dataTransfer.dropEffect = 'move'; } catch {}
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    const sourceId = dragId;
    setDragId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === targetId) return;

    const ids = categories.map((c) => c.id);
    const fromIdx = ids.indexOf(sourceId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    const newOrder = [...ids];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, sourceId);

    // Optimistic update
    const newCategories = newOrder.map((id) => categories.find((c) => c.id === id)).filter(Boolean);
    setCategories(newCategories);

    try {
      await api.put('/menu/categories/reorder', { order: newOrder });
      // Sunucudan tekrar fetch (opsiyonel)
      fetchData();
    } catch {
      // Hata olursa eski sıralamaya dön
      fetchData();
    }
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  if (loading) return <Loading />;

  const activeItems = items.filter((it) => (it.categoryId || it.category_id) === activeCategoryId);

  const categoryEmoji = (name = '') => {
    const n = name.toLocaleLowerCase('tr');
    if (n.includes('kebap') || n.includes('et')) return '🍖';
    if (n.includes('çorba') || n.includes('corba')) return '🍲';
    if (n.includes('salata')) return '🥗';
    if (n.includes('tatlı') || n.includes('tatli')) return '🍰';
    if (n.includes('içecek') || n.includes('icecek') || n.includes('drink')) return '🥤';
    if (n.includes('pizza')) return '🍕';
    if (n.includes('burger') || n.includes('fast')) return '🥙';
    if (n.includes('kahve') || n.includes('coffee')) return '☕';
    return '🍽️';
  };

  const renderStockBadge = (item) => {
    if (item.stock_count == null) {
      return <span className="stock-badge stock-infinite" title="Sınırsız stok">∞ Sınırsız</span>;
    }
    const n = Number(item.stock_count);
    let cls = 'stock-badge stock-ok';
    if (n <= 0) cls = 'stock-badge stock-out';
    else if (n < 5) cls = 'stock-badge stock-critical';
    else if (n < 10) cls = 'stock-badge stock-low';
    return <span className={cls}>{n} adet</span>;
  };

  return (
    <div className="menu-manage">
      <div className="mm-page-header">
        <h1 className="panel-page-title">Menu Yonetimi</h1>
        <button className="btn btn-accent btn-sm" onClick={() => {
          setItemForm({ name: '', name_en: '', name_ar: '', price: '', categoryId: activeCategoryId || categories[0]?.id || '', editId: null, image_url: '', is_special: false, special_discount: 0, stock_count: '' });
          setShowItemForm(!showItemForm);
        }}>
          {showItemForm ? 'Kapat' : '+ Yeni Urun'}
        </button>
      </div>

      {showItemForm && (
        <div className="panel-card">
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
            <div className="form-group">
              <label>Stok (boş = sınırsız)</label>
              <input
                type="number"
                min="0"
                placeholder="örn: 25 (boş bırakırsanız sınırsız stok)"
                value={itemForm.stock_count}
                onChange={(e) => setItemForm({ ...itemForm, stock_count: e.target.value })}
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
        </div>
      )}

      <div className="mm-container">
        <aside className="mm-sidebar">
          <h2>Menü</h2>
          <div className="mm-cat-hint">İpucu: Kategorileri sürükleyerek sıralayabilirsiniz</div>
          <form className="mm-cat-form" onSubmit={handleCatSubmit}>
            <input
              type="text"
              placeholder="Kategori adı"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
            />
            <button type="submit">{catForm.editId ? '✓' : '+'}</button>
            {catForm.editId && (
              <button type="button" onClick={() => setCatForm({ name: '', editId: null })}>✕</button>
            )}
          </form>
          <ul className="mm-cat-list">
            {categories.map((cat) => {
              const isDragging = dragId === cat.id;
              const isOver = dragOverId === cat.id && dragId !== null && dragId !== cat.id;
              const cls = [
                cat.id === activeCategoryId ? 'active' : '',
                isDragging ? 'dragging' : '',
                isOver ? 'drag-over' : '',
              ].filter(Boolean).join(' ');
              return (
                <li
                  key={cat.id}
                  className={cls}
                  draggable
                  onDragStart={(e) => handleDragStart(e, cat.id)}
                  onDragOver={(e) => handleDragOver(e, cat.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, cat.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setActiveCategoryId(cat.id)}
                  style={{
                    opacity: isDragging ? 0.4 : 1,
                    cursor: 'grab',
                  }}
                >
                  <span className="mm-cat-drag" title="Sürükleyin">⋮⋮</span>
                  <span className="mm-cat-name">
                    <span className="mm-cat-emoji">{categoryEmoji(cat.name)}</span>
                    {cat.name}
                  </span>
                  <span className="mm-cat-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="mm-cat-icon" onClick={() => setCatForm({ name: cat.name, editId: cat.id })} title="Düzenle">✎</button>
                    <button className="mm-cat-icon danger" onClick={() => handleDeleteCat(cat.id)} title="Sil">✕</button>
                  </span>
                </li>
              );
            })}
            {categories.length === 0 && <li className="mm-cat-empty">Henüz kategori yok</li>}
          </ul>
        </aside>

        <section className="mm-area">
          {activeItems.length === 0 ? (
            <div className="mm-empty">
              {categories.length === 0
                ? 'Önce sol taraftan bir kategori ekleyin.'
                : 'Bu kategoride henüz ürün yok. "+ Yeni Ürün" ile ekleyin.'}
            </div>
          ) : (
            activeItems.map((item) => {
              const fallbackImg = `https://loremflickr.com/400/300/${encodeURIComponent((item.name || 'food') + ',food')}?lock=${item.id}`;
              const imgSrc = item.image_url || fallbackImg;
              const stockEditValue = stockEdits[item.id] !== undefined
                ? stockEdits[item.id]
                : (item.stock_count == null ? '' : String(item.stock_count));
              return (
              <div key={item.id} className={`card ${!item.active ? 'inactive' : ''}`}>
                <div className="card-img-wrap">
                  <img
                    src={imgSrc}
                    alt={item.name}
                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                  />
                  <div className="card-placeholder" style={{ display: 'none' }}>{(item.name || '?').charAt(0).toUpperCase()}</div>
                  {item.is_special ? <span className="card-badge">⭐</span> : null}
                </div>
                <div className="card-content">
                  <div className="card-title">{item.name}</div>
                  <div className="card-price">{formatTL(item.price)}</div>
                  <div className="card-stock-row">
                    {renderStockBadge(item)}
                  </div>
                  <div className="card-stock-edit">
                    <input
                      type="number"
                      min="0"
                      placeholder="Stok (boş = ∞)"
                      value={stockEditValue}
                      onChange={(e) => setStockEdits({ ...stockEdits, [item.id]: e.target.value })}
                      onBlur={() => {
                        if (stockEdits[item.id] !== undefined) saveStockCount(item);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); saveStockCount(item); }
                      }}
                    />
                    {item.stock_count != null && (
                      <button
                        type="button"
                        className="btn-icon"
                        title="Sınırsız stok yap"
                        onClick={() => clearStock(item)}
                      >
                        ∞
                      </button>
                    )}
                  </div>
                  <div className="card-actions">
                    <button
                      onClick={() => toggleStock(item)}
                      className={`mm-stock ${item.active ? 'active' : ''}`}
                    >
                      {item.active ? '✓ Stokta' : '✕ Tükendi'}
                    </button>
                    <button className="btn-icon" onClick={() => editItem(item)} title="Duzenle">&#9998;</button>
                    <button className="btn-icon danger" onClick={() => handleDeleteItem(item.id)} title="Sil">&#10005;</button>
                  </div>
                </div>
              </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
