// Socket.IO altyapısı — restoran ID bazlı odalarla
// Kullanım:
//   const { initRealtime, emitToRestaurant } = require('./utils/realtime');
//   const httpServer = http.createServer(app);
//   initRealtime(httpServer);
//   ...
//   emitToRestaurant(restaurantId, 'order:new', payload);

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initRealtime(httpServer) {
  if (io) return io;

  const corsRaw = process.env.CORS_ORIGIN || '';
  const corsOrigin = corsRaw === '*' || corsRaw === ''
    ? true
    : corsRaw.split(',').map((s) => s.trim());

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    // Restoran panel/KDS bağlanır → JWT ile yetki doğrula → restoran odasına ekle
    socket.on('auth', (data) => {
      try {
        const token = data?.token;
        if (!token) {
          socket.emit('auth:error', { error: 'Token yok.' });
          return;
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        const restaurantId = decoded.restaurantId;
        if (!restaurantId) {
          socket.emit('auth:error', { error: 'Geçersiz token.' });
          return;
        }
        socket.join(`restaurant:${restaurantId}`);
        socket.data.restaurantId = restaurantId;
        socket.emit('auth:ok', { restaurantId });
      } catch (e) {
        socket.emit('auth:error', { error: 'Yetkilendirme başarısız.' });
      }
    });

    socket.on('disconnect', () => {
      // Otomatik temizleniyor
    });
  });

  return io;
}

function emitToRestaurant(restaurantId, event, payload) {
  if (!io || !restaurantId) return;
  io.to(`restaurant:${restaurantId}`).emit(event, payload);
}

function getIO() {
  return io;
}

module.exports = {
  initRealtime,
  emitToRestaurant,
  getIO,
};
