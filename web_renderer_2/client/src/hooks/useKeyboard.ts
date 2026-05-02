import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  togglePlay,
  seek,
  setFullscreen,
} from '../store/playerSlice';

export function useKeyboard(): void {
  const dispatch = useDispatch();
  const media = useSelector((s: RootState) => s.player.media);
  const currentTime = useSelector((s: RootState) => s.player.currentTime);
  const duration = useSelector((s: RootState) => s.player.duration);
  const isFullscreen = useSelector((s: RootState) => s.player.isFullscreen);

  useEffect(() => {
    if (!media) return;

    const handleKey = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          dispatch(togglePlay());
          break;

        case 'ArrowLeft':
          e.preventDefault();
          dispatch(seek(Math.max(0, currentTime - 5)));
          break;

        case 'ArrowRight':
          e.preventDefault();
          dispatch(seek(Math.min(duration, currentTime + 5)));
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          dispatch(setFullscreen(!isFullscreen));
          break;

        case 'F11':
          e.preventDefault();
          dispatch(setFullscreen(!isFullscreen));
          break;

        case 'Escape':
          dispatch(setFullscreen(false));
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dispatch, media, currentTime, duration, isFullscreen]);
}
