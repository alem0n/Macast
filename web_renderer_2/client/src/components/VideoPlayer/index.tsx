import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useVideoEvents } from '../../hooks/useVideoEvents';
import PlayerControls from './PlayerControls';
import StatusOverlay from '../StatusOverlay';

const CONTROLS_HIDE_DELAY = 3000;

const VideoPlayer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const media = useSelector((s: RootState) => s.player.media);
  const status = useSelector((s: RootState) => s.player.status);
  const isFullscreen = useSelector((s: RootState) => s.player.isFullscreen);

  const { isDraggingRef } = useVideoEvents(videoRef);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, CONTROLS_HIDE_DELAY);
  }, []);

  useEffect(() => {
    return () => clearTimeout(hideTimerRef.current);
  }, []);

  // Explicitly load and play when media URL changes (video remount via key)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !media?.url) return;

    console.log(`[VideoPlayer] loading src=${media.url.substring(0, 80)} title="${media.title}"`);
    video.load();
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        console.log('[VideoPlayer] direct play() blocked — waiting for user gesture');
      });
    }
  }, [media?.url]);

  // Orientation lock is handled directly in FullscreenButton
  // to ensure it's within a user gesture context

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

  // Key on media URL forces React to unmount/remount the video element,
  // ensuring a clean state and proper event lifecycle on source change.
  const videoKey = media?.url || 'empty';

  return (
    <div
      className={`player-container ${isFullscreen ? 'player-fullscreen' : ''}`}
      ref={containerRef}
      onMouseMove={showControls}
      onMouseLeave={() => setControlsVisible(false)}
      onTouchStart={showControls}
    >
      <video
        key={videoKey}
        ref={videoRef}
        className="player-video"
        src={media?.url || ''}
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
    </div>
  );
};

export default VideoPlayer;
