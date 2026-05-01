import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  { icon: '📷', title: 'Fotoğraflı Menü', desc: 'Mercimek çorbası, baklava, kebap... her ürün gerçek fotoğrafıyla.' },
  { icon: '🔔', title: 'Garson Çağırma', desc: 'Müşteri tek tıkla garsonu çağırır, zil çalar, kim hangi masa anında belli olur.' },
  { icon: '🍽️', title: 'Anlık Sipariş', desc: 'Müşteri masadan sipariş verir, garsona/mutfağa otomatik bildirim.' },
  { icon: '📊', title: 'Detaylı Raporlar', desc: 'Günlük ciro, en çok satan ürünler, kategori dağılımı, PDF export.' },
  { icon: '📱', title: 'QR Kod Yazdır', desc: 'Her masa için özel QR kod. Tek tıkla PDF olarak indir, yapıştır.' },
  { icon: '🌍', title: 'Çoklu Dil', desc: 'Türkçe, İngilizce, Arapça menü desteği. Turistler de rahatça sipariş.' },
];

const steps = [
  { num: '1', title: 'Hesap Aç', desc: 'Restoran adı ve şifre ile dakikalar içinde hesabını oluştur.' },
  { num: '2', title: 'Menünü Yükle', desc: 'Kategorileri, ürünleri ve fotoğrafları ekle. 30 dakikada bitir.' },
  { num: '3', title: 'QR Yapıştır', desc: 'PDF\'i yazdır, masalarına yapıştır. Müşteri okutur, sistem başlıyor.' },
];

