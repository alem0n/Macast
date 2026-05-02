import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setFullscreen } from '../../store/playerSlice';
import { FullscreenEnterIcon, FullscreenExitIcon } from '../Icons';

const FullscreenButton: React.FC<{ containerRef: React.RefObject<HTMLDivElement | null> }> = ({
  containerRef,
}) => {
  const dispatch = useDispatch();
  const isFullscreen = useSelector((s: RootState) => s.player.isFullscreen);

  const handleClick = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!isFullscreen) {
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      }
      dispatch(setFullscreen(true));

      // Lock to landscape on mobile — must be within user gesture
      const orientation = (screen as any).orientation;
      if (orientation && orientation.lock) {
        orientation.lock('landscape').catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      dispatch(setFullscreen(false));

      // Unlock orientation when exiting fullscreen
      const orientation = (screen as any).orientation;
      if (orientation && orientation.unlock) {
        orientation.unlock();
      }
    }
  }, [isFullscreen, containerRef, dispatch]);

  // Sync with browser fullscreen changes
  React.useEffect(() => {
    const onFsChange = () => {
      const fs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      dispatch(setFullscreen(fs));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, [dispatch]);

  return (
    <button
      className="control-btn fullscreen-btn"
      onClick={handleClick}
      title={isFullscreen ? '退出全屏 (Esc)' : '全屏 (F)'}
      aria-label={isFullscreen ? '退出全屏' : '全屏'}
    >
      {isFullscreen ? <FullscreenExitIcon size={18} /> : <FullscreenEnterIcon size={18} />}
    </button>
  );
};

export default React.memo(FullscreenButton);
