// Postgres'e migrate edildikten sonra dosya tabanlı yedekleme bypass edildi.
// Render'da pg_dump CLI yok; yedekleme için Render Postgres'in yerleşik
// otomatik yedeklerinden yararlanılıyor (PITR + günlük snapshot).
// Eğer manuel yedek istenirse Render Dashboard üzerinden veya ayrı bir
// scheduled job ile pg_dump çalıştırılabilir.

const baslat = () => {
  console.log('📦 Yedekleme: Postgres modunda (Render snapshot kullanılıyor) — local yedekleme devre dışı.');
};

const durdur = () => {};

const yedekAl = async () => {
  // No-op
};

module.exports = { baslat, durdur, yedekAl };

if (require.main === module) {
  baslat();
}
