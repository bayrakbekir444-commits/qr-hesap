const express = require('express');
const { getPool } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

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
