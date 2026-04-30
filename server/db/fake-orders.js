// Raporları test etmek için sahte (kapalı) siparişler oluşturur.
// Son 30 gün boyunca rastgele tarihlerde 25 sipariş üretir.

const { getPool, initDb } = require('./init');

const RESTAURANT_ID = 1;
const COUNT = 25;

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];

function randomPastDate(maxDaysAgo = 30) {
  const d = new Date();
  d.setDate(d.getDate() - rand(maxDaysAgo));
  d.setHours(11 + rand(11), rand(60), rand(60));
  return d.toISOString();
}

(async () => {
  try {
    await initDb();
    const pool = getPool();

    const { rows: tables } = await pool.query(
      'SELECT id FROM tables WHERE restaurant_id = $1',
      [RESTAURANT_ID]
    );
    const { rows: items } = await pool.query(
      'SELECT id, price FROM menu_items WHERE restaurant_id = $1 AND active = 1',
      [RESTAURANT_ID]
    );

    if (tables.length === 0 || items.length === 0) {
      console.log('Masa veya menü ürünü yok, çıkılıyor.');
      process.exit(1);
    }

    const client = await pool.connect();
    let totalOrders = 0;
    try {
      await client.query('BEGIN');

      for (let i = 0; i < COUNT; i++) {
        const createdAt = randomPastDate(30);
        const { rows: orderRows } = await client.query(
          "INSERT INTO orders (table_id, status, created_at, updated_at) VALUES ($1, 'closed', $2, $3) RETURNING id",
          [pick(tables).id, createdAt, createdAt]
        );
        const orderId = orderRows[0].id;

        const itemCount = 2 + rand(4); // 2-5 ürün
        let total = 0;
        for (let j = 0; j < itemCount; j++) {
          const it = pick(items);
          const qty = 1 + rand(3); // 1-3 adet
          await client.query(
            'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
            [orderId, it.id, qty, it.price]
          );
          total += it.price * qty;
        }

        const tip = Math.random() < 0.4 ? Math.round(total * 0.1) : 0;
        await client.query(
          "INSERT INTO payments (order_id, payer_name, amount, tip, status, created_at, card_type) VALUES ($1, $2, $3, $4, 'paid', $5, $6)",
          [orderId, 'Müşteri', total, tip, createdAt, pick(['cash', 'card'])]
        );
        totalOrders++;
      }

      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch {}
      throw err;
    } finally {
      client.release();
    }

    console.log(`✓ ${totalOrders} adet sahte kapalı sipariş oluşturuldu (son 30 gün).`);

    // Özet rapor
    const { rows: summary } = await pool.query(
      `SELECT o.created_at::date as d, COUNT(*)::int as orders, SUM(oi.quantity*oi.unit_price)::bigint as revenue
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN tables t ON o.table_id = t.id
       WHERE t.restaurant_id = $1 AND o.status = 'closed'
       GROUP BY o.created_at::date
       ORDER BY d DESC LIMIT 10`,
      [RESTAURANT_ID]
    );
    console.log('\nSon 10 gün özeti:');
    summary.forEach((r) =>
      console.log(`  ${r.d.toISOString ? r.d.toISOString().split('T')[0] : r.d}  →  ${r.orders} sipariş  ·  ${(Number(r.revenue) / 100).toFixed(2)} TL`)
    );

    process.exit(0);
  } catch (err) {
    console.error('Fake orders hatası:', err);
    process.exit(1);
  }
})();
