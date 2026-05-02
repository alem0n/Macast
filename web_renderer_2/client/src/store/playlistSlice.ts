import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CastMedia, SortField, SortOrder } from '../types';

interface PlaylistUIState {
  items: CastMedia[];
  currentIndex: number; // local per-browser — NOT synced from server
  sortField: SortField;
  sortOrder: SortOrder;
  filterFormat: string | null;
}

const initialState: PlaylistUIState = {
  items: [],
  currentIndex: -1,
  sortField: 'castAt',
  sortOrder: 'asc', // ascending: oldest first, new items at bottom
  filterFormat: null,
};

const playlistSlice = createSlice({
  name: 'playlist',
  initialState,
  reducers: {
    // Called when server broadcasts playlist:updated
    setPlaylistItems(state, action: PayloadAction<CastMedia[]>) {
      state.items = action.payload;
      // Clamp local currentIndex if it's now out of bounds
      if (state.currentIndex >= state.items.length) {
        state.currentIndex = state.items.length > 0 ? state.items.length - 1 : -1;
      } else if (state.items.length === 0) {
        state.currentIndex = -1;
      }
    },

    // Called when server broadcasts cast:new — append item
    appendItem(state, action: PayloadAction<CastMedia>) {
      // Avoid duplicates by id
      const existing = state.items.findIndex(
        (item) => item.id === action.payload.id
      );
      if (existing >= 0) {
        state.items[existing] = action.payload;
        return;
      }
      state.items.push(action.payload);
    },

    // Local switch — user clicks a playlist item in this browser only
    playMediaItem(state, action: PayloadAction<number>) {
      const idx = action.payload;
      if (idx < 0 || idx >= state.items.length) return;
      state.currentIndex = idx;
    },

    // Remove item by index (called from handleDelete when server confirms)
    removeItemByIndex(state, action: PayloadAction<number>) {
      const idx = action.payload;
      if (idx < 0 || idx >= state.items.length) return;

      state.items.splice(idx, 1);

      if (state.items.length === 0) {
        state.currentIndex = -1;
      } else if (state.currentIndex >= state.items.length) {
        state.currentIndex = state.items.length - 1;
      } else if (state.currentIndex > idx) {
        state.currentIndex--;
      }
    },

    setSortField(state, action: PayloadAction<SortField>) {
      state.sortField = action.payload;
    },

    setSortOrder(state, action: PayloadAction<SortOrder>) {
      state.sortOrder = action.payload;
    },

    toggleSortOrder(state) {
      state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
    },

    setFilterFormat(state, action: PayloadAction<string | null>) {
      state.filterFormat = action.payload;
    },
  },
});

export const {
  setPlaylistItems,
  appendItem,
  playMediaItem,
  removeItemByIndex,
  setSortField,
  setSortOrder,
  toggleSortOrder,
  setFilterFormat,
} = playlistSlice.actions;

export default playlistSlice.reducer;
