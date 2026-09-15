import { upload } from '@vercel/blob/client';

export const isBackendConfigured = String(import.meta.env.VITE_LOCAL_ONLY || '').toLowerCase() !== 'true';

async function api(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 2500);
  try {
    const response = await fetch(path, {
      credentials: 'same-origin',
      signal: options.signal || controller.signal,
      ...options,
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
    clearTimeout(timeoutId);
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};
    if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status}).`);
    return payload;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function cleanFileName(name = 'file') {
  return name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(-100) || 'file';
}

export async function getCurrentBackendUser() {
  const data = await api('/api/auth-session');
  return data.user || null;
}

export async function signInBackend(email, password) {
  const data = await api('/api/auth-login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function signUpBackend({ name, email, password, plan = 'free' }) {
  return api('/api/auth-register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, plan }),
  });
}

export async function signOutBackend() {
  await api('/api/auth-logout', { method: 'POST', body: JSON.stringify({}) });
}

export async function sendPasswordResetBackend(email) {
  return api('/api/auth-reset-request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function updatePasswordBackend(password, token) {
  return api('/api/auth-reset-complete', {
    method: 'POST',
    body: JSON.stringify({ password, token }),
  });
}

export async function updatePlanBackend(_userId, plan) {
  const planAliases = { trial: 'free', single: 'starter', quarterly: 'plus', yearly: 'unlimited' };
  const data = await api('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify({ plan: planAliases[plan] || plan }),
  });
  return data.user;
}

export async function updateProfileBackend(patch = {}) {
  const data = await api('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.user;
}

export async function loadAlbumsBackend() {
  const data = await api('/api/albums');
  return data.albums || [];
}

export async function saveAlbumBackend(_userId, album) {
  await api('/api/albums', {
    method: 'POST',
    body: JSON.stringify({ album }),
  });
}

export async function saveAlbumsBackend(_userId, albums) {
  if (!albums?.length) return;
  await api('/api/albums', {
    method: 'POST',
    body: JSON.stringify({ albums }),
  });
}

export async function deleteAlbumBackend(_userId, albumId) {
  await api(`/api/albums?id=${encodeURIComponent(albumId)}`, { method: 'DELETE' });
}

export async function publishAlbumBackend(_userId, album) {
  await api('/api/publish', {
    method: 'POST',
    body: JSON.stringify({ album }),
  });
}

export async function loadPublicAlbumBackend(slug) {
  const data = await api(`/api/public-album?slug=${encodeURIComponent(slug)}`);
  return data.album || null;
}

export async function uploadAlbumMediaBackend({ userId, albumId, file, kind = 'photos' }) {
  const safeName = cleanFileName(file?.name || (kind === 'audio' ? 'audio' : 'photo'));
  const pathname = `users/${userId}/albums/${albumId}/${kind}/${Date.now()}-${safeName}`;
  const blob = await upload(pathname, file, {
    access: 'private',
    handleUploadUrl: '/api/upload',
    clientPayload: JSON.stringify({ albumId, kind }),
    multipart: Number(file?.size || 0) > 4 * 1024 * 1024,
  });
  return {
    path: blob.pathname,
    blobUrl: blob.url,
    publicUrl: `/api/media?path=${encodeURIComponent(blob.pathname)}`,
  };
}

export async function removeAlbumMediaBackend(path) {
  if (!path) return;
  await api(`/api/media?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
}
