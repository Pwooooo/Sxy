import crypto from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command, ...args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([command, ...args]),
  });
  const data = await res.json();
  return data.result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, robloxUserId, gamepassId } = req.body;
  if (!username || !robloxUserId || !gamepassId) {
    return res.status(400).json({ error: 'username, robloxUserId, and gamepassId are required' });
  }

  const token = crypto.randomBytes(16).toString('hex');

  const record = {
    username,
    robloxUserId: String(robloxUserId),
    gamepassId: String(gamepassId),
    verified: false,
    createdAt: Date.now(),
  };

  await redis('SET', `verify:${token}`, JSON.stringify(record), 'EX', '3600');
  await redis('SET', `user-verify:${robloxUserId}`, JSON.stringify({ token, gamepassId: String(gamepassId) }), 'EX', '3600');

  return res.status(200).json({ success: true, token });
}
