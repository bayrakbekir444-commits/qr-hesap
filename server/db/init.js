const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function runAlterTables(database) {
  const alterStatements = [
    "ALTER TABLE menu_items ADD COLUMN name_en TEXT DEFAULT ''",
    "ALTER TABLE menu_items ADD COLUMN name_ar TEXT DEFAULT ''",
    "ALTER TABLE categories ADD COLUMN name_en TEXT DEFAULT ''",
    "ALTER TABLE categories ADD COLUMN name_ar TEXT DEFAULT ''",
    "ALTER TABLE tables ADD COLUMN menu_qr_token TEXT",
    "ALTER TABLE tables ADD COLUMN payment_qr_token TEXT",
    "ALTER TABLE restaurants ADD COLUMN email TEXT",
    "ALTER TABLE restaurants ADD COLUMN phone TEXT",
    "ALTER TABLE tables ADD COLUMN name TEXT",
    "ALTER TABLE restaurants ADD COLUMN package_type TEXT DEFAULT 'temel'",
    "ALTER TABLE restaurants ADD COLUMN package_expires_at TEXT",
    "ALTER TABLE waiter_calls ADD COLUMN dismissed_at TEXT",
    "ALTER TABLE menu_items ADD COLUMN image_url TEXT",
    "ALTER TABLE menu_items ADD COLUMN is_special INTEGER DEFAULT 0",
    "ALTER TABLE menu_items ADD COLUMN special_discount INTEGER DEFAULT 0",
    "ALTER TABLE restaurants ADD COLUMN logo_url TEXT",
    "ALTER TABLE restaurants ADD COLUMN description TEXT",
    "ALTER TABLE campaigns ADD COLUMN code TEXT",
  ];

  for (const sql of alterStatements) {
    try {
      database.exec(sql);
    } catch (err) {
      // Column already exists - ignore
      if (!err.message.includes('duplicate column')) {
        console.error('ALTER TABLE hatası:', err.message);
      }
    }
  }
}

function backfillQrTokens(database) {
  const rows = database.prepare(
    'SELECT id FROM tables WHERE menu_qr_token IS NULL OR payment_qr_token IS NULL'
  ).all();

  if (rows.length > 0) {
    const update = database.prepare(
      'UPDATE tables SET menu_qr_token = ?, payment_qr_token = ? WHERE id = ?'
    );
    const backfill = database.transaction(() => {
      for (const row of rows) {
        update.run(uuidv4(), uuidv4(), row.id);
      }
    });
    backfill();
    console.log(`${rows.length} masaya menu_qr_token ve payment_qr_token atandı.`);
  }
}

function ensurePasswordResetsTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
    )
  `);
}

function ensurePaymentAlertsTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS payment_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      table_id INTEGER NOT NULL,
      restaurant_id INTEGER NOT NULL,
      total_amount INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (table_id) REFERENCES tables(id)
    )
  `);
}

function initDb() {
  const database = getDb();
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  database.exec(schema);
  runAlterTables(database);
  ensurePaymentAlertsTable(database);
  ensurePasswordResetsTable(database);
  backfillQrTokens(database);
  console.log('Veritabanı tabloları oluşturuldu.');
  return database;
}

// Doğrudan çalıştırılırsa tabloları oluştur
if (require.main === module) {
  initDb();
  console.log('Veritabanı başarıyla başlatıldı.');
}

module.exports = { getDb, initDb };
