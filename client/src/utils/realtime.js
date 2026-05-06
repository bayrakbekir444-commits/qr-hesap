// Socket.IO client wrapper — restoran panel/KDS için
import { io as socketIo } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || '/api';
// Socket için /api kısmını çıkar
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = socketIo(SOCKET_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    if (token) socket.emit('auth', { token });
  });

  socket.on('reconnect', () => {
    if (token) socket.emit('auth', { token });
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
