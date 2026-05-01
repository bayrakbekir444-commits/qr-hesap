import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api, { formatTL } from '../../utils/api';
import Loading from '../../components/Loading';

const LANGUAGES = [
  { code: 'tr', label: 'TR' },
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'AR' },
];

function getItemName(item, lang) {
  if (lang === 'en' && item.name_en) return item.name_en;
  if (lang === 'ar' && item.name_ar) return item.name_ar;
  return item.name;
}

function getItemDesc(item, lang) {
  if (lang === 'en' && item.description_en) return item.description_en;
  if (lang === 'ar' && item.description_ar) return item.description_ar;
  return item.description;
}

export default function MenuView() {
  const { menuQrToken } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('qr_hesap_lang') || 'tr');
  const [orderItems, setOrderItems] = useState([]);
  const [orderOpen, setOrderOpen] = useState(false);
  const [soupModal, setSoupModal] = useState(null);

  const handleLangChange = (code) => {
    setLang(code);
    localStorage.setItem('qr_hesap_lang', code);
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const fetchData = useCallback(() => {
    return api
      .get(`/tables/menu/${menuQrToken}/public`)
      .then((res) => {
        setData(res.data);
        const items = res.data?.order?.items || res.data?.items || [];
        setOrderItems(items);
      })
      .catch((err) => setError(err.response?.data?.error || 'Menu bilgisi alinamadi.'));
  }, [menuQrToken]);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleCallWaiter = async () => {
    if (waiterCalled) return;
    const tableId = data?.table?.id || data?.tableId;
    try {
      await api.post('/waiter/call', { table_id: tableId });
      setWaiterCalled(true);
      showToast('Garson cagrildi!');
      setTimeout(() => setWaiterCalled(false), 3000);
    } catch {
      showToast('Bir hata olustu, tekrar deneyin.');
    }
  };

  const isSoup = (name) => /çorba|corba|soup/i.test(name || '');

  const handleAddItem = async (menuItem, note = null, askedSoup = false) => {
    // Çorba ise ve henüz porsiyon sorulmadıysa modal aç
    if (isSoup(menuItem.name) && !askedSoup) {
      setSoupModal({ item: menuItem });
      return;
    }
    try {
      await api.post(`/orders/menu/${menuQrToken}/items`, {
        items: [{
          menu_item_id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
          note: note || undefined,
        }],
      });
      showToast(note ? `Siparis eklendi: ${note}` : 'Siparis eklendi!');
      await fetchData();
    } catch {
      showToast('Urun eklenemedi.');
    }
  };

  const handleSoupChoice = (porsiyon) => {
    if (soupModal?.item) {
      handleAddItem(soupModal.item, porsiyon, true);
    }
    setSoupModal(null);
  };

  if (loading) return <Loading text="Menu yukleniyor..." />;

  if (error) {
    return (
      <div className="customer-page">
        <div className="customer-container">
          <div className="error-card">
            <div className="error-icon">!</div>
            <h2>Hata</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const menu = data?.menu || data?.restaurant?.menu || [];
  const tableName = data?.table?.name || data?.tableName || `Masa ${data?.table?.number || ''}`;
  const restaurantName = data?.restaurant?.name || data?.restaurantName || 'Restoran';

  // Backend iki format dönebilir:
  // 1) [{ id, name, items: [...] }]  (kategori objeleri)
  // 2) [{ id, name, price, category, ... }]  (flat item listesi)
  const isCategoryFormat = menu.length > 0 && Array.isArray(menu[0]?.items);

  const menuByCategory = isCategoryFormat
    ? menu.reduce((acc, cat) => {
        acc[cat.name] = (cat.items || []).filter((it) => it.active !== 0);
        return acc;
      }, {})
    : menu.reduce((acc, item) => {
        const cat = item.category || 'Diger';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {});

  const categoryNames = isCategoryFormat
    ? menu.map((c) => c.name).filter((n) => menuByCategory[n] && menuByCategory[n].length > 0)
    : Object.keys(menuByCategory);
  const orderTotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const orderCount = orderItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="customer-page">
      <div className="customer-container">
        {/* Toast */}
        {toast && <div className="toast-notification">{toast}</div>}

        {/* Language toggle */}
        <div className="lang-toggle">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className={`lang-btn ${lang === l.code ? 'active' : ''}`}
              onClick={() => handleLangChange(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="customer-header">
          <div className="restaurant-badge">
            <span className="restaurant-icon">&#9733;</span>
          </div>
          <h1 className="restaurant-name">{restaurantName}</h1>
          <div className="table-badge">{tableName}</div>
        </div>

        {/* Waiter call */}
        <button
          className={`waiter-call-btn ${waiterCalled ? 'called' : ''}`}
          onClick={handleCallWaiter}
          disabled={waiterCalled}
        >
          <span className="waiter-call-icon">&#128276;</span>
          <span>{waiterCalled ? 'Garson Cagrildi' : 'Garson Cagir'}</span>
        </button>

        {/* Category quick-jump tabs */}
        {categoryNames.length > 1 && (
          <div className="mv-cat-tabs">
            {categoryNames.map((category) => (
              <button
                key={category}
                className="mv-cat-tab"
                onClick={() => {
                  const el = document.getElementById(`cat-${category}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {/* Menu */}
        {categoryNames.length === 0 ? (
          <div className="empty-state">
            <p>Menu henuz yuklenmedi.</p>
          </div>
        ) : (
          <div className="mv-menu">
            {categoryNames.map((category) => (
              <div key={category} id={`cat-${category}`} className="mv-category">
                <div className="mv-category-header">
                  <span className="mv-category-name">{category}</span>
                  <span className="mv-category-count">{menuByCategory[category].length} urun</span>
                </div>
                <div className="mv-items">
                  {menuByCategory[category].map((item) => {
                    const fallbackImg = `https://loremflickr.com/400/300/${encodeURIComponent((item.name || 'food') + ',food')}?lock=${item.id}`;
                    const imgSrc = item.image_url || fallbackImg;
                    const stock = item.stock_count;
                    const lowStock = stock != null && stock > 0 && stock < 5;
                    return (
                      <div key={item.id} className="mv-food-card">
                        <div className="mv-food-image">
                          <img
                            src={imgSrc}
                            alt={getItemName(item, lang)}
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                          />
                          <div className="mv-food-image-placeholder" style={{ display: 'none' }}>
                            {(getItemName(item, lang) || '?').charAt(0).toUpperCase()}
                          </div>
                          {lowStock && (
                            <span className="mv-low-stock-badge">Son {stock} adet!</span>
                          )}
                        </div>
                        <div className="mv-food-body">
                          <span className="mv-food-name">{getItemName(item, lang)}</span>
                          {getItemDesc(item, lang) && (
                            <span className="mv-food-desc">{getItemDesc(item, lang)}</span>
                          )}
                          <div className="mv-food-row">
                            <span className="mv-food-price">{formatTL(item.price)}</span>
                            <button
                              className="mv-add-btn"
                              onClick={() => handleAddItem(item)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order summary at bottom */}
        {orderItems.length > 0 && (
          <div className="mv-order-summary">
            <button
              className="mv-order-toggle"
              onClick={() => setOrderOpen(!orderOpen)}
            >
              <div className="mv-order-toggle-left">
                <span className="mv-order-badge">{orderCount}</span>
                <span className="mv-order-toggle-text">Siparislerim</span>
              </div>
              <span className="mv-order-total">{formatTL(orderTotal)}</span>
              <span className={`menu-order-arrow ${orderOpen ? 'open' : ''}`}>&#9660;</span>
            </button>

            {orderOpen && (
              <div className="mv-order-list">
                {orderItems.map((item, i) => {
                  const menuItemId = item.menu_item_id || item.menuItemId;
                  const menuItem = menu.find((m) => m.id === menuItemId);
                  const reorderTarget = menuItem || { id: menuItemId, name: item.name, price: item.unit_price ?? item.price };
                  return (
                  <div key={i} className="mv-order-item">
                    <div className="mv-order-item-left">
                      <span className="mv-order-qty">{item.quantity}x</span>
                      <span className="mv-order-name">{item.name || item.item_name}</span>
                    </div>
                    <div className="mv-order-item-right">
                      <span className="mv-order-price">{formatTL((item.unit_price ?? item.price) * item.quantity)}</span>
                      {menuItemId && (
                        <button
                          className="mv-reorder-btn"
                          onClick={(e) => { e.stopPropagation(); handleAddItem(reorderTarget); }}
                          title="1 tane daha"
                        >
                          +1
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
                <div className="mv-order-total-row">
                  <span>Toplam</span>
                  <span className="mv-order-total-amount">{formatTL(orderTotal)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="powered-by">QR Hesap ile siparis sistemi</div>

        {/* Çorba porsiyon modalı */}
        {soupModal && (
          <div className="soup-modal-overlay" onClick={() => setSoupModal(null)}>
            <div className="soup-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{soupModal.item.name}</h3>
              <p className="soup-modal-q">Porsiyon nasıl olsun?</p>
              <div className="soup-modal-options">
                <button onClick={() => handleSoupChoice('Az')}>🥄 Az</button>
                <button onClick={() => handleSoupChoice('Normal')}>🍲 Normal</button>
                <button onClick={() => handleSoupChoice('Çok')}>🍜 Çok</button>
              </div>
              <button className="soup-modal-cancel" onClick={() => setSoupModal(null)}>İptal</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
