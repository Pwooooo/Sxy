export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, gamepassId } = req.body;
  if (!userId || !gamepassId) {
    return res.status(400).json({ error: 'userId and gamepassId are required' });
  }

  try {
    const robloxRes = await fetch(`https://inventory.roblox.com/v1/users/${userId}/items/Pass/${gamepassId}`);
    const data = await robloxRes.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to verify gamepass' });
  }
}
