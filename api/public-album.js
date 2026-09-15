import { getDb } from '../server/db.js';
import { json, methodNotAllowed } from '../server/http.js';
import { errorResponse } from '../server/errors.js';

export default async function handler(request) {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  try {
    const slug = new URL(request.url).searchParams.get('slug');
    if (!slug) throw Object.assign(new Error('Share code missing.'), { status: 400 });
    const sql = getDb();
    const rows = await sql(
      `SELECT data FROM albums
       WHERE share_slug = $1 AND share_enabled = TRUE AND status = 'completed'
       LIMIT 1`,
      [slug]
    );
    return json({ album: rows[0]?.data || null });
  } catch (error) {
    return errorResponse(error);
  }
}
