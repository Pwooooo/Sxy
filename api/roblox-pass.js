export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, gamepassId } = req.body;
  if (!userId || !gamepassId) {
    return res.status(400).json({ error: 'userId and gamepassId are required' });
  }

  try {
    const robloxRes = await fetch(`https://inventory.roblox.com/v1/users/${userId}/items/Pass/${gamepassId}?limit=10`);

    if (robloxRes.ok) {
      const data = await robloxRes.json();
      if (data.data && data.data.length > 0) {
        return res.status(200).json({ owned: true });
      }
      return res.status(200).json({ owned: false });
    }

    return res.status(200).json({ owned: null, message: 'Could not verify — inventory may be private' });
  } catch (e) {
    return res.status(200).json({ owned: null, message: 'Could not verify automatically' });
  }
}
