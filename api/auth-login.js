import { getDb } from '../server/db.js';
import { createSession, publicUser, sessionCookie, verifyPassword } from '../server/auth.js';
import { json, methodNotAllowed, readJson } from '../server/http.js';
import { errorResponse } from '../server/errors.js';

export default async function handler(request) {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  try {
    const body = await readJson(request);
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (!email || !password) throw Object.assign(new Error('Please enter your email and password.'), { status: 400 });

    const sql = getDb();
    const rows = await sql(
      `SELECT id, name, email, password_hash, plan, created_at
       FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    const row = rows[0];
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      throw Object.assign(new Error('Incorrect email or password.'), { status: 401 });
    }
    const session = await createSession(row.id);
    return json(
      { user: publicUser(row) },
      200,
      { 'set-cookie': sessionCookie(session.token, session.expiresAt) }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
