/**
 * Types for BGG XML responses parsed by fast-xml-parser.
 *
 * With parser options { ignoreAttributes: false, attributeNamePrefix: '', textNodeName: 'value', parseAttributeValue: true }:
 * - XML attributes become object properties (e.g. id="123" → { id: 123 })
 * - Text content becomes { value: "text" } when an element has both text and attributes
 * - Statistics/ratings are objects (NOT arrays) — only rank is an array when multiple exist
 */

// BGG search XML item: <item type="boardgame" id="123"><name type="primary" value="Game Name"/></item>
export interface BggSearchItem {
  id: number | string;
  type: string;
  name: BggAttribute;
}

// BGG details XML item with full fields
export interface BggDetailsItem {
  id: number | string;
  type: string;
  name: BggAttribute | BggAttribute[];
  thumbnail?: string | BggAttribute;
  image?: string | BggImageElement;
  yearpublished?: BggAttribute;
  statistics?: BggStatistics;
}

// Element with a "value" attribute (e.g. <name type="primary" value="Catan"/>)
interface BggAttribute {
  type?: string;
  value: string;
}

// Image element with optional size attribute: <image size="small">url</image>
// Parsed as { value: "url", size: "small" } due to textNodeName: 'value'
interface BggImageElement {
  value: string;
  size?: string | number;
}

// <statistics page="1"><ratings>...</ratings></statistics>
// These are objects, NOT arrays
interface BggStatistics {
  ratings: BggRatings;
}

// <ratings><ranks><rank ... value="42"/><rank ... value="30"/></ranks></ratings>
// "ranks" wraps the rank array
interface BggRatings {
  ranks: { rank: BggRank | BggRank[] };
}

// <rank type="subtype" id="1" name="boardgame" friendlyname="Board Game Rank" value="42"/>
interface BggRank {
  type: string;
  id: number;
  name: string;
  friendlyname: string;
  value: string | number;
}

// Parsed response containers — the <items> wrapper has item[] children plus attributes
interface BggSearchResponse {
  items: { item: BggSearchItem | BggSearchItem[]; total?: number; termsofuse?: string };
}

interface BggDetailsResponse {
  items: { item: BggDetailsItem | BggDetailsItem[]; termsofuse?: string };
}

// Output types
export interface SearchResult {
  id: string;
  name: string;
  type: string;
}

export interface DetailsResult {
  id: string;
  name: string;
  thumbnail: string;
  image: string;
  year_published: string;
  type: string;
  rank: number | null;
  image_size: number | null;
}

import { XMLParser } from 'fast-xml-parser';

// Parser configured for BGG's XML structure
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'value',
  parseAttributeValue: true,
  trimValues: true,
});

/** Ensure a value is an array; wrap single items. */
function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/**
 * Parse BGG search XML → clean JSON.
 * BGG search returns: <items><item id="123" type="boardgame"><name value="Game"/></item>...</items>
 */
export function parseSearchXml(xml: string): { items: SearchResult[] } {
  const parsed = xmlParser.parse(xml) as BggSearchResponse;
  // parsed.items is the <items> wrapper; .item is the actual array
  const items = toArray(parsed.items?.item);

  return {
    items: items.map((item) => ({
      id: String(item.id ?? ''),
      name: item.name?.value ?? '',
      type: item.type ?? '',
    })),
  };
}

/**
 * Parse BGG details XML → clean JSON.
 * BGG thing returns: <items><item id="123" type="boardgame">...</item>...</items>
 */
export function parseDetailsXml(xml: string): { items: DetailsResult[] } {
  const parsed = xmlParser.parse(xml) as BggDetailsResponse;
  // parsed.items is the <items> wrapper; .item is the actual array
  const items = toArray(parsed.items?.item);

  return {
    items: items.map((item) => {
      // Extract rank: statistics.ratings.ranks.rank is an array of BggRank
      // We need the one where name === 'boardgame'
      let rank: number | null = null;
      const rankEntries = toArray(item.statistics?.ratings?.ranks?.rank);
      for (const r of rankEntries) {
        if (r.name === 'boardgame') {
          const value = String(r.value);
          if (value && value !== '0' && value !== 'Not Ranked') {
            const parsedRank = parseInt(value, 10);
            if (!isNaN(parsedRank)) {
              rank = parsedRank;
            }
          }
          break;
        }
      }

      // Extract image size (attribute on <image size="12345">url</image>)
      let imageSize: number | null = null;
      if (item.image && typeof item.image === 'object' && 'size' in item.image) {
        const sizeVal = item.image.size;
        if (sizeVal != null) {
          imageSize = typeof sizeVal === 'number' ? sizeVal : parseInt(String(sizeVal), 10);
        }
      }

      // Thumbnail: plain string or object with value
      const thumbnail =
        typeof item.thumbnail === 'string'
          ? item.thumbnail
          : item.thumbnail?.value ?? '';

      // Image URL: plain string or object with value
      const image =
        typeof item.image === 'string'
          ? item.image
          : item.image?.value ?? '';

      // Name: may be array (primary + alternates) or single object
      const nameEntry = Array.isArray(item.name) ? item.name[0] : item.name;

      return {
        id: String(item.id ?? ''),
        name: nameEntry?.value ?? '',
        thumbnail,
        image,
        year_published: String(item.yearpublished?.value ?? ''),
        type: item.type ?? '',
        rank,
        image_size: imageSize,
      };
    }),
  };
}

/**
 * Extract query params from a Node.js/Vercel request object.
 */
export function getQueryParams(req: {
  url?: string;
  headers?: { host?: string };
}): Record<string, string> {
  const url = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}
