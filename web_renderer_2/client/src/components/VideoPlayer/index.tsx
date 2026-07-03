import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { togglePlay } from '../../store/playerSlice';
import { useVideoEvents } from '../../hooks/useVideoEvents';
import { usePlaylistNavigation } from '../../hooks/usePlaylistNavigation';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import PlayerControls from './PlayerControls';
import StatusOverlay from '../StatusOverlay';
import Toast from '../Toast';

const CONTROLS_HIDE_DELAY = 3000;

const VideoPlayer: React.FC = () => {
  const dispatch = useDispatch();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  // Snapshot of controls visibility at touch/mouse-down time,
  // BEFORE the handler shows them. Used to decide whether a
  // subsequent tap/click should toggle playback or just show controls.
  const controlsWereVisibleRef = useRef(true);
  // Suppress the synthetic click the browser fires ~300ms after touchend.
  // Without this, a tap that resumes playback is immediately undone by the
  // delayed click handler which sees status='playing' and pauses again.
  const suppressNextClickRef = useRef(false);

  const media = useSelector((s: RootState) => s.player.media);
  const status = useSelector((s: RootState) => s.player.status);
  const isFullscreen = useSelector((s: RootState) => s.player.isFullscreen);

  const { goNext } = usePlaylistNavigation();
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  const handleEnded = useCallback(async () => {
    const success = await goNext();
    if (!success) {
      showToast('已到达最后一个视频');
    }
  }, [goNext, showToast]);

  const { isDraggingRef } = useVideoEvents(videoRef, handleEnded);
  useKeyboard({ videoRef, containerRef });

  // ── Touch gesture callbacks ──────────────────────────────────────

  const handleSingleTap = useCallback(() => {
    // If controls were hidden when the touch started, tapping should
    // only reveal them — not toggle playback. onTouchStart already
    // made them visible; we just don't toggle.
    if (!controlsWereVisibleRef.current) {
      return;
    }

    const video = videoRef.current;
    if (!video || !media) return;

    if (status === 'playing') {
      video.pause();
    } else if (status === 'paused') {
      video.play().catch(() => {});
    }
    dispatch(togglePlay());
    suppressNextClickRef.current = true;
  }, [dispatch, status, videoRef, media]);

  // Snapshots controls visibility and shows them on every touch.
  // The snapshot is consumed by handleSingleTap to decide whether
  // to toggle playback or only reveal controls.
  const handleTouchStart = useCallback(() => {
    controlsWereVisibleRef.current = controlsVisible;
    setControlsVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, CONTROLS_HIDE_DELAY);
  }, [controlsVisible]);

  useTouchGestures({
    containerRef,
    callbacks: {
      onSingleTap: handleSingleTap,
      onTouchStart: handleTouchStart,
    },
  });

  // ── Mouse-based controls visibility ──────────────────────────────

  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, CONTROLS_HIDE_DELAY);
  }, []);

  // Snapshot visibility on mousedown, so a click without prior mouse
  // movement knows whether controls were already visible or not.
  const handleMouseDown = useCallback(() => {
    controlsWereVisibleRef.current = controlsVisible;
    showControls();
  }, [controlsVisible, showControls]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Ignore synthetic click that fires ~300ms after a touch tap —
    // the tap was already handled by handleSingleTap.
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    const target = e.target as HTMLElement;
    if (target.closest('.player-controls')) return;

    if (!controlsWereVisibleRef.current) return;

    const video = videoRef.current;
    if (!video || !media) return;

    if (status === 'playing') {
      video.pause();
    } else if (status === 'paused') {
      video.play().catch(() => {});
    }
    dispatch(togglePlay());
  }, [dispatch, status, videoRef, media]);

  useEffect(() => {
    return () => clearTimeout(hideTimerRef.current);
  }, []);

  // Load and play when media URL changes.
  // We set src imperatively instead of via the `src` attribute + `key` remount.
  // Keeping the same <video> element preserves any warmed-up DNS/TCP/TLS
  // connections to the CDN and avoids the cost of DOM recreation, shaving
  // ~100-300ms off first-frame on repeated casts from the same host.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !media?.url) return;

    const src = media.proxyUrl || media.url;
    if (video.src.endsWith(src)) {
      // Already loaded (e.g. playlist:updated re-broadcast) — don't reload.
      return;
    }

    console.log(`[VideoPlayer] loading src=${src.substring(0, 80)} title="${media.title}"`);
    video.src = src;
    video.load();
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        console.log('[VideoPlayer] direct play() blocked — waiting for user gesture');
      });
    }
  }, [media?.url, media?.proxyUrl]);

  // Disable context menu on fullscreen video
  useEffect(() => {
    const onContextMenu = (e: Event) => {
      if (isFullscreen) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, [isFullscreen]);

  const showControlsBar = controlsVisible && (status === 'playing' || status === 'paused');

  return (
    <div
      className={`player-container ${isFullscreen ? 'player-fullscreen' : ''}`}
      ref={containerRef}
      onMouseMove={showControls}
      onMouseLeave={() => setControlsVisible(false)}
      onMouseDown={handleMouseDown}
      onClick={handleContainerClick}
    >
      <video
        ref={videoRef}
        className="player-video"
        preload="auto"
        autoPlay
        controls={false}
        playsInline
        onContextMenu={(e) => e.preventDefault()}
      />

      <StatusOverlay videoRef={videoRef} />

      {media && (
        <PlayerControls
          videoRef={videoRef}
          containerRef={containerRef}
          isDraggingRef={isDraggingRef}
          visible={showControlsBar}
        />
      )}

      <Toast
        message={toastMessage}
        visible={toastVisible}
        onClose={hideToast}
      />

    </div>
  );
};

export default VideoPlayer;
