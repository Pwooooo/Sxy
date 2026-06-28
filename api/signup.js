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

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Email, password, and username are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const emailKey = email.toLowerCase().trim();

  const existing = await redisCommand('GET', 'user:' + emailKey);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const user = {
    email: emailKey,
    username: username.trim(),
    password: hashPassword(password),
    plan: null,
    licenseKey: null,
    createdAt: new Date().toISOString()
  };

  await redisCommand('SET', 'user:' + emailKey, JSON.stringify(user));

  const token = crypto.randomBytes(32).toString('hex');
  await redisCommand('SET', 'session:' + token, emailKey);
  await redisCommand('EXPIRE', 'session:' + token, 60 * 60 * 24 * 30);

  return res.status(200).json({
    success: true,
    token,
    user: { email: user.email, username: user.username, plan: user.plan, licenseKey: user.licenseKey }
  });
}
