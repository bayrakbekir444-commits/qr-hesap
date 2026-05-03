import React from 'react';
import { Link } from 'react-router-dom';

export default function LegalPage({ title, children, lastUpdate = '3 Mayıs 2026' }) {
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
        </div>
      </main>

      <footer className="legal-footer">
        <div className="legal-container">
          <div>© 2026 QR Hesap</div>
          <div className="legal-links">
            <Link to="/yasal/kvkk">KVKK</Link>
            <Link to="/yasal/gizlilik">Gizlilik</Link>
            <Link to="/yasal/cerez">Çerez</Link>
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
      <p>
        6698 sayılı <strong>Kişisel Verilerin Korunması Kanunu</strong> ("KVKK") uyarınca veri sorumlusu sıfatıyla
        kişisel verilerinizi aşağıdaki esaslar çerçevesinde işliyoruz. Bu metin, KVKK madde 10 kapsamında
        aydınlatma yükümlülüğümüzün yerine getirilmesi amacıyla hazırlanmıştır.
      </p>

      <h2>1. Veri Sorumlusu</h2>
      <p>
        <strong>QR Hesap</strong> (bundan sonra "Platform")<br />
        İletişim: <a href="mailto:info@qrhesap.com">info@qrhesap.com</a><br />
        Telefon / WhatsApp: 0543 696 05 74<br />
        <em>Şahıs şirketi kuruluşu sonrası ticari unvan ve adres bu alanda güncellenecektir.</em>
      </p>

      <h2>2. İşlenen Kişisel Veri Kategorileri</h2>

      <h3>2.1 Restoran Sahibi / Personel</h3>
      <ul>
        <li><strong>Kimlik:</strong> Restoran adı, ticari unvan, vergi numarası, personel adı</li>
        <li><strong>İletişim:</strong> E-posta, telefon, restoran adresi</li>
        <li><strong>Hesap güvenliği:</strong> Şifre (bcrypt ile geri döndürülemez şekilde şifrelenmiş)</li>
        <li><strong>Müşteri / işlem verileri:</strong> Açtığınız siparişler, masa bilgileri, ödeme tutarları, kupon kullanımı</li>
        <li><strong>Abonelik / fatura:</strong> Paket türü, ödeme geçmişi, fatura bilgileri</li>
      </ul>

      <h3>2.2 Restoran Müşterisi (QR ile menüye giren ziyaretçi)</h3>
      <ul>
        <li><strong>Sipariş verisi:</strong> Seçtiğiniz ürünler, miktar, masa numarası, sipariş zamanı</li>
        <li><strong>Sadakat puanı (isteğe bağlı):</strong> Telefon numarası — yalnızca açık rıza ile</li>
        <li><strong>Ödeme:</strong> Kart bilgileri <strong>doğrudan iyzico tarafından</strong> işlenir; sunucularımızda kart numarası saklanmaz</li>
        <li><strong>Teknik:</strong> IP adresi, çerezler (oturum yönetimi için), tarayıcı/cihaz bilgileri</li>
        <li><strong>Geri bildirim:</strong> Yorum ve yıldız değerlendirmesi (isteğe bağlı, anonim)</li>
      </ul>

      <h2>3. İşleme Amaçları</h2>
      <ul>
        <li>Hizmetin sunulması (sipariş, ödeme, garson çağırma, raporlama)</li>
        <li>Hesap oluşturma ve oturum yönetimi (JWT)</li>
        <li>Sadakat puanı ve kampanya yönetimi (açık rıza ile)</li>
        <li>Vergi Usul Kanunu, Türk Ticaret Kanunu kapsamında yasal yükümlülükler</li>
        <li>Hizmet kalitesinin iyileştirilmesi (anonim/topluca)</li>
        <li>Müşteri destek talepleri (e-posta, WhatsApp)</li>
        <li>Hukuki uyuşmazlıkların çözümü</li>
      </ul>

      <h2>4. İşlemenin Hukuki Sebebi (KVKK m.5)</h2>
      <ul>
        <li><strong>Sözleşmenin kurulması/ifası</strong> (KVKK m.5/2-c): hesap, sipariş, ödeme</li>
        <li><strong>Hukuki yükümlülük</strong> (KVKK m.5/2-ç): vergi, fatura, mali kayıt tutma</li>
        <li><strong>Meşru menfaat</strong> (KVKK m.5/2-f): hizmet güvenliği, log kayıtları, kötüye kullanım önleme</li>
        <li><strong>Açık rıza</strong> (KVKK m.5/1): sadakat puanı için telefon kaydı, pazarlama iletişimi</li>
      </ul>

      <h2>5. Verilerin Aktarımı</h2>
      <p>Kişisel verileriniz aşağıdaki üçüncü taraflara <strong>hizmet ifası amacıyla sınırlı olarak</strong> aktarılır:</p>
      <ul>
        <li><strong>iyzico (Türkiye)</strong> — ödeme işleme; KVKK kapsamında veri işleyendir</li>
        <li><strong>Render Inc. (ABD/Frankfurt-AB sunucuları)</strong> — uygulama ve veritabanı barındırma</li>
        <li><strong>Vercel Inc. (ABD/AB)</strong> — web ön yüzü dağıtımı (CDN)</li>
        <li><strong>Yetkili kamu kurum ve kuruluşları</strong> — yasal talep halinde (mahkeme kararı, mali müşavir, savcılık vs.)</li>
      </ul>
      <p>
        Yurtdışı aktarımlar KVKK m.9 kapsamında değerlendirilmektedir. Render ve Vercel'in bulunduğu
        ülkelerin yeterli koruma sağladığına ilişkin Kurul kararı bulunmamakla birlikte, taahhütname ve
        standart sözleşme hükümleri çerçevesinde aktarım yapılır. Mümkün olan tüm konularda AB merkezli
        sunucular tercih edilir.
      </p>

      <h2>6. Saklama Süreleri</h2>
      <ul>
        <li><strong>Hesap bilgileri:</strong> Hesap aktif olduğu sürece + iptal sonrası 30 gün</li>
        <li><strong>Sipariş ve ödeme kayıtları:</strong> Vergi Usul Kanunu m.253 gereği <strong>5 yıl</strong></li>
        <li><strong>Ticari defter ve fatura:</strong> Türk Ticaret Kanunu m.82 gereği <strong>10 yıl</strong></li>
        <li><strong>Sadakat puanı (telefon):</strong> Müşteri silme talebi gelene kadar veya 2 yıl pasiflik sonrası silinir</li>
        <li><strong>Çerez/oturum verileri:</strong> Oturum süresince (24 saat JWT) + log 90 gün</li>
        <li><strong>Yorum ve değerlendirmeler:</strong> Hesap aktif olduğu sürece</li>
      </ul>

      <h2>7. Veri Sahibi Hakları (KVKK m.11)</h2>
      <p>Aşağıdaki haklara sahipsiniz:</p>
      <ul>
        <li>Kişisel verinizin işlenip işlenmediğini öğrenme</li>
        <li>İşlenmişse buna ilişkin bilgi talep etme</li>
        <li>İşleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme</li>
        <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
        <li>Eksik/yanlış işlenmişse düzeltilmesini isteme</li>
        <li>KVKK m.7'de öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme</li>
        <li>Düzeltme/silme/yok etme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
        <li>Otomatik sistemlerle analiz sonucu aleyhinize çıkan sonuca itiraz etme</li>
        <li>Kanuna aykırı işleme sebebiyle zarara uğramışsanız tazminat talep etme</li>
      </ul>

      <h2>8. Başvuru Yöntemi</h2>
      <p>
        Haklarınızı kullanmak için <a href="mailto:info@qrhesap.com">info@qrhesap.com</a> adresine
        kimliğinizi tespit edici bilgilerle başvuru yapabilirsiniz. Başvurularınız KVKK m.13/2 uyarınca
        en geç <strong>30 gün</strong> içinde, kural olarak ücretsiz şekilde sonuçlandırılır.
      </p>
      <p>
        Başvurunuzu yazılı olarak veya kayıtlı elektronik posta (KEP), güvenli elektronik imza, mobil imza
        ya da daha önce bildirdiğiniz e-posta adresinizden iletebilirsiniz.
      </p>

      <h2>9. VERBİS</h2>
      <p>
        KVKK m.16 ve ilgili mevzuat çerçevesinde Veri Sorumluları Sicil Bilgi Sistemi (VERBİS) kayıt
        zorunluluğu, yıllık ciro ve çalışan sayısı eşiklerine bağlıdır. Eşiğin aşılması halinde kayıt
        yapılacak olup, kayıt durumu güncel olarak burada açıklanacaktır.
      </p>
    </LegalPage>
  );
}

