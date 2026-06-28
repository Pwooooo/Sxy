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
  if (secret !== 'sxy-nuke-2026') return res.status(403).json({ error: 'Wrong secret' });

  let cursor = '0';
  let deleted = 0;
  const patterns = ['user:*', 'session:*', 'roblox-used:*', 'roblox-cache-checked'];

  for (const pattern of patterns) {
    cursor = '0';
    do {
      const [nextCursor, keys] = await redis('SCAN', cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys && keys.length > 0) {
        for (const k of keys) {
          await redis('DEL', k);
          deleted++;
        }
      }
    } while (cursor !== '0');
  }

  await redis('DEL', 'roblox-used-set');

  return res.status(200).json({ success: true, deleted });
}
