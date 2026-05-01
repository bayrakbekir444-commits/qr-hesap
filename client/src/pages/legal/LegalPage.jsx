import React from 'react';
import { Link } from 'react-router-dom';

export default function LegalPage({ title, children, lastUpdate = '1 Mayıs 2026' }) {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="legal-container">
          <Link to="/" className="legal-logo">🧾 QR Hesap</Link>
          <Link to="/" className="legal-back">← Ana sayfa</Link>
        </div>
      </header>

      <main className="legal-main">
        <div className="legal-container legal-content">
          <h1>{title}</h1>
          <p className="legal-update">Son güncelleme: {lastUpdate}</p>
          {children}
          <div className="legal-disclaimer">
            <strong>⚠️ Not:</strong> Bu metin yasal şablondur, demo aşamasındadır.
            Gerçek müşteri verisi toplamaya başlanmadan önce KVKK uzmanı bir avukat tarafından gözden geçirilmesi önerilir.
          </div>
        </div>
      </main>

      <footer className="legal-footer">
        <div className="legal-container">
          <div>© 2026 QR Hesap</div>
          <div className="legal-links">
            <Link to="/yasal/kvkk">KVKK</Link>
            <Link to="/yasal/gizlilik">Gizlilik</Link>
            <Link to="/yasal/kullanim">Kullanım Koşulları</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────
// Sayfalar
// ─────────────────────────────────────────

export function KvkkPage() {
  return (
    <LegalPage title="KVKK Aydınlatma Metni">
      <h2>1. Veri Sorumlusu</h2>
      <p>
        QR Hesap (bundan sonra "Platform") olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK")
        kapsamında veri sorumlusu sıfatıyla kişisel verilerinizi aşağıda açıklanan amaçlar doğrultusunda işlemekteyiz.
      </p>

      <h2>2. İşlenen Kişisel Veriler</h2>
      <p>Aşağıdaki kişisel verileriniz işlenebilir:</p>
      <ul>
        <li><strong>Kimlik:</strong> Ad-soyad, restoran adı, vergi numarası</li>
        <li><strong>İletişim:</strong> E-posta, telefon, adres</li>
        <li><strong>Müşteri verileri (restoran):</strong> sipariş geçmişi, ödeme tutarları, masa numarası</li>
        <li><strong>Teknik:</strong> IP adresi, tarayıcı bilgileri, çerezler</li>
      </ul>

      <h2>3. Kişisel Verilerin İşlenme Amaçları</h2>
      <ul>
        <li>Hizmetin sunulması ve sürdürülmesi</li>
        <li>Hesap oluşturma ve yönetimi</li>
        <li>Faturalama ve ödeme işlemleri</li>
        <li>Müşteri destek hizmetleri</li>
        <li>Yasal yükümlülüklerin yerine getirilmesi</li>
        <li>İstatistik ve analiz çalışmaları (anonim)</li>
      </ul>

      <h2>4. Verilerin Aktarımı</h2>
      <p>
        Kişisel verileriniz; ödeme altyapısı sağlayıcıları (iyzico vb.), yurtdışı sunucu sağlayıcıları
        (Render, Vercel) ve yasal yükümlülükler nedeniyle yetkili kamu kurum ve kuruluşlarına aktarılabilir.
      </p>

      <h2>5. Veri Sahibi Hakları</h2>
      <p>KVKK madde 11 kapsamında aşağıdaki haklara sahipsiniz:</p>
      <ul>
        <li>Verilerin işlenip işlenmediğini öğrenme</li>
        <li>Verilerin işlenmişse buna ilişkin bilgi talep etme</li>
        <li>İşleme amacını ve uygun kullanılıp kullanılmadığını öğrenme</li>
        <li>Verilerin silinmesini veya yok edilmesini isteme</li>
        <li>Düzeltme talep etme</li>
        <li>Verilerin yurt içi/yurt dışı aktarıldığı kişileri bilme</li>
      </ul>

      <h2>6. İletişim</h2>
      <p>
        KVKK ile ilgili taleplerinizi <a href="mailto:info@qrhesap.com">info@qrhesap.com</a> adresine
        veya WhatsApp üzerinden 0543 696 05 74 numarasına iletebilirsiniz.
      </p>
    </LegalPage>
  );
}

export function PrivacyPage() {
  return (
    <LegalPage title="Gizlilik Politikası">
      <p>
        QR Hesap olarak gizliliğinize saygı duyuyor, kişisel verilerinizin güvenliğini önemsiyoruz.
        Bu politika, Platform'u nasıl kullandığınızı ve verilerinizin nasıl işlendiğini açıklar.
      </p>

      <h2>1. Topladığımız Bilgiler</h2>
      <ul>
        <li><strong>Hesap bilgileri:</strong> Restoran adı, e-posta, şifre (şifrelenmiş)</li>
        <li><strong>Kullanım verileri:</strong> Hangi özelliği ne zaman kullandığınız</li>
        <li><strong>Sipariş verileri:</strong> Müşterilerin sipariş ettiği ürünler, tutarlar</li>
        <li><strong>Ödeme bilgileri:</strong> iyzico aracılığıyla işlenir, kart bilgileri sunucularımızda saklanmaz</li>
        <li><strong>Teknik:</strong> IP adresi, cihaz ve tarayıcı türü, çerezler</li>
      </ul>

      <h2>2. Bilgileri Nasıl Kullanıyoruz</h2>
      <ul>
        <li>Hizmeti sağlamak ve geliştirmek</li>
        <li>Hesap güvenliğini sağlamak</li>
        <li>Faturalama yapmak</li>
        <li>Yeni özelliklerden ve güncellemelerden haberdar etmek (isteğe bağlı)</li>
        <li>Yasal zorunluluklara uymak</li>
      </ul>

      <h2>3. Bilgi Paylaşımı</h2>
      <p>Verilerinizi <strong>satmıyoruz</strong>. Sadece şu durumlarda paylaşırız:</p>
      <ul>
        <li><strong>Hizmet sağlayıcılar:</strong> iyzico (ödeme), Render (sunucu), Vercel (web), e-posta gönderim servisleri</li>
        <li><strong>Yasal zorunluluk:</strong> Mahkeme kararı, yetkili kamu kurumları</li>
        <li><strong>İş devri:</strong> Şirket satışı/birleşmesi durumunda</li>
      </ul>

      <h2>4. Çerezler (Cookies)</h2>
      <p>
        Platform'da oturum açma ve tercihleri hatırlama için çerez kullanırız.
        Tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz, ancak bu durumda bazı özellikler çalışmayabilir.
      </p>

      <h2>5. Veri Güvenliği</h2>
      <ul>
        <li>Şifreler bcrypt ile şifrelenir</li>
        <li>Bağlantılar HTTPS/SSL ile korunur</li>
        <li>Düzenli yedekleme yapılır</li>
        <li>Yetkisiz erişimi önlemek için JWT tabanlı oturum yönetimi</li>
      </ul>

      <h2>6. Verilerin Saklanma Süresi</h2>
      <p>
        Hesabınız aktif olduğu sürece verileriniz saklanır. Hesap silindikten sonra 30 gün içinde tüm
        veriler silinir veya anonim hale getirilir. Yasal saklama yükümlülükleri (vergi vb.) için
        bazı veriler daha uzun saklanabilir.
      </p>

      <h2>7. Çocukların Gizliliği</h2>
      <p>
        Platform 18 yaş altındaki bireylere yönelik değildir. 18 yaş altındaysanız Platform'u kullanmayınız.
      </p>

      <h2>8. Politika Değişiklikleri</h2>
      <p>
        Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişikliklerde e-posta ile bilgilendirme yaparız.
      </p>

      <h2>9. İletişim</h2>
      <p>
        Sorularınız için <a href="mailto:info@qrhesap.com">info@qrhesap.com</a>
      </p>
    </LegalPage>
  );
}

export function TermsPage() {
  return (
    <LegalPage title="Kullanım Koşulları">
      <p>
        QR Hesap'a hoş geldiniz. Platform'u kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.
        Kabul etmiyorsanız Platform'u kullanmayınız.
      </p>

      <h2>1. Hizmetin Tanımı</h2>
      <p>
        QR Hesap, restoranlara QR kod tabanlı dijital menü, sipariş takibi ve ödeme yönetimi
        SaaS hizmeti sunar. Hizmet "olduğu gibi" sağlanır.
      </p>

      <h2>2. Hesap Oluşturma</h2>
      <ul>
        <li>Hesap açabilmek için 18 yaşından büyük ve hukuki ehliyete sahip olmalısınız</li>
        <li>Verdiğiniz bilgiler doğru ve güncel olmalıdır</li>
        <li>Hesap güvenliği sizin sorumluluğunuzdadır (şifre paylaşmayın)</li>
        <li>Yasal olmayan veya zararlı içerik yüklenemez</li>
      </ul>

      <h2>3. Ücretler ve Ödeme</h2>
      <ul>
        <li>Aylık abonelik ücretleri Fiyatlandırma sayfasında belirtilmiştir</li>
        <li>Ödemeler iyzico aracılığıyla işlenir</li>
        <li>İade politikası: ilk 7 gün içinde memnun kalmazsanız iade yapılır</li>
        <li>Ücretler ön bildirim ile değişebilir</li>
      </ul>

      <h2>4. Hizmetin Kullanımı</h2>
      <p>Şu durumlarda hesabınız askıya alınabilir veya silinebilir:</p>
      <ul>
        <li>Yasalara aykırı kullanım</li>
        <li>Sistemlere zarar vermeye çalışma</li>
        <li>Ödeme yapmama</li>
        <li>Üçüncü şahıs haklarına tecavüz</li>
        <li>Spam veya kötüye kullanım</li>
      </ul>

      <h2>5. Fikri Mülkiyet</h2>
      <p>
        QR Hesap markası, logosu, yazılımı, tasarımı ve içeriği fikri mülkiyet haklarımız altındadır.
        Yazılı izin olmadan kopyalanamaz, dağıtılamaz veya tersine mühendislik yapılamaz.
      </p>

      <h2>6. Sorumluluğun Sınırı</h2>
      <ul>
        <li>Hizmette yaşanabilecek geçici kesintilerden sorumlu değiliz (en az %99 uptime hedefliyoruz)</li>
        <li>Restoranın müşterileriyle yaşadığı sorunlardan sorumlu değiliz</li>
        <li>Veri kaybı durumunda yedeklerden geri yükleme yapılır, ancak garanti edilemez</li>
        <li>Maksimum sorumluluğumuz son 12 ayda ödediğiniz aboneliğin toplamı ile sınırlıdır</li>
      </ul>

      <h2>7. Hizmetin Sonlandırılması</h2>
      <ul>
        <li>İstediğiniz zaman aboneliğinizi iptal edebilirsiniz</li>
        <li>Verilerinizi 30 gün içinde indirebilirsiniz</li>
        <li>30 gün sonra tüm veriler silinir</li>
      </ul>

      <h2>8. Uyuşmazlık Çözümü</h2>
      <p>
        Bu sözleşmeden doğan uyuşmazlıklar Türkiye Cumhuriyeti yasalarına tabidir.
        Yetkili mahkeme ve icra daireleri İstanbul'dur.
      </p>

      <h2>9. Değişiklikler</h2>
      <p>
        Bu koşulları zaman zaman güncelleyebiliriz. Önemli değişiklikler e-posta ile bildirilir.
        Devam eden kullanım, güncellenmiş koşulların kabulü anlamına gelir.
      </p>

      <h2>10. İletişim</h2>
      <p>
        Sorularınız için: <a href="mailto:info@qrhesap.com">info@qrhesap.com</a> ·
        WhatsApp: 0543 696 05 74
      </p>
    </LegalPage>
  );
}
