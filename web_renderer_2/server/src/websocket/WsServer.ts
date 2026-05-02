import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { addSession, checkTimeouts } from '../services/SessionManager';
import { handleMessage, handleClose, broadcastUserStatus } from './handlers';
import { HEARTBEAT_SCAN_INTERVAL_MS } from '../config';

let wss: WebSocketServer | null = null;
let timeoutTimer: NodeJS.Timeout | null = null;

export function initWsServer(httpServer: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (socket: WebSocket, req) => {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    addSession(socket, userAgent);

    socket.on('message', (raw: Buffer) => {
      handleMessage(socket, raw.toString());
    });

    socket.on('close', () => {
      handleClose(socket);
    });

    broadcastUserStatus();
  });

  timeoutTimer = setInterval(() => {
    const timedOut = checkTimeouts();
    if (timedOut.length > 0) {
      broadcastUserStatus();
    }
  }, HEARTBEAT_SCAN_INTERVAL_MS);

  return wss;
}

export function getWsServer(): WebSocketServer | null {
  return wss;
}

export function stopWsServer(): void {
  if (timeoutTimer) {
    clearInterval(timeoutTimer);
    timeoutTimer = null;
  }
  if (wss) {
    wss.close();
    wss = null;
  }
}
