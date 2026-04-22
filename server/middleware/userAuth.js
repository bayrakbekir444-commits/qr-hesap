const jwt = require('jsonwebtoken');

const USER_JWT_SECRET = process.env.USER_JWT_SECRET || 'qr-hesap-user-secret-key';

function userAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yetkilendirme başlığı eksik veya geçersiz.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, USER_JWT_SECRET);
    req.userId = decoded.userId;
    req.userName = decoded.userName;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token.' });
  }
}

module.exports = { userAuthMiddleware, USER_JWT_SECRET };
