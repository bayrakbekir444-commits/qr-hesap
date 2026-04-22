const express = require('express');
const { getDb } = require('../db/init');
const { userAuthMiddleware } = require('../middleware/userAuth');

const router = express.Router();

// GET /api/wallet - Cüzdan bakiyesi
router.get('/', userAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.userId);

    if (!wallet) {
      return res.status(404).json({ error: 'Cüzdan bulunamadı.' });
    }

    res.json({
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        balance_formatted: (wallet.balance / 100).toFixed(2) + ' TL',
        created_at: wallet.created_at,
      },
    });
  } catch (err) {
    console.error('Cüzdan hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/wallet/deposit - Para yükleme (simüle)
router.post('/deposit', userAuthMiddleware, (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Geçerli bir tutar giriniz.' });
    }

    const db = getDb();
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.userId);

    if (!wallet) {
      return res.status(404).json({ error: 'Cüzdan bulunamadı.' });
    }

    const amountTL = (amount / 100).toFixed(2);

    const deposit = db.transaction(() => {
      db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?').run(amount, wallet.id);

      db.prepare(
        'INSERT INTO wallet_transactions (wallet_id, amount, type, description) VALUES (?, ?, ?, ?)'
      ).run(wallet.id, amount, 'deposit', `Para yükleme: ${amountTL} TL`);

      db.prepare(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
      ).run(req.userId, 'Para Yüklendi', `Para yüklendi: ${amountTL} TL`, 'success');
    });

    deposit();

    const updated = db.prepare('SELECT balance FROM wallets WHERE id = ?').get(wallet.id);

    res.json({
      message: `Para yüklendi: ${amountTL} TL`,
      balance: updated.balance,
      balance_formatted: (updated.balance / 100).toFixed(2) + ' TL',
    });
  } catch (err) {
    console.error('Para yükleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/wallet/transactions - İşlem geçmişi
router.get('/transactions', userAuthMiddleware, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const db = getDb();
    const wallet = db.prepare('SELECT id FROM wallets WHERE user_id = ?').get(req.userId);

    if (!wallet) {
      return res.status(404).json({ error: 'Cüzdan bulunamadı.' });
    }

    const total = db.prepare(
      'SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = ?'
    ).get(wallet.id).count;

    const transactions = db.prepare(
      'SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(wallet.id, limit, offset);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('İşlem geçmişi hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/wallet/pay - Cüzdandan ödeme
router.post('/pay', userAuthMiddleware, (req, res) => {
  try {
    const { order_id, amount, tip, qr_token } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({ error: 'Sipariş ID ve tutar gereklidir.' });
    }

    const db = getDb();
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.userId);

    if (!wallet) {
      return res.status(404).json({ error: 'Cüzdan bulunamadı.' });
    }

    const totalAmount = amount + (tip || 0);
    const totalTL = (totalAmount / 100).toFixed(2);

    // Bakiye kontrolü
    if (wallet.balance < totalAmount) {
      db.prepare(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
      ).run(req.userId, 'Ödeme Reddedildi', 'Ödeme reddedildi: yetersiz bakiye', 'error');

      return res.status(400).json({ error: 'Yetersiz bakiye.' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }

    const pay = db.transaction(() => {
      // Bakiyeden düş
      db.prepare('UPDATE wallets SET balance = balance - ? WHERE id = ?').run(totalAmount, wallet.id);

      // Cüzdan işlemi
      db.prepare(
        'INSERT INTO wallet_transactions (wallet_id, amount, type, description, reference_id) VALUES (?, ?, ?, ?, ?)'
      ).run(wallet.id, totalAmount, 'payment', `Ödeme: ${totalTL} TL (Sipariş #${order_id})`, String(order_id));

      // Payments tablosuna kayıt
      const paymentResult = db.prepare(
        'INSERT INTO payments (order_id, payer_name, amount, tip, status) VALUES (?, ?, ?, ?, ?)'
      ).run(order_id, req.userName, amount, tip || 0, 'paid');

      // Bildirim
      db.prepare(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
      ).run(req.userId, 'Ödeme Başarılı', `Ödeme başarılı: ${totalTL} TL`, 'success');

      return paymentResult.lastInsertRowid;
    });

    const paymentId = pay();

    const updatedWallet = db.prepare('SELECT balance FROM wallets WHERE id = ?').get(wallet.id);
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);

    // Sipariş toplam/kalan hesabı
    const totalPaid = db.prepare(
      "SELECT SUM(amount + tip) as total FROM payments WHERE order_id = ? AND status = 'paid'"
    ).get(order_id);

    const orderTotal = db.prepare(
      'SELECT SUM(quantity * unit_price) as total FROM order_items WHERE order_id = ?'
    ).get(order_id);

    const remaining = (orderTotal.total || 0) - (totalPaid.total || 0);

    res.json({
      message: `Ödeme başarılı: ${totalTL} TL`,
      payment,
      wallet_balance: updatedWallet.balance,
      wallet_balance_formatted: (updatedWallet.balance / 100).toFixed(2) + ' TL',
      order_total: orderTotal.total || 0,
      total_paid: totalPaid.total || 0,
      remaining: remaining > 0 ? remaining : 0,
      fully_paid: remaining <= 0,
    });
  } catch (err) {
    console.error('Cüzdan ödeme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
