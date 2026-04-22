const express = require('express');
const { getDb } = require('../db/init');

const router = express.Router();

// GET /api/receipts/:orderId - Fiş verisi oluştur (auth yok)
router.get('/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const db = getDb();

    const order = db.prepare(
      `SELECT o.*, t.table_number, r.name as restaurant_name
       FROM orders o
       JOIN tables t ON o.table_id = t.id
       JOIN restaurants r ON t.restaurant_id = r.id
       WHERE o.id = ?`
    ).get(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }

    const items = db.prepare(
      `SELECT oi.*, mi.name as item_name
       FROM order_items oi
       JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = ?`
    ).all(orderId);

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    const payments = db.prepare(
      "SELECT * FROM payments WHERE order_id = ? AND status = 'paid' ORDER BY created_at"
    ).all(orderId);

    const totalTip = payments.reduce((sum, p) => sum + (p.tip || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount + (p.tip || 0), 0);
    const paymentMethod = payments.length > 0 ? 'paid' : 'unpaid';

    const timestamp = Date.now();
    const receiptNumber = `RCP-${orderId}-${timestamp}`;

    res.json({
      receipt_number: receiptNumber,
      restaurant_name: order.restaurant_name,
      table_number: order.table_number,
      order_id: order.id,
      date: order.created_at,
      items: items.map((item) => ({
        name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
        note: item.note,
      })),
      subtotal,
      tip: totalTip,
      total: subtotal + totalTip,
      total_paid: totalPaid,
      payment_method: paymentMethod,
      payments: payments.map((p) => ({
        payer_name: p.payer_name,
        amount: p.amount,
        tip: p.tip,
        created_at: p.created_at,
      })),
    });
  } catch (err) {
    console.error('Fiş oluşturma hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
