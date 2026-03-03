import type { SearchResult } from './App';

export function debounce<TArgs extends unknown[]>(
  func: (...args: TArgs) => unknown,
  wait: number
): (...args: TArgs) => void {
  let timeout: NodeJS.Timeout;

  return (...args) => {
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
      return `/img/api${urlObj.pathname}${urlObj.search}`;
    } else {
      return `/img/api/${url}`;
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
      `/api/bgg/details?ids=${gameIds.join(',')}&stats=1`,
      { signal }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');

    const items = doc.getElementsByTagName('item');
    return Array.from(items).map((item) => {
      let rank: number | null = null;
      const stats = item.getElementsByTagName('statistics')[0];
      if (stats) {
        const ratings = stats.getElementsByTagName('ratings')[0];
        if (ratings) {
          const ranks = ratings.getElementsByTagName('rank');
          for (let i = 0; i < ranks.length; i++) {
            const rankEl = ranks[i];
            if (rankEl.getAttribute('name') === 'boardgame') {
              const value = rankEl.getAttribute('value');
              if (value && value !== '0' && value !== 'Not Ranked') {
                rank = parseInt(value, 10);
                if (isNaN(rank)) {
                  rank = null;
                }
              }
              break;
            }
          }
        }
      }

      return {
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
        rank,
      };
    });
  } catch (error) {
    console.error('Error fetching game details:', error);
    return [];
  }
}

export async function searchBoardGames(query: string, signal?: AbortSignal) {
  try {
    const response = await fetch(
      `/api/bgg/search?q=${encodeURIComponent(query)}`,
      { signal }
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
