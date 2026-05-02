import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { Session, DeviceInfo, WsServerMessage } from '../types';
import { HEARTBEAT_TIMEOUT_MS } from '../config';

const sessions = new Map<string, Session>();

function parseUserAgent(ua: string): { browser: string; deviceType: DeviceInfo['deviceType'] } {
  let browser = 'Unknown';
  if (ua.includes('Edg')) {
    browser = 'Edge';
  } else if (ua.includes('Chrome')) {
    browser = 'Chrome';
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('Safari')) {
    browser = 'Safari';
  }

  let deviceType: DeviceInfo['deviceType'] = 'Desktop';
  if (/Mobile|Android|iPhone/i.test(ua)) {
    deviceType = 'Mobile';
  } else if (/iPad|Tablet/i.test(ua)) {
    deviceType = 'Tablet';
  }

  return { browser, deviceType };
}

export function addSession(socket: WebSocket, userAgent: string): Session {
  const id = randomUUID();
  const { browser, deviceType } = parseUserAgent(userAgent);

  const deviceInfo: DeviceInfo = {
    deviceId: id,
    deviceType,
    browser,
    connectedAt: new Date().toISOString(),
  };

  const session: Session = {
    id,
    socket,
    deviceInfo,
    lastHeartbeat: Date.now(),
  };

  sessions.set(id, session);
  return session;
}

export function removeSession(sessionId: string): Session | undefined {
  const session = sessions.get(sessionId);
  if (session) {
    sessions.delete(sessionId);
  }
  return session;
}

export function updateHeartbeat(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastHeartbeat = Date.now();
  }
}

export function getSessionCount(): number {
  return sessions.size;
}

export function getOnlineStats(): { onlineCount: number; devices: DeviceInfo[] } {
  const devices: DeviceInfo[] = [];
  sessions.forEach((s) => devices.push(s.deviceInfo));
  return {
    onlineCount: devices.length,
    devices,
  };
}

export function broadcastAll(message: WsServerMessage): void {
  const data = JSON.stringify(message);
  sessions.forEach((session) => {
    if (session.socket.readyState === WebSocket.OPEN) {
      session.socket.send(data);
    }
  });
}

export function sendToSession(sessionId: string, message: WsServerMessage): void {
  const session = sessions.get(sessionId);
  if (session && session.socket.readyState === WebSocket.OPEN) {
    session.socket.send(JSON.stringify(message));
  }
}

export function checkTimeouts(): string[] {
  const now = Date.now();
  const timedOut: string[] = [];

  sessions.forEach((session, id) => {
    if (now - session.lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
      timedOut.push(id);
    }
  });

  timedOut.forEach((id) => {
    const session = sessions.get(id);
    if (session) {
      session.socket.terminate();
      sessions.delete(id);
    }
  });

  return timedOut;
}

export function findSessionBySocket(socket: WebSocket): Session | undefined {
  for (const session of sessions.values()) {
    if (session.socket === socket) {
      return session;
    }
  }
  return undefined;
}
