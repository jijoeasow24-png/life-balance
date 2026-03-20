import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const KEY = 'lb:data';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const data = await redis.get(KEY);
      return res.status(200).json({ ok: true, data: data || null });
    } catch (err) {
      return res.status(200).json({ ok: true, data: null });
    }
  }
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      await redis.set(KEY, JSON.stringify(body));
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
