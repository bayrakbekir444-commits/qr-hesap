import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const slides = [
  // 1 — Kapak
  {
    type: 'cover',
    content: (
      <>
        <div className="pd-logo">🧾</div>
        <h1>QR Hesap</h1>
        <p className="pd-tagline">Müşteriniz QR ile sipariş, tek tuşla ödeme</p>
        <div className="pd-cover-meta">2026 · Türkiye</div>
      </>
    ),
  },
  // 2 — Problem
  {
    type: 'standard',
    title: 'Sorun',
    sub: 'Restoranlar 21. yüzyıla geçemedi',
    content: (
      <ul className="pd-list">
        <li>📋 Kağıt menü — yıpranıyor, fotoğraf yok, yeni ürün eklemek zor</li>
        <li>⏳ Müşteri 10-15 dk garson bekliyor (sipariş + hesap için)</li>
        <li>💸 Kasada 5-10 dk kuyruk → müşteri sinirli ayrılıyor</li>
        <li>📞 Sipariş notları kayboluyor, mutfak yanlış anlıyor</li>
        <li>📊 Restoran sahibi ne sattığını, hangi saatte yoğun olduğunu bilmiyor</li>
        <li>🌍 Yabancı turist menüyü okuyamıyor</li>
      </ul>
    ),
  },
  // 3 — Çözüm
  {
    type: 'standard',
    title: 'Çözüm',
    sub: 'QR Hesap = restoranın dijital asistanı',
    content: (
      <div className="pd-grid-2">
        <div>
          <h3>📱 Müşteri</h3>
          <ul>
            <li>QR okutur → fotoğraflı menü açılır</li>
            <li>Sipariş verir, mutfağa anında gider</li>
            <li>Garson çağırır, "geldim" der</li>
            <li>Kalkarken kartla öder, ayrılır</li>
          </ul>
        </div>
        <div>
          <h3>💼 Restoran</h3>
          <ul>
            <li>Tek panelden tüm operasyon</li>
            <li>Anlık sipariş bildirimi (zil + ses)</li>
            <li>Günlük rapor, en çok satan ürün</li>
            <li>Stok takibi, kupon, sadakat puanı</li>
          </ul>
        </div>
      </div>
    ),
  },
  // 4 — Nasıl çalışır
  {
    type: 'steps',
    title: 'Nasıl Çalışır',
    sub: '30 dakikada kuruluma hazır',
    content: (
      <div className="pd-steps">
        <div className="pd-step">
          <div className="pd-step-num">1</div>
          <h4>Hesap aç</h4>
          <p>Restoran adı + şifre</p>
        </div>
        <div className="pd-step">
          <div className="pd-step-num">2</div>
          <h4>Menünü yükle</h4>
          <p>Kategoriler, ürünler, fotoğraflar</p>
        </div>
        <div className="pd-step">
          <div className="pd-step-num">3</div>
          <h4>QR yapıştır</h4>
          <p>PDF yazdır, masalara koy</p>
        </div>
        <div className="pd-step">
          <div className="pd-step-num">4</div>
          <h4>Çalışmaya başla</h4>
          <p>Müşteri okutsun, sistem ilerlesin</p>
        </div>
      </div>
    ),
  },
  // 5 — Özellikler
  {
    type: 'features',
    title: 'Özellikler',
    sub: 'Tek panelde restoranın tamamı',
    content: (
      <div className="pd-features">
        {[
          ['📷', 'Fotoğraflı Menü', '18+ ürün gerçek fotoğraflarla'],
          ['🔔', 'Garson Çağırma', 'Anlık zil + bildirim'],
          ['🍽️', 'Sipariş Takibi', 'Mutfak, garson, kasa eşzamanlı'],
          ['📊', 'Detaylı Raporlar', 'Günlük ciro, popüler ürünler, PDF'],
          ['📱', 'QR Yazdırma', 'PNG ve toplu PDF'],
          ['🌍', 'Çoklu Dil', 'TR / EN / AR'],
          ['📦', 'Stok Takibi', '"Son 3 adet kaldı"'],
          ['🎟️', 'Kupon & Sadakat', 'Müşteri kazanma'],
          ['⭐', 'Yorum Sistemi', 'Yıldız puan + yorum'],
        ].map(([icon, title, desc], i) => (
          <div key={i} className="pd-feat">
            <span className="pd-feat-icon">{icon}</span>
            <div>
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  // 6 — Pazar
  {
    type: 'standard',
    title: 'Pazar',
    sub: 'Türkiye\'de devasa fırsat',
    content: (
      <div className="pd-stats">
        <div className="pd-stat">
          <div className="pd-stat-num">~250.000</div>
          <div className="pd-stat-label">Restoran & kafe (Türkiye, TUİK)</div>
        </div>
        <div className="pd-stat">
          <div className="pd-stat-num">%85</div>
          <div className="pd-stat-label">Hâlâ kağıt menü kullanıyor</div>
        </div>
        <div className="pd-stat">
          <div className="pd-stat-num">₺2.000/ay</div>
          <div className="pd-stat-label">Ortalama Pro paket geliri</div>
        </div>
        <div className="pd-stat">
          <div className="pd-stat-num">₺6 milyar</div>
          <div className="pd-stat-label">Toplam yıllık pazar (TAM)</div>
        </div>
      </div>
    ),
  },
  // 7 — İş Modeli
  {
    type: 'pricing',
    title: 'İş Modeli',
    sub: 'SaaS abonelik — 3 paket',
    content: (
      <div className="pd-plans">
        <div className="pd-plan">
          <h4>Temel</h4>
          <div className="pd-price">₺800<span>/ay</span></div>
          <ul>
            <li>10 masa</li>
            <li>Fotoğraflı menü</li>
            <li>Sipariş + garson</li>
          </ul>
        </div>
        <div className="pd-plan featured">
          <div className="pd-plan-tag">⭐ En çok</div>
          <h4>Pro</h4>
          <div className="pd-price">₺2.000<span>/ay</span></div>
          <ul>
            <li>30 masa</li>
            <li>Detaylı raporlar</li>
            <li>Çoklu personel</li>
            <li>Kupon + Sadakat</li>
          </ul>
        </div>
        <div className="pd-plan">
          <h4>Zincir</h4>
          <div className="pd-price">₺4.000<span>/ay</span></div>
          <ul>
            <li>Sınırsız masa & şube</li>
            <li>API erişimi</li>
            <li>Birebir destek</li>
          </ul>
        </div>
      </div>
    ),
  },
  // 8 — Yol haritası
  {
    type: 'standard',
    title: 'Yol Haritası',
    sub: '6 ayda yapılacaklar',
    content: (
      <div className="pd-roadmap">
        <div className="pd-rm-item done">
          <span>✅</span>
          <div><h4>Web platformu</h4><p>Backend + müşteri menüsü + restoran paneli + raporlar (TAMAM)</p></div>
        </div>
        <div className="pd-rm-item current">
          <span>🚧</span>
          <div><h4>Gerçek ödeme entegrasyonu</h4><p>iyzico ile kart ödeme, 3DS doğrulama</p></div>
        </div>
        <div className="pd-rm-item">
          <span>📱</span>
          <div><h4>Native mobil app</h4><p>App Store + Google Play (garson/mutfak için)</p></div>
        </div>
        <div className="pd-rm-item">
          <span>🤖</span>
          <div><h4>AI özellikleri</h4><p>Akıllı menü önerileri, popüler ürün tahmini</p></div>
        </div>
        <div className="pd-rm-item">
          <span>🌍</span>
          <div><h4>Yurt dışı genişleme</h4><p>Avrupa & Orta Doğu pazarları</p></div>
        </div>
      </div>
    ),
  },
  // 9 — Takım
  {
    type: 'standard',
    title: 'Takım',
    sub: 'Hızlı, kararlı, kullanıcı odaklı',
    content: (
      <div className="pd-team">
        <div className="pd-team-card">
          <div className="pd-avatar">👨‍💻</div>
          <h3>Bekir Bayrak</h3>
          <p className="pd-role">Kurucu / Geliştirici</p>
          <p>Tam yığın geliştirme, ürün vizyonu, satış</p>
        </div>
      </div>
    ),
  },
  // 10 — İletişim
  {
    type: 'contact',
    content: (
      <>
        <h2>Hadi Birlikte Çalışalım 🤝</h2>
        <p className="pd-tagline">QR Hesap'ı kendi restoranınıza getirin</p>
        <div className="pd-contact">
          <div>📧 info@qrhesap.com</div>
          <div>📱 0543 696 05 74</div>
          <div>🌐 qr-hesap.vercel.app</div>
        </div>
        <div style={{ marginTop: 40 }}>
          <a href="https://qr-hesap.vercel.app" className="pd-cta">Demo'yu Aç →</a>
        </div>
      </>
    ),
  },
];

export default function PitchDeck() {
  const [idx, setIdx] = useState(0);
  const total = slides.length;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') setIdx((i) => Math.min(i + 1, total - 1));
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') setIdx((i) => Math.max(i - 1, 0));
      if (e.key === 'Home') setIdx(0);
      if (e.key === 'End') setIdx(total - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total]);

  const slide = slides[idx];

  return (
    <div className="pd-wrap">
      <div className={`pd-slide pd-slide-${slide.type}`}>
        {slide.title && (
          <div className="pd-header">
            <h2>{slide.title}</h2>
            {slide.sub && <p>{slide.sub}</p>}
          </div>
        )}
        <div className="pd-body">{slide.content}</div>
      </div>

      <div className="pd-nav">
        <button onClick={() => setIdx((i) => Math.max(i - 1, 0))} disabled={idx === 0}>← Önceki</button>
        <span className="pd-counter">{idx + 1} / {total}</span>
        <button onClick={() => setIdx((i) => Math.min(i + 1, total - 1))} disabled={idx === total - 1}>Sonraki →</button>
      </div>

      <div className="pd-actions">
        <button onClick={() => window.print()}>🖨️ PDF</button>
        <Link to="/">← Ana sayfa</Link>
      </div>

      <div className="pd-progress">
        <div className="pd-progress-bar" style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>
    </div>
  );
}
