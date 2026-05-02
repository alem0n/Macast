import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { receiveCast } from '../store/playerSlice';
import { setPlaylistItems, playMediaItem } from '../store/playlistSlice';
import { getStore } from '../store';
import { fetchCurrentCast } from '../services/api';

export function usePlaylistNavigation() {
  const dispatch = useDispatch();
  const [navLoading, setNavLoading] = useState(false);

  const goNext = useCallback(async (): Promise<boolean> => {
    setNavLoading(true);
    try {
      const data = await fetchCurrentCast();
      dispatch(setPlaylistItems(data.playlist));

      const state = getStore().getState();
      const { items, currentIndex } = state.playlist;
      const targetIndex = currentIndex + 1;

      if (targetIndex >= items.length) {
        return false;
      }

      const target = items[targetIndex];
      dispatch(playMediaItem(targetIndex));
      dispatch(receiveCast(target));
      return true;
    } catch (err) {
      console.error('[PlaylistNav] refresh failed:', err);
      return false;
    } finally {
      setNavLoading(false);
    }
  }, [dispatch]);

  const goPrev = useCallback(async (): Promise<void> => {
    setNavLoading(true);
    try {
      const data = await fetchCurrentCast();
      dispatch(setPlaylistItems(data.playlist));

      const state = getStore().getState();
      const { items, currentIndex } = state.playlist;
      const targetIndex = currentIndex - 1;

      if (targetIndex < 0) {
        return;
      }

      const target = items[targetIndex];
      dispatch(playMediaItem(targetIndex));
      dispatch(receiveCast(target));
    } catch (err) {
      console.error('[PlaylistNav] refresh failed:', err);
    } finally {
      setNavLoading(false);
    }
  }, [dispatch]);

  return { goNext, goPrev, navLoading };
}