const plans = [
  {
    name: 'Temel',
    price: '₺800',
    period: '/ ay',
    desc: 'Küçük kafeler için',
    features: ['10 masa', 'Fotoğraflı QR menü', 'Sipariş alma', 'Garson çağırma', 'Çoklu dil'],
    cta: 'Hemen Başla',
    popular: false,
  },
  {
    name: 'Pro',
    price: '₺2.000',
    period: '/ ay',
    desc: 'Profesyonel restoranlar için',
    features: ['30 masa', 'Detaylı raporlar', 'PDF export', 'Çoklu personel', 'PDF QR yazdırma', 'Öncelikli destek'],
    cta: 'Pro\'ya Geç',
    popular: true,
  },
  {
    name: 'Zincir',
    price: '₺4.000',
    period: '/ ay',
    desc: 'Şubesi olan markalar için',
    features: ['Sınırsız masa', 'Sınırsız şube', 'Merkezi yönetim', 'API erişimi', 'Özel entegrasyon', 'Birebir destek'],
    cta: 'İletişime Geç',
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <div className="lp">
      {/* Header */}
      <header className="lp-header">
        <div className="lp-container lp-header-inner">
          <div className="lp-logo">🧾 QR Hesap</div>
          <nav className="lp-nav">
            <a href="#features">Özellikler</a>
            <a href="#how">Nasıl Çalışır</a>
            <a href="#pricing">Fiyatlar</a>
            <Link to="/panel/login" className="lp-nav-cta">Giriş Yap</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-container lp-hero-inner">
          <div className="lp-hero-text">
            <span className="lp-badge">🚀 Türkiye'nin yeni nesil restoran sistemi</span>
            <h1 className="lp-hero-title">
              Restoranınız için <span className="lp-accent">QR Menü ve Hesap Sistemi</span>
            </h1>
            <p className="lp-hero-desc">
              Müşterileriniz QR kodu okutsun, fotoğraflı menüden sipariş versin, kasada beklemeden ödesin.
              Garson, mutfak ve yönetim için tek panel.
            </p>
            <div className="lp-hero-cta">
              <Link to="/panel/login" className="lp-btn lp-btn-primary">
                Hemen Başla →
              </Link>
              <a href="#pricing" className="lp-btn lp-btn-ghost">
                Fiyatları Gör
              </a>
            </div>
          </div>
          <div className="lp-hero-visual">
            <div className="lp-phone">
              <div className="lp-phone-screen">
                <div className="lp-phone-header">
                  <span>★</span>
                  <strong>Demo Restoran</strong>
                  <span className="lp-phone-tag">Masa 4</span>
                </div>
                <div className="lp-phone-card">
                  <div className="lp-phone-img" style={{ background: 'linear-gradient(135deg, #f4a261, #e76f51)' }}>🍲</div>
                  <div className="lp-phone-text">
                    <strong>Mercimek Çorbası</strong>
                    <span>₺45</span>
                  </div>
                </div>
                <div className="lp-phone-card">
                  <div className="lp-phone-img" style={{ background: 'linear-gradient(135deg, #e76f51, #c1432a)' }}>🍖</div>
                  <div className="lp-phone-text">
                    <strong>Adana Kebap</strong>
                    <span>₺250</span>
                  </div>
                </div>
                <div className="lp-phone-card">
                  <div className="lp-phone-img" style={{ background: 'linear-gradient(135deg, #f4a261, #d49c4e)' }}>🥙</div>
                  <div className="lp-phone-text">
                    <strong>Lahmacun</strong>
                    <span>₺80</span>
                  </div>
                </div>
                <div className="lp-phone-bottom">3 ürün · ₺375</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="lp-section">
        <div className="lp-container">
          <h2 className="lp-section-title">Restoranınız için her şey, tek panelde</h2>
          <p className="lp-section-sub">
            Müşteriden mutfağa, garsondan kasaya — operasyonun tamamı
          </p>
          <div className="lp-features-grid">
            {features.map((f, i) => (
              <div key={i} className="lp-feature">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="lp-section lp-section-dark">
        <div className="lp-container">
          <h2 className="lp-section-title">3 adımda kuruluma hazır</h2>
          <p className="lp-section-sub">Yarım saat içinde menünüz canlıda</p>
          <div className="lp-steps">
            {steps.map((s) => (
              <div key={s.num} className="lp-step">
                <div className="lp-step-num">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="lp-section">
        <div className="lp-container">
          <h2 className="lp-section-title">Şeffaf fiyatlandırma</h2>
          <p className="lp-section-sub">Her ölçek için bir paket — gizli ücret yok</p>
          <div className="lp-plans">
            {plans.map((p, i) => (
              <div key={i} className={`lp-plan ${p.popular ? 'popular' : ''}`}>
                {p.popular && <div className="lp-plan-tag">⭐ En Çok Tercih Edilen</div>}
                <h3>{p.name}</h3>
                <div className="lp-plan-price">
                  <span className="lp-plan-amount">{p.price}</span>
                  {p.period && <span className="lp-plan-period">{p.period}</span>}
                </div>
                <p className="lp-plan-desc">{p.desc}</p>
                <ul className="lp-plan-features">
                  {p.features.map((f, j) => (
                    <li key={j}>✓ {f}</li>
                  ))}
                </ul>
                <Link
                  to="/panel/login"
                  className={`lp-btn ${p.popular ? 'lp-btn-primary' : 'lp-btn-outline'}`}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta-final">
        <div className="lp-container">
          <h2>Restoranınızı bugün dijitalleştirin</h2>
          <p>Dakikalar içinde başlayın, ilk müşteriniz QR kodu okutsun.</p>
          <Link to="/panel/login" className="lp-btn lp-btn-primary lp-btn-large">
            Ücretsiz Dene →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div>
            <div className="lp-logo">🧾 QR Hesap</div>
            <p>Restoranlar için QR menü ve hesap sistemi.</p>
          </div>
          <div className="lp-footer-cols">
            <div>
              <h4>Ürün</h4>
              <a href="#features">Özellikler</a>
              <a href="#pricing">Fiyatlar</a>
              <Link to="/panel/login">Giriş Yap</Link>
            </div>
            <div>
              <h4>Yasal</h4>
              <a href="#">KVKK</a>
              <a href="#">Gizlilik</a>
              <a href="#">Kullanım Koşulları</a>
            </div>
            <div>
              <h4>İletişim</h4>
              <a href="mailto:info@qrhesap.com">info@qrhesap.com</a>
              <a href="https://wa.me/" target="_blank" rel="noreferrer">WhatsApp</a>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">© 2026 QR Hesap. Tüm hakları saklıdır.</div>
      </footer>
    </div>
  );
}
