import { io, type Socket } from 'socket.io-client';
import type { CourtSlot } from '@fitora/shared';
import { API_URL } from './api';

export type LiveSlotUpdated = Pick<
  CourtSlot,
  | 'id'
  | 'courtId'
  | 'capacity'
  | 'availableSeats'
  | 'reservedSeats'
  | 'confirmedSeats'
  | 'availabilityStatus'
  | 'isBooked'
  | 'isBlocked'
  | 'startTime'
  | 'endTime'
  | 'price'
> & {
  blockReason?: string | null;
};

function getRealtimeOrigin() {
  return API_URL.replace(/\/api\/v1\/?$/, '');
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

export function disconnectRealtimeSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  socketToken = undefined;
}
