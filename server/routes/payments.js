const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/payments - Ödeme yap (mock - 1 saniye bekle, her zaman başarılı)
router.post('/', async (req, res) => {
  try {
    const { order_id, payer_name, amount, tip, split_count, split_index } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({ error: 'Sipariş ID ve tutar gereklidir.' });
    }

    const db = getDb();

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }

    // Ödemeyi oluştur (pending durumda)
    const result = db.prepare(
      'INSERT INTO payments (order_id, payer_name, amount, tip, status, split_count, split_index) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      order_id,
      payer_name || 'Misafir',
      amount,
      tip || 0,
      'pending',
      split_count || 1,
      split_index || 1
    );

    const paymentId = result.lastInsertRowid;

    // 1 saniye bekle (ödeme simülasyonu)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Ödemeyi onayla
    db.prepare("UPDATE payments SET status = 'paid' WHERE id = ?").run(paymentId);

    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);

    // Toplam ödenen tutarı kontrol et
    const totalPaid = db.prepare(
      "SELECT SUM(amount + tip) as total FROM payments WHERE order_id = ? AND status = 'paid'"
    ).get(order_id);

    const orderTotal = db.prepare(
      'SELECT SUM(quantity * unit_price) as total FROM order_items WHERE order_id = ?'
    ).get(order_id);

    const remaining = (orderTotal.total || 0) - (totalPaid.total || 0);
    const fullyPaid = remaining <= 0 && (orderTotal.total || 0) > 0;

    const willCloseOrder = fullyPaid && order.status === 'open';

    if (willCloseOrder) {
      db.prepare(
        "UPDATE orders SET status = 'closed', updated_at = datetime('now') WHERE id = ?"
      ).run(order_id);

      const tableRow = db.prepare(
        'SELECT id, restaurant_id FROM tables WHERE id = ?'
      ).get(order.table_id);

      if (tableRow) {
        db.prepare(
          `INSERT INTO payment_alerts (order_id, table_id, restaurant_id, total_amount, status)
           VALUES (?, ?, ?, ?, 'pending')`
        ).run(order_id, tableRow.id, tableRow.restaurant_id, orderTotal.total || 0);
      }
    }

    res.json({
      message: 'Ödeme başarılı.',
      payment,
      order_total: orderTotal.total || 0,
      total_paid: totalPaid.total || 0,
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
router.get('/alerts', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const alerts = db.prepare(
      `SELECT pa.*, t.table_number
       FROM payment_alerts pa
       JOIN tables t ON pa.table_id = t.id
       WHERE pa.restaurant_id = ? AND pa.status = 'pending'
       ORDER BY pa.created_at ASC`
    ).all(req.restaurantId);
    res.json(alerts);
  } catch (err) {
    console.error('Ödeme alert listeleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/payments/alerts/:id/dismiss - Ödeme bildirimini kapat (auth)
router.put('/alerts/:id/dismiss', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const alert = db.prepare(
      'SELECT * FROM payment_alerts WHERE id = ? AND restaurant_id = ?'
    ).get(id, req.restaurantId);
    if (!alert) {
      return res.status(404).json({ error: 'Bildirim bulunamadı.' });
    }
    db.prepare("UPDATE payment_alerts SET status = 'dismissed' WHERE id = ?").run(id);
    res.json({ message: 'Bildirim kapatıldı.' });
  } catch (err) {
    console.error('Ödeme alert kapatma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/payments/:orderId - Sipariş ödemelerini listele
router.get('/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const db = getDb();

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }

    const payments = db.prepare(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at'
    ).all(orderId);

    const orderTotal = db.prepare(
      'SELECT SUM(quantity * unit_price) as total FROM order_items WHERE order_id = ?'
    ).get(orderId);

    const totalPaid = payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount + p.tip, 0);

    const remaining = (orderTotal.total || 0) - totalPaid;

    res.json({
      payments,
      order_total: orderTotal.total || 0,
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
