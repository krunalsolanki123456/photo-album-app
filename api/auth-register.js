import crypto from 'node:crypto';
import { getDb } from '../server/db.js';
import { createSession, hashPassword, publicUser, sessionCookie } from '../server/auth.js';
import { json, methodNotAllowed, readJson } from '../server/http.js';
import { errorResponse } from '../server/errors.js';

export default async function handler(request) {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  try {
    const body = await readJson(request);
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const plan = ['free', 'starter', 'plus', 'unlimited'].includes(body?.plan) ? body.plan : 'free';
    if (!name) throw Object.assign(new Error('Please enter your name.'), { status: 400 });
    if (!email || !email.includes('@')) throw Object.assign(new Error('Please enter a valid email address.'), { status: 400 });
    if (password.length < 6) throw Object.assign(new Error('Password must be at least 6 characters.'), { status: 400 });

    const sql = getDb();
    const exists = await sql('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (exists.length) throw Object.assign(new Error('An account is already registered with this email.'), { status: 409 });

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const rows = await sql(
      `INSERT INTO users (id, name, email, password_hash, plan)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, plan, created_at`,
      [id, name, email, passwordHash, plan]
    );
    const session = await createSession(id);
    return json(
      { user: publicUser(rows[0]), emailConfirmationRequired: false },
      201,
      { 'set-cookie': sessionCookie(session.token, session.expiresAt) }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
