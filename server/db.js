import { neon } from '@neondatabase/serverless';

let client;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured. Connect a Neon database in Vercel.');
  if (!client) client = neon(url);
  return client;
}
