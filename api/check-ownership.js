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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token is required' });

  const recordRaw = await redis('GET', `verify:${token}`);
  if (!recordRaw) return res.status(200).json({ verified: false, message: 'Verification expired or not found' });

  const record = JSON.parse(recordRaw);

  return res.status(200).json({ verified: record.verified === true, gamepassId: record.gamepassId });
}
