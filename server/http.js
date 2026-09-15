export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

export function methodNotAllowed(methods = ['GET']) {
  return json({ error: 'Method not allowed.' }, 405, { allow: methods.join(', ') });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error('Invalid JSON request.');
  }
}

export function getCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const chunk of raw.split(';')) {
    const [key, ...rest] = chunk.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}
