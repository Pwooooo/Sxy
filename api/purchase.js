import crypto from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCommand(...args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  return data.result;
}

async function isRobloxUsed(robloxUserId) {
  const direct = await redisCommand('GET', 'roblox-used:' + robloxUserId);
  if (direct) return direct;

  const cached = await redisCommand('GET', 'roblox-cache-checked');
  if (!cached) {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redisCommand('SCAN', cursor, 'MATCH', 'user:*', 'COUNT', '100');
      cursor = nextCursor;
      if (keys) {
        for (const k of keys) {
          const raw = await redisCommand('GET', k);
          if (!raw) continue;
          const u = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (u.robloxUserId) {
            await redisCommand('SET', 'roblox-used:' + u.robloxUserId, u.email || k.replace('user:', ''));
          }
        }
      }
    } while (cursor !== '0');
    await redisCommand('SET', 'roblox-cache-checked', '1', 'EX', 86400);
  }

  return await redisCommand('GET', 'roblox-used:' + robloxUserId);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, plan, robloxUser, robloxUserId } = req.body;
  if (!email || !plan || !robloxUser || !robloxUserId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const emailKey = email.toLowerCase().trim();

  const existingRoblox = await isRobloxUsed(robloxUserId);
  if (existingRoblox && existingRoblox !== emailKey) {
    return res.status(400).json({ error: 'This Roblox account has already been used to claim a key.' });
  }

  if (existingRoblox && existingRoblox === emailKey) {
    const raw = await redisCommand('GET', 'user:' + emailKey);
    const user = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
    if (user && user.licenseKey) {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      await redisCommand('SET', 'session:' + sessionToken, emailKey, 'EX', 2592000);
      return res.status(200).json({ success: true, licenseKey: user.licenseKey, sessionToken, plan: user.plan || plan });
    }
  }

  const raw = await redisCommand('GET', 'user:' + emailKey);
  let user;
  if (raw) {
    user = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } else {
    user = { email: emailKey, createdAt: new Date().toISOString() };
  }

  const key = 'SXY-' + Array.from({length: 4}, () => crypto.randomBytes(2).toString('hex').toUpperCase()).join('-');
  const sessionToken = crypto.randomBytes(32).toString('hex');

  user.plan = plan;
  user.licenseKey = key;
  user.robloxUser = robloxUser;
  user.robloxUserId = robloxUserId;
  user.purchasedAt = new Date().toISOString();

  await redisCommand('SET', 'user:' + emailKey, JSON.stringify(user));
  await redisCommand('SET', 'session:' + sessionToken, emailKey, 'EX', 2592000);
  await redisCommand('SET', 'roblox-used:' + robloxUserId, emailKey);

  return res.status(200).json({ success: true, licenseKey: key, sessionToken, plan });
}
