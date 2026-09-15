# Flipora Vercel Backend Setup

Flipora now uses a Vercel-native deployment architecture:

- React/Vite frontend on Vercel
- Vercel Functions under `/api`
- Neon Postgres from Vercel Marketplace
- Private Vercel Blob for photos and music
- Server-side session auth with HttpOnly cookies

## Quick setup

1. Run `npm install`.
2. Import the project into Vercel.
3. Add Neon from Vercel Marketplace and connect it to this project.
4. Run `db/schema.sql` in Vercel Database Browser -> Query or Neon SQL Editor.
5. Create a **Private** Vercel Blob store for the same project.
6. Verify Vercel has `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN`.
7. Optional for Forgot Password in production: add `RESEND_API_KEY`, `EMAIL_FROM`, and `APP_URL`.
8. Deploy.

For backend-aware local development use `npm run dev` (Vercel Dev). For frontend-only demo mode set `VITE_LOCAL_ONLY=true` and run `npm run dev:vite`.

## Authentication

Passwords are hashed server-side with Node `scrypt`. Login creates a random session token; only its SHA-256 hash is stored in Neon. The raw token stays in an HttpOnly, SameSite cookie.

Endpoints:

- `/api/auth-register`
- `/api/auth-login`
- `/api/auth-session`
- `/api/auth-logout`
- `/api/auth-reset-request`
- `/api/auth-reset-complete`

## Albums

Authenticated album data is stored in the Neon `albums` table as JSONB. Existing editor state, page layouts, text positions, pan/zoom values, music assignments, cover data and publish state remain compatible with the current frontend model.

Endpoints:

- `GET /api/albums`
- `POST /api/albums`
- `DELETE /api/albums?id=...`
- `POST /api/publish`
- `GET /api/public-album?slug=...`

## Private media

Photos and music use direct browser-to-Blob client uploads. `/api/upload` issues an authenticated upload token, so the Blob write token never reaches the browser.

The Blob store must be **Private**. Album JSON stores a protected `/api/media?path=...` URL. That route streams media only when:

- the logged-in user owns the media path, or
- the corresponding album is published and public sharing is enabled.

Delete operations also remove Blob objects when a saved `storagePath` is available.

## Environment variables

Server-only:

```text
DATABASE_URL=...
BLOB_READ_WRITE_TOKEN=...
RESEND_API_KEY=...        # optional
EMAIL_FROM=...            # optional
APP_URL=...               # optional
```

Frontend optional:

```text
VITE_LOCAL_ONLY=false
```

Never prefix database/blob secrets with `VITE_`.
