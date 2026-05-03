import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { formatTL } from '../../utils/api';
import BillSummary from '../../components/BillSummary';
import Loading from '../../components/Loading';

const LANGUAGES = [
  { code: 'tr', label: 'TR' },
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'AR' },
];

const I18N = {
  tr: {
    garsonCagir: 'Garson Çağır',
    cagrildi: 'Garson Çağrıldı',
    siparisYok: 'Bu masa için henüz sipariş bulunmuyor.',
    menudenSec: 'Menüden ürün seç — sipariş garsona otomatik iletilir',
    mutfagaIletildi: '✓ Sipariş mutfağa iletildi · Hazırlanıyor',
    hesapDetayi: 'Hesap Detayı',
    toplam: 'Toplam',
    baskaBirSey: 'Başka bir şey istersen menüden ekleyebilirsin. Ödemeyi kalkarken yapabilirsin.',
    kalkiyorum: '💳 Kalkıyorum — Hesabı Kapat',
    tamaminiOde: 'Tamamını Öde',
    hesabiBol: 'Hesabı Böl',
    siparisVer: 'Sipariş Ver',
    degerlendir: '⭐ Değerlendir',
    tesekkurler: '✓ Değerlendirmen için teşekkürler!',
    puan: 'Puan seç.',
    yorum: 'Yorumun (opsiyonel)',
    gonder: 'Gönder',
    tukendi: 'TÜKENDİ',
    nasilHazirlansin: 'Nasıl hazırlansın?',
    sepeteEkle: 'Sepete Ekle',
    iptal: 'İptal',
  },
  en: {
    garsonCagir: 'Call Waiter',
    cagrildi: 'Waiter Called',
    siparisYok: 'No order for this table yet.',
    menudenSec: 'Select an item from the menu — order goes to the waiter automatically',
    mutfagaIletildi: '✓ Order sent to kitchen · Preparing',
    hesapDetayi: 'Bill Details',
    toplam: 'Total',
    baskaBirSey: 'Add more from the menu if you want. You can pay when leaving.',
    kalkiyorum: '💳 Leaving — Close Bill',
    tamaminiOde: 'Pay Full',
    hesabiBol: 'Split Bill',
    siparisVer: 'Order',
    degerlendir: '⭐ Rate Us',
    tesekkurler: '✓ Thanks for your review!',
    puan: 'Select rating.',
    yorum: 'Your comment (optional)',
    gonder: 'Send',
    tukendi: 'SOLD OUT',
    nasilHazirlansin: 'How would you like it?',
    sepeteEkle: 'Add to Cart',
    iptal: 'Cancel',
  },
  ar: {
    garsonCagir: 'اتصل بالنادل',
    cagrildi: 'تم استدعاء النادل',
    siparisYok: 'لا يوجد طلب لهذه الطاولة حتى الآن.',
    menudenSec: 'اختر صنفاً من القائمة — يصل الطلب للنادل تلقائياً',
    mutfagaIletildi: '✓ تم إرسال الطلب للمطبخ · جاري التحضير',
    hesapDetayi: 'تفاصيل الفاتورة',
    toplam: 'الإجمالي',
    baskaBirSey: 'أضف المزيد من القائمة إذا أردت. يمكنك الدفع عند المغادرة.',
    kalkiyorum: '💳 سأغادر — أغلق الفاتورة',
    tamaminiOde: 'ادفع الكل',
    hesabiBol: 'تقسيم الفاتورة',
    siparisVer: 'اطلب',
    degerlendir: '⭐ قيّمنا',
    tesekkurler: '✓ شكراً على تقييمك!',
    puan: 'اختر التقييم.',
    yorum: 'تعليقك (اختياري)',
    gonder: 'إرسال',
    tukendi: 'نفذ',
    nasilHazirlansin: 'كيف تريده؟',
    sepeteEkle: 'أضف إلى السلة',
    iptal: 'إلغاء',
  },
};

const t = (key, lang) => (I18N[lang] || I18N.tr)[key] || I18N.tr[key] || key;

