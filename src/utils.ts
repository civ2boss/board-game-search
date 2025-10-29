import type { SearchResult } from './App';

export function debounce<TArgs extends unknown[]>(
  func: (...args: TArgs) => unknown,
  wait: number
): (...args: TArgs) => void {
  let timeout: NodeJS.Timeout;

  return (...args: TArgs) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Helper function to convert BGG image URLs to use our proxy
export function proxyImageUrl(url: string): string {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'cf.geekdo-images.com') {
      return `${urlObj.pathname}${urlObj.search}`;
    } else {
      return `https://cf.geekdo-images.com/${url}`;
    }
  } catch {
    return url;
  }
}

export async function fetchGameDetails(
  gameIds: string[],
  signal?: AbortSignal
): Promise<SearchResult[]> {
  if (!gameIds.length) return [];

  try {
    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/thing?id=${gameIds.join(',')}&stats=1`,
      { signal, headers: { 'Authorization': `Bearer ${import.meta.env.VITE_BGG_API_KEY}` } }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');

    const items = doc.getElementsByTagName('item');
    return Array.from(items).map((item) => ({
      id: item.getAttribute('id') || '',
      name: item.getElementsByTagName('name')[0]?.getAttribute('value') || '',
      thumbnail: proxyImageUrl(
        item.getElementsByTagName('thumbnail')[0]?.textContent || ''
      ),
      image: item.getElementsByTagName('image')[0]?.textContent || '',
      year_published:
        item.getElementsByTagName('yearpublished')[0]?.getAttribute('value') ||
        '',
      type: item.getAttribute('type') || '',
    }));
  } catch (error) {
    console.error('Error fetching game details:', error);
    return [];
  }
}

export async function searchBoardGames(query: string, signal?: AbortSignal) {
  try {
    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(
        query
      )}&type=boardgame`,
      { signal, headers: { 'Authorization': `Bearer ${import.meta.env.VITE_BGG_API_KEY}` } }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    return Array.from(doc.getElementsByTagName('item'));
  } catch (error) {
    console.error('Error searching board games:', error);
    return [];
  }
}
