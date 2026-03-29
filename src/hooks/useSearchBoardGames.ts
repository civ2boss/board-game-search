import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Game } from '../types';
import { proxyImageUrl } from '../utils';

interface SearchItem {
  id: string;
  name: string;
  type: string;
}

interface DetailItem {
  id: string;
  name: string;
  thumbnail: string;
  image: string;
  year_published: string;
  type: string;
  rank: number | null;
}

async function searchGames(query: string): Promise<SearchItem[]> {
  const response = await fetch(`/api/bgg/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error(`Search failed: ${response.status}`);
  const data = await response.json();
  return data.items || [];
}

async function fetchDetails(ids: string[]): Promise<Game[]> {
  if (!ids.length) return [];
  const response = await fetch(`/api/bgg/details?ids=${ids.join(',')}&stats=1`);
  if (!response.ok) throw new Error(`Details failed: ${response.status}`);
  const data = await response.json();
  return (data.items || []).map((item: DetailItem) => ({
    id: String(item.id),
    name: item.name,
    thumbnail: proxyImageUrl(item.thumbnail),
    image: item.image,
    year_published: item.year_published,
    type: item.type,
    rank: item.rank,
  }));
}

// BGG rejects >20 IDs per request
const MAX_DETAILS = 20;

export function useSearchBoardGames(query: string) {
  const searchQuery = useQuery({
    queryKey: ['search', query],
    queryFn: () => searchGames(query),
    enabled: query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Memoize the sliced ID list so the reference is stable across renders
  const ids = useMemo(() => {
    const allIds = searchQuery.data?.map(item => item.id) || [];
    return allIds.slice(0, MAX_DETAILS);
  }, [searchQuery.data]);

  // Use joined string as stable query key — avoids new array reference every render
  const idsKey = ids.join(',');

  const detailsQuery = useQuery({
    queryKey: ['details', idsKey],
    queryFn: () => fetchDetails(ids),
    enabled: idsKey.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry 400 errors
  });

  return {
    results: detailsQuery.data || [],
    allIds: searchQuery.data?.map(item => item.id) || [],
    isLoading: searchQuery.isLoading || detailsQuery.isLoading,
    isFetching: searchQuery.isFetching || detailsQuery.isFetching,
    error: searchQuery.error || detailsQuery.error,
  };
}
