import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CastMedia } from '../types';

interface PlayerState {
  media: CastMedia | null;
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  isFullscreen: boolean;
  error: string | null;
  buffered: number;
}

const initialState: PlayerState = {
  media: null,
  status: 'idle',
  currentTime: 0,
  duration: 0,
  volume: 100,
  muted: false,
  isFullscreen: false,
  error: null,
  buffered: 0,
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    receiveCast(state, action: PayloadAction<CastMedia>) {
      state.media = action.payload;
      state.status = 'loading';
      state.currentTime = 0;
      state.duration = action.payload.duration || 0;
      state.error = null;
      state.buffered = 0;
    },

    setStatus(state, action: PayloadAction<PlayerState['status']>) {
      state.status = action.payload;
    },

    play(state) {
      state.status = 'playing';
    },

    pause(state) {
      state.status = 'paused';
    },

    togglePlay(state) {
      if (state.status === 'playing') {
        state.status = 'paused';
      } else if (state.status === 'paused') {
        state.status = 'playing';
      }
    },

    seek(state, action: PayloadAction<number>) {
      state.currentTime = Math.max(0, Math.min(action.payload, state.duration));
    },

    setVolume(state, action: PayloadAction<number>) {
      state.volume = Math.max(0, Math.min(100, action.payload));
    },

    toggleMute(state) {
      state.muted = !state.muted;
    },

    updateTime(state, action: PayloadAction<number>) {
      state.currentTime = action.payload;
    },

    setDuration(state, action: PayloadAction<number>) {
      state.duration = action.payload;
    },

    setBuffered(state, action: PayloadAction<number>) {
      state.buffered = Math.max(0, Math.min(1, action.payload));
    },

    setFullscreen(state, action: PayloadAction<boolean>) {
      state.isFullscreen = action.payload;
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      if (action.payload) {
        state.status = 'error';
      }
    },

    clearMedia(state) {
      state.media = null;
      state.status = 'idle';
      state.currentTime = 0;
      state.duration = 0;
      state.error = null;
      state.buffered = 0;
    },
  },
});

export const {
  receiveCast,
  setStatus,
  play,
  pause,
  togglePlay,
  seek,
  setVolume,
  toggleMute,
  updateTime,
  setDuration,
  setBuffered,
  setFullscreen,
  setError,
  clearMedia,
} = playerSlice.actions;

export default playerSlice.reducer;
