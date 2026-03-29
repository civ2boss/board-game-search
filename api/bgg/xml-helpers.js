import { XMLParser } from 'fast-xml-parser';

/**
 * Shared XML parsing utilities for BGG API responses.
 * Provides functions to transform XML responses into clean JSON.
 */

// Create parser with options optimized for BGG's XML structure
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'value',
  parseAttributeValue: true,
  trimValues: true,
};

const xmlParser = new XMLParser(parserOptions);

/**
 * Parse BGG search XML response into a clean JSON structure.
 * @param {string} xml - Raw XML string from BGG search API
 * @returns {{ items: Array<{ id: string, name: string, type: string }> }}
 */
export function parseSearchXml(xml) {
  const parsed = xmlParser.parse(xml);
  const items = parsed?.items?.item || [];
  
  // Normalize to array
  const itemArray = Array.isArray(items) ? items : items ? [items] : [];
  
  return {
    items: itemArray.map((item) => ({
      id: item.id || '',
      name: item.name?.value || '',
      type: item.type || '',
    })),
  };
}

/**
 * Parse BGG details XML response into a clean JSON structure.
 * @param {string} xml - Raw XML string from BGG thing API
 * @returns {{ items: Array<{ id: string, name: string, thumbnail: string, image: string, year_published: string, type: string, rank: number|null, image_size: number|null }> }}
 */
export function parseDetailsXml(xml) {
  const parsed = xmlParser.parse(xml);
  const items = parsed?.items?.item || [];
  
  // Normalize to array
  const itemArray = Array.isArray(items) ? items : items ? [items] : [];
  
  return {
    items: itemArray.map((item) => {
      // Extract rank from statistics > ratings > rank
      // Note: fast-xml-parser parses statistics/ratings as objects, not arrays
      let rank = null;
      const ratings = item.statistics?.ratings;
      if (ratings) {
        const ranks = ratings.rank || [];
        const rankArray = Array.isArray(ranks) ? ranks : ranks ? [ranks] : [];
        for (const r of rankArray) {
          if (r.name === 'boardgame') {
            const value = r.value;
            if (value && value !== '0' && value !== 'Not Ranked') {
              const parsedRank = parseInt(String(value), 10);
              if (!isNaN(parsedRank)) {
                rank = parsedRank;
              }
            }
            break;
          }
        }
      }
      
      // Extract image size from the image element
      let imageSize = null;
      const imageEl = item.image;
      if (imageEl) {
        const attrs = imageEl['@_size'] || imageEl.size;
        if (attrs) {
          imageSize = parseInt(attrs, 10);
        }
      }
      
      // Handle thumbnail - may be object with value or direct string
      let thumbnail = '';
      if (item.thumbnail) {
        thumbnail = typeof item.thumbnail === 'string' ? item.thumbnail : item.thumbnail.value || '';
      }
      
      // Handle image - may be object with value or direct string
      let image = '';
      if (item.image) {
        image = typeof item.image === 'string' ? item.image : item.image.value || '';
      }
      
      return {
        id: item.id || '',
        name: item.name?.[0]?.value || item.name?.value || item.name || '',
        thumbnail,
        image,
        year_published: item.yearpublished?.value || item.yearpublished || '',
        type: item.type || '',
        rank,
        image_size: imageSize,
      };
    }),
  };
}

/**
 * Helper to get query params from Vercel/Node request object.
 * @param {object} req - Request object
 * @returns {object} Parsed query parameters
 */
export function getQueryParams(req) {
  const url = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
  const params = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}