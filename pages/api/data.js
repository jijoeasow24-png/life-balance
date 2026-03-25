import { Redis } from '@upstash/redis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function userKey(email) {
  // e.g. lb:user:jijoeasow@gmail.com
  return `lb:user:${email}`;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  // If not signed in, fall back to a generic guest key
  // (same behaviour as before, but isolated from real users)
  const key = session?.user?.email
    ? userKey(session.user.email)
    : 'lb:guest';

  if (req.method === 'GET') {
    try {
      const data = await redis.get(key);
      return res.status(200).json({ ok: true, data: data || null });
    } catch (err) {
      return res.status(200).json({ ok: true, data: null });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      await redis.set(key, JSON.stringify(body));
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
