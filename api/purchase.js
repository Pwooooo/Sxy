import crypto from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

async function redisCommand(...args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  return data.result;
}

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    return res.ok;
  } catch { return false; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, plan, robloxUser, robloxUserId } = req.body;
  if (!email || !plan || !robloxUser || !robloxUserId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const emailKey = email.toLowerCase().trim();
  const uid = String(robloxUserId);

  const authHeader = req.headers.authorization;
  const sessionToken = authHeader ? authHeader.replace('Bearer ', '') : null;

  const alreadyUsed = await redisCommand('SISMEMBER', 'roblox-used-set', uid);
  if (alreadyUsed) {
    const owner = await redisCommand('GET', 'roblox-used:' + uid);
    if (owner && owner !== emailKey) {
      return res.status(400).json({ error: 'This Roblox account has already been used to claim a key.' });
    }
    if (owner && owner === emailKey) {
      if (!sessionToken) {
        return res.status(401).json({ error: 'Please log in to view your existing key.' });
      }
      const sessionEmail = await redisCommand('GET', 'session:' + sessionToken);
      if (!sessionEmail || sessionEmail !== emailKey) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
      const raw = await redisCommand('GET', 'user:' + emailKey);
      const user = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
      if (user && user.licenseKey) {
        return res.status(200).json({ success: true, licenseKey: user.licenseKey, plan: user.plan || plan });
      }
    }
  }

  const raw = await redisCommand('GET', 'user:' + emailKey);
  let user;
  if (raw) {
    user = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!sessionToken) {
      return res.status(401).json({ error: 'Please log in to make changes to your account.' });
    }
    const sessionEmail = await redisCommand('GET', 'session:' + sessionToken);
    if (!sessionEmail || sessionEmail !== emailKey) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
  } else {
    user = { email: emailKey, username: robloxUser, createdAt: new Date().toISOString() };
  }

  const key = 'SXY-' + Array.from({length: 4}, () => crypto.randomBytes(2).toString('hex').toUpperCase()).join('-');
  const sessionToken = crypto.randomBytes(32).toString('hex');

  user.plan = plan;
  user.licenseKey = key;
  user.robloxUser = robloxUser;
  user.robloxUserId = uid;
  user.purchasedAt = new Date().toISOString();

  await redisCommand('SET', 'user:' + emailKey, JSON.stringify(user));
  await redisCommand('SET', 'session:' + sessionToken, emailKey, 'EX', 2592000);
  await redisCommand('SADD', 'roblox-used-set', uid);
  await redisCommand('SET', 'roblox-used:' + uid, emailKey);

  const planName = plan === 'premium' ? 'SXY Premium' : 'SXY Basic';
  const emailSent = await sendEmail(emailKey, 'Your SXY License Key', `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <h2 style="color:#a855f7;">Welcome to ${planName}</h2>
      <p>Thanks for your purchase, <b>${robloxUser}</b>!</p>
      <div style="background:#1a1a2e;border:1px solid #333;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="color:#888;margin:0 0 4px;font-size:12px;">YOUR LICENSE KEY</p>
        <p style="color:#a855f7;font-size:20px;font-weight:bold;margin:0;letter-spacing:1px;">${key}</p>
      </div>
      <p style="color:#666;font-size:13px;">Use this key on the SXY dashboard to activate your access.</p>
    </div>
  `);

  return res.status(200).json({ success: true, licenseKey: key, sessionToken, plan, emailSent });
}
