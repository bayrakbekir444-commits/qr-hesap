import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { formatTL } from '../../utils/api';
import Loading from '../../components/Loading';
import BrandingFooter from '../../components/BrandingFooter';

const LANGUAGES = [
  { code: 'tr', label: 'TR' },
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'AR' },
];

const I18N = {
  tr: {
    callWaiter: 'Garson Çağır', waiterCalled: 'Garson Çağrıldı',
    myOrder: 'Siparişlerim', total: 'Toplam', closeBill: '💳 Hesabı Kapat / Öde',
    loading: 'Menü yükleniyor...', empty: 'Menü henüz yüklenmedi.',
    search: 'Ürün ara...', urun: 'ürün', portion: 'Porsiyon nasıl olsun?',
    less: 'Az', normal: 'Normal', more: 'Çok', cancel: 'İptal',
    items: 'ürün', myPoints: 'Sadakat Puanım', orderAdded: 'Sipariş eklendi!',
    addError: 'Ürün eklenemedi.',
  },
  en: {
    callWaiter: 'Call Waiter', waiterCalled: 'Waiter Called',
    myOrder: 'My Order', total: 'Total', closeBill: '💳 Close Bill / Pay',
    loading: 'Loading menu...', empty: 'Menu not loaded yet.',
    search: 'Search items...', urun: 'items', portion: 'Portion size?',
    less: 'Less', normal: 'Normal', more: 'More', cancel: 'Cancel',
    items: 'items', myPoints: 'My Loyalty Points', orderAdded: 'Order added!',
    addError: 'Could not add.',
  },
  ar: {
    callWaiter: 'اتصل بالنادل', waiterCalled: 'تم استدعاء النادل',
    myOrder: 'طلبي', total: 'المجموع', closeBill: '💳 إغلاق الفاتورة / دفع',
    loading: 'جاري التحميل...', empty: 'القائمة لم تُحمَّل بعد.',
    search: 'ابحث عن منتج...', urun: 'منتجات', portion: 'حجم الحصة؟',
    less: 'قليل', normal: 'عادي', more: 'كثير', cancel: 'إلغاء',
    items: 'منتجات', myPoints: 'نقاط الولاء', orderAdded: 'تمت الإضافة!',
    addError: 'تعذرت الإضافة.',
  },
};

const t = (key, lang) => (I18N[lang] || I18N.tr)[key] || I18N.tr[key] || key;

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

function getCategoryName(cat, lang) {
  if (lang === 'en' && cat.name_en) return cat.name_en;
  if (lang === 'ar' && cat.name_ar) return cat.name_ar;
  return cat.name;
}

