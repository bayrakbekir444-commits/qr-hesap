import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';

const STATUS_LABELS = {
  incomplete: { label: 'Eksik', color: '#dc2626', desc: 'Ödeme almak için bilgileri tamamla.' },
  pending: { label: 'Onay bekliyor', color: '#f59e0b', desc: 'Bilgiler iletildi, onay süreci 1-5 iş günü.' },
  approved: { label: 'Aktif', color: '#10b981', desc: 'Ödeme alabilirsin.' },
  rejected: { label: 'Reddedildi', color: '#dc2626', desc: 'Destek ekibi ile iletişime geç.' },
};

export default function Billing() {
  const [searchParams] = useSearchParams();
  const isWelcome = searchParams.get('welcome') === '1';
  const [form, setForm] = useState({
    company_type: 'sahis',
    legal_name: '',
    tax_number: '',
    tax_office: '',
    identity_number: '',
    iban: 'TR',
    authorized_name: '',
    authorized_surname: '',
    authorized_email: '',
    authorized_phone: '',
    authorized_identity: '',
    authorized_birthdate: '',
    authorized_gender: '',
    address_city: '',
    address_district: '',
    address_full: '',
    address_postal_code: '',
    website: '',
    business_category: 'restoran',
  });
  const [status, setStatus] = useState('incomplete');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/billing');
        const data = res.data || {};
        setStatus(data.status || 'incomplete');
        if (data.company_type) {
          setForm((f) => ({ ...f, ...Object.fromEntries(Object.keys(f).map((k) => [k, data[k] ?? f[k]])) }));
        }
        if (data.accepted_at) setAccepted(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!accepted) {
      setError('Sözleşme/onay kutusunu işaretleyin.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/billing', form);
      setStatus(res.data.billing?.status || 'pending');
      setMessage('Ödeme bilgileri kaydedildi. Onay süreci 1-5 iş günü.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || 'Kayıt sırasında hata.');
    } finally {
      setSaving(false);
    }
  };

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isSahis = form.company_type === 'sahis';
  const st = STATUS_LABELS[status] || STATUS_LABELS.incomplete;

  if (loading) return <div className="panel-card">Yükleniyor…</div>;

  return (
    <div className="billing-page">
      <div className="panel-page-title">
        <h1>💳 Ödeme Bilgileri</h1>
        <p>iyzico üzerinden ödeme alabilmek için işletme ve banka bilgilerinizi tamamlayın.</p>
      </div>

      {isWelcome && status === 'incomplete' && (
        <div className="billing-welcome">
          <h3>🎉 Hoş geldin! Son bir adım kaldı.</h3>
          <p>
            QR Hesap'a kayıt oldun. Müşterilerden ödeme alabilmen için aşağıdaki <strong>vergi ve banka bilgilerini </strong>
            doldurman gerekiyor. Bilgiler iyzico'ya iletilir, 1-5 iş günü içinde onaylanır.
          </p>
        </div>
      )}

      <div className="billing-status" style={{ borderColor: st.color }}>
        <div>
          <span className="billing-status-dot" style={{ background: st.color }}></span>
          <strong>Durum: {st.label}</strong>
        </div>
        <p>{st.desc}</p>
      </div>

      <div className="billing-docs-info">
        <h4>📎 Ayrıca göndermeniz gereken evraklar</h4>
        <p>Formu doldurduktan sonra aşağıdaki PDF/JPG evrakları <a href="https://wa.me/905436960574" target="_blank" rel="noreferrer"><strong>WhatsApp</strong></a> veya <a href="mailto:info@qrhesap.com"><strong>info@qrhesap.com</strong></a> üzerinden iletmeniz gerekir:</p>
        <ul>
          <li><strong>Vergi Levhası</strong> (zorunlu)</li>
          <li><strong>Faaliyet Belgesi</strong> (esnaf odası / ticaret odası — zorunlu)</li>
          <li><strong>İmza Beyannamesi</strong> (Şahıs) <em>veya</em> <strong>İmza Sirküleri</strong> (Limited/Anonim)</li>
          <li><strong>Ticaret Sicil Gazetesi</strong> (sadece Limited/Anonim)</li>
          <li><strong>Kimlik Fotokopisi</strong> (yetkili kişinin)</li>
        </ul>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="billing-form">
        <section className="billing-section">
          <h3>İşletme Türü</h3>
          <div className="billing-radios">
            {[
              ['sahis', 'Şahıs Şirketi'],
              ['limited', 'Limited Şirket'],
              ['anonim', 'Anonim Şirket'],
            ].map(([val, label]) => (
              <label key={val} className={`billing-radio ${form.company_type === val ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="company_type"
                  value={val}
                  checked={form.company_type === val}
                  onChange={(e) => update('company_type', e.target.value)}
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        <section className="billing-section">
          <h3>{isSahis ? 'Şahıs Bilgileri' : 'Şirket Bilgileri'}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>{isSahis ? 'Ad Soyad (vergi levhasındaki)' : 'Şirket Unvanı'} *</label>
              <input
                type="text"
                value={form.legal_name}
                onChange={(e) => update('legal_name', e.target.value)}
                placeholder={isSahis ? 'Ahmet Yılmaz' : 'Lezzet Mutfak Gıda Ltd. Şti.'}
                required
              />
            </div>
            {isSahis ? (
              <div className="form-group">
                <label>T.C. Kimlik No * <small>(11 hane)</small></label>
                <input
                  type="text"
                  value={form.identity_number}
                  onChange={(e) => update('identity_number', e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="12345678901"
                  inputMode="numeric"
                  maxLength={11}
                  required
                />
              </div>
            ) : (
              <div className="form-group">
                <label>Vergi Numarası * <small>(10 hane)</small></label>
                <input
                  type="text"
                  value={form.tax_number}
                  onChange={(e) => update('tax_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="1234567890"
                  inputMode="numeric"
                  maxLength={10}
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label>Vergi Dairesi</label>
              <input
                type="text"
                value={form.tax_office}
                onChange={(e) => update('tax_office', e.target.value)}
                placeholder="Beşiktaş"
              />
            </div>
            <div className="form-group">
              <label>İşletme Türü</label>
              <select
                value={form.business_category}
                onChange={(e) => update('business_category', e.target.value)}
              >
                <option value="restoran">Restoran</option>
                <option value="kafe">Kafe</option>
                <option value="bar">Bar / Pub</option>
                <option value="pastane">Pastane / Fırın</option>
                <option value="fast_food">Fast Food</option>
                <option value="kebapci">Kebapçı / Pideci</option>
                <option value="diger">Diğer</option>
              </select>
            </div>
            <div className="form-group">
              <label>Web Sitesi <small>(opsiyonel)</small></label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => update('website', e.target.value)}
                placeholder="https://lezzetmutfak.com"
              />
            </div>
          </div>
        </section>

        <section className="billing-section">
          <h3>Banka Bilgileri</h3>
          <div className="form-group">
            <label>IBAN * <small>(TR ile başlayan, 26 karakter)</small></label>
            <input
              type="text"
              value={form.iban}
              onChange={(e) => update('iban', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 26))}
              placeholder="TR12 3456 7890 1234 5678 9012 34"
              required
              minLength={26}
              maxLength={26}
            />
            <small className="form-hint">
              {form.iban.length}/26 karakter. IBAN, vergi numarası/T.C. ile eşleşmeli.
            </small>
          </div>
        </section>

        <section className="billing-section">
          <h3>Yetkili Kişi</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Ad *</label>
              <input
                type="text"
                value={form.authorized_name}
                onChange={(e) => update('authorized_name', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Soyad *</label>
              <input
                type="text"
                value={form.authorized_surname}
                onChange={(e) => update('authorized_surname', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={form.authorized_email}
                onChange={(e) => update('authorized_email', e.target.value)}
                placeholder="ornek@email.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Telefon *</label>
              <input
                type="tel"
                value={form.authorized_phone}
                onChange={(e) => update('authorized_phone', e.target.value)}
                placeholder="05XX XXX XX XX"
                required
              />
            </div>
            {!isSahis && (
              <div className="form-group">
                <label>Yetkili T.C. Kimlik No <small>(opsiyonel)</small></label>
                <input
                  type="text"
                  value={form.authorized_identity}
                  onChange={(e) => update('authorized_identity', e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="12345678901"
                  inputMode="numeric"
                  maxLength={11}
                />
              </div>
            )}
            <div className="form-group">
              <label>Doğum Tarihi <small>(opsiyonel)</small></label>
              <input
                type="date"
                value={form.authorized_birthdate}
                onChange={(e) => update('authorized_birthdate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Cinsiyet <small>(opsiyonel)</small></label>
              <select
                value={form.authorized_gender}
                onChange={(e) => update('authorized_gender', e.target.value)}
              >
                <option value="">Seçiniz</option>
                <option value="erkek">Erkek</option>
                <option value="kadın">Kadın</option>
              </select>
            </div>
          </div>
        </section>

        <section className="billing-section">
          <h3>İş Yeri Adresi</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>İl *</label>
              <input
                type="text"
                value={form.address_city}
                onChange={(e) => update('address_city', e.target.value)}
                placeholder="İstanbul"
                required
              />
            </div>
            <div className="form-group">
              <label>İlçe</label>
              <input
                type="text"
                value={form.address_district}
                onChange={(e) => update('address_district', e.target.value)}
                placeholder="Beşiktaş"
              />
            </div>
            <div className="form-group form-group-full">
              <label>Açık Adres *</label>
              <textarea
                rows={2}
                value={form.address_full}
                onChange={(e) => update('address_full', e.target.value)}
                placeholder="Mahalle, sokak, no, daire..."
                required
              />
            </div>
            <div className="form-group">
              <label>Posta Kodu</label>
              <input
                type="text"
                value={form.address_postal_code}
                onChange={(e) => update('address_postal_code', e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="34000"
                inputMode="numeric"
                maxLength={5}
              />
            </div>
          </div>
        </section>

        <label className="billing-terms">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>
            Yukarıdaki bilgilerin doğru olduğunu beyan ederim. iyzico ödeme hizmet sözleşmesi ile QR Hesap
            hizmet koşullarını okudum, onaylıyorum.
          </span>
        </label>

        <button type="submit" className="btn btn-accent btn-full" disabled={saving}>
          {saving ? 'Kaydediliyor...' : (status === 'incomplete' ? 'Bilgileri Gönder' : 'Güncelle')}
        </button>
      </form>
    </div>
  );
}
