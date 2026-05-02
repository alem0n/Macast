const API_BASE = '';

export async function fetchCurrentCast(): Promise<{
  playlist: import('../types').CastMedia[];
}> {
  const res = await fetch(`${API_BASE}/api/cast`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function postCast(url: string, title?: string): Promise<{
  success: boolean;
  media: import('../types').CastMedia;
}> {
  const res = await fetch(`${API_BASE}/api/cast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title, source: 'manual' }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deletePlaylistItem(index: number): Promise<{
  success: boolean;
}> {
  const res = await fetch(`${API_BASE}/api/cast/${index}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
