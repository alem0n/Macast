import { useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { receiveCast } from '../store/playerSlice';
import { setPlaylistItems, appendItem, playMediaItem } from '../store/playlistSlice';
import { updateUserStatus, setWsConnected } from '../store/userSlice';
import { getStore } from '../store';
import { WsServerMessage } from '../types';

const TAG = '[WS-Client]';
const WS_URL = `ws://${window.location.host}`;
const HEARTBEAT_INTERVAL = 30000;
const MAX_BACKOFF = 30000;

function log(msg: string, ...args: unknown[]): void {
  console.log(`${TAG} ${new Date().toISOString()} ${msg}`, ...args);
}

export function useWebSocket(): void {
  const dispatch = useDispatch();
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    log(`connecting to ${WS_URL}...`);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      log('connected, requesting playlist');
      dispatch(setWsConnected(true));
      reconnectAttemptRef.current = 0;

      ws.send(JSON.stringify({ type: 'cast:request' }));

      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      }, HEARTBEAT_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsServerMessage = JSON.parse(event.data);

        switch (msg.type) {
          case 'cast:new': {
            const media = msg.payload;
            log(`cast:new | id=${media.id} title="${media.title}" format=${media.format} source=${media.source}`);

            dispatch(appendItem(media));

            const state = getStore().getState();
            const newIdx = state.playlist.items.length - 1;
            const localIdx = state.playlist.currentIndex;

            // DLNA casts (source='dlna') always抢占当前播放 — 用户从手机
            // 投屏的意图就是立即观看。web 来源（用户在浏览器输入栏投屏）
            // 仅在空闲时自动播放，避免打断正在进行的观看。
            if (media.source === 'dlna') {
              log(`cast:new | DLNA FORCE-PLAY — switching from index=${localIdx} to ${newIdx}`);
              dispatch(playMediaItem(newIdx));
              dispatch(receiveCast(media));
            } else if (localIdx < 0) {
              log(`cast:new | AUTO-PLAY — idle browser, setting currentIndex=${newIdx}`);
              dispatch(playMediaItem(newIdx));
              dispatch(receiveCast(media));
            } else {
              log(`cast:new | SKIP auto-play — already playing item at index=${localIdx}`);
            }
            break;
          }

          case 'cast:current': {
            if (msg.payload && getStore().getState().playlist.items.length === 0) {
              log(`cast:current | legacy fallback — playing id=${msg.payload.id}`);
              dispatch(receiveCast(msg.payload));
            }
            break;
          }

          case 'playlist:updated': {
            const count = msg.payload.items.length;
            log(`playlist:updated | ${count} items`);
            dispatch(setPlaylistItems(msg.payload.items));
            break;
          }

          case 'user:status':
            log(`user:status | online=${msg.payload.onlineCount} devices=${msg.payload.devices.length}`);
            dispatch(updateUserStatus(msg.payload));
            break;

          case 'pong':
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      log('disconnected, scheduling reconnect');
      dispatch(setWsConnected(false));
      clearInterval(heartbeatRef.current);
      scheduleReconnect();
    };

    ws.onerror = () => {
      log('error, closing socket');
      ws.close();
    };
  }, [dispatch]);

  const scheduleReconnect = useCallback(() => {
    const delay = Math.min(
      Math.pow(2, reconnectAttemptRef.current) * 1000,
      MAX_BACKOFF
    );
    reconnectAttemptRef.current += 1;
    log(`reconnect attempt #${reconnectAttemptRef.current} in ${delay}ms`);

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      clearInterval(heartbeatRef.current);
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}
