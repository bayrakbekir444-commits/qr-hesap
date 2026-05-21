const express = require('express');
const http = require('http');
const cors = require('cors');
const { initDb, getPool } = require('./db/init');
const { baslat: yedekBaslat } = require('./db/backup');
const { seed } = require('./db/seed');
const { updateImages } = require('./db/update-images');
const { initRealtime } = require('./utils/realtime');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const menuRoutes = require('./routes/menu');
const tablesRoutes = require('./routes/tables');
const ordersRoutes = require('./routes/orders');
const paymentsRoutes = require('./routes/payments');
const reportsRoutes = require('./routes/reports');
const waiterRoutes = require('./routes/waiter');
const reviewsRoutes = require('./routes/reviews');
const campaignsRoutes = require('./routes/campaigns');
const staffRoutes = require('./routes/staff');
const loyaltyRoutes = require('./routes/loyalty');
const receiptsRoutes = require('./routes/receipts');
const usersRoutes = require('./routes/users');
const walletRoutes = require('./routes/wallet');
const notificationsRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — production'da CORS_ORIGIN env'inden domain listesi
const corsRaw = process.env.CORS_ORIGIN || '';
const corsOrigin = corsRaw === '*' || corsRaw === ''
  ? true // hepsine açık
  : corsRaw.split(',').map((s) => s.trim());

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

// Health check (Render bunu kullanır)
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'qrhesap-api', time: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/waiter', waiterRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/kitchen', require('./routes/kitchen'));
app.use('/api/ai-waiter', require('./routes/ai-waiter'));

// Sağlık kontrolü
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'QR Hesap API çalışıyor.' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı.' });
});

// Hata yakalayıcı
app.use((err, req, res, next) => {
  console.error('Beklenmeyen hata:', err);
  res.status(500).json({ error: 'Sunucu hatası.' });
});

// Veritabanını async başlat, sonra dinlemeye geç
(async () => {
  try {
    await initDb();

    // Boş DB tespit edilirse demo seed + image URL'leri otomatik doldur
    try {
      const { rows } = await getPool().query("SELECT COUNT(*)::int AS c FROM restaurants");
      if (rows[0].c === 0) {
        console.log('🌱 Boş veritabanı tespit edildi, demo seed çalıştırılıyor...');
        await seed();
        const r = await updateImages();
        console.log(`✓ Seed tamam, ${r.updated}/${r.total} ürün fotoğrafı güncellendi.`);
      }
    } catch (seedErr) {
      console.error('Auto-seed hatası (devam ediliyor):', seedErr.message);
    }

    yedekBaslat();

    const httpServer = http.createServer(app);
    initRealtime(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`QR Hesap API http://localhost:${PORT} adresinde çalışıyor (Socket.IO aktif).`);
    });
  } catch (err) {
    console.error('Veritabanı başlatma hatası:', err);
    process.exit(1);
  }
})();

module.exports = app;
