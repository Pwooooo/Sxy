import crypto from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCommand(...args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + REDIS_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  });
  const data = await res.json();
  return data.result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, plan, robloxUser, robloxUserId } = req.body;

  if (!email || !plan || !robloxUser || !robloxUserId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const emailKey = email.toLowerCase().trim();
  const raw = await redisCommand('GET', 'user:' + emailKey);

  const existingRoblox = await redisCommand('GET', 'roblox-used:' + robloxUserId);
  if (existingRoblox && existingRoblox !== emailKey) {
    return res.status(400).json({ error: 'This Roblox account has already been used to claim a key.' });
  }

  let user;
  if (raw) {
    user = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } else {
    user = { email: emailKey, createdAt: new Date().toISOString() };
  }

  const key = 'SXY-' + Array.from({length: 4}, () => crypto.randomBytes(2).toString('hex').toUpperCase()).join('-');

  user.plan = plan;
  user.licenseKey = key;
  user.robloxUser = robloxUser;
  user.robloxUserId = robloxUserId;
  user.purchasedAt = new Date().toISOString();

  await redisCommand('SET', 'user:' + emailKey, JSON.stringify(user));
  await redisCommand('SET', 'roblox-used:' + robloxUserId, emailKey);

  return res.status(200).json({
    success: true,
    licenseKey: key,
    plan
  });
}
