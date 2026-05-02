import { useEffect, useRef } from 'react';

interface TouchGestureCallbacks {
  onSingleTap: () => void;
  onTouchStart?: () => void;
}

interface UseTouchGesturesOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  callbacks: TouchGestureCallbacks;
}

const TAP_TIMEOUT = 300;
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

      // Single tap — short duration, minimal movement
      if (dt < TAP_TIMEOUT && Math.abs(dx) < TAP_MOVEMENT_THRESHOLD && Math.abs(dy) < TAP_MOVEMENT_THRESHOLD) {
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
