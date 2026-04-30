const express = require('express');
const { getPool } = require('../db/init');
const { userAuthMiddleware } = require('../middleware/userAuth');

const router = express.Router();

// GET /api/wallet - Cüzdan bakiyesi
router.get('/', userAuthMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [req.userId]);
    const wallet = rows[0];

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
router.post('/deposit', userAuthMiddleware, async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      client.release();
      return res.status(400).json({ error: 'Geçerli bir tutar giriniz.' });
    }

    const { rows: walletRows } = await client.query('SELECT * FROM wallets WHERE user_id = $1', [req.userId]);
    const wallet = walletRows[0];

    if (!wallet) {
      client.release();
      return res.status(404).json({ error: 'Cüzdan bulunamadı.' });
    }

    const amountTL = (amount / 100).toFixed(2);

    await client.query('BEGIN');
    await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [amount, wallet.id]);
    await client.query(
      'INSERT INTO wallet_transactions (wallet_id, amount, type, description) VALUES ($1, $2, $3, $4)',
      [wallet.id, amount, 'deposit', `Para yükleme: ${amountTL} TL`]
    );
    await client.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
      [req.userId, 'Para Yüklendi', `Para yüklendi: ${amountTL} TL`, 'success']
    );
    await client.query('COMMIT');

    const { rows: updatedRows } = await client.query('SELECT balance FROM wallets WHERE id = $1', [wallet.id]);

    res.json({
      message: `Para yüklendi: ${amountTL} TL`,
      balance: updatedRows[0].balance,
      balance_formatted: (updatedRows[0].balance / 100).toFixed(2) + ' TL',
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Para yükleme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
});

// GET /api/wallet/transactions - İşlem geçmişi
router.get('/transactions', userAuthMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const pool = getPool();
    const { rows: walletRows } = await pool.query(
      'SELECT id FROM wallets WHERE user_id = $1',
      [req.userId]
    );
    const wallet = walletRows[0];

    if (!wallet) {
      return res.status(404).json({ error: 'Cüzdan bulunamadı.' });
    }

    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*)::int as count FROM wallet_transactions WHERE wallet_id = $1',
      [wallet.id]
    );
    const total = countRows[0].count;

    const { rows: transactions } = await pool.query(
      'SELECT * FROM wallet_transactions WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [wallet.id, limit, offset]
    );

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
router.post('/pay', userAuthMiddleware, async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const { order_id, amount, tip } = req.body;

    if (!order_id || !amount) {
      client.release();
      return res.status(400).json({ error: 'Sipariş ID ve tutar gereklidir.' });
    }

    const { rows: walletRows } = await client.query('SELECT * FROM wallets WHERE user_id = $1', [req.userId]);
    const wallet = walletRows[0];

    if (!wallet) {
      client.release();
      return res.status(404).json({ error: 'Cüzdan bulunamadı.' });
    }

    const totalAmount = amount + (tip || 0);
    const totalTL = (totalAmount / 100).toFixed(2);

    // Bakiye kontrolü
    if (wallet.balance < totalAmount) {
      await client.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [req.userId, 'Ödeme Reddedildi', 'Ödeme reddedildi: yetersiz bakiye', 'error']
      );
      client.release();
      return res.status(400).json({ error: 'Yetersiz bakiye.' });
    }

    const { rows: orderRows } = await client.query('SELECT id FROM orders WHERE id = $1', [order_id]);
    if (orderRows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }

    await client.query('BEGIN');
    // Bakiyeden düş
    await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [totalAmount, wallet.id]);

    // Cüzdan işlemi
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, amount, type, description, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [wallet.id, totalAmount, 'payment', `Ödeme: ${totalTL} TL (Sipariş #${order_id})`, String(order_id)]
    );

    // Payments tablosuna kayıt
    const { rows: paymentInsertRows } = await client.query(
      `INSERT INTO payments (order_id, payer_name, amount, tip, status)
       VALUES ($1, $2, $3, $4, 'paid')
       RETURNING *`,
      [order_id, req.userName, amount, tip || 0]
    );
    const payment = paymentInsertRows[0];

    // Bildirim
    await client.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
      [req.userId, 'Ödeme Başarılı', `Ödeme başarılı: ${totalTL} TL`, 'success']
    );
    await client.query('COMMIT');

    const { rows: updatedWalletRows } = await client.query('SELECT balance FROM wallets WHERE id = $1', [wallet.id]);

    // Sipariş toplam/kalan hesabı
    const { rows: paidRows } = await client.query(
      "SELECT COALESCE(SUM(amount + tip), 0)::bigint as total FROM payments WHERE order_id = $1 AND status = 'paid'",
      [order_id]
    );
    const totalPaid = Number(paidRows[0].total) || 0;

    const { rows: orderTotalRows } = await client.query(
      'SELECT COALESCE(SUM(quantity * unit_price), 0)::bigint as total FROM order_items WHERE order_id = $1',
      [order_id]
    );
    const orderTotal = Number(orderTotalRows[0].total) || 0;

    const remaining = orderTotal - totalPaid;

    res.json({
      message: `Ödeme başarılı: ${totalTL} TL`,
      payment,
      wallet_balance: updatedWalletRows[0].balance,
      wallet_balance_formatted: (updatedWalletRows[0].balance / 100).toFixed(2) + ' TL',
      order_total: orderTotal,
      total_paid: totalPaid,
      remaining: remaining > 0 ? remaining : 0,
      fully_paid: remaining <= 0,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Cüzdan ödeme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
});

module.exports = router;
