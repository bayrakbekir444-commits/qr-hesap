const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
const { checkTableLimit } = require('../middleware/packages');

const router = express.Router();

const CLIENT_BASE = process.env.CLIENT_BASE_URL || 'http://localhost:5173';

const buildQrUrl = (type, token) => {
  if (type === 'menu') return `${CLIENT_BASE}/menu/${token}`;
  if (type === 'payment') return `${CLIENT_BASE}/pay/${token}`;
  return `${CLIENT_BASE}/t/${token}`;
};

const pickToken = (table, type) => {
  if (type === 'menu') return table.menu_qr_token;
  if (type === 'payment') return table.payment_qr_token;
  return table.qr_token;
};

// GET /api/tables - Masaları listele (sipariş durumu ile)
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const tables = db.prepare(
      'SELECT * FROM tables WHERE restaurant_id = ? AND active = 1 ORDER BY table_number'
    ).all(req.restaurantId);

    const result = tables.map((table) => {
      const openOrder = db.prepare(
        "SELECT * FROM orders WHERE table_id = ? AND status = 'open' LIMIT 1"
      ).get(table.id);

      let orderTotal = 0;
      let itemCount = 0;

      if (openOrder) {
        const totals = db.prepare(
          'SELECT SUM(quantity * unit_price) as total, SUM(quantity) as count FROM order_items WHERE order_id = ?'
        ).get(openOrder.id);
        orderTotal = totals.total || 0;
        itemCount = totals.count || 0;
      }

      return {
        ...table,
        has_open_order: !!openOrder,
        order_id: openOrder ? openOrder.id : null,
        order_total: orderTotal,
        item_count: itemCount,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Masa listeleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/tables - Masa oluştur ve QR kodu üret
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { table_number, name, number } = req.body;
    // Frontend bazen "number" ve "name" gönderiyor
    const masaNo = table_number || number;

    if (!masaNo) {
      return res.status(400).json({ error: 'Masa numarası gereklidir.' });
    }

    // Paket limiti kontrol
    const limit = checkTableLimit(req.restaurantId);
    if (!limit.ok) {
      return res.status(403).json({ error: limit.error, upgrade_required: limit.upgrade_required });
    }

    const db = getDb();

    // Aynı numarada aktif masa var mı kontrol et
    const existing = db.prepare(
      'SELECT * FROM tables WHERE restaurant_id = ? AND table_number = ? AND active = 1'
    ).get(req.restaurantId, masaNo);

    if (existing) {
      return res.status(409).json({ error: 'Bu numarada aktif bir masa zaten var.' });
    }

    const qrToken = uuidv4();
    const menuQrToken = uuidv4();
    const paymentQrToken = uuidv4();
    const qrUrl = `${CLIENT_BASE}/t/${qrToken}`;

    const result = db.prepare(
      'INSERT INTO tables (restaurant_id, table_number, name, qr_token, menu_qr_token, payment_qr_token) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.restaurantId, masaNo, name || null, qrToken, menuQrToken, paymentQrToken);

    // QR kodu base64 olarak üret
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Masa oluşturuldu.',
      table,
      qr_code: qrCodeDataUrl,
      qr_url: qrUrl,
    });
  } catch (err) {
    console.error('Masa oluşturma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/tables/:id - Masa adı/numarasını güncelle
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { name, table_number } = req.body;
    const db = getDb();

    const table = db.prepare(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ?'
    ).get(id, req.restaurantId);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    db.prepare(
      'UPDATE tables SET name = ?, table_number = ? WHERE id = ?'
    ).run(
      name !== undefined ? name : table.name,
      table_number !== undefined ? table_number : table.table_number,
      id
    );

    const updated = db.prepare('SELECT * FROM tables WHERE id = ?').get(id);
    res.json({ message: 'Masa güncellendi.', table: updated });
  } catch (err) {
    console.error('Masa güncelleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/tables/:id - Masayı pasife al
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const table = db.prepare(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ?'
    ).get(id, req.restaurantId);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    db.prepare('UPDATE tables SET active = 0 WHERE id = ?').run(id);

    res.json({ message: 'Masa pasife alındı.' });
  } catch (err) {
    console.error('Masa silme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/tables/:id/qr - QR kodu base64 olarak döndür
router.get('/:id/qr', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const table = db.prepare(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ? AND active = 1'
    ).get(id, req.restaurantId);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    const qrUrl = `http://localhost:5173/t/${table.qr_token}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    res.json({
      table_id: table.id,
      table_number: table.table_number,
      qr_code: qrCodeDataUrl,
      qr_url: qrUrl,
    });
  } catch (err) {
    console.error('QR kod oluşturma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/tables/:id/menu-qr - Menü QR kodu
router.get('/:id/menu-qr', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const table = db.prepare(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ? AND active = 1'
    ).get(id, req.restaurantId);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    const menuQrUrl = `http://localhost:5173/menu/${table.menu_qr_token}`;
    const qrCodeDataUrl = await QRCode.toDataURL(menuQrUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    res.json({
      table_id: table.id,
      table_number: table.table_number,
      qr_code: qrCodeDataUrl,
      qr_url: menuQrUrl,
    });
  } catch (err) {
    console.error('Menü QR kod oluşturma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/tables/:id/payment-qr - Ödeme QR kodu
router.get('/:id/payment-qr', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const table = db.prepare(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ? AND active = 1'
    ).get(id, req.restaurantId);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    const paymentQrUrl = `http://localhost:5173/pay/${table.payment_qr_token}`;
    const qrCodeDataUrl = await QRCode.toDataURL(paymentQrUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    res.json({
      table_id: table.id,
      table_number: table.table_number,
      qr_code: qrCodeDataUrl,
      qr_url: paymentQrUrl,
    });
  } catch (err) {
    console.error('Ödeme QR kod oluşturma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/tables/menu/:menuQrToken/public - Menü QR ile herkese açık menü bilgisi (auth yok)
router.get('/menu/:menuQrToken/public', (req, res) => {
  try {
    const { menuQrToken } = req.params;
    const db = getDb();

    const table = db.prepare(
      'SELECT t.*, r.name as restaurant_name FROM tables t JOIN restaurants r ON t.restaurant_id = r.id WHERE t.menu_qr_token = ? AND t.active = 1'
    ).get(menuQrToken);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı veya aktif değil.' });
    }

    // Menüyü getir
    const categories = db.prepare(
      'SELECT * FROM categories WHERE restaurant_id = ? ORDER BY sort_order, id'
    ).all(table.restaurant_id);

    const menuItems = db.prepare(
      'SELECT * FROM menu_items WHERE restaurant_id = ? AND active = 1 ORDER BY id'
    ).all(table.restaurant_id);

    const menu = categories.map((cat) => ({
      ...cat,
      items: menuItems.filter((item) => item.category_id === cat.id),
    }));

    res.json({
      table: {
        id: table.id,
        table_number: table.table_number,
        restaurant_name: table.restaurant_name,
      },
      menu,
    });
  } catch (err) {
    console.error('Menü QR herkese açık bilgi hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/tables/payment/:paymentQrToken/public - Ödeme QR ile herkese açık sipariş/ödeme bilgisi (auth yok)
router.get('/payment/:paymentQrToken/public', (req, res) => {
  try {
    const { paymentQrToken } = req.params;
    const db = getDb();

    const table = db.prepare(
      'SELECT t.*, r.name as restaurant_name, r.logo_url as restaurant_logo, r.description as restaurant_description FROM tables t JOIN restaurants r ON t.restaurant_id = r.id WHERE t.payment_qr_token = ? AND t.active = 1'
    ).get(paymentQrToken);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı veya aktif değil.' });
    }

    // Açık sipariş ve kalemlerini getir
    const openOrder = db.prepare(
      "SELECT * FROM orders WHERE table_id = ? AND status = 'open' LIMIT 1"
    ).get(table.id);

    let orderItems = [];
    let orderTotal = 0;

    if (openOrder) {
      orderItems = db.prepare(
        `SELECT oi.*, mi.name as item_name
         FROM order_items oi
         JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE oi.order_id = ?`
      ).all(openOrder.id);

      orderTotal = orderItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    }

    // Mevcut ödemeleri getir
    let payments = [];
    if (openOrder) {
      payments = db.prepare(
        'SELECT * FROM payments WHERE order_id = ?'
      ).all(openOrder.id);
    }

    res.json({
      table: {
        id: table.id,
        table_number: table.table_number,
        restaurant_name: table.restaurant_name,
        restaurant_logo: table.restaurant_logo,
        restaurant_description: table.restaurant_description,
      },
      order: openOrder
        ? {
            id: openOrder.id,
            status: openOrder.status,
            created_at: openOrder.created_at,
            items: orderItems,
            total: orderTotal,
          }
        : null,
      payments,
    });
  } catch (err) {
    console.error('Ödeme QR herkese açık bilgi hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/tables/:qrToken/public - Herkese açık masa bilgisi
router.get('/:qrToken/public', (req, res) => {
  try {
    const { qrToken } = req.params;
    const db = getDb();

    const table = db.prepare(
      'SELECT t.*, r.name as restaurant_name, r.logo_url as restaurant_logo, r.description as restaurant_description FROM tables t JOIN restaurants r ON t.restaurant_id = r.id WHERE t.qr_token = ? AND t.active = 1'
    ).get(qrToken);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı veya aktif değil.' });
    }

    // Açık sipariş ve kalemlerini getir
    const openOrder = db.prepare(
      "SELECT * FROM orders WHERE table_id = ? AND status = 'open' LIMIT 1"
    ).get(table.id);

    let orderItems = [];
    let orderTotal = 0;

    if (openOrder) {
      orderItems = db.prepare(
        `SELECT oi.*, mi.name as item_name
         FROM order_items oi
         JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE oi.order_id = ?`
      ).all(openOrder.id);

      orderTotal = orderItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    }

    // Menüyü de gönder
    const categories = db.prepare(
      'SELECT * FROM categories WHERE restaurant_id = ? ORDER BY sort_order, id'
    ).all(table.restaurant_id);

    const menuItems = db.prepare(
      'SELECT * FROM menu_items WHERE restaurant_id = ? AND active = 1 ORDER BY id'
    ).all(table.restaurant_id);

    const menu = categories.map((cat) => ({
      ...cat,
      items: menuItems.filter((item) => item.category_id === cat.id),
    }));

    res.json({
      table: {
        id: table.id,
        table_number: table.table_number,
        restaurant_name: table.restaurant_name,
        restaurant_logo: table.restaurant_logo,
        restaurant_description: table.restaurant_description,
      },
      order: openOrder
        ? {
            id: openOrder.id,
            status: openOrder.status,
            created_at: openOrder.created_at,
            items: orderItems,
            total: orderTotal,
          }
        : null,
      menu,
    });
  } catch (err) {
    console.error('Herkese açık masa bilgisi hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/tables/qr-pdf?type=main|menu|payment - Tüm masalar için tek PDF
router.get('/qr-pdf', authMiddleware, async (req, res) => {
  try {
    const type = ['main', 'menu', 'payment'].includes(req.query.type) ? req.query.type : 'main';
    const db = getDb();

    const restaurant = db.prepare(
      'SELECT id, name FROM restaurants WHERE id = ?'
    ).get(req.restaurantId);

    const tables = db.prepare(
      'SELECT * FROM tables WHERE restaurant_id = ? AND active = 1 ORDER BY table_number'
    ).all(req.restaurantId);

    if (tables.length === 0) {
      return res.status(404).json({ error: 'Yazdırılacak masa yok.' });
    }

    const typeLabel = type === 'menu' ? 'Menü' : type === 'payment' ? 'Ödeme' : 'Sipariş';
    const bottomHint = type === 'menu'
      ? 'Menüyü görmek için QR kodu okutun'
      : type === 'payment'
      ? 'Hesabı ödemek için QR kodu okutun'
      : 'Sipariş vermek için QR kodu okutun';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="qr-kodlar-${type}.pdf"`
    );

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(res);

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const token = pickToken(table, type);
      if (!token) continue;

      const url = buildQrUrl(type, token);
      const qrDataUrl = await QRCode.toDataURL(url, { width: 600, margin: 1 });
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

      if (i > 0) doc.addPage();

      const pageW = doc.page.width;

      doc
        .fontSize(14)
        .fillColor('#555')
        .text(restaurant?.name || 'Restoran', 40, 50, { align: 'center', width: pageW - 80 });

      doc
        .fontSize(48)
        .fillColor('#000')
        .text(`Masa ${table.table_number}`, 40, 90, { align: 'center', width: pageW - 80 });

      doc
        .fontSize(14)
        .fillColor('#888')
        .text(`${typeLabel} QR Kodu`, 40, 160, { align: 'center', width: pageW - 80 });

      const qrSize = 340;
      const qrX = (pageW - qrSize) / 2;
      const qrY = 200;
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      doc
        .fontSize(16)
        .fillColor('#000')
        .text(bottomHint, 40, qrY + qrSize + 30, { align: 'center', width: pageW - 80 });

      doc
        .fontSize(9)
        .fillColor('#aaa')
        .text(url, 40, qrY + qrSize + 60, { align: 'center', width: pageW - 80 });
    }

    doc.end();
  } catch (err) {
    console.error('Toplu QR PDF hatası:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'PDF oluşturulamadı.' });
    }
  }
});

module.exports = router;
