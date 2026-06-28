const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...args) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  return (await r.json()).result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { secret, email } = req.body;
  if (secret !== 'sxy-admin-2026') return res.status(403).json({ error: 'Wrong secret' });
  if (!email) return res.status(400).json({ error: 'email required' });

  const emailKey = email.toLowerCase().trim();
  const raw = await redis('GET', 'user:' + emailKey);
  const user = raw ? JSON.parse(raw) : { email: emailKey };
  user.admin = true;
  await redis('SET', 'user:' + emailKey, JSON.stringify(user));

  return res.status(200).json({ success: true, message: emailKey + ' is now admin' });
}
