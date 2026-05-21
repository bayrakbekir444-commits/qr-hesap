import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';

const STEPS = [
  { num: 1, title: 'Hesap', desc: 'Restoran adı, şifre' },
  { num: 2, title: 'İşletme & Banka', desc: 'Vergi, IBAN, yetkili, adres' },
  { num: 3, title: 'Onay', desc: 'Sözleşme ve gönder' },
];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [account, setAccount] = useState({
    name: '', password: '', password2: '', email: '', phone: '',
  });

  const [billing, setBilling] = useState({
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
  const [accepted, setAccepted] = useState(false);

  const isSahis = billing.company_type === 'sahis';
  const updA = (k, v) => setAccount((s) => ({ ...s, [k]: v }));
  const updB = (k, v) => setBilling((s) => ({ ...s, [k]: v }));

  const validateStep1 = () => {
    if (!account.name.trim() || account.name.trim().length < 2) return 'Restoran adı en az 2 karakter olmalı.';
    if (account.password.length < 6) return 'Şifre en az 6 karakter olmalı.';
    if (account.password !== account.password2) return 'Şifreler eşleşmiyor.';
    return null;
  };

  const validateStep2 = () => {
    if (!billing.legal_name.trim()) return 'İşletme/Şirket adını girin.';
    if (isSahis) {
      if (!/^\d{11}$/.test(billing.identity_number)) return 'Şahıs için 11 haneli T.C. kimlik no girin.';
    } else {
      if (!/^\d{10}$/.test(billing.tax_number)) return 'Limited/Anonim için 10 haneli vergi numarası girin.';
    }
    if (!/^TR\d{24}$/.test(billing.iban)) return 'Geçerli bir IBAN girin (TR ile başlayan 26 karakter).';
    if (!billing.authorized_name.trim() || !billing.authorized_surname.trim()) return 'Yetkili kişinin ad/soyadını girin.';
    if (!billing.authorized_email.trim() || !billing.authorized_phone.trim()) return 'Yetkili kişinin email/telefonunu girin.';
    if (!billing.address_city.trim() || !billing.address_full.trim()) return 'İl ve açık adres girin.';
    return null;
  };

  const next = () => {
    setError('');
    const err = step === 1 ? validateStep1() : step === 2 ? validateStep2() : null;
    if (err) { setError(err); return; }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => { setError(''); setStep((s) => s - 1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!accepted) { setError('Sözleşmeleri onaylamanız gerekiyor.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name: account.name.trim(),
        password: account.password,
        email: account.email || undefined,
        phone: account.phone || undefined,
        billing,
      });
      localStorage.setItem('token', res.data.token);
      navigate('/panel', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        <div className="signup-header">
          <h1>🚀 Hesap Oluştur</h1>
          <p>QR Hesap'a hoş geldin. Aşağıdaki bilgileri doldur, hemen başla.</p>
        </div>

        <div className="signup-steps">
          {STEPS.map((s) => (
            <div key={s.num} className={`signup-step ${step === s.num ? 'active' : ''} ${step > s.num ? 'done' : ''}`}>
              <div className="signup-step-num">{step > s.num ? '✓' : s.num}</div>
              <div className="signup-step-info">
                <div className="signup-step-title">{s.title}</div>
                <div className="signup-step-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          {step === 1 && (
            <div className="signup-section">
              <h3>Hesap Bilgileri</h3>
              <div className="form-group">
                <label>Restoran Adı *</label>
                <input
                  type="text"
                  value={account.name}
                  onChange={(e) => updA('name', e.target.value)}
                  placeholder="ör. Lezzet Mutfağı"
                  required
                  autoCapitalize="words"
                  maxLength={60}
                />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Şifre * <small>(min 6)</small></label>
                  <input type="password" value={account.password} onChange={(e) => updA('password', e.target.value)} required minLength={6} />
                </div>
                <div className="form-group">
                  <label>Şifre Tekrar *</label>
                  <input type="password" value={account.password2} onChange={(e) => updA('password2', e.target.value)} required minLength={6} />
                </div>
                <div className="form-group">
                  <label>E-posta <small>(opsiyonel)</small></label>
                  <input type="email" value={account.email} onChange={(e) => updA('email', e.target.value)} placeholder="ornek@email.com" />
                </div>
                <div className="form-group">
                  <label>Telefon <small>(opsiyonel)</small></label>
                  <input type="tel" value={account.phone} onChange={(e) => updA('phone', e.target.value)} placeholder="05XX XXX XX XX" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="signup-section">
                <h3>İşletme Türü</h3>
                <div className="billing-radios">
                  {[['sahis', 'Şahıs'], ['limited', 'Limited'], ['anonim', 'Anonim']].map(([v, l]) => (
                    <label key={v} className={`billing-radio ${billing.company_type === v ? 'active' : ''}`}>
                      <input type="radio" name="company_type" value={v} checked={billing.company_type === v} onChange={(e) => updB('company_type', e.target.value)} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>

              <div className="signup-section">
                <h3>{isSahis ? 'Şahıs Bilgileri' : 'Şirket Bilgileri'}</h3>
                <div className="form-grid">
                  <div className="form-group form-group-full">
                    <label>{isSahis ? 'Ad Soyad (vergi levhasındaki)' : 'Şirket Unvanı'} *</label>
                    <input type="text" value={billing.legal_name} onChange={(e) => updB('legal_name', e.target.value)} required />
                  </div>
                  {isSahis ? (
                    <div className="form-group">
                      <label>T.C. Kimlik No * <small>(11)</small></label>
                      <input type="text" value={billing.identity_number} onChange={(e) => updB('identity_number', e.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="numeric" maxLength={11} required />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Vergi No * <small>(10)</small></label>
                      <input type="text" value={billing.tax_number} onChange={(e) => updB('tax_number', e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" maxLength={10} required />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Vergi Dairesi</label>
                    <input type="text" value={billing.tax_office} onChange={(e) => updB('tax_office', e.target.value)} placeholder="Beşiktaş" />
                  </div>
                  <div className="form-group">
                    <label>İşletme Türü</label>
                    <select value={billing.business_category} onChange={(e) => updB('business_category', e.target.value)}>
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
                    <input type="url" value={billing.website} onChange={(e) => updB('website', e.target.value)} placeholder="https://..." />
                  </div>
                </div>
              </div>

              <div className="signup-section">
                <h3>Banka Bilgileri</h3>
                <div className="form-group">
                  <label>IBAN * <small>(TR ile başlayan 26 karakter)</small></label>
                  <input type="text" value={billing.iban} onChange={(e) => updB('iban', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 26))} required minLength={26} maxLength={26} />
                  <small className="form-hint">{billing.iban.length}/26</small>
                </div>
              </div>

              <div className="signup-section">
                <h3>Yetkili Kişi</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Ad *</label>
                    <input type="text" value={billing.authorized_name} onChange={(e) => updB('authorized_name', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Soyad *</label>
                    <input type="text" value={billing.authorized_surname} onChange={(e) => updB('authorized_surname', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input type="email" value={billing.authorized_email} onChange={(e) => updB('authorized_email', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Telefon *</label>
                    <input type="tel" value={billing.authorized_phone} onChange={(e) => updB('authorized_phone', e.target.value)} required />
                  </div>
                  {!isSahis && (
                    <div className="form-group">
                      <label>Yetkili T.C. <small>(opsiyonel)</small></label>
                      <input type="text" value={billing.authorized_identity} onChange={(e) => updB('authorized_identity', e.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="numeric" maxLength={11} />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Doğum Tarihi <small>(opsiyonel)</small></label>
                    <input type="date" value={billing.authorized_birthdate} onChange={(e) => updB('authorized_birthdate', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Cinsiyet <small>(opsiyonel)</small></label>
                    <select value={billing.authorized_gender} onChange={(e) => updB('authorized_gender', e.target.value)}>
                      <option value="">Seçiniz</option>
                      <option value="erkek">Erkek</option>
                      <option value="kadın">Kadın</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="signup-section">
                <h3>İş Yeri Adresi</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>İl *</label>
                    <input type="text" value={billing.address_city} onChange={(e) => updB('address_city', e.target.value)} placeholder="İstanbul" required />
                  </div>
                  <div className="form-group">
                    <label>İlçe</label>
                    <input type="text" value={billing.address_district} onChange={(e) => updB('address_district', e.target.value)} placeholder="Beşiktaş" />
                  </div>
                  <div className="form-group form-group-full">
                    <label>Açık Adres *</label>
                    <textarea rows={2} value={billing.address_full} onChange={(e) => updB('address_full', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Posta Kodu</label>
                    <input type="text" value={billing.address_postal_code} onChange={(e) => updB('address_postal_code', e.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" maxLength={5} />
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="signup-section">
              <h3>Onay ve Gönderim</h3>
              <div className="billing-docs-info">
                <h4>📎 Sonra göndereceğiniz evraklar</h4>
                <p>Kaydı tamamladıktan sonra aşağıdaki belgeleri <a href="https://wa.me/905436960574" target="_blank" rel="noreferrer"><strong>WhatsApp</strong></a> veya <a href="mailto:info@qrhesap.com"><strong>info@qrhesap.com</strong></a> üzerinden iletmeniz gerekir:</p>
                <ul>
                  <li>Vergi Levhası</li>
                  <li>Faaliyet Belgesi (esnaf/ticaret odası)</li>
                  <li>{isSahis ? 'İmza Beyannamesi' : 'İmza Sirküleri'}</li>
                  {!isSahis && <li>Ticaret Sicil Gazetesi</li>}
                  <li>Yetkili Kimlik Fotokopisi</li>
                </ul>
              </div>

              <label className="billing-terms">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                <span>
                  Yukarıdaki bilgilerin doğru olduğunu beyan ederim.{' '}
                  <Link to="/yasal/kullanim" target="_blank">Kullanım koşulları</Link>,{' '}
                  <Link to="/yasal/kvkk" target="_blank">KVKK aydınlatma metni</Link> ve iyzico ödeme hizmet sözleşmesini onaylıyorum.
                </span>
              </label>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="signup-nav">
            {step > 1 && (
              <button type="button" className="btn btn-ghost" onClick={back}>← Geri</button>
            )}
            <div style={{ flex: 1 }} />
            {step < 3 ? (
              <button type="button" className="btn btn-accent" onClick={next}>Devam →</button>
            ) : (
              <button type="submit" className="btn btn-accent" disabled={loading}>
                {loading ? 'Hesap oluşturuluyor...' : 'Hesabımı Oluştur ✓'}
              </button>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: '#8b8b8b' }}>
            Zaten hesabın var mı?{' '}
            <Link to="/panel/login" style={{ color: '#f5a623', fontWeight: 600 }}>Giriş Yap</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
