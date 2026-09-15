import { clearSessionCookie, revokeSession } from '../server/auth.js';
import { json, methodNotAllowed } from '../server/http.js';
import { errorResponse } from '../server/errors.js';

export default async function handler(request) {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  try {
    await revokeSession(request);
    return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
  } catch (error) {
    return errorResponse(error);
  }
}
