const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getPool, initDb } = require('./init');

async function seed() {
  await initDb();
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Mevcut verileri temizle (FK sırası önemli)
    await client.query('DELETE FROM payments');
    await client.query('DELETE FROM order_items');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM table_assignments');
    await client.query('DELETE FROM tables');
    await client.query('DELETE FROM menu_items');
    await client.query('DELETE FROM categories');
    await client.query('DELETE FROM staff');
    await client.query('DELETE FROM campaigns');
    await client.query('DELETE FROM password_resets');
    await client.query('DELETE FROM payment_alerts');
    await client.query('DELETE FROM restaurants');

    // Postgres SERIAL sıralarını sıfırla
    const seqsToReset = [
      'restaurants_id_seq',
      'categories_id_seq',
      'menu_items_id_seq',
      'tables_id_seq',
      'orders_id_seq',
      'order_items_id_seq',
      'payments_id_seq',
      'staff_id_seq',
      'campaigns_id_seq',
      'table_assignments_id_seq',
      'password_resets_id_seq',
      'payment_alerts_id_seq',
    ];
    for (const s of seqsToReset) {
      try {
        await client.query(`ALTER SEQUENCE ${s} RESTART WITH 1`);
      } catch {}
    }

    console.log('Mevcut veriler temizlendi.');

    // Demo restoran
    const passwordHash = bcrypt.hashSync('123456', 10);
    const { rows: rRows } = await client.query(
      'INSERT INTO restaurants (name, password_hash) VALUES ($1, $2) RETURNING id',
      ['Demo Restoran', passwordHash]
    );
    const restaurantId = rRows[0].id;
    console.log(`Restoran oluşturuldu: Demo Restoran (ID: ${restaurantId})`);

    // Kategoriler
    const categoryData = [
      { name: 'Başlangıçlar', sort_order: 1 },
      { name: 'Ana Yemekler', sort_order: 2 },
      { name: 'İçecekler', sort_order: 3 },
      { name: 'Tatlılar', sort_order: 4 },
    ];

    const categoryIds = {};
    for (const cat of categoryData) {
      const { rows } = await client.query(
        'INSERT INTO categories (restaurant_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id',
        [restaurantId, cat.name, cat.sort_order]
      );
      categoryIds[cat.name] = rows[0].id;
    }
    console.log('Kategoriler oluşturuldu:', Object.keys(categoryIds).join(', '));

    // Menü ürünleri
    const menuData = [
      { category: 'Başlangıçlar', name: 'Mercimek Çorbası', price: 4500 },
      { category: 'Başlangıçlar', name: 'Ezogelin Çorbası', price: 4500 },
      { category: 'Başlangıçlar', name: 'Karışık Salata', price: 5500 },
      { category: 'Başlangıçlar', name: 'Humus', price: 5000 },
      { category: 'Ana Yemekler', name: 'Adana Kebap', price: 18500 },
      { category: 'Ana Yemekler', name: 'İskender', price: 22000 },
      { category: 'Ana Yemekler', name: 'Tavuk Şiş', price: 16000 },
      { category: 'Ana Yemekler', name: 'Köfte', price: 15000 },
      { category: 'Ana Yemekler', name: 'Pide', price: 12500 },
      { category: 'Ana Yemekler', name: 'Lahmacun', price: 8000 },
      { category: 'İçecekler', name: 'Ayran', price: 2000 },
      { category: 'İçecekler', name: 'Kola', price: 3000 },
      { category: 'İçecekler', name: 'Çay', price: 1500 },
      { category: 'İçecekler', name: 'Türk Kahvesi', price: 3500 },
      { category: 'Tatlılar', name: 'Künefe', price: 9000 },
      { category: 'Tatlılar', name: 'Baklava', price: 8500 },
      { category: 'Tatlılar', name: 'Sütlaç', price: 6000 },
      { category: 'Tatlılar', name: 'Kazandibi', price: 6500 },
    ];

    const menuItemIds = {};
    for (const item of menuData) {
      const { rows } = await client.query(
        'INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES ($1, $2, $3, $4) RETURNING id',
        [restaurantId, categoryIds[item.category], item.name, item.price]
      );
      menuItemIds[item.name] = rows[0].id;
    }
    console.log(`${menuData.length} menü ürünü oluşturuldu.`);

    // 8 masa
    const tableIds = {};
    for (let i = 1; i <= 8; i++) {
      const qrToken = uuidv4();
      const menuQrToken = uuidv4();
      const paymentQrToken = uuidv4();
      const { rows } = await client.query(
        'INSERT INTO tables (restaurant_id, table_number, qr_token, menu_qr_token, payment_qr_token) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [restaurantId, i, qrToken, menuQrToken, paymentQrToken]
      );
      tableIds[i] = rows[0].id;
    }
    console.log('8 masa oluşturuldu (menu_qr_token ve payment_qr_token ile).');

    // Masa 1 için açık sipariş
    const { rows: orderRows } = await client.query(
      "INSERT INTO orders (table_id, status, created_at, updated_at) VALUES ($1, 'open', NOW(), NOW()) RETURNING id",
      [tableIds[1]]
    );
    const orderId = orderRows[0].id;

    const orderItems = [
      { name: 'Adana Kebap', quantity: 2 },
      { name: 'Mercimek Çorbası', quantity: 1 },
      { name: 'Ayran', quantity: 2 },
      { name: 'Künefe', quantity: 1 },
    ];

    for (const oi of orderItems) {
      const menuItem = menuData.find((m) => m.name === oi.name);
      await client.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [orderId, menuItemIds[oi.name], oi.quantity, menuItem.price]
      );
    }

    // Sipariş toplamını hesapla
    const total = orderItems.reduce((sum, oi) => {
      const menuItem = menuData.find((m) => m.name === oi.name);
      return sum + oi.quantity * menuItem.price;
    }, 0);

    console.log(`Masa 1'de açık sipariş oluşturuldu (Sipariş #${orderId}):`);
    for (const oi of orderItems) {
      const menuItem = menuData.find((m) => m.name === oi.name);
      console.log(`  ${oi.quantity}x ${oi.name} - ${(oi.quantity * menuItem.price / 100).toFixed(2)} TL`);
    }
    console.log(`  Toplam: ${(total / 100).toFixed(2)} TL`);

    // Demo kullanıcı
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM wallet_transactions');
    await client.query('DELETE FROM wallets');
    await client.query('DELETE FROM users');

    try { await client.query('ALTER SEQUENCE users_id_seq RESTART WITH 1'); } catch {}
    try { await client.query('ALTER SEQUENCE wallets_id_seq RESTART WITH 1'); } catch {}
    try { await client.query('ALTER SEQUENCE wallet_transactions_id_seq RESTART WITH 1'); } catch {}
    try { await client.query('ALTER SEQUENCE notifications_id_seq RESTART WITH 1'); } catch {}

    const userPasswordHash = bcrypt.hashSync('123456', 10);
    const { rows: userRows } = await client.query(
      'INSERT INTO users (name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Demo Kullanıcı', 'demo@test.com', '05551234567', userPasswordHash]
    );
    const userId = userRows[0].id;

    await client.query(
      'INSERT INTO wallets (user_id, balance) VALUES ($1, $2)',
      [userId, 50000]
    );
    console.log('Demo kullanıcı oluşturuldu: demo@test.com / 123456 (Bakiye: 500.00 TL)');

    console.log('\nSeed verisi başarıyla yüklendi!');
    console.log('Restoran giriş bilgileri: Demo Restoran / 123456');
    console.log('Kullanıcı giriş bilgileri: demo@test.com / 123456');
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed hatası:', err);
      process.exit(1);
    });
}

module.exports = { seed };
