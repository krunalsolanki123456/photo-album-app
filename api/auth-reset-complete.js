import { getDb } from '../server/db.js';
import { hashOpaqueToken, hashPassword } from '../server/auth.js';
import { json, methodNotAllowed, readJson } from '../server/http.js';
import { errorResponse } from '../server/errors.js';

export default async function handler(request) {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  try {
    const body = await readJson(request);
    const token = String(body?.token || '');
    const password = String(body?.password || '');
    if (!token) throw Object.assign(new Error('Reset link is invalid.'), { status: 400 });
    if (password.length < 6) throw Object.assign(new Error('New password must be at least 6 characters.'), { status: 400 });

    const sql = getDb();
    const rows = await sql(
      `SELECT token_hash, user_id FROM password_resets
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [hashOpaqueToken(token)]
    );
    if (!rows.length) throw Object.assign(new Error('Reset link is invalid or has expired.'), { status: 400 });

    const passwordHash = await hashPassword(password);
    await sql('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, rows[0].user_id]);
    await sql('UPDATE password_resets SET used_at = NOW() WHERE token_hash = $1', [rows[0].token_hash]);
    await sql('DELETE FROM sessions WHERE user_id = $1', [rows[0].user_id]);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
