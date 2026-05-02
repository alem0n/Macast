import { CastMedia, CastRequestBody } from '../types';

let playlist: CastMedia[] = [];

function log(msg: string, ...args: unknown[]): void {
  console.log(`[CastService] ${new Date().toISOString()} ${msg}`, ...args);
}

function generateId(): string {
  const ts = Date.now().toString(36);
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let rand = '';
  for (let i = 0; i < 16; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${ts}_${rand}`;
}

export function validateUrl(
  url: string
): { valid: boolean; format?: string } {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false };
    }

    const pathname = parsed.pathname.toLowerCase();
    let format = 'unknown';

    if (pathname.endsWith('.mp4')) {
      format = 'mp4';
    } else if (pathname.endsWith('.webm')) {
      format = 'webm';
    } else if (pathname.endsWith('.m3u8') || pathname.includes('m3u8')) {
      format = 'hls';
    } else if (pathname.endsWith('.mpd')) {
      format = 'dash';
    }

    return { valid: true, format };
  } catch {
    return { valid: false };
  }
}

export function extractTitle(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    return decodeURIComponent(filename) || '未命名视频';
  } catch {
    return '未命名视频';
  }
}

export function addToPlaylist(body: CastRequestBody): CastMedia {
  const validation = validateUrl(body.url);
  const format = (validation.format || 'unknown') as CastMedia['format'];
  const title = body.title || extractTitle(body.url);
  const id = generateId();

  log(
    `addToPlaylist | id=${id} title="${title}" format=${format} source=${body.source || 'dlna'} url=${body.url.substring(0, 80)}`
  );

  const media: CastMedia = {
    id,
    url: body.url,
    title,
    duration: body.duration ?? 0,
    format,
    castAt: new Date().toISOString(),
    source: body.source || 'dlna',
  };

  playlist.push(media);
  log(`addToPlaylist | playlist size now=${playlist.length} index=${playlist.length - 1}`);

  return media;
}

export function getPlaylist(): CastMedia[] {
  return playlist;
}

export function removeItem(index: number): CastMedia | null {
  if (index < 0 || index >= playlist.length) {
    log(`removeItem | INVALID index=${index} playlist.length=${playlist.length}`);
    return null;
  }

  const removed = playlist[index];
  playlist.splice(index, 1);
  log(`removeItem | index=${index} id=${removed.id} title="${removed.title}" — playlist size now=${playlist.length}`);
  return removed;
}

export function reorder(fromIndex: number, toIndex: number): boolean {
  if (
    fromIndex < 0 || fromIndex >= playlist.length ||
    toIndex < 0 || toIndex >= playlist.length
  ) {
    log(`reorder | INVALID from=${fromIndex} to=${toIndex} playlist.length=${playlist.length}`);
    return false;
  }

  const [item] = playlist.splice(fromIndex, 1);
  playlist.splice(toIndex, 0, item);
  log(`reorder | moved "${item.title}" from=${fromIndex} to=${toIndex}`);
  return true;
}

export function clearPlaylist(): void {
  log(`clearPlaylist | removing ${playlist.length} items`);
  playlist = [];
}
