const express = require('express');
const { getPool } = require('../db/init');
const { chat } = require('../utils/aiWaiter');

const router = express.Router();

// Basit IP bazlı rate-limit (dakikada 10 mesaj)
const rateBuckets = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 10;
  const bucket = rateBuckets.get(ip) || [];
  const fresh = bucket.filter((t) => now - t < windowMs);
  if (fresh.length >= max) return false;
  fresh.push(now);
  rateBuckets.set(ip, fresh);
  return true;
}

// POST /api/ai-waiter/:menuQrToken/chat
router.post('/:menuQrToken/chat', async (req, res) => {
  try {
    const { menuQrToken } = req.params;
    const { message, history, lang } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Mesaj gereklidir.' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: 'Mesaj çok uzun (max 1000 karakter).' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!rateLimit(ip)) {
      return res.status(429).json({ error: 'Çok hızlısın, biraz bekle.' });
    }

    const pool = getPool();
    const { rows: tableRows } = await pool.query(
      `SELECT t.id, t.restaurant_id, r.name AS restaurant_name, r.ai_waiter_enabled
       FROM tables t
       JOIN restaurants r ON r.id = t.restaurant_id
       WHERE t.menu_qr_token = $1 AND t.active = 1`,
      [menuQrToken]
    );
    const table = tableRows[0];
    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı.' });
    }

    if (table.ai_waiter_enabled === 0) {
      return res.status(403).json({ error: 'AI Garson bu restoranda kapalı.' });
    }

    const { rows: categories } = await pool.query(
      'SELECT id, name FROM categories WHERE restaurant_id = $1 ORDER BY sort_order, id',
      [table.restaurant_id]
    );
    const { rows: items } = await pool.query(
      'SELECT id, category_id, name, price, description, active FROM menu_items WHERE restaurant_id = $1 AND active = 1',
      [table.restaurant_id]
    );
    const menu = categories.map((c) => ({
      ...c,
      items: items.filter((i) => i.category_id === c.id),
    }));

    const result = await chat({
      restaurantName: table.restaurant_name,
      categories: menu,
      lang: ['tr', 'en', 'ar'].includes(lang) ? lang : 'tr',
      history: Array.isArray(history) ? history : [],
      userMessage: message.trim(),
    });

    res.json({ reply: result.text, usage: result.usage });
  } catch (err) {
    console.error('AI Garson hatası:', err.message);
    if (err.message?.includes('ANTHROPIC_API_KEY')) {
      return res.status(503).json({ error: 'AI Garson henüz yapılandırılmamış.' });
    }
    res.status(500).json({ error: 'Yanıt üretilemedi, tekrar deneyin.' });
  }
});

module.exports = router;
