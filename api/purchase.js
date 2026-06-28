import { kv } from '@vercel/kv';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, plan, robloxUser, robloxUserId } = req.body;

  if (!email || !plan || !robloxUser || !robloxUserId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const emailKey = email.toLowerCase().trim();
  const raw = await kv.get('user:' + emailKey);

  if (!raw) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = typeof raw === 'string' ? JSON.parse(raw) : raw;

  const key = 'SXY-' + Array.from({length: 4}, () => crypto.randomBytes(2).toString('hex').toUpperCase()).join('-');

  user.plan = plan;
  user.licenseKey = key;
  user.robloxUser = robloxUser;
  user.robloxUserId = robloxUserId;
  user.purchasedAt = new Date().toISOString();

  await kv.set('user:' + emailKey, JSON.stringify(user));

  return res.status(200).json({
    success: true,
    licenseKey: key,
    plan
  });
}
