import { configureStore } from '@reduxjs/toolkit';
import playerReducer from './playerSlice';
import playlistReducer from './playlistSlice';
import userReducer from './userSlice';

export const store = configureStore({
  reducer: {
    player: playerReducer,
    playlist: playlistReducer,
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Exported for hooks that need to read state outside of React components
export function getStore() {
  return store;
}
