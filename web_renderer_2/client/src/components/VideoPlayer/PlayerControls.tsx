import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { togglePlay } from '../../store/playerSlice';
import { PlayIcon, PauseIcon, PreviousIcon, NextIcon } from '../Icons';
import { usePlaylistNavigation } from '../../hooks/usePlaylistNavigation';
import ProgressBar from './ProgressBar';
import FullscreenButton from './FullscreenButton';
import Toast from '../Toast';

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
  const currentIndex = useSelector((s: RootState) => s.playlist.currentIndex);
  const itemsCount = useSelector((s: RootState) => s.playlist.items.length);

  const { goNext, goPrev, navLoading } = usePlaylistNavigation();
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

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

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  const handleNext = useCallback(async () => {
    if (navLoading) return;
    const success = await goNext();
    if (!success) {
      showToast('已到达最后一个视频');
    }
  }, [goNext, navLoading, showToast]);

  const handlePrev = useCallback(async () => {
    if (navLoading) return;
    await goPrev();
  }, [goPrev, navLoading]);

  const isPlaying = status === 'playing';
  const isPrevDisabled = navLoading || currentIndex <= 0;
  const isNextDisabled = navLoading || currentIndex >= itemsCount - 1;

  return (
    <div className={`player-controls ${visible ? 'controls-visible' : 'controls-hidden'}`}>
      <ProgressBar videoRef={videoRef} isDraggingRef={isDraggingRef} />

      <div className="controls-bar">
        <button
          className="control-btn prev-btn"
          onClick={handlePrev}
          disabled={isPrevDisabled}
          title="上一个"
          aria-label="上一个"
        >
          <PreviousIcon size={20} />
        </button>

        <button
          className="control-btn play-btn"
          onClick={handleTogglePlay}
          title={isPlaying ? '暂停 (Space)' : '播放 (Space)'}
          aria-label={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
        </button>

        <button
          className="control-btn next-btn"
          onClick={handleNext}
          disabled={isNextDisabled}
          title="下一个"
          aria-label="下一个"
        >
          <NextIcon size={20} />
        </button>

        <div className="controls-spacer" />

        <FullscreenButton containerRef={containerRef} />
      </div>

      <Toast
        message={toastMessage}
        visible={toastVisible}
        onClose={hideToast}
      />
    </div>
  );
};

export default React.memo(PlayerControls);
