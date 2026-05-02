import { describe, it, expect } from 'vitest';
import playerReducer, {
  receiveCast,
  setStatus,
  play,
  pause,
  togglePlay,
  seek,
  updateTime,
  setDuration,
  setBuffered,
  setFullscreen,
  setError,
  clearMedia,
} from '../playerSlice';
import { CastMedia } from '../../types';

function makeMedia(overrides: Partial<CastMedia> = {}): CastMedia {
  return {
    id: 'test-1',
    url: 'https://example.com/video.mp4',
    title: 'Test Video',
    duration: 120,
    format: 'mp4',
    castAt: new Date().toISOString(),
    source: 'manual',
    ...overrides,
  };
}

describe('playerSlice', () => {
  const initial = playerReducer(undefined, { type: '@@INIT' });

  it('has no volume or muted in initial state', () => {
    expect(initial).not.toHaveProperty('volume');
    expect(initial).not.toHaveProperty('muted');
  });

  it('initial state has expected shape', () => {
    expect(initial).toEqual({
      media: null,
      status: 'idle',
      currentTime: 0,
      duration: 0,
      isFullscreen: false,
      error: null,
      buffered: 0,
    });
  });

  describe('receiveCast', () => {
    it('sets media and resets playback state', () => {
      const media = makeMedia();
      const state = playerReducer(
        { ...initial, status: 'playing', currentTime: 42, error: 'old error', buffered: 0.5 },
        receiveCast(media),
      );
      expect(state.media).toEqual(media);
      expect(state.status).toBe('loading');
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(120);
      expect(state.error).toBeNull();
      expect(state.buffered).toBe(0);
    });
  });

  describe('setStatus', () => {
    it('updates status', () => {
      const state = playerReducer(initial, setStatus('playing'));
      expect(state.status).toBe('playing');
    });
  });

  describe('play / pause / togglePlay', () => {
    it('play sets status to playing', () => {
      expect(playerReducer(initial, play()).status).toBe('playing');
    });

    it('pause sets status to paused', () => {
      expect(playerReducer(initial, pause()).status).toBe('paused');
    });

    it('togglePlay switches playing → paused', () => {
      const state = playerReducer({ ...initial, status: 'playing' }, togglePlay());
      expect(state.status).toBe('paused');
    });

    it('togglePlay switches paused → playing', () => {
      const state = playerReducer({ ...initial, status: 'paused' }, togglePlay());
      expect(state.status).toBe('playing');
    });
  });

  describe('seek', () => {
    it('clamps to [0, duration]', () => {
      const withDur = { ...initial, duration: 100 };
      expect(playerReducer(withDur, seek(50)).currentTime).toBe(50);
      expect(playerReducer(withDur, seek(-10)).currentTime).toBe(0);
      expect(playerReducer(withDur, seek(200)).currentTime).toBe(100);
    });
  });

  describe('updateTime', () => {
    it('sets currentTime directly', () => {
      expect(playerReducer(initial, updateTime(30.5)).currentTime).toBe(30.5);
    });
  });

  describe('setDuration', () => {
    it('sets duration', () => {
      expect(playerReducer(initial, setDuration(180)).duration).toBe(180);
    });
  });

  describe('setBuffered', () => {
    it('clamps to [0, 1]', () => {
      expect(playerReducer(initial, setBuffered(0.5)).buffered).toBe(0.5);
      expect(playerReducer(initial, setBuffered(-0.5)).buffered).toBe(0);
      expect(playerReducer(initial, setBuffered(2)).buffered).toBe(1);
    });
  });

  describe('setFullscreen', () => {
    it('toggles fullscreen flag', () => {
      expect(playerReducer(initial, setFullscreen(true)).isFullscreen).toBe(true);
      expect(playerReducer(initial, setFullscreen(false)).isFullscreen).toBe(false);
    });
  });

  describe('setError', () => {
    it('sets error and status to error', () => {
      const state = playerReducer(initial, setError('something broke'));
      expect(state.error).toBe('something broke');
      expect(state.status).toBe('error');
    });

    it('clears error without changing status', () => {
      const withError = { ...initial, error: 'old', status: 'error' as const };
      const state = playerReducer(withError, setError(null));
      expect(state.error).toBeNull();
    });
  });

  describe('clearMedia', () => {
    it('resets to idle state', () => {
      const filled = {
        ...initial,
        media: makeMedia(),
        status: 'playing' as const,
        currentTime: 60,
        duration: 120,
        error: 'err',
        buffered: 0.8,
      };
      const state = playerReducer(filled, clearMedia());
      expect(state.media).toBeNull();
      expect(state.status).toBe('idle');
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.error).toBeNull();
      expect(state.buffered).toBe(0);
    });
  });
});
