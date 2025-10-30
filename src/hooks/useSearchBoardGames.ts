import { useQuery } from '@tanstack/react-query';
import type { SearchResult } from '../App';

export function useSearchBoardGames(query: string) {
  return useQuery<SearchResult[]>({
    queryKey: ['searchBoardGames', query],
    queryFn: async () => {
      if (!query.trim()) return [];

      try {
        const response = await fetch(
          `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(
            query
          )}&type=boardgame`,
          {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_BGG_API_KEY}`
            }
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/xml');

        return Array.from(doc.getElementsByTagName('item')).map((item) => ({
          id: item.getAttribute('id') || '',
          name:
            item.getElementsByTagName('name')[0]?.getAttribute('value') || '',
          thumbnail:
            item.getElementsByTagName('thumbnail')[0]?.textContent || '',
          image: item.getElementsByTagName('image')[0]?.textContent || '',
          year_published:
            item
              .getElementsByTagName('yearpublished')[0]
              ?.getAttribute('value') || '',
          type: item.getAttribute('type') || '',
        }));
      } catch (error) {
        console.error('Error searching board games:', error);
        return [];
      }
    },
    staleTime: 0, // Adjust based on your requirements
  });
}
