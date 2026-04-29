// Raporları test etmek için sahte (kapalı) siparişler oluşturur.
// Son 30 gün boyunca rastgele tarihlerde 25 sipariş üretir.

const { getDb, initDb } = require('./init');

initDb();
const db = getDb();

const RESTAURANT_ID = 1;
const tables = db.prepare('SELECT id FROM tables WHERE restaurant_id = ?').all(RESTAURANT_ID);
const items = db.prepare('SELECT id, price FROM menu_items WHERE restaurant_id = ? AND active = 1').all(RESTAURANT_ID);

if (tables.length === 0 || items.length === 0) {
  console.log('Masa veya menü ürünü yok, çıkılıyor.');
  process.exit(1);
}

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];

// Son 30 gün için tarih üretici
function randomPastDate(maxDaysAgo = 30) {
  const d = new Date();
  d.setDate(d.getDate() - rand(maxDaysAgo));
  d.setHours(11 + rand(11), rand(60), rand(60));
  return d.toISOString();
}

const insertOrder = db.prepare(
  'INSERT INTO orders (table_id, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
);
const insertItem = db.prepare(
  'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
);
const insertPayment = db.prepare(
  'INSERT INTO payments (order_id, payer_name, amount, tip, status, created_at, card_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

let totalOrders = 0;

const make = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const createdAt = randomPastDate(30);
    const orderResult = insertOrder.run(pick(tables).id, 'closed', createdAt, createdAt);
    const orderId = orderResult.lastInsertRowid;

    const itemCount = 2 + rand(4); // 2-5 ürün
    let total = 0;
    for (let j = 0; j < itemCount; j++) {
      const it = pick(items);
      const qty = 1 + rand(3); // 1-3 adet
      insertItem.run(orderId, it.id, qty, it.price);
      total += it.price * qty;
    }

    const tip = Math.random() < 0.4 ? Math.round(total * 0.10) : 0;
    insertPayment.run(orderId, 'Müşteri', total, tip, 'paid', createdAt, pick(['cash', 'card']));
    totalOrders++;
  }
});

make(25);
console.log(`✓ ${totalOrders} adet sahte kapalı sipariş oluşturuldu (son 30 gün).`);

// Özet rapor
const summary = db.prepare(
  `SELECT date(o.created_at) as d, COUNT(*) as orders, SUM(oi.quantity*oi.unit_price) as revenue
   FROM orders o
   JOIN order_items oi ON oi.order_id = o.id
   JOIN tables t ON o.table_id = t.id
   WHERE t.restaurant_id = ? AND o.status = 'closed'
   GROUP BY date(o.created_at)
   ORDER BY d DESC LIMIT 10`
).all(RESTAURANT_ID);
console.log('\nSon 10 gün özeti:');
summary.forEach(r => console.log(`  ${r.d}  →  ${r.orders} sipariş  ·  ${(r.revenue/100).toFixed(2)} TL`));
