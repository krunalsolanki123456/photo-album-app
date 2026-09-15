import { getDb } from '../server/db.js';
import { requireSession } from '../server/auth.js';
import { json, methodNotAllowed, readJson } from '../server/http.js';
import { errorResponse } from '../server/errors.js';

export default async function handler(request) {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  try {
    const session = await requireSession(request);
    const body = await readJson(request);
    const album = body?.album;
    if (!album?.id || !album?.shareSlug) throw Object.assign(new Error('Album publish data is incomplete.'), { status: 400 });
    const sql = getDb();
    await sql(
      `INSERT INTO albums (id, user_id, title, status, share_slug, share_enabled, data, created_at, updated_at)
       VALUES ($1, $2, $3, 'completed', $4, TRUE, $5::jsonb, $6, NOW())
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         status = 'completed',
         share_slug = EXCLUDED.share_slug,
         share_enabled = TRUE,
         data = EXCLUDED.data,
         updated_at = NOW()
       WHERE albums.user_id = EXCLUDED.user_id`,
      [
        String(album.id),
        session.id,
        album.title || 'Untitled Album',
        String(album.shareSlug),
        JSON.stringify({ ...album, status: 'completed' }),
        album.createdAt ? new Date(album.createdAt).toISOString() : new Date().toISOString(),
      ]
    );
    return json({ ok: true });
  } catch (error) {
    if (/duplicate key|unique/i.test(error?.message || '')) {
      error.status = 409;
      error.message = 'Share code is already in use. Please try publishing again.';
    }
    return errorResponse(error);
  }
}
