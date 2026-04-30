#!/usr/bin/env node
// Kullanım: node set-package.js "Restoran Adı" <temel|pro|zincir> [ay_sayısı]
// Örnek: node set-package.js "Demo Restoran" pro 12

const { getPool, initDb } = require('./db/init');

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

(async () => {
  try {
    await initDb();
    const pool = getPool();

    const { rows } = await pool.query('SELECT id FROM restaurants WHERE name = $1', [name]);
    const restaurant = rows[0];
    if (!restaurant) {
      console.error(`Restoran bulunamadı: "${name}"`);
      process.exit(1);
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + parseInt(months, 10));
    const expiresStr = expiresAt.toISOString().split('T')[0];

    await pool.query(
      'UPDATE restaurants SET package_type = $1, package_expires_at = $2 WHERE id = $3',
      [packageType, expiresStr, restaurant.id]
    );

    console.log(`✓ "${name}" → ${packageType.toUpperCase()} paket (${months} ay, bitiş: ${expiresStr})`);
    process.exit(0);
  } catch (err) {
    console.error('set-package hatası:', err);
    process.exit(1);
  }
})();
