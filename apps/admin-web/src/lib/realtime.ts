import { io, type Socket } from 'socket.io-client';

function getRealtimeOrigin() {
  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') || 'http://localhost:3001';
  return base;
}

let socket: Socket | null = null;
let socketToken: string | null | undefined;

export function getRealtimeSocket(token?: string | null): Socket {
  if (typeof window === 'undefined') {
    throw new Error('Realtime socket is browser-only');
  }

  if (socket && socketToken === token) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socketToken = token;
  socket = io(`${getRealtimeOrigin()}/realtime`, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    auth: token ? { token } : undefined,
  });

  return socket;
}
