const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');
const BACKUP_DIR = path.join(__dirname, 'backups');
const MAX_BACKUPS = 7; // Son 7 günü tut

const ensureDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
};

const yedekAl = () => {
  try {
    if (!fs.existsSync(DB_PATH)) return;
    ensureDir();
    const tarih = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hedef = path.join(BACKUP_DIR, `database-${tarih}.sqlite`);
    fs.copyFileSync(DB_PATH, hedef);
    console.log(`✓ Yedek alındı: ${path.basename(hedef)}`);
    eskiYedekleriSil();
  } catch (err) {
    console.error('Yedekleme hatası:', err.message);
  }
};

const eskiYedekleriSil = () => {
  try {
    const dosyalar = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('database-') && f.endsWith('.sqlite'))
      .map((f) => ({
        name: f,
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    const silinecekler = dosyalar.slice(MAX_BACKUPS);
    silinecekler.forEach((d) => {
      fs.unlinkSync(path.join(BACKUP_DIR, d.name));
      console.log(`  Eski yedek silindi: ${d.name}`);
    });
  } catch {}
};

// Her 24 saatte bir yedek al
let interval = null;
const baslat = () => {
  yedekAl(); // başlangıçta bir kez
  interval = setInterval(yedekAl, 24 * 60 * 60 * 1000);
  console.log(`📦 Otomatik yedekleme başladı (her 24 saat, son ${MAX_BACKUPS} gün)`);
};

const durdur = () => {
  if (interval) clearInterval(interval);
};

module.exports = { baslat, durdur, yedekAl };

// Doğrudan çalıştırılırsa tek seferlik yedek
if (require.main === module) {
  yedekAl();
}
