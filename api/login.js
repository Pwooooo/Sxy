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

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === verify;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const emailKey = email.toLowerCase().trim();

  const raw = await redisCommand('GET', 'user:' + emailKey);
  if (!raw) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = typeof raw === 'string' ? JSON.parse(raw) : raw;

  if (!verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  await redisCommand('SET', 'session:' + token, emailKey);
  await redisCommand('EXPIRE', 'session:' + token, 60 * 60 * 24 * 30);

  return res.status(200).json({
    success: true,
    token,
    user: { email: user.email, username: user.username, plan: user.plan, licenseKey: user.licenseKey }
  });
}
