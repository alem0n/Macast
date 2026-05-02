import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setStatus, updateTime, setDuration, setBuffered, setError } from '../store/playerSlice';

const ERROR_MESSAGES: Record<number, string> = {
  1: 'MEDIA_ERR_ABORTED — 加载已取消',
  2: 'MEDIA_ERR_NETWORK — 网络连接失败，请检查网络后重试',
  3: 'MEDIA_ERR_DECODE — 视频解码失败，格式可能已损坏',
  4: 'MEDIA_ERR_SRC_NOT_SUPPORTED — 当前浏览器不支持该视频格式，请尝试MP4格式',
};

const TAG = '[VideoEvents]';
const LOAD_TIMEOUT_MS = 15000;

export function useVideoEvents(videoRef: React.RefObject<HTMLVideoElement | null>): {
  isDraggingRef: React.MutableRefObject<boolean>;
} {
  const dispatch = useDispatch();
  const mediaUrl = useSelector((s: RootState) => s.player.media?.url);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let timeUpdateTimer: ReturnType<typeof setTimeout>;
    let loadTimeout: ReturnType<typeof setTimeout>;

    const onLoadStart = () => {
      console.log(`${TAG} loadstart | src=${video.src.substring(0, 80)}`);
      dispatch(setStatus('loading'));
      loadTimeout = setTimeout(() => {
        console.log(`${TAG} LOAD TIMEOUT after ${LOAD_TIMEOUT_MS}ms`);
        dispatch(setError('视频加载超时，请检查链接是否有效'));
      }, LOAD_TIMEOUT_MS);
    };

    const onCanPlay = () => {
      clearTimeout(loadTimeout);
      console.log(`${TAG} canplay | duration=${video.duration.toFixed(1)}s readyState=${video.readyState}`);
      dispatch(setStatus('playing'));

      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch((err) => {
          console.log(`${TAG} autoplay BLOCKED — ${err.name}: ${err.message}`);
          dispatch(setStatus('paused'));
        });
      }
    };

    const onPlaying = () => {
      clearTimeout(loadTimeout);
      console.log(`${TAG} playing | currentTime=${video.currentTime.toFixed(1)}s`);
      dispatch(setStatus('playing'));
    };

    const onPlay = () => {
      clearTimeout(loadTimeout);
      dispatch(setStatus('playing'));
    };

    const onPause = () => {
      if (video.readyState >= 2) {
        console.log(`${TAG} pause | currentTime=${video.currentTime.toFixed(1)}s readyState=${video.readyState}`);
        dispatch(setStatus('paused'));
      }
    };

    const onEnded = () => {
      console.log(`${TAG} ended`);
      dispatch(setStatus('idle'));
    };

    const onTimeUpdate = () => {
      if (isDraggingRef.current) return;
      if (timeUpdateTimer) return;
      timeUpdateTimer = setTimeout(() => {
        dispatch(updateTime(video.currentTime));
        timeUpdateTimer = undefined as any;
      }, 250);
    };

    const onDurationChange = () => {
      if (isFinite(video.duration)) {
        console.log(`${TAG} durationchange | duration=${video.duration.toFixed(1)}s`);
        dispatch(setDuration(video.duration));
      }
    };

    const onProgress = () => {
      if (video.buffered.length > 0 && video.duration > 0) {
        const end = video.buffered.end(video.buffered.length - 1);
        dispatch(setBuffered(end / video.duration));
      }
    };

    const onError = () => {
      clearTimeout(loadTimeout);
      const code = video.error?.code;
      console.log(`${TAG} ERROR | code=${code} message=${video.error?.message} src=${video.src?.substring(0, 80)}`);
      dispatch(setError(code ? (ERROR_MESSAGES[code] || `未知错误 (code: ${code})`) : '未知播放错误'));
      dispatch(setStatus('error'));
    };

    video.addEventListener('loadstart', onLoadStart);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('progress', onProgress);
    video.addEventListener('error', onError);

    return () => {
      clearTimeout(timeUpdateTimer);
      clearTimeout(loadTimeout);
      video.removeEventListener('loadstart', onLoadStart);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('error', onError);
    };
  }, [videoRef, dispatch, mediaUrl]);

  return { isDraggingRef };
}
