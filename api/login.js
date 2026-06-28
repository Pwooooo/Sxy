import { kv } from '@vercel/kv';
import crypto from 'crypto';

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

  const raw = await kv.get('user:' + emailKey);
  if (!raw) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = typeof raw === 'string' ? JSON.parse(raw) : raw;

  if (!verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  await kv.set('session:' + token, emailKey, { ex: 60 * 60 * 24 * 30 });

  return res.status(200).json({
    success: true,
    token,
    user: { email: user.email, username: user.username, plan: user.plan, licenseKey: user.licenseKey }
  });
}
