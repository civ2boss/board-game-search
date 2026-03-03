export default async function handler(req, res) {
  try {
    const query = req.query?.q || '';
    if (!query.trim()) {
      res.status(400).json({ error: 'Missing query parameter' });
      return;
    }

    const apiKey = process.env.BGG_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'API key not configured' });
      return;
    }

    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(
        query
      )}&type=boardgame`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    if (!response.ok) {
      res.status(response.status).json({ error: 'BGG API error' });
      return;
    }

    const text = await response.text();
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(text);
  } catch (error) {
    console.error('Error proxying BGG search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
