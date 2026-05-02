import { Router, Request, Response } from 'express';
import * as CastService from '../services/CastService';
import { getOnlineStats } from '../services/SessionManager';
import { broadcastAll } from '../services/SessionManager';
import {
  CastRequestBody,
  CastResponse,
  CastGetResponse,
  UsersResponse,
  StatusResponse,
  ErrorResponse,
  WsCastNewMessage,
  WsPlaylistUpdatedMessage,
} from '../types';

const router = Router();

const startTime = Date.now();

function log(msg: string, ...args: unknown[]): void {
  console.log(`[API] ${new Date().toISOString()} ${msg}`, ...args);
}

function broadcastPlaylist(): void {
  const items = CastService.getPlaylist();
  log(`broadcastPlaylist | ${items.length} items`);
  const msg: WsPlaylistUpdatedMessage = {
    type: 'playlist:updated',
    payload: { items },
  };
  broadcastAll(msg);
}

// POST /api/cast — Receive a cast URL (from Macast Python or manual input)
router.post('/cast', (req: Request, res: Response) => {
  try {
    const body = req.body as CastRequestBody;

    if (!body || !body.url) {
      log('POST /api/cast | REJECTED — missing url');
      const err: ErrorResponse = { error: 'Missing required field: url' };
      return res.status(400).json(err);
    }

    const validation = CastService.validateUrl(body.url);
    if (!validation.valid) {
      log(`POST /api/cast | REJECTED — invalid URL: ${body.url.substring(0, 80)}`);
      const err: ErrorResponse = { error: 'Invalid URL provided' };
      return res.status(400).json(err);
    }

    log(`POST /api/cast | source=${body.source || 'dlna'} title="${body.title || ''}" url=${body.url.substring(0, 80)}`);
    const media = CastService.addToPlaylist(body);

    // Broadcast new media to all clients
    log(`POST /api/cast | broadcasting cast:new id=${media.id}`);
    const castMsg: WsCastNewMessage = { type: 'cast:new', payload: media };
    broadcastAll(castMsg);

    broadcastPlaylist();

    const resp: CastResponse = { success: true, media };
    return res.status(201).json(resp);
  } catch (e) {
    log(`POST /api/cast | ERROR: ${e}`);
    const err: ErrorResponse = { error: 'Internal server error' };
    return res.status(500).json(err);
  }
});

// GET /api/cast — Get full playlist
router.get('/cast', (_req: Request, res: Response) => {
  const resp: CastGetResponse = {
    playlist: CastService.getPlaylist(),
  };
  return res.status(200).json(resp);
});

// DELETE /api/cast/:index — Remove a playlist item
router.delete('/cast/:index', (req: Request, res: Response) => {
  try {
    const idx = parseInt(req.params.index, 10);

    if (isNaN(idx)) {
      log(`DELETE /api/cast/:index | REJECTED — invalid index param: ${req.params.index}`);
      const err: ErrorResponse = { error: 'Invalid index parameter' };
      return res.status(400).json(err);
    }

    log(`DELETE /api/cast/${idx} | request`);
    const removed = CastService.removeItem(idx);

    if (!removed) {
      log(`DELETE /api/cast/${idx} | REJECTED — index out of range (playlist size=${CastService.getPlaylist().length})`);
      const err: ErrorResponse = { error: 'Invalid playlist index' };
      return res.status(400).json(err);
    }

    broadcastPlaylist();

    log(`DELETE /api/cast/${idx} | OK — removed id=${removed.id} title="${removed.title}"`);
    return res.status(200).json({ success: true });
  } catch (e) {
    log(`DELETE /api/cast/:index | ERROR: ${e}`);
    const err: ErrorResponse = { error: 'Internal server error' };
    return res.status(500).json(err);
  }
});

// POST /api/cast/reorder — Reorder playlist items
router.post('/cast/reorder', (req: Request, res: Response) => {
  try {
    const { fromIndex, toIndex } = req.body as {
      fromIndex: number;
      toIndex: number;
    };

    if (fromIndex === undefined || toIndex === undefined) {
      const err: ErrorResponse = {
        error: 'Missing required fields: fromIndex, toIndex',
      };
      return res.status(400).json(err);
    }

    const ok = CastService.reorder(Number(fromIndex), Number(toIndex));

    if (!ok) {
      const err: ErrorResponse = { error: 'Invalid index range' };
      return res.status(400).json(err);
    }

    broadcastPlaylist();

    return res.status(200).json({ success: true });
  } catch (e) {
    const err: ErrorResponse = { error: 'Internal server error' };
    return res.status(500).json(err);
  }
});

// GET /api/users — Get online user stats
router.get('/users', (_req: Request, res: Response) => {
  const stats = getOnlineStats();
  const resp: UsersResponse = stats;
  return res.status(200).json(resp);
});

// GET /api/status — Health check
router.get('/status', (_req: Request, res: Response) => {
  const stats = getOnlineStats();
  const resp: StatusResponse = {
    status: 'ok',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    hasMedia: CastService.getPlaylist().length > 0,
    onlineCount: stats.onlineCount,
  };
  return res.status(200).json(resp);
});

export default router;
