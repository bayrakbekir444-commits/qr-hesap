const express = require('express');
const cors = require('cors');
const { initDb } = require('./db/init');
const { baslat: yedekBaslat } = require('./db/backup');

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

// Middleware
app.use(cors());
app.use(express.json());

// Veritabanını başlat
initDb();

// Otomatik yedekleme başlat (günlük, son 7 gün tutulur)
yedekBaslat();

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

app.listen(PORT, () => {
  console.log(`QR Hesap API http://localhost:${PORT} adresinde çalışıyor.`);
});

module.exports = app;
