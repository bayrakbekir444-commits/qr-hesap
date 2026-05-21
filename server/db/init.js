const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set.');
    }
    // Render Postgres genelde SSL gerektirir; lokal kurulumlarda devre dışı bırakılabilir.
    const useSsl = process.env.PG_NO_SSL === '1' ? false : { rejectUnauthorized: false };
    pool = new Pool({
      connectionString,
      ssl: useSsl,
      max: parseInt(process.env.PG_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
    });
    pool.on('error', (err) => {
      console.error('Postgres pool hatası:', err);
    });
  }
  return pool;
}

// Geriye dönük uyumluluk için (mevcut import {getDb} kullanan dosyalar varsa)
function getDb() {
  return getPool();
}

// Postgres'te sütun ekleme (IF NOT EXISTS native destekleniyor)
async function runAlterTables(client) {
  const alterStatements = [
    "ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS name_en TEXT DEFAULT ''",
    "ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS name_ar TEXT DEFAULT ''",
    "ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_en TEXT DEFAULT ''",
    "ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_ar TEXT DEFAULT ''",
    "ALTER TABLE tables ADD COLUMN IF NOT EXISTS menu_qr_token TEXT",
    "ALTER TABLE tables ADD COLUMN IF NOT EXISTS payment_qr_token TEXT",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS email TEXT",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone TEXT",
    "ALTER TABLE tables ADD COLUMN IF NOT EXISTS name TEXT",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS package_type TEXT DEFAULT 'temel'",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS package_expires_at TEXT",
    "ALTER TABLE waiter_calls ADD COLUMN IF NOT EXISTS dismissed_at TEXT",
    "ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT",
    "ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_special SMALLINT DEFAULT 0",
    "ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS special_discount INTEGER DEFAULT 0",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo_url TEXT",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS description TEXT",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS code TEXT",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_type TEXT",
    "ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS stock_count INTEGER DEFAULT NULL",
    "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS response TEXT",
    "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS response_at TIMESTAMPTZ",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS iyzico_payment_id TEXT",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS iyzico_conversation_id TEXT",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'mock'",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS error_message TEXT",
    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS kitchen_status TEXT DEFAULT 'pending'",
    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
    "UPDATE order_items SET created_at = NOW() WHERE created_at IS NULL",
    "UPDATE order_items SET kitchen_status = 'pending' WHERE kitchen_status IS NULL",
    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS kitchen_updated_at TIMESTAMPTZ",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hide_branding SMALLINT DEFAULT 0",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS ai_waiter_enabled SMALLINT DEFAULT 1",
    // iyzico ödeme bilgileri (her restoran için)
    `CREATE TABLE IF NOT EXISTS restaurant_billing (
      restaurant_id INTEGER PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
      company_type TEXT,
      legal_name TEXT,
      tax_number TEXT,
      tax_office TEXT,
      identity_number TEXT,
      iban TEXT,
      authorized_name TEXT,
      authorized_surname TEXT,
      authorized_email TEXT,
      authorized_phone TEXT,
      authorized_identity TEXT,
      address_city TEXT,
      address_district TEXT,
      address_full TEXT,
      address_postal_code TEXT,
      website TEXT,
      mcc_code TEXT DEFAULT '5812',
      iyzico_submerchant_key TEXT,
      status TEXT DEFAULT 'incomplete',
      accepted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];

  for (const sql of alterStatements) {
    try {
      await client.query(sql);
    } catch (err) {
      console.error('ALTER TABLE hatası:', err.message);
    }
  }
}

async function backfillQrTokens(client) {
  const { rows } = await client.query(
    'SELECT id FROM tables WHERE menu_qr_token IS NULL OR payment_qr_token IS NULL'
  );

  if (rows.length > 0) {
    for (const row of rows) {
      await client.query(
        'UPDATE tables SET menu_qr_token = $1, payment_qr_token = $2 WHERE id = $3',
        [uuidv4(), uuidv4(), row.id]
      );
    }
    console.log(`${rows.length} masaya menu_qr_token ve payment_qr_token atandı.`);
  }
}

async function ensurePasswordResetsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      restaurant_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used SMALLINT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
    )
  `);
}

async function ensurePaymentAlertsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS payment_alerts (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL,
      table_id INTEGER NOT NULL,
      restaurant_id INTEGER NOT NULL,
      total_amount INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (table_id) REFERENCES tables(id)
    )
  `);
}

async function initDb() {
  const p = getPool();
  const client = await p.connect();
  try {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    await client.query(schema);
    await runAlterTables(client);
    await ensurePaymentAlertsTable(client);
    await ensurePasswordResetsTable(client);
    await backfillQrTokens(client);
    console.log('Veritabanı tabloları oluşturuldu (Postgres).');
  } finally {
    client.release();
  }
  return p;
}

// Doğrudan çalıştırılırsa tabloları oluştur
if (require.main === module) {
  (async () => {
    try {
      await initDb();
      console.log('Veritabanı başarıyla başlatıldı.');
      process.exit(0);
    } catch (err) {
      console.error('initDb hatası:', err);
      process.exit(1);
    }
  })();
}

module.exports = { getPool, getDb, initDb };