function ReviewBox({ orderId, lang = 'tr' }) {
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [err, setErr] = React.useState('');

  if (!orderId) return null;

  const gonder = async () => {
    setErr('');
    if (!rating) {
      setErr(t('puan', lang));
      return;
    }
    try {
      await api.post('/reviews', { order_id: orderId, rating, comment });
      setSent(true);
    } catch (e) {
      setErr(e.response?.data?.error || 'Gönderilemedi.');
    }
  };

  if (sent) {
    return (
      <div style={{
        background: '#dcfce7',
        color: '#166534',
        padding: '1rem',
        borderRadius: '12px',
        marginTop: '1rem',
        textAlign: 'center',
        fontWeight: 700,
      }}>
        {t('tesekkurler', lang)}
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: '#f3f4f6',
          border: 'none',
          borderRadius: '10px',
          fontWeight: 600,
          cursor: 'pointer',
        }}>
        {t('degerlendir', lang)}
      </button>
      {open && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '10px', marginTop: '0.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                onClick={() => setRating(n)}
                style={{
                  fontSize: '2rem',
                  cursor: 'pointer',
                  color: rating >= n ? '#f59e0b' : '#d1d5db',
                  userSelect: 'none',
                }}>
                ★
              </span>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('yorum', lang)}
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '0.5rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          {err && <div style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.5rem' }}>{err}</div>}
          <button
            onClick={gonder}
            style={{
              width: '100%',
              marginTop: '0.5rem',
              padding: '0.75rem',
              background: '#e94560',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
            }}>
            {t('gonder', lang)}
          </button>
        </div>
      )}
    </div>
  );
}

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

