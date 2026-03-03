function getQueryParams(req) {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const params = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export default async function handler(req, res) {
  try {
    const queryParams = getQueryParams(req);
    const query = queryParams.q || '';
    
    if (!query.trim()) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing query parameter' }));
      return;
    }

    const apiKey = process.env.BGG_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'API key not configured' }));
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
      res.statusCode = response.status;
      res.end(JSON.stringify({ error: 'BGG API error' }));
      return;
    }

    const text = await response.text();
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.statusCode = 200;
    res.end(text);
  } catch (error) {
    console.error('Error proxying BGG search:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}
