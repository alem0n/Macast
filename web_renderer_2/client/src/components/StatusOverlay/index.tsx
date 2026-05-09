import React, { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { receiveCast, setStatus } from '../../store/playerSlice';
import { TVIcon, WarningIcon, SpinnerIcon, PlayIcon } from '../Icons';

const StatusOverlay: React.FC<{ videoRef?: React.RefObject<HTMLVideoElement | null> }> = ({
  videoRef,
}) => {
  const dispatch = useDispatch();
  const media = useSelector((s: RootState) => s.player.media);
  const status = useSelector((s: RootState) => s.player.status);
  const error = useSelector((s: RootState) => s.player.error);

  const handleRetry = useCallback(() => {
    if (media) {
      dispatch(receiveCast({ ...media }));
    }
  }, [dispatch, media]);

  // User explicitly clicks play — satisfies browser autoplay policy
  const handleManualPlay = useCallback(() => {
    const video = videoRef?.current;
    if (video && media) {
      video.play().then(() => {
        dispatch(setStatus('playing'));
      }).catch(() => {
        // Still blocked — keep paused state
      });
    }
  }, [videoRef, media, dispatch]);

  // Show nothing when already playing
  if (status === 'playing') {
    return null;
  }

  // Show faint play icon when paused — transparent overlay so the frame is visible
  if (status === 'paused' && media) {
    return (
      <div className="pause-overlay" onClick={handleManualPlay}>
        <PlayIcon size={64} className="pause-play-icon" />
      </div>
    );
  }

  return (
    <div className="status-overlay">
      {status === 'idle' && (
        <div className="status-content">
          <div className="status-icon idle-icon">
            <TVIcon size={48} />
          </div>
          <p className="status-title">等待投屏信号...</p>
          <p className="status-hint">DLNA投屏将自动播放，也可在下方手动输入链接</p>
        </div>
      )}

      {status === 'loading' && (
        <div className="status-content">
          <div className="status-spinner-icon">
            <SpinnerIcon size={36} className="spinner-animate" />
          </div>
          <p className="status-title">视频加载中...</p>
          {media && <p className="status-hint">{media.title}</p>}
        </div>
      )}

      {status === 'error' && (
        <div className="status-content">
          <div className="status-icon error-icon">
            <WarningIcon size={48} />
          </div>
          <p className="status-title">播放失败</p>
          <p className="status-hint status-error-text">{error || '未知错误'}</p>
          {media && (
            <p className="status-meta">
              格式: {media.format.toUpperCase()} | 来源: {media.source === 'dlna' ? 'DLNA' : '手动'}
            </p>
          )}
          <button className="retry-btn" onClick={handleRetry}>
            重试
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(StatusOverlay);
