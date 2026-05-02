// === Cast Media ===

export interface CastMedia {
  id: string;
  url: string;
  title: string;
  duration: number;
  format: 'mp4' | 'webm' | 'hls' | 'dash' | 'unknown';
  castAt: string;
  source: 'dlna' | 'manual';
}

// === Player Status ===

export interface PlayerStatus {
  state: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  error: string | null;
}

// === Device Info ===

export interface DeviceInfo {
  deviceId: string;
  deviceType: 'Desktop' | 'Tablet' | 'Mobile';
  browser: string;
  connectedAt: string;
}

// === WebSocket Session ===

export interface Session {
  id: string;
  socket: import('ws').WebSocket;
  deviceInfo: DeviceInfo;
  lastHeartbeat: number;
}

// === WebSocket Messages (Client → Server) ===

export interface WsPingMessage {
  type: 'ping';
  timestamp: number;
}

export interface WsCastRequestMessage {
  type: 'cast:request';
}

export interface WsPlayerStatusMessage {
  type: 'player:status';
  payload: PlayerStatus;
}

export type WsClientMessage =
  | WsPingMessage
  | WsCastRequestMessage
  | WsPlayerStatusMessage;

// === WebSocket Messages (Server → Client) ===

export interface WsPongMessage {
  type: 'pong';
  timestamp: number;
}

export interface WsCastNewMessage {
  type: 'cast:new';
  payload: CastMedia;
}

export interface WsCastCurrentMessage {
  type: 'cast:current';
  payload: CastMedia | null;
}

export interface WsUserStatusMessage {
  type: 'user:status';
  payload: {
    onlineCount: number;
    devices: DeviceInfo[];
  };
}

export interface WsPlaylistUpdatedMessage {
  type: 'playlist:updated';
  payload: {
    items: CastMedia[];
  };
}

export type WsServerMessage =
  | WsPongMessage
  | WsCastNewMessage
  | WsCastCurrentMessage
  | WsUserStatusMessage
  | WsPlaylistUpdatedMessage;

// === REST API Types ===

export interface CastRequestBody {
  url: string;
  title?: string;
  duration?: number;
  source?: 'dlna' | 'manual';
}

export interface CastResponse {
  success: true;
  media: CastMedia;
}

export interface CastGetResponse {
  playlist: CastMedia[];
}

export interface UsersResponse {
  onlineCount: number;
  devices: DeviceInfo[];
}

export interface StatusResponse {
  status: 'ok';
  uptime: number;
  hasMedia: boolean;
  onlineCount: number;
}

export interface ErrorResponse {
  error: string;
}
