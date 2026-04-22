const express = require('express');
const PDFDocument = require('pdfkit');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
const { requireFeature } = require('../middleware/packages');

const router = express.Router();

// Raporlar Pro+ paket gerektirir
router.use(authMiddleware, requireFeature('reports'));

// GET /api/reports/daily?date=YYYY-MM-DD - Günlük gelir raporu
router.get('/daily', authMiddleware, (req, res) => {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Geçerli bir tarih giriniz (YYYY-MM-DD).' });
    }

    const db = getDb();

    // O güne ait kapatılmış siparişler
    const orders = db.prepare(
      `SELECT o.* FROM orders o
       JOIN tables t ON o.table_id = t.id
       WHERE t.restaurant_id = ?
       AND date(o.created_at) = ?
       AND o.status = 'closed'`
    ).all(req.restaurantId, date);

    const orderIds = orders.map((o) => o.id);

    let totalRevenue = 0;
    let totalTips = 0;
    let totalOrders = orders.length;
    let totalItems = 0;
    let categoryBreakdown = [];

    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');

      // Toplam gelir
      const revenue = db.prepare(
        `SELECT SUM(oi.quantity * oi.unit_price) as total, SUM(oi.quantity) as item_count
         FROM order_items oi
         WHERE oi.order_id IN (${placeholders})`
      ).get(...orderIds);

      totalRevenue = revenue.total || 0;
      totalItems = revenue.item_count || 0;

      // Bahşiş toplamı
      const tips = db.prepare(
        `SELECT SUM(tip) as total FROM payments
         WHERE order_id IN (${placeholders}) AND status = 'paid'`
      ).get(...orderIds);

      totalTips = tips.total || 0;

      // Kategori bazlı dağılım
      categoryBreakdown = db.prepare(
        `SELECT c.name as category_name,
                SUM(oi.quantity) as item_count,
                SUM(oi.quantity * oi.unit_price) as total
         FROM order_items oi
         JOIN menu_items mi ON oi.menu_item_id = mi.id
         JOIN categories c ON mi.category_id = c.id
         WHERE oi.order_id IN (${placeholders})
         GROUP BY c.id
         ORDER BY total DESC`
      ).all(...orderIds);
    }

    // Açık siparişler de bilgi olarak ekle
    const openOrders = db.prepare(
      `SELECT COUNT(*) as count FROM orders o
       JOIN tables t ON o.table_id = t.id
       WHERE t.restaurant_id = ?
       AND date(o.created_at) = ?
       AND o.status = 'open'`
    ).get(req.restaurantId, date);

    res.json({
      date,
      total_revenue: totalRevenue,
      total_tips: totalTips,
      total_orders: totalOrders,
      open_orders: openOrders.count,
      total_items: totalItems,
      average_order: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      category_breakdown: categoryBreakdown,
    });
  } catch (err) {
    console.error('Rapor hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/reports/weekly?date=YYYY-MM-DD - Haftalık gelir raporu
router.get('/weekly', authMiddleware, (req, res) => {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Geçerli bir tarih giriniz (YYYY-MM-DD).' });
    }

    const db = getDb();

    // Haftanın başlangıcını bul (Pazartesi)
    const inputDate = new Date(date);
    const dayOfWeek = inputDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(inputDate);
    monday.setDate(inputDate.getDate() + mondayOffset);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dayStr = d.toISOString().split('T')[0];

      const row = db.prepare(
        `SELECT
           COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue,
           COUNT(DISTINCT o.id) as order_count,
           COALESCE(SUM(p.tip), 0) as tips
         FROM orders o
         JOIN tables t ON o.table_id = t.id
         LEFT JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'paid'
         WHERE t.restaurant_id = ?
         AND date(o.created_at) = ?
         AND o.status = 'closed'`
      ).get(req.restaurantId, dayStr);

      days.push({
        date: dayStr,
        revenue: row.revenue || 0,
        order_count: row.order_count || 0,
        tips: row.tips || 0,
      });
    }

    res.json(days);
  } catch (err) {
    console.error('Haftalık rapor hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/reports/monthly?year=YYYY&month=MM - Aylık gelir raporu
router.get('/monthly', authMiddleware, (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month || !/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month)) {
      return res.status(400).json({ error: 'Geçerli yıl (YYYY) ve ay (MM) giriniz.' });
    }

    const db = getDb();

    const paddedMonth = month.padStart(2, '0');
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = `${year}-${paddedMonth}-${String(i).padStart(2, '0')}`;

      const row = db.prepare(
        `SELECT
           COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue,
           COUNT(DISTINCT o.id) as order_count,
           COALESCE(SUM(p.tip), 0) as tips
         FROM orders o
         JOIN tables t ON o.table_id = t.id
         LEFT JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'paid'
         WHERE t.restaurant_id = ?
         AND date(o.created_at) = ?
         AND o.status = 'closed'`
      ).get(req.restaurantId, dayStr);

      days.push({
        date: dayStr,
        revenue: row.revenue || 0,
        order_count: row.order_count || 0,
        tips: row.tips || 0,
      });
    }

    res.json(days);
  } catch (err) {
    console.error('Aylık rapor hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/reports/daily/pdf?date=YYYY-MM-DD - Günlük PDF rapor
router.get('/daily/pdf', (req, res) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Geçerli bir tarih giriniz (YYYY-MM-DD).' });
    }

    const db = getDb();
    const restaurant = db.prepare('SELECT name FROM restaurants WHERE id = ?').get(req.restaurantId);

    // Günlük veri
    const orders = db.prepare(
      `SELECT o.* FROM orders o
       JOIN tables t ON o.table_id = t.id
       WHERE t.restaurant_id = ? AND date(o.created_at) = ? AND o.status = 'closed'`
    ).all(req.restaurantId, date);

    const orderIds = orders.map((o) => o.id);
    let totalRevenue = 0;
    let totalItems = 0;
    let totalTips = 0;
    let categoryBreakdown = [];
    let topItems = [];

    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');

      const revenue = db.prepare(
        `SELECT SUM(oi.quantity * oi.unit_price) as total, SUM(oi.quantity) as cnt
         FROM order_items oi WHERE oi.order_id IN (${placeholders})`
      ).get(...orderIds);
      totalRevenue = revenue.total || 0;
      totalItems = revenue.cnt || 0;

      const tips = db.prepare(
        `SELECT SUM(tip) as t FROM payments WHERE order_id IN (${placeholders}) AND status = 'paid'`
      ).get(...orderIds);
      totalTips = tips.t || 0;

      categoryBreakdown = db.prepare(
        `SELECT c.name as category_name, SUM(oi.quantity) as cnt, SUM(oi.quantity * oi.unit_price) as total
         FROM order_items oi
         JOIN menu_items mi ON oi.menu_item_id = mi.id
         JOIN categories c ON mi.category_id = c.id
         WHERE oi.order_id IN (${placeholders})
         GROUP BY c.id ORDER BY total DESC`
      ).all(...orderIds);

      topItems = db.prepare(
        `SELECT mi.name, SUM(oi.quantity) as cnt, SUM(oi.quantity * oi.unit_price) as total
         FROM order_items oi
         JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE oi.order_id IN (${placeholders})
         GROUP BY mi.id ORDER BY cnt DESC LIMIT 10`
      ).all(...orderIds);
    }

    const tl = (kurus) => (kurus / 100).toFixed(2).replace('.', ',') + ' TL';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="gunluk-rapor-${date}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).text(restaurant?.name || 'Restoran', { align: 'center' });
    doc.fontSize(14).text('Gunluk Satis Raporu', { align: 'center' });
    doc.fontSize(12).text(`Tarih: ${date}`, { align: 'center' });
    doc.moveDown(1.5);

    // Özet
    doc.fontSize(14).text('Ozet', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Toplam Gelir: ${tl(totalRevenue)}`);
    doc.text(`Siparis Sayisi: ${orders.length}`);
    doc.text(`Satilan Urun: ${totalItems}`);
    doc.text(`Bahsis: ${tl(totalTips)}`);
    doc.text(`Ortalama Siparis: ${orders.length > 0 ? tl(Math.round(totalRevenue / orders.length)) : '-'}`);
    doc.moveDown(1);

    // Kategori
    if (categoryBreakdown.length > 0) {
      doc.fontSize(14).text('Kategori Dagiligi', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      categoryBreakdown.forEach((c) => {
        doc.text(`${c.category_name}: ${c.cnt} adet · ${tl(c.total)}`);
      });
      doc.moveDown(1);
    }

    // Top ürünler
    if (topItems.length > 0) {
      doc.fontSize(14).text('En Cok Satan 10 Urun', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      topItems.forEach((item, i) => {
        doc.text(`${i + 1}. ${item.name} — ${item.cnt} adet · ${tl(item.total)}`);
      });
    }

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#999').text(
      `Olusturma: ${new Date().toLocaleString('tr-TR')} | QR-Hesap Sistemi`,
      { align: 'center' }
    );

    doc.end();
  } catch (err) {
    console.error('PDF rapor hatasi:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'PDF olusturulamadi.' });
    }
  }
});

module.exports = router;
