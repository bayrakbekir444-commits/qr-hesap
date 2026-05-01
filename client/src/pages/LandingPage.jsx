import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const faqs = [
  {
    q: 'Kurulum ne kadar sürüyor?',
    a: 'Hesap açtıktan sonra menünüzü ve masalarınızı eklemek ortalama 30 dakika sürer. Aynı gün içinde QR kodlarını yazdırıp masalara yapıştırabilirsiniz.',
  },
  {
    q: 'Aylık ücret dışında gizli ödeme var mı?',
    a: 'Hayır. Paket ücreti dışında hiçbir gizli ücret yok. KDV dahildir. İstediğiniz zaman iptal edebilirsiniz.',
  },
  {
    q: 'Müşteri ödeme nasıl yapıyor?',
    a: 'Müşteri menüden sipariş verir, "Hesabı kapat" butonuna basar ve kart bilgisini girer. Para doğrudan iyzico üzerinden restoranın hesabına geçer. (iyzico entegrasyonu Pro paket sonrası)',
  },
  {
    q: 'QR kodları nasıl yazdırırım?',
    a: 'Panelin Masa Yönetimi sayfasından her masa için ayrı PNG indirebilir veya tek tıkla tüm masaları PDF olarak indirip matbaaya verebilirsiniz.',
  },
  {
    q: 'İnternetim yokken çalışır mı?',
    a: 'Restoran panelinin internet bağlantısı gerekir. Müşteri telefonu ise mobil veri veya restoranın WiFi\'sini kullanır. Garson çağırma ve sipariş bildirimleri anlık olarak gelir.',
  },
  {
    q: 'Personel sayısı sınırı var mı?',
    a: 'Pro pakette sınırsız personel ekleyebilirsiniz. Her birine kendi giriş bilgisi tanımlanır.',
  },
  {
    q: 'Fiş/fatura veriyor mu?',
    a: 'Sistem her sipariş için dijital fiş üretir. e-Fatura/e-Arşiv entegrasyonu ihtiyaç halinde Zincir paketine dahildir.',
  },
];

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
  const [openFaq, setOpenFaq] = useState(null);

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
            <a href="#faq">SSS</a>
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
              Müşteriniz <span className="lp-accent">QR ile sipariş</span>, tek tuşla <span className="lp-accent">ödeme</span>
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
              <div className="lp-phone-screen lp-phone-live">
                <iframe
                  src="/menu/7c4d3316-3ea9-458b-b062-b217339ef824"
                  className="lp-phone-iframe"
                  title="Canlı müşteri menüsü"
                  loading="lazy"
                />
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

          {/* Demo videosu placeholder */}
          <div className="lp-video">
            <div className="lp-video-frame">
              <div className="lp-video-placeholder">
                <div className="lp-video-play">▶</div>
                <h3>Demo Videosu</h3>
                <p>1 dakikalık tanıtım — yakında</p>
              </div>
            </div>
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

      {/* FAQ */}
      <section id="faq" className="lp-section">
        <div className="lp-container" style={{ maxWidth: 800 }}>
          <h2 className="lp-section-title">Sıkça Sorulan Sorular</h2>
          <p className="lp-section-sub">Aklındaki soruların cevabı burada</p>
          <div className="lp-faq">
            {faqs.map((f, i) => (
              <div key={i} className={`lp-faq-item ${openFaq === i ? 'open' : ''}`}>
                <button className="lp-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{f.q}</span>
                  <span className="lp-faq-icon">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && <div className="lp-faq-a">{f.a}</div>}
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
              <a href="https://wa.me/905555555555" target="_blank" rel="noreferrer">WhatsApp</a>
            </div>
          </div>
        </div>
        <div className="lp-footer-social">
          <a href="https://instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.86 5.86 0 0 0-2.13 1.38A5.86 5.86 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.73 1.46 1.38 2.13a5.86 5.86 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.86 5.86 0 0 0 2.13-1.38 5.86 5.86 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.86 5.86 0 0 0-1.38-2.13A5.86 5.86 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0m0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84m0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4m6.4-11.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44"/></svg>
          </a>
          <a href="https://x.com/" target="_blank" rel="noreferrer" aria-label="X / Twitter">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://tiktok.com/" target="_blank" rel="noreferrer" aria-label="TikTok">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.85a8.16 8.16 0 0 0 4.77 1.52V6.93a4.85 4.85 0 0 1-1.84-.24"/></svg>
          </a>
          <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07"/></svg>
          </a>
        </div>
        <div className="lp-footer-bottom">© 2026 QR Hesap. Tüm hakları saklıdır.</div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/905555555555?text=Merhaba%2C%20QR%20Hesap%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum"
        target="_blank"
        rel="noreferrer"
        className="lp-whatsapp"
        aria-label="WhatsApp ile iletişim"
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="#fff">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </div>
  );
}
