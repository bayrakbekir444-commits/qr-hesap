// Paket sistemi kaldırıldı — tüm restoranlar tüm özelliklere erişebilir.
// Eski API'yi kıracak değişiklik yapmamak için fonksiyonlar no-op olarak duruyor.

const PACKAGES = {};

const getPackage = async () => ({
  type: 'unlimited',
  config: { label: 'Unlimited', monthly_fee: 0, max_tables: 9999, features: {} },
  expires_at: null,
  expired: false,
});

const requireFeature = () => (req, res, next) => next();

const checkTableLimit = async () => ({ ok: true });

module.exports = { PACKAGES, getPackage, requireFeature, checkTableLimit };
