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

  const { userId, gamepassId } = req.body;
  if (!userId || !gamepassId) {
    return res.status(400).json({ error: 'userId and gamepassId are required' });
  }

  const userData = await redis('GET', `user-verify:${userId}`);
  if (!userData) {
    return res.status(200).json({ success: false, message: 'No pending verification for this user' });
  }

  const pending = JSON.parse(userData);

  if (String(pending.gamepassId) !== String(gamepassId)) {
    return res.status(200).json({ success: false, message: 'Gamepass ID mismatch' });
  }

  const recordRaw = await redis('GET', `verify:${pending.token}`);
  if (!recordRaw) {
    return res.status(200).json({ success: false, message: 'Verification record expired' });
  }

  const record = JSON.parse(recordRaw);
  record.verified = true;
  record.verifiedAt = Date.now();

  await redis('SET', `verify:${pending.token}`, JSON.stringify(record), 'EX', '3600');

  return res.status(200).json({ success: true });
}
