import { handleUpload } from '@vercel/blob/client';
import { requireSession } from '../server/auth.js';
import { json, methodNotAllowed } from '../server/http.js';
import { errorResponse } from '../server/errors.js';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/webm'];

export default async function handler(request) {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  try {
    const body = await request.json();
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await requireSession(request);
        const expectedPrefix = `users/${session.id}/albums/`;
        if (!pathname.startsWith(expectedPrefix)) {
          throw Object.assign(new Error('Upload path unauthorized hai.'), { status: 403 });
        }
        let payload = {};
        try { payload = clientPayload ? JSON.parse(clientPayload) : {}; } catch { payload = {}; }
        const kind = payload.kind === 'audio' ? 'audio' : 'photos';
        return {
          allowedContentTypes: kind === 'audio' ? AUDIO_TYPES : IMAGE_TYPES,
          maximumSizeInBytes: kind === 'audio' ? 50 * 1024 * 1024 : 25 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.id, albumId: payload.albumId || '', kind }),
        };
      },
      onUploadCompleted: async () => {},
    });
    return json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
