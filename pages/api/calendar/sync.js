import { google } from 'googleapis';
import { getToken } from 'next-auth/jwt';

const CALENDAR_ID = 'primary';
const LB_TAG = 'LIFEBALANCE';

function toRFC3339(dateStr, timeStr) {
  return `${dateStr}T${timeStr}:00`;
}

function getDatesForBlock(block, weeksAhead = 8) {
  const dates = [];
  const base = new Date(block.date + 'T00:00:00');
  const end  = new Date();
  end.setDate(end.getDate() + weeksAhead * 7);

  for (let d = new Date(base); d <= end; d.setDate(d.getDate() + 1)) {
    const dow  = d.getDay();
    const diff = Math.round((d - base) / 86400000);
    let include = false;
    switch (block.recur) {
      case 'none':        include = diff === 0; break;
      case 'daily':       include = true; break;
      case 'weekdays':    include = dow >= 1 && dow <= 5; break;
      case 'weekends':    include = dow === 0 || dow === 6; break;
      case 'alternate':   include = diff % 2 === 0; break;
      case 'weekly':      include = diff % 7 === 0; break;
      case 'fortnightly': include = diff % 14 === 0; break;
      case 'monthly':     include = d.getDate() === base.getDate(); break;
    }
    if (include) dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: token.accessToken });

  const calendar = google.calendar({ version: 'v3', auth });
  const { blocks } = req.body;

  if (!blocks || !Array.isArray(blocks)) return res.status(400).json({ error: 'No blocks provided' });

  try {
    // Delete existing Life Balance events (next 8 weeks)
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 8 * 7 * 86400000).toISOString();
    const existing = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin, timeMax,
      privateExtendedProperty: `source=${LB_TAG}`,
      maxResults: 500,
    });
    const toDelete = existing.data.items || [];
    await Promise.all(toDelete.map(e =>
      calendar.events.delete({ calendarId: CALENDAR_ID, eventId: e.id }).catch(() => {})
    ));

    // Push all blocks as individual events
    let created = 0;
    for (const block of blocks) {
      const dates = getDatesForBlock(block);
      for (const date of dates) {
        await calendar.events.insert({
          calendarId: CALENDAR_ID,
          requestBody: {
            summary: block.title,
            start: { dateTime: toRFC3339(date, block.start), timeZone: 'Asia/Dubai' },
            end:   { dateTime: toRFC3339(date, block.end),   timeZone: 'Asia/Dubai' },
            colorId: { work:'9', spiritual:'3', social:'11', fitness:'10', creativity:'6' }[block.domain] || '1',
            extendedProperties: { private: { source: LB_TAG, domain: block.domain } },
          },
        });
        created++;
      }
    }

    return res.status(200).json({ ok: true, created });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
