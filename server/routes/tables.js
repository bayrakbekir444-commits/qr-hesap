const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const { getPool } = require('../db/init');
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
router.get('/', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { rows: tables } = await pool.query(
      'SELECT * FROM tables WHERE restaurant_id = $1 AND active = 1 ORDER BY table_number',
      [req.restaurantId]
    );

    const result = [];
    for (const table of tables) {
      const { rows: openOrderRows } = await pool.query(
        "SELECT * FROM orders WHERE table_id = $1 AND status = 'open' LIMIT 1",
        [table.id]
      );
      const openOrder = openOrderRows[0];

      let orderTotal = 0;
      let itemCount = 0;

      if (openOrder) {
        const { rows: tRows } = await pool.query(
          'SELECT COALESCE(SUM(quantity * unit_price), 0)::bigint as total, COALESCE(SUM(quantity), 0)::int as count FROM order_items WHERE order_id = $1',
          [openOrder.id]
        );
        orderTotal = Number(tRows[0].total) || 0;
        itemCount = tRows[0].count || 0;
      }

      result.push({
        ...table,
        has_open_order: !!openOrder,
        order_id: openOrder ? openOrder.id : null,
        order_total: orderTotal,
        item_count: itemCount,
      });
    }

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
    const masaNo = table_number || number;

    if (!masaNo) {
      return res.status(400).json({ error: 'Masa numarası gereklidir.' });
    }

    // Paket limiti kontrol
    const limit = await checkTableLimit(req.restaurantId);
    if (!limit.ok) {
      return res.status(403).json({ error: limit.error, upgrade_required: limit.upgrade_required });
    }

    const pool = getPool();

    const { rows: existRows } = await pool.query(
      'SELECT id FROM tables WHERE restaurant_id = $1 AND table_number = $2 AND active = 1',
      [req.restaurantId, masaNo]
    );

    if (existRows.length > 0) {
      return res.status(409).json({ error: 'Bu numarada aktif bir masa zaten var.' });
    }

    const qrToken = uuidv4();
    const menuQrToken = uuidv4();
    const paymentQrToken = uuidv4();
    const qrUrl = `${CLIENT_BASE}/t/${qrToken}`;

    const { rows } = await pool.query(
      `INSERT INTO tables (restaurant_id, table_number, name, qr_token, menu_qr_token, payment_qr_token)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.restaurantId, masaNo, name || null, qrToken, menuQrToken, paymentQrToken]
    );

    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    res.status(201).json({
      message: 'Masa oluşturuldu.',
      table: rows[0],
      qr_code: qrCodeDataUrl,
      qr_url: qrUrl,
    });
  } catch (err) {
    console.error('Masa oluşturma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/tables/:id - Masa adı/numarasını güncelle
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, table_number } = req.body;
    const pool = getPool();

    const { rows: tableRows } = await pool.query(
      'SELECT * FROM tables WHERE id = $1 AND restaurant_id = $2',
      [id, req.restaurantId]
    );
    const table = tableRows[0];

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    const { rows } = await pool.query(
      'UPDATE tables SET name = $1, table_number = $2 WHERE id = $3 RETURNING *',
      [
        name !== undefined ? name : table.name,
        table_number !== undefined ? table_number : table.table_number,
        id,
      ]
    );

    res.json({ message: 'Masa güncellendi.', table: rows[0] });
  } catch (err) {
    console.error('Masa güncelleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/tables/:id - Masayı pasife al
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const { rows: tableRows } = await pool.query(
      'SELECT id FROM tables WHERE id = $1 AND restaurant_id = $2',
      [id, req.restaurantId]
    );

    if (tableRows.length === 0) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    await pool.query('UPDATE tables SET active = 0 WHERE id = $1', [id]);

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
    const pool = getPool();

    const { rows } = await pool.query(
      'SELECT * FROM tables WHERE id = $1 AND restaurant_id = $2 AND active = 1',
      [id, req.restaurantId]
    );
    const table = rows[0];

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    const qrUrl = `${CLIENT_BASE}/t/${table.qr_token}`;
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
    const pool = getPool();

    const { rows } = await pool.query(
      'SELECT * FROM tables WHERE id = $1 AND restaurant_id = $2 AND active = 1',
      [id, req.restaurantId]
    );
    const table = rows[0];

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    const menuQrUrl = `${CLIENT_BASE}/menu/${table.menu_qr_token}`;
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
    const pool = getPool();

    const { rows } = await pool.query(
      'SELECT * FROM tables WHERE id = $1 AND restaurant_id = $2 AND active = 1',
      [id, req.restaurantId]
    );
    const table = rows[0];

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    const paymentQrUrl = `${CLIENT_BASE}/pay/${table.payment_qr_token}`;
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
router.get('/menu/:menuQrToken/public', async (req, res) => {
  try {
    const { menuQrToken } = req.params;
    const pool = getPool();

    const { rows: tableRows } = await pool.query(
      `SELECT t.*, r.name as restaurant_name, r.logo_url as restaurant_logo,
              r.description as restaurant_description,
              r.hide_branding as restaurant_hide_branding,
              r.ai_waiter_enabled as restaurant_ai_waiter,
              r.package_type as restaurant_package
       FROM tables t JOIN restaurants r ON t.restaurant_id = r.id
       WHERE t.menu_qr_token = $1 AND t.active = 1`,
      [menuQrToken]
    );
    const table = tableRows[0];

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı veya aktif değil.' });
    }

    // Whitelabel sadece pro+ paketlerde mümkün; temel paketlerde her zaman göster
    const hideBranding = table.restaurant_hide_branding === 1;

    const { rows: categories } = await pool.query(
      'SELECT * FROM categories WHERE restaurant_id = $1 ORDER BY sort_order, id',
      [table.restaurant_id]
    );

    const { rows: menuItems } = await pool.query(
      'SELECT * FROM menu_items WHERE restaurant_id = $1 AND active = 1 ORDER BY id',
      [table.restaurant_id]
    );

    const menu = categories.map((cat) => ({
      ...cat,
      items: menuItems.filter((item) => item.category_id === cat.id),
    }));

    // Bu masanın açık siparişini de getir (müşteri sepetini göstermek için)
    const { rows: openOrderRows } = await pool.query(
      "SELECT * FROM orders WHERE table_id = $1 AND status = 'open' ORDER BY id DESC LIMIT 1",
      [table.id]
    );
    let order = null;
    if (openOrderRows[0]) {
      const o = openOrderRows[0];
      const { rows: orderItems } = await pool.query(
        `SELECT oi.*, mi.name AS item_name, oi.unit_price AS price
         FROM order_items oi LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE oi.order_id = $1 ORDER BY oi.id`,
        [o.id]
      );
      order = { ...o, items: orderItems };
    }

    res.json({
      table: {
        id: table.id,
        table_number: table.table_number,
        restaurant_name: table.restaurant_name,
        restaurant_logo: table.restaurant_logo,
        restaurant_description: table.restaurant_description,
        payment_qr_token: table.payment_qr_token,
        hide_branding: hideBranding,
        ai_waiter_enabled: table.restaurant_ai_waiter === 1 || table.restaurant_ai_waiter === null || table.restaurant_ai_waiter === undefined,
      },
      menu,
      order,
    });
  } catch (err) {
    console.error('Menü QR herkese açık bilgi hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/tables/payment/:paymentQrToken/public - Ödeme QR ile herkese açık sipariş/ödeme bilgisi (auth yok)
router.get('/payment/:paymentQrToken/public', async (req, res) => {
  try {
    const { paymentQrToken } = req.params;
    const pool = getPool();

    const { rows: tableRows } = await pool.query(
      `SELECT t.*, r.name as restaurant_name, r.logo_url as restaurant_logo,
              r.description as restaurant_description,
              r.hide_branding as restaurant_hide_branding,
              r.package_type as restaurant_package
       FROM tables t JOIN restaurants r ON t.restaurant_id = r.id
       WHERE t.payment_qr_token = $1 AND t.active = 1`,
      [paymentQrToken]
    );
    const table = tableRows[0];

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı veya aktif değil.' });
    }

    const { rows: orderRows } = await pool.query(
      "SELECT * FROM orders WHERE table_id = $1 AND status = 'open' LIMIT 1",
      [table.id]
    );
    const openOrder = orderRows[0];

    let orderItems = [];
    let orderTotal = 0;

    if (openOrder) {
      const { rows: itemRows } = await pool.query(
        `SELECT oi.*, mi.name as item_name
         FROM order_items oi
         JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE oi.order_id = $1`,
        [openOrder.id]
      );
      orderItems = itemRows;
      orderTotal = orderItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    }

    let payments = [];
    if (openOrder) {
      const { rows: pRows } = await pool.query(
        'SELECT * FROM payments WHERE order_id = $1',
        [openOrder.id]
      );
      payments = pRows;
    }

    const hideBranding = table.restaurant_hide_branding === 1;

    res.json({
      table: {
        id: table.id,
        table_number: table.table_number,
        restaurant_name: table.restaurant_name,
        restaurant_logo: table.restaurant_logo,
        restaurant_description: table.restaurant_description,
        hide_branding: hideBranding,
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
router.get('/:qrToken/public', async (req, res) => {
  try {
    const { qrToken } = req.params;
    const pool = getPool();

    const { rows: tableRows } = await pool.query(
      `SELECT t.*, r.name as restaurant_name, r.logo_url as restaurant_logo,
              r.description as restaurant_description,
              r.hide_branding as restaurant_hide_branding,
              r.package_type as restaurant_package
       FROM tables t JOIN restaurants r ON t.restaurant_id = r.id
       WHERE t.qr_token = $1 AND t.active = 1`,
      [qrToken]
    );
    const table = tableRows[0];

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı veya aktif değil.' });
    }

    const { rows: orderRows } = await pool.query(
      "SELECT * FROM orders WHERE table_id = $1 AND status = 'open' LIMIT 1",
      [table.id]
    );
    const openOrder = orderRows[0];

    let orderItems = [];
    let orderTotal = 0;

    if (openOrder) {
      const { rows: itemRows } = await pool.query(
        `SELECT oi.*, mi.name as item_name
         FROM order_items oi
         JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE oi.order_id = $1`,
        [openOrder.id]
      );
      orderItems = itemRows;
      orderTotal = orderItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    }

    const { rows: categories } = await pool.query(
      'SELECT * FROM categories WHERE restaurant_id = $1 ORDER BY sort_order, id',
      [table.restaurant_id]
    );

    const { rows: menuItems } = await pool.query(
      'SELECT * FROM menu_items WHERE restaurant_id = $1 AND active = 1 ORDER BY id',
      [table.restaurant_id]
    );

    const menu = categories.map((cat) => ({
      ...cat,
      items: menuItems.filter((item) => item.category_id === cat.id),
    }));

    const hideBranding = table.restaurant_hide_branding === 1;

    res.json({
      table: {
        id: table.id,
        table_number: table.table_number,
        restaurant_name: table.restaurant_name,
        restaurant_logo: table.restaurant_logo,
        restaurant_description: table.restaurant_description,
        hide_branding: hideBranding,
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
    const pool = getPool();

    const { rows: rRows } = await pool.query(
      'SELECT id, name FROM restaurants WHERE id = $1',
      [req.restaurantId]
    );
    const restaurant = rRows[0];

    const { rows: tables } = await pool.query(
      'SELECT * FROM tables WHERE restaurant_id = $1 AND active = 1 ORDER BY table_number',
      [req.restaurantId]
    );

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
