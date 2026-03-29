import { parseSearchXml, getQueryParams } from './xml-helpers.js';

export default async function handler(req, res) {
  try {
    const queryParams = getQueryParams(req);
    const query = queryParams.q || '';
    
    if (!query.trim()) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing query parameter' }));
      return;
    }

    // Get API key from request (set by middleware) or fallback to env
    // @ts-expect-error - custom property added by middleware
    const apiKey = req.bggApiKey || process.env.BGG_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
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
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'BGG API error' }));
      return;
    }

    const text = await response.text();
    
    // Parse XML to JSON on the server
    const result = parseSearchXml(text);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.statusCode = 200;
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Error proxying BGG search:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}