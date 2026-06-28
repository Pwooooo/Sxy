export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, gamepassId } = req.body;
  if (!userId || !gamepassId) return res.status(400).json({ error: 'userId and gamepassId required' });

  try {
    const r = await fetch(
      `https://inventory.roblox.com/v1/users/${userId}/items/GamePass/${gamepassId}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!r.ok) return res.status(200).json({ owned: null });
    const d = await r.json();
    return res.status(200).json({ owned: d.data && d.data.length > 0 });
  } catch {
    return res.status(200).json({ owned: null });
  }
}
