import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { getDb } from './db.js';
import { getCookie } from './http.js';

const scryptAsync = promisify(crypto.scrypt);
const COOKIE_NAME = 'flipora_session';
const SESSION_DAYS = 30;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const derived = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, stored) {
  const [kind, salt, encoded] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !encoded) return false;
  const derived = Buffer.from(await scryptAsync(password, salt, 64));
  const expected = Buffer.from(encoded, 'base64url');
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    plan: row.plan || 'free',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export async function createSession(userId) {
  const sql = getDb();
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await sql(
    `INSERT INTO sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (token_hash) DO UPDATE SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at`,
    [tokenHash, userId, expiresAt.toISOString()]
  );
  return { token, expiresAt };
}

export function sessionCookie(token, expiresAt) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production';
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Expires=${expiresAt.toUTCString()}`,
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

export function clearSessionCookie() {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production';
  const attrs = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0', 'Expires=Thu, 01 Jan 1970 00:00:00 GMT'];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

export async function getSession(request) {
  const token = getCookie(request, COOKIE_NAME);
  if (!token) return null;
  const sql = getDb();
  const rows = await sql(
    `SELECT u.id, u.name, u.email, u.plan, u.created_at, s.token_hash
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > NOW()
      LIMIT 1`,
    [sha256(token)]
  );
  return rows[0] || null;
}

export async function requireSession(request) {
  const session = await getSession(request);
  if (!session) {
    const error = new Error('Please log in again.');
    error.status = 401;
    throw error;
  }
  return session;
}

export async function revokeSession(request) {
  const token = getCookie(request, COOKIE_NAME);
  if (!token) return;
  const sql = getDb();
  await sql('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
}

export function newOpaqueToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: sha256(token) };
}

export function hashOpaqueToken(token) {
  return sha256(token);
}
