export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const robloxRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username] })
    });
    const data = await robloxRes.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to check username' });
  }
}
