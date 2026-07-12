import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:5000', {
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(user: { id: string; role: string; departmentId: string | null }) {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    
    s.off('connect'); // Remove existing listeners
    s.on('connect', () => {
      console.log('[SOCKET CONNECTED]: Joined realtime namespace rooms');
      s.emit('join:employee', user.id);
      s.emit('join:role', user.role);
      if (user.departmentId) {
        s.emit('join:department', user.departmentId);
      }
    });
  }
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
    socket = null;
  }
}
