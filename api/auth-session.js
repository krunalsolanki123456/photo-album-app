import { getSession, publicUser } from '../server/auth.js';
import { json, methodNotAllowed } from '../server/http.js';
import { errorResponse } from '../server/errors.js';

export default async function handler(request) {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  try {
    const session = await getSession(request);
    return json({ user: session ? publicUser(session) : null });
  } catch (error) {
    return errorResponse(error);
  }
}
