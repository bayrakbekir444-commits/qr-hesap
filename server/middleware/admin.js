const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./auth');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const adminMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Admin yetkisi yok.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Admin yetkisi yok.' });
    }
    next();
  } catch {
    res.status(401).json({ error: 'Geçersiz admin oturumu.' });
  }
};

module.exports = { adminMiddleware, ADMIN_USERNAME, ADMIN_PASSWORD };