export function PrivacyPage() {
  return (
    <LegalPage title="Gizlilik Politikası">
      <p>
        Bu Gizlilik Politikası; QR Hesap'ı ziyaret eden, hesap açan veya QR kod aracılığıyla menüye
        erişen kullanıcıların kişisel verilerinin nasıl toplandığını, işlendiğini ve korunduğunu açıklar.
        Detaylı KVKK metni için <Link to="/yasal/kvkk">KVKK Aydınlatma Metni</Link> sayfasını inceleyiniz.
      </p>

      <h2>1. Toplanan Bilgiler</h2>
      <ul>
        <li><strong>Hesap:</strong> Restoran adı, e-posta, telefon, bcrypt-şifrelenmiş parola</li>
        <li><strong>Operasyonel:</strong> Sipariş içerikleri, tutarlar, masa numarası, garson çağrıları, kupon kullanımı</li>
        <li><strong>Sadakat (isteğe bağlı):</strong> Müşteri telefon numarası — yalnızca açık rıza ile</li>
        <li><strong>Ödeme:</strong> Kart bilgileri <strong>iyzico</strong> tarafından PCI-DSS uyumlu işlenir; sunucularımıza ulaşmaz</li>
        <li><strong>Teknik:</strong> IP, tarayıcı, cihaz, çerezler (oturum + dil/tema tercihi)</li>
        <li><strong>Geri bildirim:</strong> Yorum ve yıldız puanı (anonim)</li>
      </ul>

      <h2>2. Kullanım Amaçları</h2>
      <ul>
        <li>Hizmetin sağlanması (sipariş, ödeme, garson çağrı, raporlar)</li>
        <li>Hesap güvenliği ve oturum yönetimi (JWT)</li>
        <li>Faturalama, yasal yükümlülükler (Vergi Usul Kanunu)</li>
        <li>Hizmetin iyileştirilmesi (anonim istatistik)</li>
        <li>Müşteri destek talepleri</li>
      </ul>

      <h2>3. Üçüncü Taraf Hizmet Sağlayıcılar (Veri İşleyenler)</h2>
      <p>Verilerinizi <strong>satmıyor, ticari amaçla paylaşmıyoruz</strong>. Yalnızca aşağıdaki hizmet sağlayıcılar görevleri kapsamında erişir:</p>
      <ul>
        <li><strong>iyzico (Türkiye)</strong> — ödeme işleme</li>
        <li><strong>Render Inc.</strong> — uygulama ve veritabanı barındırma (AB/ABD)</li>
        <li><strong>Vercel Inc.</strong> — web ön yüz CDN dağıtımı (AB/ABD)</li>
        <li><strong>Yasal merciler</strong> — mahkeme veya yetkili kamu kurum talebiyle sınırlı</li>
      </ul>

      <h2>4. Çerez Kullanımı</h2>
      <p>
        Çerezlere ilişkin detaylar için <Link to="/yasal/cerez">Çerez Politikası</Link> sayfasını inceleyiniz.
        Yalnızca zorunlu (oturum, güvenlik) ve fonksiyonel (dil, tema) çerez kullanılır;
        reklam ve takip çerezi kullanılmaz.
      </p>

      <h2>5. Veri Güvenliği</h2>
      <ul>
        <li>Tüm bağlantılar TLS/HTTPS ile şifrelenir</li>
        <li>Şifreler bcrypt ile geri döndürülemez şekilde özetlenir</li>
        <li>Veritabanı bağlantısı SSL üzerinden yapılır</li>
        <li>Erişim kontrolü JWT (24 saat) ile yapılır</li>
        <li>Otomatik yedekleme (Render Postgres günlük snapshot)</li>
        <li>Sızıntı tespitinde KVKK m.12/5 uyarınca 72 saat içinde Kuruma ve veri sahibine bildirim yapılır</li>
      </ul>

      <h2>6. Saklama Süreleri</h2>
      <p>
        Detay için <Link to="/yasal/kvkk">KVKK metni Bölüm 6</Link>. Özetle:
        ticari kayıtlar 5-10 yıl (yasal zorunluluk), hesap verileri iptal sonrası 30 gün,
        sadakat verisi 2 yıl pasiflik sonrası silinir.
      </p>

      <h2>7. Yaş Sınırı</h2>
      <p>
        Platform 18 yaş altı bireylere yönelik değildir. 18 yaş altındaysanız Platform üzerinden
        sipariş veremez veya hesap açamazsınız.
      </p>

      <h2>8. Politika Değişiklikleri</h2>
      <p>
        Bu politikayı güncelleyebiliriz. Önemli değişiklikler e-posta veya panel üzerinden duyurulur.
        Güncel sürüm her zaman bu sayfada yayınlanır; tarih başta belirtilir.
      </p>

      <h2>9. İletişim</h2>
      <p>
        Veri ile ilgili tüm talep ve sorularınız için <a href="mailto:info@qrhesap.com">info@qrhesap.com</a>
        veya WhatsApp 0543 696 05 74.
      </p>
    </LegalPage>
  );
}

