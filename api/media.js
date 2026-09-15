import { del, get } from '@vercel/blob';
import { getDb } from '../server/db.js';
import { getSession, requireSession } from '../server/auth.js';
import { json, methodNotAllowed } from '../server/http.js';
import { errorResponse } from '../server/errors.js';

function parsePath(pathname) {
  const parts = String(pathname || '').split('/');
  if (parts.length < 6 || parts[0] !== 'users' || parts[2] !== 'albums') return null;
  return { userId: parts[1], albumId: parts[3] };
}

export default async function handler(request) {
  if (!['GET', 'DELETE'].includes(request.method)) return methodNotAllowed(['GET', 'DELETE']);
  try {
    const url = new URL(request.url);
    const pathname = url.searchParams.get('path');
    const parsed = parsePath(pathname);
    if (!pathname || !parsed) throw Object.assign(new Error('Invalid media path.'), { status: 400 });

    if (request.method === 'DELETE') {
      const session = await requireSession(request);
      if (parsed.userId !== session.id) throw Object.assign(new Error('Media delete unauthorized hai.'), { status: 403 });
      await del(pathname);
      return json({ ok: true });
    }

    let allowed = false;
    const session = await getSession(request);
    if (session && parsed.userId === session.id) allowed = true;
    if (!allowed) {
      const sql = getDb();
      const rows = await sql(
        `SELECT 1 FROM albums
         WHERE id = $1 AND user_id = $2 AND share_enabled = TRUE AND status = 'completed'
         LIMIT 1`,
        [parsed.albumId, parsed.userId]
      );
      allowed = rows.length > 0;
    }
    if (!allowed) throw Object.assign(new Error('Media access denied.'), { status: 403 });

    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') || undefined,
    });
    if (!result) return new Response('Not found', { status: 404 });
    if (result.statusCode === 304) {
      return new Response(null, {
        status: 304,
        headers: { ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' },
      });
    }
    return new Response(result.stream, {
      status: 200,
      headers: {
        'Content-Type': result.blob.contentType || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        ETag: result.blob.etag,
        'Cache-Control': allowed && !session ? 'public, max-age=300' : 'private, no-cache',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
