import { json } from './http.js';

export function errorResponse(error) {
  console.error(error);
  const status = Number(error?.status) || 500;
  const safeMessage = status >= 500
    ? (process.env.NODE_ENV === 'production' ? 'Server error. Please try again.' : (error?.message || 'Server error.'))
    : (error?.message || 'Request failed.');
  return json({ error: safeMessage }, status);
}
