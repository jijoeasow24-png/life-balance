import { google } from 'googleapis';
import { getToken } from 'next-auth/jwt';

const LB_TAG = 'LIFEBALANCE';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) return res.status(401).json({ error: 'Not authenticated' });
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ access_token: token.accessToken });
  const calendar = google.calendar({ version: 'v3', auth });
  try {
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 8 * 7 * 86400000).toISOString();
    const res2 = await calendar.events.list({
      calendarId: 'primary', timeMin, timeMax, maxResults: 500, singleEvents: true,
    });
    const events = (res2.data.items || []).filter(e => {
      const src = e.extendedProperties?.private?.source;
      return src !== LB_TAG;
    });
    return res.status(200).json({ ok: true, events });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
