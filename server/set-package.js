#!/usr/bin/env node
// Kullanım: node set-package.js "Restoran Adı" <temel|pro|zincir> [ay_sayısı]
// Örnek: node set-package.js "Demo Restoran" pro 12

const { getDb, initDb } = require('./db/init');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Kullanım: node set-package.js "Restoran Adı" <temel|pro|zincir> [ay_sayısı]');
  console.log('Örnek: node set-package.js "Demo Restoran" pro 12');
  process.exit(1);
}

const [name, packageType, months = '1'] = args;
const validTypes = ['temel', 'pro', 'zincir'];
if (!validTypes.includes(packageType)) {
  console.error('Geçersiz paket. Seçenekler:', validTypes.join(', '));
  process.exit(1);
}

initDb();
const db = getDb();

const restaurant = db.prepare('SELECT * FROM restaurants WHERE name = ?').get(name);
if (!restaurant) {
  console.error(`Restoran bulunamadı: "${name}"`);
  process.exit(1);
}

const expiresAt = new Date();
expiresAt.setMonth(expiresAt.getMonth() + parseInt(months, 10));
const expiresStr = expiresAt.toISOString().split('T')[0];

db.prepare(
  'UPDATE restaurants SET package_type = ?, package_expires_at = ? WHERE id = ?'
).run(packageType, expiresStr, restaurant.id);

console.log(`✓ "${name}" → ${packageType.toUpperCase()} paket (${months} ay, bitiş: ${expiresStr})`);