export function CookiePage() {
  return (
    <LegalPage title="Çerez Politikası">
      <p>
        QR Hesap web sitesi ve uygulamaları, kullanıcı deneyimini geliştirmek ve hizmetin temel işlevlerini
        sağlayabilmek amacıyla çerez (cookie) ve benzeri yerel depolama teknolojileri (localStorage)
        kullanır. Bu sayfa, hangi çerezleri kullandığımızı ve neden kullandığımızı açıklar.
      </p>

      <h2>1. Çerez Nedir?</h2>
      <p>
        Çerez, sitelerin tarayıcınızda küçük bir veri parçası saklamasına olanak tanıyan teknik bir
        araçtır. localStorage benzer şekilde çalışır ve tarayıcı tarafında veri saklar.
      </p>

      <h2>2. Kullanılan Çerezler</h2>

      <h3>2.1 Zorunlu Çerezler (rıza gerekmez)</h3>
      <ul>
        <li><strong>token</strong> — Restoran panelinde JWT oturum bilgisi. Süre: 24 saat.</li>
        <li><strong>admin_token</strong> — Sistem yönetici paneli oturumu. Süre: 24 saat.</li>
        <li><strong>user_token / user_data</strong> — Müşteri (sadakat üyesi) oturum bilgisi. Süre: 24 saat.</li>
        <li><strong>qr_hesap_seen_orders</strong> — Bildirim merkezinde "görüldü" işaretli siparişler. Süre: 1 saat.</li>
      </ul>

      <h3>2.2 Fonksiyonel Çerezler</h3>
      <ul>
        <li><strong>qr_hesap_lang</strong> — Müşteri dil tercihi (TR/EN/AR). Süre: kalıcı.</li>
        <li><strong>qr_hesap_mv_theme</strong> — Menü tema tercihi (açık/koyu). Süre: kalıcı.</li>
        <li><strong>qr_hesap_loyalty_phone</strong> — Sadakat puanı sorgusu için kayıtlı telefon. Süre: kalıcı, kullanıcı silebilir.</li>
      </ul>

      <h3>2.3 Üçüncü Taraf Çerezler</h3>
      <p>
        Reklam, izleme veya analitik üçüncü taraf çerezi <strong>kullanılmaz</strong>. Vercel ve Render
        teknik sebeplerle (sunucu yük dengeleme) kendi çerezlerini ekleyebilir.
      </p>

      <h2>3. Çerezlerin Yönetimi</h2>
      <p>
        Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz. Bu durumda zorunlu çerezler
        engellendiğinde panel ve sipariş özellikleri çalışmayacaktır.
      </p>
      <ul>
        <li><strong>Chrome:</strong> Ayarlar → Gizlilik ve güvenlik → Çerezler</li>
        <li><strong>Safari:</strong> Tercihler → Gizlilik → Çerezler</li>
        <li><strong>Firefox:</strong> Ayarlar → Gizlilik ve Güvenlik → Çerezler ve Site Verileri</li>
      </ul>

      <h2>4. Değişiklikler</h2>
      <p>
        Bu politika güncellenirse tarih başta belirtilir. Önemli değişiklikler için ana sayfada
        bildirim yapılır.
      </p>

      <h2>5. İletişim</h2>
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
