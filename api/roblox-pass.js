export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, gamepassId } = req.body;
  if (!userId || !gamepassId) {
    return res.status(400).json({ error: 'userId and gamepassId are required' });
  }

  try {
    const robloxRes = await fetch(
      `https://apis.roblox.com/game-passes/v1/users/${userId}/game-passes?count=100`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (robloxRes.ok) {
      const data = await robloxRes.json();
      if (data.gamePasses && Array.isArray(data.gamePasses)) {
        const owned = data.gamePasses.some(p => String(p.id) === String(gamepassId));
        return res.status(200).json({ owned });
      }
      return res.status(200).json({ owned: null, message: 'Unexpected response' });
    }

    return res.status(200).json({ owned: null, message: 'Could not verify' });
  } catch (e) {
    return res.status(200).json({ owned: null, message: 'Could not verify' });
  }
}
