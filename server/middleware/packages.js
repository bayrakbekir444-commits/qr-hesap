const { getPool } = require('../db/init');

const PACKAGES = {
  temel: {
    label: 'Temel',
    monthly_fee: 400,
    max_tables: 10,
    features: {
      reports: false,
      staff: false,
      multi_branch: false,
    },
  },
  pro: {
    label: 'Pro',
    monthly_fee: 800,
    max_tables: 30,
    features: {
      reports: true,
      staff: true,
      multi_branch: false,
    },
  },
  zincir: {
    label: 'Zincir',
    monthly_fee: 2000,
    max_tables: 999,
    features: {
      reports: true,
      staff: true,
      multi_branch: true,
    },
  },
};

const getPackage = async (restaurantId) => {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT package_type, package_expires_at FROM restaurants WHERE id = $1',
    [restaurantId]
  );
  const r = rows[0];
  const type = r?.package_type || 'temel';
  const config = PACKAGES[type] || PACKAGES.temel;
  const expired = r?.package_expires_at ? new Date(r.package_expires_at) < new Date() : false;
  return { type, config, expires_at: r?.package_expires_at, expired };
};

// Middleware: belirli bir özelliği gerektirir
const requireFeature = (feature) => async (req, res, next) => {
  try {
    const pkg = await getPackage(req.restaurantId);
    if (pkg.expired) {
      return res.status(402).json({ error: 'Paket süresi dolmuş. Lütfen sistem sorumlusuna başvurun.' });
    }
    if (!pkg.config.features[feature]) {
      return res.status(403).json({
        error: `Bu özellik ${pkg.config.label} paketinde yok. Pro veya Zincir pakete yükselt.`,
        upgrade_required: true,
        current_package: pkg.type,
      });
    }
    next();
  } catch (err) {
    console.error('requireFeature hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
};

// Masa eklemeden önce limit kontrolü
const checkTableLimit = async (restaurantId) => {
  const pool = getPool();
  const pkg = await getPackage(restaurantId);
  if (pkg.expired) {
    return { ok: false, error: 'Paket süresi dolmuş.' };
  }
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int as c FROM tables WHERE restaurant_id = $1 AND active = 1',
    [restaurantId]
  );
  const count = rows[0].c;
  if (count >= pkg.config.max_tables) {
    return {
      ok: false,
      error: `${pkg.config.label} paketinde en fazla ${pkg.config.max_tables} masa ekleyebilirsin. Pro pakete yükselt.`,
      upgrade_required: true,
    };
  }
  return { ok: true };
};

module.exports = { PACKAGES, getPackage, requireFeature, checkTableLimit };
