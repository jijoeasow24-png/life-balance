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
      return res.status(500).json({ ok: false, error: err.message });
    }
  }
  if (req.method === 'POST') {
    try {
      await redis.set(KEY, req.body);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
