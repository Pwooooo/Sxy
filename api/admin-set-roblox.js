export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

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

  const token = auth.replace('Bearer ', '');
  const email = await redis('GET', 'session:' + token);
  if (!email) return res.status(401).json({ error: 'Invalid session' });

  const { robloxUserId } = req.body;
  if (!robloxUserId) return res.status(400).json({ error: 'robloxUserId required' });

  const existing = await redis('GET', 'roblox-used:' + robloxUserId);
  if (existing) {
    return res.status(400).json({ error: 'This Roblox account has already been used.' });
  }

  await redis('SET', 'roblox-used:' + robloxUserId, email);
  return res.status(200).json({ success: true });
}
