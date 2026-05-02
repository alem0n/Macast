import React, { useMemo, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { playMediaItem, setSortField, setSortOrder, setFilterFormat } from '../../store/playlistSlice';
import { receiveCast } from '../../store/playerSlice';
import { deletePlaylistItem } from '../../services/api';
import { SortField } from '../../types';
import { PlaylistIcon, SortIcon, FilterIcon, DeleteIcon, PreviousIcon } from '../Icons';
import '../../styles/playlist.css';

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '刚刚';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  return `${Math.floor(hr / 24)}天前`;
}

const FORMAT_LABELS: Record<string, string> = {
  mp4: 'MP4',
  webm: 'WebM',
  hls: 'HLS',
  dash: 'DASH',
  unknown: '未知',
};

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'castAt', label: '时间' },
  { field: 'title', label: '标题' },
  { field: 'format', label: '格式' },
];

const Playlist: React.FC = () => {
  const dispatch = useDispatch();
  const items = useSelector((s: RootState) => s.playlist.items);
  const currentIndex = useSelector((s: RootState) => s.playlist.currentIndex);
  const sortField = useSelector((s: RootState) => s.playlist.sortField);
  const sortOrder = useSelector((s: RootState) => s.playlist.sortOrder);
  const filterFormat = useSelector((s: RootState) => s.playlist.filterFormat);
  const [collapsed, setCollapsed] = useState(false);

  const availableFormats = useMemo(() => {
    const formats = new Set<string>();
    items.forEach((item) => formats.add(item.format));
    return Array.from(formats).sort();
  }, [items]);

  // Sort + filter for display only
  const displayItems = useMemo(() => {
    let list = [...items];

    if (filterFormat) {
      list = list.filter((item) => item.format === filterFormat);
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'castAt':
          cmp = new Date(a.castAt).getTime() - new Date(b.castAt).getTime();
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title, 'zh');
          break;
        case 'format':
          cmp = a.format.localeCompare(b.format);
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [items, sortField, sortOrder, filterFormat]);

  // Local-only switch — does NOT affect other browsers
  const handleSwitch = useCallback(
    (displayIdx: number) => {
      const item = displayItems[displayIdx];
      const actualIdx = items.findIndex((i) => i.id === item.id);
      if (actualIdx < 0 || actualIdx === currentIndex) return;

      console.log(`[Playlist] switch to index=${actualIdx} id=${item.id} title="${item.title}"`);
      dispatch(playMediaItem(actualIdx));
      dispatch(receiveCast(items[actualIdx]));
    },
    [displayItems, items, currentIndex, dispatch]
  );

  // Delete from shared playlist (server broadcasts playlist:updated for all clients)
  const handleDelete = useCallback(
    async (e: React.MouseEvent, displayIdx: number) => {
      e.stopPropagation();
      const item = displayItems[displayIdx];
      const actualIdx = items.findIndex((i) => i.id === item.id);
      if (actualIdx < 0) return;

      console.log(`[Playlist] delete index=${actualIdx} id=${item.id} title="${item.title}"`);
      try {
        await deletePlaylistItem(actualIdx);
        console.log(`[Playlist] delete OK — server will broadcast playlist:updated`);
      } catch (err: any) {
        console.log(`[Playlist] delete HTTP error: ${err?.message || err}`);
      }
    },
    [displayItems, items]
  );

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        // If already sorting by this field, toggle order (asc → desc shows newest on top)
        dispatch(setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'));
      } else {
        dispatch(setSortField(field));
        // Default: time-based fields → ascending (newest at bottom), text fields → ascending (A-Z)
        dispatch(setSortOrder('asc'));
      }
    },
    [dispatch, sortField, sortOrder]
  );

  if (items.length === 0) return null;

  return (
    <aside className={`playlist-panel ${collapsed ? 'playlist-collapsed' : ''}`}>
      <header className="playlist-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="playlist-header-left">
          <PlaylistIcon size={16} />
          <span className="playlist-title">播放列表</span>
          <span className="playlist-count">{items.length}</span>
        </span>
        <button className="playlist-collapse-btn" aria-label={collapsed ? '展开' : '收起'}>
          {collapsed ? '◀' : '▼'}
        </button>
      </header>

      {!collapsed && (
        <>
          <div className="playlist-toolbar">
            <div className="playlist-sort-group">
              <SortIcon size={14} />
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.field}
                  className={`playlist-sort-btn ${sortField === opt.field ? 'sort-active' : ''}`}
                  onClick={() => toggleSort(opt.field)}
                >
                  {opt.label}
                  {sortField === opt.field && (
                    <span className="sort-arrow">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="playlist-filter-group">
              <FilterIcon size={14} />
              <select
                className="playlist-filter-select"
                value={filterFormat || ''}
                onChange={(e) => dispatch(setFilterFormat(e.target.value || null))}
              >
                <option value="">全部格式</option>
                {availableFormats.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {FORMAT_LABELS[fmt] || fmt.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ul className="playlist-items">
            {displayItems.length === 0 ? (
              <li className="playlist-empty">无匹配视频</li>
            ) : (
              displayItems.map((item, displayIdx) => {
                const actualIdx = items.findIndex((i) => i.id === item.id);
                const isCurrent = actualIdx === currentIndex;

                return (
                  <li
                    key={item.id}
                    className={`playlist-item ${isCurrent ? 'playlist-item-active' : ''}`}
                    onClick={() => handleSwitch(displayIdx)}
                    title={item.title}
                  >
                    {isCurrent && (
                      <span className="playlist-item-indicator">
                        <PreviousIcon size={12} />
                      </span>
                    )}

                    <div className="playlist-item-info">
                      <span className="playlist-item-title">{item.title}</span>
                      <span className="playlist-item-meta">
                        <span className={`playlist-item-format format-${item.format}`}>
                          {FORMAT_LABELS[item.format] || item.format}
                        </span>
                        <span className="playlist-item-duration">
                          {formatDuration(item.duration)}
                        </span>
                        <span className="playlist-item-time">{formatTimeAgo(item.castAt)}</span>
                      </span>
                    </div>

                    <button
                      className="playlist-item-delete"
                      onClick={(e) => handleDelete(e, displayIdx)}
                      aria-label="移除"
                      title="从列表移除"
                    >
                      <DeleteIcon size={14} />
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </>
      )}
    </aside>
  );
};

export default React.memo(Playlist);
