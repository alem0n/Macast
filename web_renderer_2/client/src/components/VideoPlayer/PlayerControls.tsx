import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { togglePlay } from '../../store/playerSlice';
import { PlayIcon, PauseIcon } from '../Icons';
import ProgressBar from './ProgressBar';
import VolumeControl from './VolumeControl';
import FullscreenButton from './FullscreenButton';

interface PlayerControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isDraggingRef: React.MutableRefObject<boolean>;
  visible: boolean;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  videoRef,
  containerRef,
  isDraggingRef,
  visible,
}) => {
  const dispatch = useDispatch();
  const status = useSelector((s: RootState) => s.player.status);

  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (status === 'playing') {
      video.pause();
    } else if (status === 'paused') {
      video.play().catch(() => {});
    }
    dispatch(togglePlay());
  }, [dispatch, status, videoRef]);

  const isPlaying = status === 'playing';

  return (
    <div className={`player-controls ${visible ? 'controls-visible' : 'controls-hidden'}`}>
      <ProgressBar videoRef={videoRef} isDraggingRef={isDraggingRef} />

      <div className="controls-bar">
        <button
          className="control-btn play-btn"
          onClick={handleTogglePlay}
          title={isPlaying ? '暂停 (Space)' : '播放 (Space)'}
          aria-label={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
        </button>

        <VolumeControl />

        <div className="controls-spacer" />

        <FullscreenButton containerRef={containerRef} />
      </div>
    </div>
  );
};

export default React.memo(PlayerControls);
