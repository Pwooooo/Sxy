import crypto from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'sxy-admin-2026';

async function redisCommand(...args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  return (await res.json()).result;
}

export default async function handler(req, res) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const token = auth.replace('Bearer ', '');
  const email = await redisCommand('GET', 'session:' + token);
  if (!email) return res.status(401).json({ error: 'Invalid session' });

  const raw = await redisCommand('GET', 'user:' + email);
  const user = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
  if (!user || !user.admin) return res.status(403).json({ error: 'Not admin' });

  if (req.method === 'GET') {
    let cursor = '0';
    const users = [];
    do {
      const [nextCursor, keys] = await redisCommand('SCAN', cursor, 'MATCH', 'user:*', 'COUNT', 100);
      cursor = nextCursor;
      if (keys) {
        for (const k of keys) {
          const r = await redisCommand('GET', k);
          if (r) {
            const u = typeof r === 'string' ? JSON.parse(r) : r;
            users.push({ email: k.replace('user:', ''), ...u });
          }
        }
      }
    } while (cursor !== '0');

    const robloxIds = await redisCommand('SMEMBERS', 'roblox-used-set');

    return res.status(200).json({ users, robloxUsedIds: robloxIds || [] });
  }

  if (req.method === 'DELETE') {
    const { targetEmail, targetUserId } = req.body;

    if (targetEmail) {
      const u = await redisCommand('GET', 'user:' + targetEmail);
      if (u) {
        const parsed = typeof u === 'string' ? JSON.parse(u) : u;
        if (parsed.robloxUserId) {
          await redisCommand('SREM', 'roblox-used-set', String(parsed.robloxUserId));
          await redisCommand('DEL', 'roblox-used:' + parsed.robloxUserId);
        }
      }
      await redisCommand('DEL', 'user:' + targetEmail);
      return res.status(200).json({ success: true, message: 'User deleted' });
    }

    if (targetUserId) {
      await redisCommand('SREM', 'roblox-used-set', String(targetUserId));
      await redisCommand('DEL', 'roblox-used:' + targetUserId);
      return res.status(200).json({ success: true, message: 'Roblox ID unblocked' });
    }

    return res.status(400).json({ error: 'targetEmail or targetUserId required' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
