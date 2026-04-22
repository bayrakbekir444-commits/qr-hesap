const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb, initDb } = require('./init');

function seed() {
  const db = initDb();

  // Mevcut verileri temizle
  db.exec('DELETE FROM payments');
  db.exec('DELETE FROM order_items');
  db.exec('DELETE FROM orders');
  db.exec('DELETE FROM tables');
  db.exec('DELETE FROM menu_items');
  db.exec('DELETE FROM categories');
  db.exec('DELETE FROM restaurants');

  // Auto-increment sıfırla
  db.exec("DELETE FROM sqlite_sequence");

  console.log('Mevcut veriler temizlendi.');

  // Demo restoran
  const passwordHash = bcrypt.hashSync('123456', 10);
  const restaurantResult = db.prepare(
    'INSERT INTO restaurants (name, password_hash) VALUES (?, ?)'
  ).run('Demo Restoran', passwordHash);
  const restaurantId = restaurantResult.lastInsertRowid;
  console.log(`Restoran oluşturuldu: Demo Restoran (ID: ${restaurantId})`);

  // Kategoriler
  const categoryData = [
    { name: 'Başlangıçlar', sort_order: 1 },
    { name: 'Ana Yemekler', sort_order: 2 },
    { name: 'İçecekler', sort_order: 3 },
    { name: 'Tatlılar', sort_order: 4 },
  ];

  const insertCategory = db.prepare(
    'INSERT INTO categories (restaurant_id, name, sort_order) VALUES (?, ?, ?)'
  );

  const categoryIds = {};
  for (const cat of categoryData) {
    const result = insertCategory.run(restaurantId, cat.name, cat.sort_order);
    categoryIds[cat.name] = result.lastInsertRowid;
  }
  console.log('Kategoriler oluşturuldu:', Object.keys(categoryIds).join(', '));

  // Menü ürünleri
  const menuData = [
    // Başlangıçlar
    { category: 'Başlangıçlar', name: 'Mercimek Çorbası', price: 4500 },
    { category: 'Başlangıçlar', name: 'Ezogelin Çorbası', price: 4500 },
    { category: 'Başlangıçlar', name: 'Karışık Salata', price: 5500 },
    { category: 'Başlangıçlar', name: 'Humus', price: 5000 },
    // Ana Yemekler
    { category: 'Ana Yemekler', name: 'Adana Kebap', price: 18500 },
    { category: 'Ana Yemekler', name: 'İskender', price: 22000 },
    { category: 'Ana Yemekler', name: 'Tavuk Şiş', price: 16000 },
    { category: 'Ana Yemekler', name: 'Köfte', price: 15000 },
    { category: 'Ana Yemekler', name: 'Pide', price: 12500 },
    { category: 'Ana Yemekler', name: 'Lahmacun', price: 8000 },
    // İçecekler
    { category: 'İçecekler', name: 'Ayran', price: 2000 },
    { category: 'İçecekler', name: 'Kola', price: 3000 },
    { category: 'İçecekler', name: 'Çay', price: 1500 },
    { category: 'İçecekler', name: 'Türk Kahvesi', price: 3500 },
    // Tatlılar
    { category: 'Tatlılar', name: 'Künefe', price: 9000 },
    { category: 'Tatlılar', name: 'Baklava', price: 8500 },
    { category: 'Tatlılar', name: 'Sütlaç', price: 6000 },
    { category: 'Tatlılar', name: 'Kazandibi', price: 6500 },
  ];

  const insertItem = db.prepare(
    'INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (?, ?, ?, ?)'
  );

  const menuItemIds = {};
  for (const item of menuData) {
    const result = insertItem.run(restaurantId, categoryIds[item.category], item.name, item.price);
    menuItemIds[item.name] = result.lastInsertRowid;
  }
  console.log(`${menuData.length} menü ürünü oluşturuldu.`);

  // 8 masa
  const insertTable = db.prepare(
    'INSERT INTO tables (restaurant_id, table_number, qr_token, menu_qr_token, payment_qr_token) VALUES (?, ?, ?, ?, ?)'
  );

  const tableIds = {};
  for (let i = 1; i <= 8; i++) {
    const qrToken = uuidv4();
    const menuQrToken = uuidv4();
    const paymentQrToken = uuidv4();
    const result = insertTable.run(restaurantId, i, qrToken, menuQrToken, paymentQrToken);
    tableIds[i] = result.lastInsertRowid;
  }
  console.log('8 masa oluşturuldu (menu_qr_token ve payment_qr_token ile).');

  // Masa 1 için açık sipariş
  const now = new Date().toISOString();
  const orderResult = db.prepare(
    'INSERT INTO orders (table_id, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
  ).run(tableIds[1], 'open', now, now);
  const orderId = orderResult.lastInsertRowid;

  const insertOrderItem = db.prepare(
    'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
  );

  const orderItems = [
    { name: 'Adana Kebap', quantity: 2 },
    { name: 'Mercimek Çorbası', quantity: 1 },
    { name: 'Ayran', quantity: 2 },
    { name: 'Künefe', quantity: 1 },
  ];

  for (const oi of orderItems) {
    const menuItem = menuData.find((m) => m.name === oi.name);
    insertOrderItem.run(orderId, menuItemIds[oi.name], oi.quantity, menuItem.price);
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
  db.exec('DELETE FROM notifications');
  db.exec('DELETE FROM wallet_transactions');
  db.exec('DELETE FROM wallets');
  db.exec('DELETE FROM users');

  const userPasswordHash = bcrypt.hashSync('123456', 10);
  const userResult = db.prepare(
    'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)'
  ).run('Demo Kullanıcı', 'demo@test.com', '05551234567', userPasswordHash);
  const userId = userResult.lastInsertRowid;

  db.prepare('INSERT INTO wallets (user_id, balance) VALUES (?, ?)').run(userId, 50000);
  console.log('Demo kullanıcı oluşturuldu: demo@test.com / 123456 (Bakiye: 500.00 TL)');

  console.log('\nSeed verisi başarıyla yüklendi!');
  console.log('Restoran giriş bilgileri: Demo Restoran / 123456');
  console.log('Kullanıcı giriş bilgileri: demo@test.com / 123456');
}

seed();
