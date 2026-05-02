import { WebSocket } from 'ws';
import {
  WsClientMessage,
  WsPongMessage,
  WsUserStatusMessage,
  WsPlaylistUpdatedMessage,
} from '../types';
import * as CastService from '../services/CastService';
import {
  updateHeartbeat,
  removeSession,
  getOnlineStats,
  broadcastAll,
  findSessionBySocket,
} from '../services/SessionManager';

function log(msg: string, ...args: unknown[]): void {
  console.log(`[WS] ${new Date().toISOString()} ${msg}`, ...args);
}

export function handleMessage(socket: WebSocket, raw: string): void {
  let msg: WsClientMessage;

  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  switch (msg.type) {
    case 'ping': {
      const session = findSessionBySocket(socket);
      if (session) {
        updateHeartbeat(session.id);
      }
      const pong: WsPongMessage = { type: 'pong', timestamp: Date.now() };
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(pong));
      }
      break;
    }

    case 'cast:request': {
      const items = CastService.getPlaylist();
      log(`cast:request | sending playlist (${items.length} items) to session`);
      const playlist: WsPlaylistUpdatedMessage = {
        type: 'playlist:updated',
        payload: { items },
      };
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(playlist));
      }
      break;
    }

    case 'player:status':
      // Reserved for future use
      break;

    default:
      break;
  }
}

export function handleClose(socket: WebSocket): void {
  const session = findSessionBySocket(socket);
  if (session) {
    removeSession(session.id);
    broadcastUserStatus();
  }
}

export function broadcastUserStatus(): void {
  const stats = getOnlineStats();
  const msg: WsUserStatusMessage = {
    type: 'user:status',
    payload: stats,
  };
  broadcastAll(msg);
}
