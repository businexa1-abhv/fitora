import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';

export type LiveSlotUpdated = {
  id: string;
  courtId: string;
  capacity?: number;
  availableSeats?: number;
  reservedSeats?: number;
  confirmedSeats?: number;
  availabilityStatus?: 'AVAILABLE' | 'FEW_SPOTS' | 'FULL' | 'BLOCKED' | 'MAINTENANCE' | 'HOLIDAY';
  isBooked: boolean;
  isBlocked: boolean;
  blockReason?: string | null;
  startTime: string;
  endTime: string;
  price: string;
};

function getRealtimeOrigin() {
  return API_URL.replace(/\/api\/v1\/?$/, '');
}

let socket: Socket | null = null;
let socketToken: string | null | undefined;

export function getRealtimeSocket(token?: string | null): Socket {
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

export function disconnectRealtimeSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  socketToken = undefined;
}