export default function CustomerView() {
  const { qrToken } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [toast, setToast] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('qr_hesap_lang') || 'tr');

  // Not seçim modalı
  const [notModalOpen, setNotModalOpen] = useState(false);
  const [notModalItem, setNotModalItem] = useState(null);
  const [notSecimi, setNotSecimi] = useState({ sogan: '', aci: '', ekstra: [], ek: '' });

  // Loyalty state
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [loyaltyPhone, setLoyaltyPhone] = useState('');
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState(null);
  const [loyaltyConsent, setLoyaltyConsent] = useState(false);

  const handleLangChange = (code) => {
    setLang(code);
    localStorage.setItem('qr_hesap_lang', code);
  };

  const fetchData = useCallback(() => {
    return api
      .get(`/tables/${qrToken}/public`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Masa bilgisi alinamadi.'));
  }, [qrToken]);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  useEffect(() => {
    api.get('/campaigns').then((res) => {
      const active = (res.data || []).filter((c) => c.active !== false);
      setCampaigns(active);
    }).catch(() => {});
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

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

  const gonderUrun = async (menuItem, note) => {
    try {
      await api.post(`/orders/customer/${qrToken}/items`, {
        items: [
          {
            menu_item_id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
            note,
          },
        ],
      });
      showToast(`${getItemName(menuItem, lang)} eklendi!`);
      await fetchData();
    } catch {
      showToast('Urun eklenemedi.');
    }
  };

  const handleAddItem = async (menuItem, categoryName = '') => {
    const isMainDish = /ana\s*yemek/i.test(categoryName);
    if (isMainDish) {
      // Modal aç
      setNotModalItem(menuItem);
      setNotSecimi({ sogan: '', aci: '', ekstra: [], ek: '' });
      setNotModalOpen(true);
      return;
    }
    // Ana yemek değilse direkt ekle
    await gonderUrun(menuItem, null);
  };

  const notModalOnayla = async () => {
    const parcalar = [];
    if (notSecimi.sogan) parcalar.push(notSecimi.sogan);
    if (notSecimi.aci) parcalar.push(notSecimi.aci);
    parcalar.push(...notSecimi.ekstra);
    if (notSecimi.ek.trim()) parcalar.push(notSecimi.ek.trim());
    const note = parcalar.length > 0 ? parcalar.join(', ') : null;
    const item = notModalItem;
    setNotModalOpen(false);
    setNotModalItem(null);
    if (item) await gonderUrun(item, note);
  };

  const handleLoyaltyCheck = async () => {
    if (!loyaltyPhone.trim() || !loyaltyConsent) return;
    setLoyaltyLoading(true);
    setLoyaltyError(null);
    try {
      const res = await api.get(`/loyalty/${encodeURIComponent(loyaltyPhone.trim())}`);
      setLoyaltyData(res.data);
    } catch (err) {
      setLoyaltyError(err.response?.data?.error || 'Puan bilgisi alinamadi.');
      setLoyaltyData(null);
    } finally {
      setLoyaltyLoading(false);
    }
  };

  if (loading) return <Loading text="Hesabiniz yukleniyor..." />;

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

  const rawItems = data?.order?.items || data?.items || [];
  const items = rawItems.map((i) => ({
    ...i,
    name: i.name || i.item_name,
    price: i.price !== undefined ? i.price : i.unit_price,
  }));
  const subtotal = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0);
  const tableName = data?.table?.name || data?.tableName || `Masa ${data?.table?.number || ''}`;
  const restaurantName = data?.restaurant?.name || data?.restaurantName || 'Restoran';
  const orderId = data?.order?.id || data?.orderId;
  const menuRaw = data?.menu || data?.restaurant?.menu || [];

  // Backend: [{id, name, items: [...]}] — doğrudan kategori/ürün yapısı
  // Legacy: flat array of items with .category field
  const menuByCategory = {};
  menuRaw.forEach((entry) => {
    if (Array.isArray(entry.items)) {
      // Yeni format
      menuByCategory[entry.name] = entry.items;
    } else {
      // Eski format
      const cat = entry.category || 'Diger';
      if (!menuByCategory[cat]) menuByCategory[cat] = [];
      menuByCategory[cat].push(entry);
    }
  });

  return (
    <div className="customer-page">
      <div className="customer-container">
        {/* Toast notification */}
        {toast && (
          <div className="toast-notification">
            {toast}
          </div>
        )}

        {/* Özel Not Modal (ana yemekler için) */}
        {notModalOpen && notModalItem && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem',
          }}>
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '1.5rem',
              maxWidth: '420px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
            }}>
              <h3 style={{ margin: '0 0 0.5rem' }}>{getItemName(notModalItem, lang)}</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 1rem' }}>
                Nasıl hazırlansın?
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>🧅 Soğan</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['Soğanlı', 'Soğansız'].map((v) => (
                    <button key={v}
                      onClick={() => setNotSecimi({ ...notSecimi, sogan: notSecimi.sogan === v ? '' : v })}
                      style={{
                        padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid #d1d5db',
                        background: notSecimi.sogan === v ? '#e94560' : '#fff',
                        color: notSecimi.sogan === v ? '#fff' : '#111',
                        fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
                      }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>🌶️ Acılık</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['Acısız', 'Az acılı', 'Acılı'].map((v) => (
                    <button key={v}
                      onClick={() => setNotSecimi({ ...notSecimi, aci: notSecimi.aci === v ? '' : v })}
                      style={{
                        padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid #d1d5db',
                        background: notSecimi.aci === v ? '#e94560' : '#fff',
                        color: notSecimi.aci === v ? '#fff' : '#111',
                        fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
                      }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>➕ Ekstra tercihler</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['Sarımsaksız', 'Salçasız', 'Ekmeksiz', 'Az tuzlu'].map((v) => {
                    const secili = notSecimi.ekstra.includes(v);
                    return (
                      <button key={v}
                        onClick={() => setNotSecimi({
                          ...notSecimi,
                          ekstra: secili ? notSecimi.ekstra.filter((x) => x !== v) : [...notSecimi.ekstra, v],
                        })}
                        style={{
                          padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid #d1d5db',
                          background: secili ? '#e94560' : '#fff',
                          color: secili ? '#fff' : '#111',
                          fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
                        }}>
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>📝 Ek not (opsiyonel)</div>
                <input
                  type="text"
                  value={notSecimi.ek}
                  onChange={(e) => setNotSecimi({ ...notSecimi, ek: e.target.value })}
                  placeholder="Başka bir isteğin var mı?"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => { setNotModalOpen(false); setNotModalItem(null); }}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  İptal
                </button>
                <button onClick={notModalOnayla}
                  style={{ flex: 2, padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#e94560', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  Sepete Ekle
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* Campaign banner */}
        {campaigns.length > 0 && (
          <div className="campaign-banner">
            {campaigns.map((c, i) => (
              <div key={i} className="campaign-item">
                <span className="campaign-icon">&#127881;</span>
                <span>{c.description || c.title || c.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Waiter call button */}
        <button
          className={`waiter-call-btn ${waiterCalled ? 'called' : ''}`}
          onClick={handleCallWaiter}
          disabled={waiterCalled}
        >
          <span className="waiter-call-icon">&#128276;</span>
          <span>{waiterCalled ? t('cagrildi', lang) : t('garsonCagir', lang)}</span>
        </button>

        <div className="customer-header">
          {data?.table?.restaurant_logo ? (
            <img
              src={data.table.restaurant_logo}
              alt={restaurantName}
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 0.75rem', display: 'block', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
            />
          ) : (
            <div className="restaurant-badge">
              <span className="restaurant-icon">&#9733;</span>
            </div>
          )}
          <h1 className="restaurant-name">{restaurantName}</h1>
          <div className="table-badge">{tableName}</div>
          {data?.table?.restaurant_description && (
            <p style={{ fontSize: '0.85rem', color: '#6b7280', textAlign: 'center', margin: '0.5rem 1rem 0', lineHeight: 1.4 }}>
              {data.table.restaurant_description}
            </p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <p>{t('siparisYok', lang)}</p>
            <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '0.5rem' }}>
              {t('menudenSec', lang)}
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                padding: '1rem',
                borderRadius: '12px',
                marginBottom: '1rem',
                textAlign: 'center',
                fontWeight: 700,
              }}>
              {t('mutfagaIletildi', lang)}
            </div>

            <div className="card">
              <h3 className="card-title">{t('hesapDetayi', lang)}</h3>
              <BillSummary items={items} />
            </div>

            <div className="total-banner">
              <span>{t('toplam', lang)}</span>
              <span className="total-amount">{formatTL(subtotal)}</span>
            </div>

            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', margin: '0.5rem 0 1rem' }}>
              {t('baskaBirSey', lang)}
            </p>

            <details style={{ marginTop: '0.5rem' }}>
              <summary style={{
                textAlign: 'center',
                color: '#6b7280',
                cursor: 'pointer',
                padding: '0.75rem',
                fontSize: '0.95rem',
                fontWeight: 600,
              }}>
                {t('kalkiyorum', lang)}
              </summary>
              <div className="customer-actions" style={{ marginTop: '0.75rem' }}>
                <button
                  className="btn btn-accent btn-full"
                  onClick={() =>
                    navigate(`/t/${qrToken}/pay`, {
                      state: { amount: subtotal, orderId, type: 'full' },
                    })
                  }
                >
                  {t('tamaminiOde', lang)}
                </button>
                <button
                  className="btn btn-outline btn-full"
                  onClick={() =>
                    navigate(`/t/${qrToken}/split`, {
                      state: { amount: subtotal, orderId, items },
                    })
                  }
                >
                  {t('hesabiBol', lang)}
                </button>
              </div>
            </details>

            {/* Yorum/puanlama */}
            <ReviewBox orderId={orderId} lang={lang} />
          </>
        )}

        {/* Menu ordering section */}
        {Object.keys(menuByCategory).length > 0 && (
          <div className="menu-order-section">
            <button
              className="menu-order-toggle"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="menu-order-toggle-text">{t('siparisVer', lang)}</span>
              <span className={`menu-order-arrow ${menuOpen ? 'open' : ''}`}>&#9660;</span>
            </button>

            {menuOpen && (
              <div className="menu-order-list">
                {Object.entries(menuByCategory).map(([category, catItems]) => (
                  <div key={category} className="menu-order-category">
                    <h4 className="menu-order-category-title">{category}</h4>
                    <div className="menu-order-items">
                      {catItems.map((item) => {
                        const indirim = item.is_special && item.special_discount > 0
                          ? item.special_discount
                          : 0;
                        const finalPrice = indirim > 0
                          ? Math.round(item.price * (1 - indirim / 100))
                          : item.price;
                        const tukendi = item.active === 0;
                        return (
                          <div key={item.id} className="menu-order-item" style={tukendi ? { opacity: 0.5 } : {}}>
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, marginRight: 10 }}
                              />
                            )}
                            <div className="menu-order-item-info">
                              <span className="menu-order-item-name">
                                {!!item.is_special && <span style={{ color: '#d97706', marginRight: 4 }}>⭐</span>}
                                {getItemName(item, lang)}
                                {tukendi ? <span style={{ color: '#dc2626', marginLeft: 8, fontSize: '0.8em' }}>{t('tukendi', lang)}</span> : null}
                              </span>
                              {getItemDesc(item, lang) && (
                                <span className="menu-order-item-desc">{getItemDesc(item, lang)}</span>
                              )}
                              {indirim > 0 ? (
                                <span className="menu-order-item-price">
                                  <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginRight: 6 }}>
                                    {formatTL(item.price)}
                                  </span>
                                  <span style={{ color: '#dc2626', fontWeight: 800 }}>
                                    {formatTL(finalPrice)} (-{indirim}%)
                                  </span>
                                </span>
                              ) : (
                                <span className="menu-order-item-price">{formatTL(item.price)}</span>
                              )}
                            </div>
                            <button
                              className="menu-order-add-btn"
                              onClick={() => handleAddItem({ ...item, price: finalPrice }, category)}
                              disabled={tukendi}
                            >
                              +
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loyalty / Sadakat Karti section */}
        <div className="loyalty-section">
          <button
            className="loyalty-toggle"
            onClick={() => setLoyaltyOpen(!loyaltyOpen)}
          >
            <span className="loyalty-toggle-text">Sadakat Karti</span>
            <span className={`menu-order-arrow ${loyaltyOpen ? 'open' : ''}`}>&#9660;</span>
          </button>

          {loyaltyOpen && (
            <div className="loyalty-content">
              <p className="loyalty-desc">Telefon numaranizi girerek puan durumunuzu ogrenin.</p>
              <div className="loyalty-input-row">
                <input
                  type="tel"
                  className="loyalty-input"
                  placeholder="05XX XXX XX XX"
                  value={loyaltyPhone}
                  onChange={(e) => setLoyaltyPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loyaltyConsent && handleLoyaltyCheck()}
                />
                <button
                  className="btn btn-gold btn-sm"
                  onClick={handleLoyaltyCheck}
                  disabled={loyaltyLoading || !loyaltyConsent || !loyaltyPhone.trim()}
                >
                  {loyaltyLoading ? 'Sorgulanıyor...' : 'Sorgula'}
                </button>
              </div>
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

              {loyaltyError && (
                <div className="error-message" style={{ marginTop: '0.5rem' }}>{loyaltyError}</div>
              )}

              {loyaltyData && (
                <div className="loyalty-result">
                  <div className="loyalty-stat">
                    <span className="loyalty-stat-label">Mevcut Puan</span>
                    <span className="loyalty-stat-value loyalty-points">{loyaltyData.points ?? 0}</span>
                  </div>
                  <div className="loyalty-stat">
                    <span className="loyalty-stat-label">Toplam Harcama</span>
                    <span className="loyalty-stat-value">{formatTL(loyaltyData.totalSpent ?? 0)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="powered-by">QR Hesap ile guvenli odeme</div>
      </div>
    </div>
  );
}
