export interface CastMedia {
  id: string;
  url: string;
  title: string;
  duration: number;
  format: 'mp4' | 'webm' | 'hls' | 'dash' | 'unknown';
  castAt: string;
  source: 'dlna' | 'manual';
  mimeType?: string;  // Actual Content-Type from server HEAD probe (for extensionless URLs like Douyin CDN)
  proxyUrl?: string;  // Local proxy URL for extensionless URLs (/proxy/{id})
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: 'Desktop' | 'Tablet' | 'Mobile';
  browser: string;
  connectedAt: string;
}

export interface PlayerStatus {
  state: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  currentTime: number;
  duration: number;
  error: string | null;
}

export type SortField = 'castAt' | 'title' | 'format';
export type SortOrder = 'asc' | 'desc';

// WebSocket message types
export type WsClientMessage =
  | { type: 'ping'; timestamp: number }
  | { type: 'cast:request' }
  | { type: 'player:status'; payload: PlayerStatus };

export type WsServerMessage =
  | { type: 'pong'; timestamp: number }
  | { type: 'cast:new'; payload: CastMedia }
  | { type: 'cast:current'; payload: CastMedia | null }
  | { type: 'user:status'; payload: { onlineCount: number; devices: DeviceInfo[] } }
  | { type: 'playlist:updated'; payload: { items: CastMedia[] } };
