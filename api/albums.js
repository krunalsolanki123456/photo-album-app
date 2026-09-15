import { del } from '@vercel/blob';
import { getDb } from '../server/db.js';
import { requireSession } from '../server/auth.js';
import { json, methodNotAllowed, readJson } from '../server/http.js';
import { errorResponse } from '../server/errors.js';

function toRow(userId, album) {
  return {
    id: String(album.id),
    userId,
    title: album.title || 'Untitled Album',
    status: album.status || 'draft',
    shareSlug: album.shareSlug || null,
    shareEnabled: Boolean(album.shareSlug && album.status === 'completed'),
    data: JSON.stringify(album),
    createdAt: album.createdAt ? new Date(album.createdAt).toISOString() : new Date().toISOString(),
  };
}

function mediaPaths(album) {
  const photos = (album?.photos || []).map((p) => p.storagePath).filter(Boolean);
  const music = (album?.musicLibrary || []).map((m) => m.storagePath).filter(Boolean);
  return [...new Set([...photos, ...music])];
}

export default async function handler(request) {
  if (!['GET', 'POST', 'DELETE'].includes(request.method)) return methodNotAllowed(['GET', 'POST', 'DELETE']);
  try {
    const session = await requireSession(request);
    const sql = getDb();

    if (request.method === 'GET') {
      const rows = await sql('SELECT data FROM albums WHERE user_id = $1 ORDER BY created_at ASC', [session.id]);
      return json({ albums: rows.map((row) => row.data).filter(Boolean) });
    }

    if (request.method === 'DELETE') {
      const id = new URL(request.url).searchParams.get('id');
      if (!id) throw Object.assign(new Error('Album id missing.'), { status: 400 });
      const rows = await sql('DELETE FROM albums WHERE id = $1 AND user_id = $2 RETURNING data', [id, session.id]);
      if (rows[0]?.data) {
        const paths = mediaPaths(rows[0].data);
        if (paths.length) await del(paths).catch((err) => console.error('Blob cleanup failed:', err));
      }
      return json({ ok: true });
    }

    const body = await readJson(request);
    const albums = Array.isArray(body?.albums) ? body.albums : (body?.album ? [body.album] : []);
    if (!albums.length) return json({ ok: true });

    for (const album of albums) {
      if (!album?.id) continue;
      const row = toRow(session.id, album);
      await sql(
        `INSERT INTO albums (id, user_id, title, status, share_slug, share_enabled, data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, NOW())
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           status = EXCLUDED.status,
           share_slug = EXCLUDED.share_slug,
           share_enabled = EXCLUDED.share_enabled,
           data = EXCLUDED.data,
           updated_at = NOW()
         WHERE albums.user_id = EXCLUDED.user_id`,
        [row.id, row.userId, row.title, row.status, row.shareSlug, row.shareEnabled, row.data, row.createdAt]
      );
    }
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
