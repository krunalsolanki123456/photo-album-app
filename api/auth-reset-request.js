import { getDb } from '../server/db.js';
import { newOpaqueToken } from '../server/auth.js';
import { json, methodNotAllowed, readJson } from '../server/http.js';
import { errorResponse } from '../server/errors.js';

async function sendResetEmail({ to, resetUrl }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject: 'Reset your Flipora password',
      html: `<p>Use the link below to set a new Flipora password.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 30 minutes.</p>`,
    }),
  });
  if (!response.ok) throw new Error('Password reset email could not be sent.');
  return true;
}

export default async function handler(request) {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  try {
    const body = await readJson(request);
    const email = String(body?.email || '').trim().toLowerCase();
    if (!email) throw Object.assign(new Error('Please enter your email.'), { status: 400 });

    const sql = getDb();
    const users = await sql('SELECT id, email FROM users WHERE email = $1 LIMIT 1', [email]);
    // Do not reveal whether the address exists.
    if (!users.length) return json({ ok: true, message: 'If an account exists with this email, a reset link will be sent.' });

    const { token, tokenHash } = newOpaqueToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await sql('DELETE FROM password_resets WHERE user_id = $1 OR expires_at < NOW()', [users[0].id]);
    await sql(
      'INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash, users[0].id, expiresAt]
    );

    const baseUrl = String(process.env.APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '').replace(/\/$/, '');
    const inferred = baseUrl ? (baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`) : new URL(request.url).origin;
    const resetUrl = `${inferred}/#/reset/${encodeURIComponent(token)}`;
    const sent = await sendResetEmail({ to: users[0].email, resetUrl });

    if (!sent && process.env.VERCEL_ENV === 'production') {
      throw Object.assign(new Error('Password email service is not configured. Please add RESEND_API_KEY and EMAIL_FROM.'), { status: 503 });
    }

    return json({
      ok: true,
      message: sent ? 'Password reset link has been sent to your email.' : 'Development reset link generated.',
      ...(sent ? {} : { debugResetUrl: resetUrl }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
