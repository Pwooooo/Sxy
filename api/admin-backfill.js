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

  const { secret } = req.body;
  if (secret !== 'sxy-backfill-2026') return res.status(403).json({ error: 'Wrong secret' });

  const { userId, email } = req.body;
  if (!userId || !email) return res.status(400).json({ error: 'userId and email required' });

  const uid = String(userId);
  const emailKey = email.toLowerCase().trim();

  await redis('SADD', 'roblox-used-set', uid);
  await redis('SET', 'roblox-used:' + uid, emailKey);

  return res.status(200).json({ success: true, message: `Blocked roblox userId ${uid} for ${emailKey}` });
}
