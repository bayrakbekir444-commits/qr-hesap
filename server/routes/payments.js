const express = require('express');
const { getPool } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
const { initiate3DS, complete3DS, isValidCardNumber } = require('../utils/iyzico');

const router = express.Router();

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || '85.34.78.112';
}

// Sipariş ödendiğinde sipariş kapanışını ve alert'i hallet
async function finalizeOrderIfFullyPaid(pool, orderId) {
  const { rows: orderRows } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  const order = orderRows[0];
  if (!order || order.status !== 'open') return { fullyPaid: false, orderClosed: false };

  const { rows: paidRows } = await pool.query(
    "SELECT COALESCE(SUM(amount + tip), 0)::bigint as total FROM payments WHERE order_id = $1 AND status = 'paid'",
    [orderId]
  );
  const totalPaid = Number(paidRows[0].total) || 0;

  const { rows: orderTotalRows } = await pool.query(
    'SELECT COALESCE(SUM(quantity * unit_price), 0)::bigint as total FROM order_items WHERE order_id = $1',
    [orderId]
  );
  const orderTotal = Number(orderTotalRows[0].total) || 0;
  const remaining = orderTotal - totalPaid;
  const fullyPaid = remaining <= 0 && orderTotal > 0;

  if (fullyPaid) {
    await pool.query("UPDATE orders SET status = 'closed', updated_at = NOW() WHERE id = $1", [orderId]);
    const { rows: tableRowsRes } = await pool.query(
      'SELECT id, restaurant_id FROM tables WHERE id = $1',
      [order.table_id]
    );
    const tableRow = tableRowsRes[0];
    if (tableRow) {
      await pool.query(
        `INSERT INTO payment_alerts (order_id, table_id, restaurant_id, total_amount, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [orderId, tableRow.id, tableRow.restaurant_id, orderTotal]
      );
    }
  }
  return {
    fullyPaid,
    orderClosed: fullyPaid,
    totalPaid,
    orderTotal,
    remaining: remaining > 0 ? remaining : 0,
  };
}

// ─────────────────────────────────────────────────────────────
// iyzico 3DS akışı
// ─────────────────────────────────────────────────────────────

// POST /api/payments/iyzico/initialize
// Frontend kart bilgisini gönderir; backend pending payment oluşturur,
// iyzico'dan 3DS HTML'i alır ve frontend'e döner. Frontend bu HTML'i
// iframe'e enjekte ederek banka 3DS sayfasını gösterir.
router.post('/iyzico/initialize', async (req, res) => {
  try {
    const {
      order_id,
      payer_name,
      amount,
      tip = 0,
      split_count = 1,
      split_index = 1,
      card,            // { holder, number, expireMonth, expireYear, cvc }
      buyer = {},      // { name, surname, email, phone, identityNumber }
      items = [],      // sepet için (opsiyonel)
    } = req.body;

    if (!order_id || amount == null) {
      return res.status(400).json({ error: 'Sipariş ID ve tutar gereklidir.' });
    }
    if (!card || !card.number || !card.cvc || !card.expireMonth || !card.expireYear || !card.holder) {
      return res.status(400).json({ error: 'Kart bilgileri eksik.' });
    }
    if (!isValidCardNumber(card.number)) {
      return res.status(400).json({ error: 'Geçersiz kart numarası.' });
    }

    const pool = getPool();
    const { rows: orderRows } = await pool.query('SELECT id FROM orders WHERE id = $1', [order_id]);
    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }

    const totalAmount = Number(amount) + Number(tip);

    // Pending payment kaydı oluştur (3DS sonucu gelince güncellenir)
    const { rows: insertRows } = await pool.query(
      `INSERT INTO payments
        (order_id, payer_name, amount, tip, status, split_count, split_index, provider, iyzico_conversation_id)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, 'iyzico', $7)
       RETURNING id`,
      [
        order_id,
        payer_name || buyer.name || 'Misafir',
        amount,
        tip,
        split_count,
        split_index,
        '', // conversation id payment.id'ye eşitlenecek
      ]
    );
    const paymentId = insertRows[0].id;

    await pool.query(
      'UPDATE payments SET iyzico_conversation_id = $1 WHERE id = $2',
      [String(paymentId), paymentId]
    );

    let iyzicoResult;
    try {
      iyzicoResult = await initiate3DS({
        conversationId: paymentId,
        amount: totalAmount,
        card,
        buyer: {
          ...buyer,
          ip: getClientIp(req),
        },
        items,
      });
    } catch (e) {
      console.error('iyzico initiate hata:', e);
      await pool.query(
        "UPDATE payments SET status = 'failed', error_message = $1 WHERE id = $2",
        [String(e?.message || 'iyzico isteği başarısız.').slice(0, 500), paymentId]
      );
      return res.status(502).json({ error: 'Ödeme servisine ulaşılamadı.' });
    }

    if (iyzicoResult.status !== 'success') {
      await pool.query(
        "UPDATE payments SET status = 'failed', error_message = $1 WHERE id = $2",
        [
          (iyzicoResult.errorMessage || iyzicoResult.errorCode || 'iyzico hatası').slice(0, 500),
          paymentId,
        ]
      );
      return res.status(400).json({
        error: iyzicoResult.errorMessage || 'Ödeme başlatılamadı.',
        code: iyzicoResult.errorCode,
      });
    }

    res.json({
      payment_id: paymentId,
      threeds_html: iyzicoResult.threeDSHtmlContent, // base64
      conversation_id: String(paymentId),
    });
  } catch (err) {
    console.error('iyzico initialize hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/payments/iyzico/callback
// iyzico 3DS tamamlandığında bu URL'e POST atar.
// Body: { paymentId, conversationData, conversationId, status, mdStatus }
// Bizim ödemenin status'unu günceller, frontend'e geri yönlendirir.
router.post('/iyzico/callback', express.urlencoded({ extended: true }), async (req, res) => {
  const pool = getPool();
  const clientUrl = process.env.CLIENT_BASE_URL || 'https://qrhesap.net';

  try {
    const { paymentId: iyzicoPaymentId, conversationData, conversationId, status, mdStatus } = req.body;

    if (!conversationId) {
      return res.status(400).send('conversationId yok');
    }

    const internalPaymentId = parseInt(conversationId, 10);
    if (!internalPaymentId) {
      return res.status(400).send('Geçersiz conversationId');
    }

    // 3DS başarısız (mdStatus 1=success, 0=fail, diğerleri hata)
    if (status !== 'success' || mdStatus !== '1') {
      await pool.query(
        "UPDATE payments SET status = 'failed', error_message = $1 WHERE id = $2",
        [`3DS doğrulaması başarısız (mdStatus=${mdStatus})`.slice(0, 500), internalPaymentId]
      );
      return res.redirect(`${clientUrl}/odeme-sonuc?payment_id=${internalPaymentId}&status=failed`);
    }

    // 3DS başarılı: ödemeyi tamamla
    let result;
    try {
      result = await complete3DS({
        paymentId: iyzicoPaymentId,
        conversationData,
        conversationId,
      });
    } catch (e) {
      console.error('iyzico complete3DS hata:', e);
      await pool.query(
        "UPDATE payments SET status = 'failed', error_message = $1 WHERE id = $2",
        [String(e?.message || 'iyzico tamamlama hatası').slice(0, 500), internalPaymentId]
      );
      return res.redirect(`${clientUrl}/odeme-sonuc?payment_id=${internalPaymentId}&status=failed`);
    }

    if (result.status !== 'success') {
      await pool.query(
        "UPDATE payments SET status = 'failed', error_message = $1, iyzico_payment_id = $2 WHERE id = $3",
        [
          (result.errorMessage || result.errorCode || 'iyzico hata').slice(0, 500),
          result.paymentId || iyzicoPaymentId || null,
          internalPaymentId,
        ]
      );
      return res.redirect(`${clientUrl}/odeme-sonuc?payment_id=${internalPaymentId}&status=failed`);
    }

    await pool.query(
      "UPDATE payments SET status = 'paid', iyzico_payment_id = $1 WHERE id = $2",
      [String(result.paymentId || iyzicoPaymentId || ''), internalPaymentId]
    );

    // Sipariş kapanışı
    const { rows: payRows } = await pool.query('SELECT order_id FROM payments WHERE id = $1', [internalPaymentId]);
    if (payRows[0]?.order_id) {
      await finalizeOrderIfFullyPaid(pool, payRows[0].order_id);
    }

    return res.redirect(`${clientUrl}/odeme-sonuc?payment_id=${internalPaymentId}&status=success`);
  } catch (err) {
    console.error('iyzico callback hatası:', err);
    return res.redirect(`${clientUrl}/odeme-sonuc?status=error`);
  }
});

// GET /api/payments/status/:paymentId — Frontend ödeme sonuç sayfasında polling için
router.get('/status/:paymentId', async (req, res) => {
  try {
    const id = parseInt(req.params.paymentId, 10);
    if (!id) return res.status(400).json({ error: 'Geçersiz ID.' });
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, status, amount, tip, error_message, order_id FROM payments WHERE id = $1',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Ödeme bulunamadı.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Ödeme status hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/payments - Ödeme yap (mock - 1 saniye bekle, her zaman başarılı)
router.post('/', async (req, res) => {
  try {
    const { order_id, payer_name, amount, tip, split_count, split_index } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({ error: 'Sipariş ID ve tutar gereklidir.' });
    }

    const pool = getPool();

    const { rows: orderRows } = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
    const order = orderRows[0];
    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }

    // Ödemeyi oluştur (pending durumda)
    const { rows: insertRows } = await pool.query(
      `INSERT INTO payments (order_id, payer_name, amount, tip, status, split_count, split_index)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6)
       RETURNING id`,
      [
        order_id,
        payer_name || 'Misafir',
        amount,
        tip || 0,
        split_count || 1,
        split_index || 1,
      ]
    );
    const paymentId = insertRows[0].id;

    // 1 saniye bekle (ödeme simülasyonu)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Ödemeyi onayla
    const { rows: updatedRows } = await pool.query(
      "UPDATE payments SET status = 'paid' WHERE id = $1 RETURNING *",
      [paymentId]
    );
    const payment = updatedRows[0];

    // Toplam ödenen tutarı kontrol et
    const { rows: paidRows } = await pool.query(
      "SELECT COALESCE(SUM(amount + tip), 0)::bigint as total FROM payments WHERE order_id = $1 AND status = 'paid'",
      [order_id]
    );
    const totalPaid = Number(paidRows[0].total) || 0;

    const { rows: orderTotalRows } = await pool.query(
      'SELECT COALESCE(SUM(quantity * unit_price), 0)::bigint as total FROM order_items WHERE order_id = $1',
      [order_id]
    );
    const orderTotal = Number(orderTotalRows[0].total) || 0;

    const remaining = orderTotal - totalPaid;
    const fullyPaid = remaining <= 0 && orderTotal > 0;

    const willCloseOrder = fullyPaid && order.status === 'open';

    if (willCloseOrder) {
      await pool.query(
        "UPDATE orders SET status = 'closed', updated_at = NOW() WHERE id = $1",
        [order_id]
      );

      const { rows: tableRowsRes } = await pool.query(
        'SELECT id, restaurant_id FROM tables WHERE id = $1',
        [order.table_id]
      );
      const tableRow = tableRowsRes[0];

      if (tableRow) {
        await pool.query(
          `INSERT INTO payment_alerts (order_id, table_id, restaurant_id, total_amount, status)
           VALUES ($1, $2, $3, $4, 'pending')`,
          [order_id, tableRow.id, tableRow.restaurant_id, orderTotal]
        );
      }
    }

    res.json({
      message: 'Ödeme başarılı.',
      payment,
      order_total: orderTotal,
      total_paid: totalPaid,
      remaining: remaining > 0 ? remaining : 0,
      fully_paid: fullyPaid,
      order_closed: willCloseOrder,
    });
  } catch (err) {
    console.error('Ödeme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/payments/alerts - Bekleyen ödeme bildirimleri (auth)
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT pa.*, t.table_number
       FROM payment_alerts pa
       JOIN tables t ON pa.table_id = t.id
       WHERE pa.restaurant_id = $1 AND pa.status = 'pending'
       ORDER BY pa.created_at ASC`,
      [req.restaurantId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Ödeme alert listeleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/payments/alerts/:id/dismiss - Ödeme bildirimini kapat (auth)
router.put('/alerts/:id/dismiss', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id FROM payment_alerts WHERE id = $1 AND restaurant_id = $2',
      [id, req.restaurantId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bildirim bulunamadı.' });
    }
    await pool.query("UPDATE payment_alerts SET status = 'dismissed' WHERE id = $1", [id]);
    res.json({ message: 'Bildirim kapatıldı.' });
  } catch (err) {
    console.error('Ödeme alert kapatma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/payments/:orderId - Sipariş ödemelerini listele
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const pool = getPool();

    const { rows: orderRows } = await pool.query('SELECT id FROM orders WHERE id = $1', [orderId]);
    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }

    const { rows: payments } = await pool.query(
      'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at',
      [orderId]
    );

    const { rows: orderTotalRows } = await pool.query(
      'SELECT COALESCE(SUM(quantity * unit_price), 0)::bigint as total FROM order_items WHERE order_id = $1',
      [orderId]
    );
    const orderTotal = Number(orderTotalRows[0].total) || 0;

    const totalPaid = payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount + p.tip, 0);

    const remaining = orderTotal - totalPaid;

    res.json({
      payments,
      order_total: orderTotal,
      total_paid: totalPaid,
      remaining: remaining > 0 ? remaining : 0,
      fully_paid: remaining <= 0,
    });
  } catch (err) {
    console.error('Ödeme listeleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