export default function MenuView() {
  const { menuQrToken } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('qr_hesap_lang') || 'tr');
  const [orderItems, setOrderItems] = useState([]);
  const [orderOpen, setOrderOpen] = useState(false);
  const [soupModal, setSoupModal] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('qr_hesap_mv_theme') || 'dark');
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [loyaltyPhone, setLoyaltyPhone] = useState(() => localStorage.getItem('qr_hesap_loyalty_phone') || '');
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  // KVKK açık rıza — telefon daha önce kaydedildiyse rıza zaten verilmiş demek
  const [loyaltyConsent, setLoyaltyConsent] = useState(() => !!localStorage.getItem('qr_hesap_loyalty_phone'));

  useEffect(() => {
    localStorage.setItem('qr_hesap_mv_theme', theme);
  }, [theme]);

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

  const fetchLoyalty = async () => {
    if (!loyaltyPhone.trim() || !loyaltyConsent) return;
    setLoyaltyLoading(true);
    try {
      const res = await api.get(`/loyalty/${loyaltyPhone.trim()}`);
      setLoyaltyData(res.data);
      localStorage.setItem('qr_hesap_loyalty_phone', loyaltyPhone.trim());
    } catch {
      setLoyaltyData({ member: null, transactions: [] });
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = `${data?.table?.restaurant_name || 'Restoran'} — Menü`;
    const text = `${title}\nQR Hesap ile menüye göz at:`;
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link kopyalandı! 📋');
    } catch {
      showToast('Paylaşım desteklenmiyor.');
    }
  };

  if (loading) return <Loading text={t('loading', lang)} />;

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
  const tableName = data?.table?.name || data?.tableName || `Masa ${data?.table?.table_number || data?.table?.number || ''}`.trim();
  const restaurantName = data?.table?.restaurant_name || data?.restaurant?.name || data?.restaurantName || 'Restoran';
  const restaurantLogo = data?.table?.restaurant_logo || data?.restaurant?.logo_url;

  // Backend iki format dönebilir:
  // 1) [{ id, name, items: [...] }]  (kategori objeleri)
  // 2) [{ id, name, price, category, ... }]  (flat item listesi)
  const isCategoryFormat = menu.length > 0 && Array.isArray(menu[0]?.items);

  // Kategori objesini key olarak tut, böylece dil değişimi çalışır
  const categoryObjects = isCategoryFormat
    ? menu.filter((c) => (c.items || []).some((it) => it.active !== 0))
    : [{ name: 'Diğer', items: menu }];

  const menuByCategory = categoryObjects.reduce((acc, cat) => {
    acc[cat.name] = (cat.items || []).filter((it) => it.active !== 0);
    return acc;
  }, {});

  const categoryNames = categoryObjects.map((c) => c.name);
  const getCatLabel = (catName) => {
    const obj = categoryObjects.find((c) => c.name === catName);
    return obj ? getCategoryName(obj, lang) : catName;
  };
  const orderTotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const orderCount = orderItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className={`customer-page mv-theme-${theme}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="customer-container">
        {/* Toast */}
        {toast && <div className="toast-notification">{toast}</div>}

        {/* Top bar: loyalty + share + theme */}
        <div className="mv-topbar">
          <button
            className="mv-theme-btn"
            onClick={() => { setLoyaltyOpen(true); if (loyaltyPhone) fetchLoyalty(); }}
            aria-label="Puanım"
            title="Puanım"
          >
            🎁
          </button>
          <button
            className="mv-theme-btn"
            onClick={handleShare}
            aria-label="Paylaş"
            title="Menüyü paylaş"
          >
            📤
          </button>
          <button
            className="mv-theme-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Tema değiştir"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

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
          {restaurantLogo ? (
            <img src={restaurantLogo} alt={restaurantName} className="restaurant-logo-img" />
          ) : (
            <div className="restaurant-badge">
              <span className="restaurant-icon">&#9733;</span>
            </div>
          )}
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
          <span>{waiterCalled ? t('waiterCalled', lang) : t('callWaiter', lang)}</span>
        </button>

        {/* Search box */}
        {categoryNames.length > 0 && (
          <div className="mv-search-wrap">
            <span className="mv-search-icon">🔍</span>
            <input
              type="search"
              className="mv-search"
              placeholder={t('search', lang)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="mv-search-clear" onClick={() => setSearch('')}>×</button>
            )}
          </div>
        )}

        {/* Category tabs — sadece aktif kategori gösterilir (arama yokken) */}
        {!search.trim() && categoryNames.length > 0 && (
          <div className="mv-cat-tabs">
            {categoryNames.map((category) => (
              <button
                key={category}
                className={`mv-cat-tab ${(activeTab || categoryNames[0]) === category ? 'active' : ''}`}
                onClick={() => setActiveTab(category)}
              >
                {getCatLabel(category)}
              </button>
            ))}
          </div>
        )}

        {/* Menu — arama varsa tüm kategorilerde filtre, yoksa sadece seçili */}
        {categoryNames.length === 0 ? (
          <div className="empty-state">
            <p>{t('empty', lang)}</p>
          </div>
        ) : (
          <div className="mv-menu">
            {(search.trim()
              ? categoryNames.filter((cat) =>
                  menuByCategory[cat].some((it) =>
                    (getItemName(it, lang) || '').toLowerCase().includes(search.trim().toLowerCase())
                  )
                )
              : categoryNames.filter((c) => c === (activeTab || categoryNames[0]))
            ).map((category) => (
              <div key={category} className="mv-category">
                <div className="mv-category-header">
                  <span className="mv-category-name">{getCatLabel(category)}</span>
                  <span className="mv-category-count">{menuByCategory[category].length} {t('urun', lang)}</span>
                </div>
                <div className="mv-items">
                  {menuByCategory[category]
                    .filter((it) =>
                      !search.trim() ||
                      (getItemName(it, lang) || '').toLowerCase().includes(search.trim().toLowerCase())
                    )
                    .map((item) => {
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
                          {!!item.is_special && (
                            <span className="mv-special-badge">⭐ Şefin Önerisi</span>
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
                <span className="mv-order-toggle-text">{t('myOrder', lang)}</span>
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
                  <span>{t('total', lang)}</span>
                  <span className="mv-order-total-amount">{formatTL(orderTotal)}</span>
                </div>
                <button
                  className="mv-checkout-btn"
                  onClick={() => {
                    const payToken = data?.table?.payment_qr_token;
                    if (payToken) {
                      navigate(`/pay/${payToken}`);
                    } else {
                      showToast('Ödeme şu an kullanılamıyor.');
                    }
                  }}
                >
                  {t('closeBill', lang)}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="powered-by">QR Hesap ile siparis sistemi</div>

        {/* Sadakat puanı modalı */}
        {loyaltyOpen && (
          <div className="soup-modal-overlay" onClick={() => setLoyaltyOpen(false)}>
            <div className="soup-modal loyalty-modal" onClick={(e) => e.stopPropagation()}>
              <h3>🎁 Sadakat Puanım</h3>
              {!loyaltyData ? (
                <>
                  <p className="soup-modal-q">Telefon numaranız ile puanınızı sorgulayın</p>
                  <input
                    type="tel"
                    className="loyalty-phone-input"
                    placeholder="05XX XXX XX XX"
                    value={loyaltyPhone}
                    onChange={(e) => setLoyaltyPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loyaltyConsent && fetchLoyalty()}
                  />
                  <label className="loyalty-consent">
                    <input
                      type="checkbox"
                      checked={loyaltyConsent}
                      onChange={(e) => setLoyaltyConsent(e.target.checked)}
                    />
                    <span>
                      Telefon numaramın sadakat puanı amacıyla işlenmesine onay veriyorum.{' '}
                      <a href="/yasal/kvkk" target="_blank" rel="noreferrer">KVKK Aydınlatma Metni</a>
                    </span>
                  </label>
                  <button
                    className="lp-btn lp-btn-primary"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                    onClick={fetchLoyalty}
                    disabled={loyaltyLoading || !loyaltyPhone.trim() || !loyaltyConsent}
                  >
                    {loyaltyLoading ? 'Yükleniyor...' : 'Sorgula'}
                  </button>
                </>
              ) : !loyaltyData.member ? (
                <>
                  <p className="soup-modal-q">Henüz puanınız yok. Bu numarayla ilk siparişinizi verince puan kazanmaya başlayacaksınız!</p>
                  <button
                    className="soup-modal-cancel"
                    onClick={() => { setLoyaltyData(null); }}
                  >Geri</button>
                </>
              ) : (
                <>
                  <div className="loyalty-points-box">
                    <div className="loyalty-points-num">{loyaltyData.member.points}</div>
                    <div className="loyalty-points-label">PUAN</div>
                  </div>
                  <p className="soup-modal-q">Toplam harcama: {((loyaltyData.member.total_spent || 0) / 100).toFixed(2)} ₺</p>
                  {loyaltyData.transactions?.length > 0 && (
                    <div className="loyalty-tx-list">
                      <div className="loyalty-tx-title">Son işlemler</div>
                      {loyaltyData.transactions.slice(0, 5).map((tx) => (
                        <div key={tx.id} className="loyalty-tx-row">
                          <span>{tx.type === 'earn' ? '➕' : '➖'} {tx.points} puan</span>
                          <span style={{ opacity: 0.6, fontSize: 12 }}>{new Date(tx.created_at).toLocaleDateString('tr-TR')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              <button
                className="soup-modal-cancel"
                onClick={() => { setLoyaltyOpen(false); }}
                style={{ marginTop: 12 }}
              >Kapat</button>
            </div>
          </div>
        )}

        {/* Çorba porsiyon modalı */}
        {soupModal && (
          <div className="soup-modal-overlay" onClick={() => setSoupModal(null)}>
            <div className="soup-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{getItemName(soupModal.item, lang)}</h3>
              <p className="soup-modal-q">{t('portion', lang)}</p>
              <div className="soup-modal-options">
                <button onClick={() => handleSoupChoice('Az')}>🥄 {t('less', lang)}</button>
                <button onClick={() => handleSoupChoice('Normal')}>🍲 {t('normal', lang)}</button>
                <button onClick={() => handleSoupChoice('Çok')}>🍜 {t('more', lang)}</button>
              </div>
              <button className="soup-modal-cancel" onClick={() => setSoupModal(null)}>{t('cancel', lang)}</button>
            </div>
          </div>
        )}
      </div>
      <BrandingFooter hide={data?.table?.hide_branding} />
    </div>
  );
}
