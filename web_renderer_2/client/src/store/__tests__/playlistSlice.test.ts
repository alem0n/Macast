import { describe, it, expect } from 'vitest';
import playlistReducer, {
  setPlaylistItems,
  appendItem,
  playMediaItem,
  removeItemByIndex,
  setSortField,
  setSortOrder,
  toggleSortOrder,
  setFilterFormat,
} from '../playlistSlice';
import { CastMedia } from '../../types';

function makeMedia(id: string, overrides: Partial<CastMedia> = {}): CastMedia {
  return {
    id,
    url: `https://example.com/${id}.mp4`,
    title: `Video ${id}`,
    duration: 120,
    format: 'mp4',
    castAt: new Date().toISOString(),
    source: 'manual',
    ...overrides,
  };
}

function makeItems(count: number): CastMedia[] {
  return Array.from({ length: count }, (_, i) => makeMedia(`item-${i}`));
}

describe('playlistSlice', () => {
  const initial = playlistReducer(undefined, { type: '@@INIT' });

  it('initial state has expected shape', () => {
    expect(initial).toEqual({
      items: [],
      currentIndex: -1,
      sortField: 'castAt',
      sortOrder: 'asc',
      filterFormat: null,
    });
  });

  describe('setPlaylistItems', () => {
    it('replaces all items', () => {
      const items = makeItems(3);
      const state = playlistReducer(initial, setPlaylistItems(items));
      expect(state.items).toHaveLength(3);
      expect(state.items).toEqual(items);
    });

    it('clamps currentIndex when out of bounds', () => {
      const withIdx = { ...initial, currentIndex: 5, items: makeItems(3) };
      const state = playlistReducer(withIdx, setPlaylistItems(makeItems(2)));
      expect(state.currentIndex).toBe(1);
    });

    it('resets currentIndex when list becomes empty', () => {
      const withIdx = { ...initial, currentIndex: 2, items: makeItems(5) };
      const state = playlistReducer(withIdx, setPlaylistItems([]));
      expect(state.currentIndex).toBe(-1);
    });
  });

  describe('appendItem', () => {
    it('appends new item to end', () => {
      const existing = makeItems(2);
      const withItems = { ...initial, items: existing };
      const newItem = makeMedia('new');
      const state = playlistReducer(withItems, appendItem(newItem));
      expect(state.items).toHaveLength(3);
      expect(state.items[2].id).toBe('new');
    });

    it('deduplicates by id', () => {
      const existing = makeItems(2);
      const withItems = { ...initial, items: existing };
      const updated = makeMedia('item-0', { title: 'Updated Title' });
      const state = playlistReducer(withItems, appendItem(updated));
      expect(state.items).toHaveLength(2);
      expect(state.items[0].title).toBe('Updated Title');
    });
  });

  describe('playMediaItem', () => {
    it('sets currentIndex when valid', () => {
      const withItems = { ...initial, items: makeItems(3) };
      const state = playlistReducer(withItems, playMediaItem(1));
      expect(state.currentIndex).toBe(1);
    });

    it('ignores negative index', () => {
      const withItems = { ...initial, items: makeItems(3), currentIndex: 1 };
      const state = playlistReducer(withItems, playMediaItem(-1));
      expect(state.currentIndex).toBe(1);
    });

    it('ignores index beyond bounds', () => {
      const withItems = { ...initial, items: makeItems(3), currentIndex: 1 };
      const state = playlistReducer(withItems, playMediaItem(5));
      expect(state.currentIndex).toBe(1);
    });
  });

  describe('removeItemByIndex', () => {
    it('removes item and shifts currentIndex when above', () => {
      const withItems = { ...initial, items: makeItems(4), currentIndex: 2 };
      const state = playlistReducer(withItems, removeItemByIndex(0));
      expect(state.items).toHaveLength(3);
      expect(state.currentIndex).toBe(1);
    });

    it('removes last item and resets to -1', () => {
      const withItems = { ...initial, items: makeItems(1), currentIndex: 0 };
      const state = playlistReducer(withItems, removeItemByIndex(0));
      expect(state.items).toHaveLength(0);
      expect(state.currentIndex).toBe(-1);
    });

    it('clamps currentIndex when it was the last item', () => {
      const withItems = { ...initial, items: makeItems(3), currentIndex: 2 };
      const state = playlistReducer(withItems, removeItemByIndex(2));
      expect(state.currentIndex).toBe(1);
    });
  });

  describe('sort and filter', () => {
    it('setSortField updates field', () => {
      const state = playlistReducer(initial, setSortField('title'));
      expect(state.sortField).toBe('title');
    });

    it('setSortOrder updates order', () => {
      const state = playlistReducer(initial, setSortOrder('desc'));
      expect(state.sortOrder).toBe('desc');
    });

    it('toggleSortOrder flips order', () => {
      const state = playlistReducer(initial, toggleSortOrder());
      expect(state.sortOrder).toBe('desc');
    });

    it('setFilterFormat updates filter', () => {
      const state = playlistReducer(initial, setFilterFormat('mp4'));
      expect(state.filterFormat).toBe('mp4');

      const cleared = playlistReducer(state, setFilterFormat(null));
      expect(cleared.filterFormat).toBeNull();
    });
  });

  describe('navigation bounds', () => {
    it('currentIndex -1 means prev and next are both unavailable', () => {
      expect(initial.currentIndex).toBe(-1);
      // prev: -2 < 0 → unavailable
      // next: 0 >= items.length (0) → unavailable
    });

    it('at last item, next is unavailable', () => {
      const state = playlistReducer(
        { ...initial, items: makeItems(3), currentIndex: 2 },
        { type: '@@noop' },
      );
      // currentIndex 2, items.length 3 → next = 3 >= 3 → unavailable
      expect(state.currentIndex).toBe(2);
      expect(state.currentIndex + 1).toBe(state.items.length);
    });

    it('at first item, prev is unavailable', () => {
      const state = playlistReducer(
        { ...initial, items: makeItems(3), currentIndex: 0 },
        { type: '@@noop' },
      );
      expect(state.currentIndex).toBe(0);
    });
  });
});
