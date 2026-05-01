# QR Hesap — Yapılacaklar

## 🔴 Yayın için kritik (sırayla)

### 1. Şahıs şirketi aç
- Muhasebeci ile veya e-Devlet üzerinden
- Süre: 1-3 iş günü
- Maliyet: ~₺500-1.500 kuruluş + ~₺1.000-2.000/ay muhasebe
- Faaliyet kodu: NACE 62.01.01 (Bilgisayar programlama)

### 2. iyzico tüccar hesabı aç
- iyzico.com → şirket evrakı yükle
- Süre: 1-3 iş günü onay
- Test API anahtarı anında verilir

### 3. iyzico entegrasyonunu kodla
- Backend: `routes/payments.js` → iyzico SDK + 3DS callback
- Frontend: `PaymentPage.jsx` → iyzico hosted checkout veya kendi formu
- Ben yapacağım, ~6 saat kod
- Test → production

### 4. Postgres Pro plan'a geç ⚠️ DEADLINE
- **Son tarih: 30 Mayıs 2026** (yoksa veriler silinir)
- Render dashboard → qr-hesap-db → Settings → Instance Type
- Plan: **Basic-256mb** ($6/ay = ~₺220/ay)
- Kart bilgisi gerekli
- ⏰ **Hatırlatma: 20-25 Mayıs 2026'da yap**

### 5. Domain al (opsiyonel ama önerilir)
- isimtescil.net'ten **qrhesap.net** (~₺250/yıl)
- Vercel + Render'a bağla
- `qr-hesap.vercel.app` yerine `qrhesap.net`

---

## 🟡 Yayın sonrası

### 6. Mobil app testi (Expo Go)
- Telefonda Expo Go indir
- `npm start` (restoran-app klasöründe)
- QR'ı tara, login, ekranları test et

### 7. Mobil app App Store / Play Store
- Apple Developer hesabı: $99/yıl
- Google Play hesabı: $25 tek seferlik
- EAS Build ile yayın

### 8. KVKK / sözleşmeler avukat onayı
- Mevcut şablon metinler `/yasal/*` adreslerinde
- Avukatla 1 saatlik gözden geçirme önerilir (~₺2.000-4.000)

---

## 🟢 İş tarafı

### 9. İlk müşteri
- Restoran arkadaşına/tanıdığa demo göster
- Geri bildirim al
- Ücretsiz pilot (1 ay) sun

### 10. Pazarlama
- Instagram / TikTok hesabı aç
- Demo videosu çek (1-2 dakika)
- Restoran sahiplerine WhatsApp ile DM gönder

---

## ✅ TAMAMLANANLAR

- ✅ Backend (Render + Postgres)
- ✅ Frontend (Vercel)
- ✅ Müşteri menüsü (fotoğraflı, kategori sekmeleri, arama, tema, çoklu dil TR/EN/AR)
- ✅ Yönetim paneli (sidebar, drag-drop, stok takibi, yorumlar)
- ✅ Garson çağırma + bildirim widget
- ✅ Sipariş + ödeme akışı (3D kart, bahşiş, kupon, başarı animasyonu, fiş PDF)
- ✅ QR yazdırma (PNG + PDF)
- ✅ Sadakat puanı UI
- ✅ Şefin Önerisi rozeti
- ✅ Landing page (hero, özellikler, fiyatlar, SSS, sosyal medya, WhatsApp)
- ✅ Yasal sayfalar (KVKK, Gizlilik, Kullanım — şablon)
- ✅ 404 sayfası
- ✅ 20 masa, Pro paket
- ✅ Restoran logosu menüde

---

📅 Son güncelleme: 2026-05-01
