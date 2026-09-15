import { getDb } from '../server/db.js';
import { publicUser, requireSession } from '../server/auth.js';
import { json, methodNotAllowed, readJson } from '../server/http.js';
import { errorResponse } from '../server/errors.js';

export default async function handler(request) {
  if (request.method !== 'PATCH') return methodNotAllowed(['PATCH']);
  try {
    const session = await requireSession(request);
    const body = await readJson(request);
    const fields = [];
    const values = [];
    if (body?.plan != null) {
      const plan = String(body.plan || '');
      if (!['free', 'starter', 'plus', 'unlimited'].includes(plan)) {
        throw Object.assign(new Error('Invalid plan.'), { status: 400 });
      }
      values.push(plan);
      fields.push(`plan = $${values.length}`);
    }
    if (body?.name != null) {
      const name = String(body.name || '').trim();
      if (name.length < 2 || name.length > 80) {
        throw Object.assign(new Error('Name must be between 2 and 80 characters.'), { status: 400 });
      }
      values.push(name);
      fields.push(`name = $${values.length}`);
    }
    if (!fields.length) throw Object.assign(new Error('Nothing to update.'), { status: 400 });
    values.push(session.id);
    const sql = getDb();
    const rows = await sql(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING id, name, email, plan, created_at`,
      values
    );
    return json({ user: publicUser(rows[0]) });
  } catch (error) {
    return errorResponse(error);
  }
}
