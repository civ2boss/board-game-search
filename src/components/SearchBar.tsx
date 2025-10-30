import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { debounce, fetchGameDetails, searchBoardGames } from '../utils';
import type { SearchResult } from '../App';

interface SearchBarProps {
  onGameSelect: (gameId: string) => void;
}

export function SearchBar({ onGameSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [page, setPage] = useState(1);
  const [allIds, setAllIds] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 5;
  
  // Add a ref to track the current search request
  const currentSearchId = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const detailsCacheRef = useRef<Map<string, SearchResult>>(new Map());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add unmount cleanup to abort any in-flight request
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleScroll = () => {
    if (!dropdownRef.current || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = dropdownRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      loadMoreResults();
    }
  };

  const loadMoreResults = async () => {
    if (!allIds.length || isLoading) return;

    const nextIds = allIds.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    if (nextIds.length === 0) return;

    const toFetch = nextIds.filter((id) => !detailsCacheRef.current.has(id));

    setIsLoading(true);
    try {
      if (toFetch.length) {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        const fetched = await fetchGameDetails(toFetch, abortRef.current.signal);
        fetched.forEach((r) => detailsCacheRef.current.set(r.id, r));
      }

      const newResults = nextIds
        .map((id) => detailsCacheRef.current.get(id))
        .filter((r): r is SearchResult => !!r);

      if (newResults.length > 0) {
        setResults((prev) => [...prev, ...newResults]);
        setPage((p) => p + 1);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error loading more results:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const searchGames = useMemo(() => debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setAllIds([]);
        return;
      }

      const searchId = ++currentSearchId.current;

      // Cancel previous in-flight work
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      try {
        const items = await searchBoardGames(searchQuery, abortRef.current.signal);
        if (searchId !== currentSearchId.current) return;

        const ids = items
          .map((item) => item.getAttribute('id'))
          .filter((id): id is string => !!id);

        setAllIds(ids);

        const firstPageIds = ids.slice(0, itemsPerPage);
        const toFetch = firstPageIds.filter((id) => !detailsCacheRef.current.has(id));

        if (toFetch.length) {
          const fetched = await fetchGameDetails(toFetch, abortRef.current.signal);
          if (searchId !== currentSearchId.current) return;
          fetched.forEach((r) => detailsCacheRef.current.set(r.id, r));
        }

        const firstResults = firstPageIds
          .map((id) => detailsCacheRef.current.get(id))
          .filter((r): r is SearchResult => !!r);

        setResults(firstResults);
        setPage(1);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (searchId === currentSearchId.current) {
          console.error('Error searching games:', error);
          setResults([]);
          setAllIds([]);
        }
      } finally {
        if (searchId === currentSearchId.current) {
          setIsLoading(false);
        }
      }
    }, 300), []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowResults(true);
    searchGames(value);
  };

  const handleSelectGame = (result: SearchResult) => {
    setQuery(result.name);
    setShowResults(false);
    onGameSelect(result.id);
  };

  const handleFocus = () => {
    if (results.length > 0 || isLoading) {
      setShowResults(true);
    }
  };

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="Search for board games..."
          className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
        />
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      </div>

      {showResults && (results.length > 0 || isLoading) && (
        <div
          ref={dropdownRef}
          onScroll={handleScroll}
          className="absolute w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[400px] overflow-y-auto"
        >
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelectGame(result)}
              className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors duration-150 border-b last:border-b-0 flex items-center gap-4"
            >
              {result.thumbnail && (
                <img
                  src={result.thumbnail.startsWith('http') ? result.thumbnail : `https://cf.geekdo-images.com${result.thumbnail}`}
                  alt={result.name}
                  className="w-16 h-16 object-cover rounded-md"
                  loading="lazy"
                />
              )}
              <span className="flex-1">{result.name}</span>
              {result.type === 'boardgameexpansion' ? (
                <span className="bg-red-500 p-1.5 rounded-full">Expansion</span>
              ) : null}
              <span>{result.year_published}</span>
            </button>
          ))}
          {isLoading && (
            <div className="p-4 text-center text-gray-500">Loading more...</div>
          )}
        </div>
      )}
    </div>
  );
}
