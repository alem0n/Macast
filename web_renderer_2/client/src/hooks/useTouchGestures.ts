import { useEffect, useRef } from 'react';

interface TouchGestureCallbacks {
  onSingleTap: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTouchStart?: () => void;
}

interface UseTouchGesturesOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  callbacks: TouchGestureCallbacks;
}

const TAP_TIMEOUT = 300;
const SWIPE_THRESHOLD = 60;
const TAP_MOVEMENT_THRESHOLD = 10;

export function useTouchGestures({ containerRef, callbacks }: UseTouchGesturesOptions): void {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
      cbRef.current.onTouchStart?.();
    };

    const onTouchEnd = (e: TouchEvent) => {
      // Ignore touches on control buttons / progress bar
      const target = e.target as HTMLElement;
      if (target.closest('.player-controls')) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const dt = Date.now() - startTime;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Horizontal swipe
      if (absDx > SWIPE_THRESHOLD && absDx > absDy * 1.5 && dt < 500) {
        if (dx < 0) {
          cbRef.current.onSwipeLeft();
        } else {
          cbRef.current.onSwipeRight();
        }
        return;
      }

      // Single tap — short duration, minimal movement, immediate response
      if (dt < TAP_TIMEOUT && absDx < TAP_MOVEMENT_THRESHOLD && absDy < TAP_MOVEMENT_THRESHOLD) {
        cbRef.current.onSingleTap();
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [containerRef]);
}
