import React, { useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { seek } from '../../store/playerSlice';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface ProgressBarProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isDraggingRef: React.MutableRefObject<boolean>;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ videoRef, isDraggingRef }) => {
  const dispatch = useDispatch();
  const currentTime = useSelector((s: RootState) => s.player.currentTime);
  const duration = useSelector((s: RootState) => s.player.duration);
  const buffered = useSelector((s: RootState) => s.player.buffered);

  const [dragTime, setDragTime] = useState<number | null>(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const displayTime = dragTime ?? currentTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;
  const bufferedPercent = buffered * 100;

  const calcTimeFromEvent = useCallback(
    (e: { clientX: number }): number => {
      const bar = barRef.current;
      if (!bar || duration <= 0) return 0;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      return Math.round(ratio * duration * 10) / 10;
    },
    [duration]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDraggingRef.current = true;
      const t = calcTimeFromEvent(e);
      setDragTime(t);

      const onMouseMove = (ev: MouseEvent) => {
        setDragTime(calcTimeFromEvent(ev));
      };

      const onMouseUp = (ev: MouseEvent) => {
        isDraggingRef.current = false;
        const finalTime = calcTimeFromEvent(ev);
        setDragTime(null);

        const video = videoRef.current;
        if (video) {
          video.currentTime = finalTime;
        }
        dispatch(seek(finalTime));

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [calcTimeFromEvent, dispatch, videoRef, isDraggingRef]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;

      isDraggingRef.current = true;
      setIsTouchDragging(true);
      const t = calcTimeFromEvent(e.touches[0]);
      setDragTime(t);

      const onTouchMove = (ev: TouchEvent) => {
        if (ev.touches.length !== 1) return;
        ev.preventDefault();
        setDragTime(calcTimeFromEvent(ev.touches[0]));
      };

      const onTouchEnd = (ev: TouchEvent) => {
        isDraggingRef.current = false;
        setIsTouchDragging(false);
        const touch = ev.changedTouches[0];
        const finalTime = calcTimeFromEvent(touch);
        setDragTime(null);

        const video = videoRef.current;
        if (video) {
          video.currentTime = finalTime;
        }
        dispatch(seek(finalTime));

        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        document.removeEventListener('touchcancel', onTouchEnd);
      };

      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd);
      document.addEventListener('touchcancel', onTouchEnd);
    },
    [calcTimeFromEvent, dispatch, videoRef, isDraggingRef]
  );

  return (
    <div className="progress-bar-container">
      <span className="time-display time-current">{formatTime(displayTime)}</span>

      <div
        className={`progress-bar${isTouchDragging ? ' progress-dragging' : ''}`}
        ref={barRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="slider"
        aria-label="播放进度"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={displayTime}
      >
        <div className="progress-track">
          <div className="progress-buffered" style={{ width: `${bufferedPercent}%` }} />
          <div className="progress-filled" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-thumb" style={{ left: `${progress}%` }} />
      </div>

      <span className="time-display time-duration">{formatTime(duration)}</span>
    </div>
  );
};

export default React.memo(ProgressBar);
