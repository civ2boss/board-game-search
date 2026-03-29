import { parseDetailsXml, getQueryParams } from './xml-helpers.js';

export default async function handler(req, res) {
  try {
    const queryParams = getQueryParams(req);
    const ids = queryParams.ids || '';
    
    if (!ids.trim()) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing ids parameter' }));
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

    const stats = queryParams.stats === '1' ? '&stats=1' : '';

    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/thing?id=${ids}${stats}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`BGG API error ${response.status}:`, errorText.slice(0, 500));
      res.statusCode = response.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'BGG API error', status: response.status, details: errorText.slice(0, 200) }));
      return;
    }

    const text = await response.text();
    
    // Parse XML to JSON on the server
    const result = parseDetailsXml(text);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.statusCode = 200;
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Error proxying BGG details:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}