import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ArrowUp } from 'lucide-react';
import { usePostHog } from 'posthog-js/react';
import { useSearchBoardGames } from '../hooks/useSearchBoardGames';
import { useDebounce } from '../hooks/useDebounce';
import type { Game } from '../types';

interface SearchBarProps {
  onGameSelect: (gameId: string) => void;
}

export function SearchBar({ onGameSelect }: SearchBarProps) {
  const posthog = usePostHog();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'relevance' | 'rank'>('rank');
  const searchRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 20;

  const debouncedQuery = useDebounce(query, 300);
  const { results: allResults, allIds, isLoading, isFetching } = useSearchBoardGames(debouncedQuery);

  // Paginated display of results
  const displayedResults = useMemo(() => {
    return allResults.slice(0, page * itemsPerPage);
  }, [allResults, page]);

  const sortedResults = useMemo(() => {
    if (sortBy === 'rank') {
      return [...displayedResults].sort((a, b) => {
        if (a.rank === null && b.rank === null) return 0;
        if (a.rank === null) return 1;
        if (b.rank === null) return -1;
        return a.rank - b.rank;
      });
    }
    return displayedResults;
  }, [displayedResults, sortBy]);

  // Track search analytics when results change
  useEffect(() => {
    if (debouncedQuery.trim() && allIds.length > 0 && !isLoading) {
      posthog?.capture('boardgame_searched', {
        query: debouncedQuery,
        results_count: allIds.length,
      });
    }
  }, [debouncedQuery, allIds.length, isLoading, posthog]);

  // Reset page when query changes
  useEffect(() => {
    setPage(1);
    setShowResults(true);
  }, [debouncedQuery]);

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

  const handleScroll = () => {
    if (!dropdownRef.current || isLoading || isFetching) return;

    const { scrollTop, scrollHeight, clientHeight } = dropdownRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      loadMoreResults();
    }
  };

  const loadMoreResults = () => {
    if (!allIds.length || displayedResults.length >= allResults.length) return;
    setPage((p) => p + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowResults(true);
  };

  const handleSelectGame = (result: Game) => {
    setQuery(result.name);
    setShowResults(false);
    onGameSelect(result.id);
    posthog?.capture('boardgame_selected', {
      game_id: result.id,
      game_name: result.name,
      year_published: result.year_published,
    });
  };

  const handleFocus = () => {
    if (displayedResults.length > 0 || isLoading || isFetching) {
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

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={() => setSortBy('relevance')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            sortBy === 'relevance'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Relevance
        </button>
        <button
          type="button"
          onClick={() => setSortBy('rank')}
          className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1 ${
            sortBy === 'rank'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Rank
          <ArrowUp className="w-3 h-3" />
        </button>
      </div>

      {showResults && (displayedResults.length > 0 || isLoading || isFetching) && (
        <div
          ref={dropdownRef}
          onScroll={handleScroll}
          className="absolute w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[400px] overflow-y-auto"
        >
          {sortedResults.map((result) => (
            <button
              type="button"
              key={result.id}
              onClick={() => handleSelectGame(result)}
              className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors duration-150 border-b last:border-b-0 flex items-center gap-4"
            >
              {result.thumbnail && (
                <img
                  src={result.thumbnail}
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
          {(isLoading || isFetching) && (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          )}
        </div>
      )}
    </div>
  );
}
