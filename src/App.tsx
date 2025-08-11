"use compiler";

import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { SearchBar } from './components/SearchBar';
import { GameGrid } from './components/GameGrid';
import { Game } from './types';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { fetchGameDetails } from './utils';

// Define or import the SearchResult type
export interface SearchResult {
  id: string;
  name: string;
  thumbnail: string;
  image: string;
  year_published: string;
  type: string;
}

const queryClient = new QueryClient();

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGameSelect = async (gameId: string) => {
    // Check if the game is already in the games array
    const isGameAlreadySelected = games.some((game) => game.id === gameId);
    if (isGameAlreadySelected) {
      toast({
        title: 'Game Already Selected',
        description: 'The selected game is already in your list.',
      });
      return; // Exit if the game is already selected
    }

    setIsLoading(true);

    try {
      // Use fetchGameDetails to get the game details
      const newResults: SearchResult[] = await fetchGameDetails([gameId]);
      if (newResults.length > 0) {
        // Map SearchResult to Game type
        const newGames = newResults.map((result: SearchResult) => ({
          id: result.id,
          name: result.name,
          thumbnail: result.thumbnail,
          year_published: result.year_published,
          type: result.type,
          image: result.image,
        }));

        setGames((prev) => [...prev, ...newGames]);
      }
    } catch (error) {
      console.error('Error fetching game details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeGame = (id: string) => {
    setGames((prevGames) => prevGames.filter((game) => game.id !== id));
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-indigo-900 mb-4">
              Board Game Explorer
            </h1>
            <p className="text-gray-600">
              Search and discover your next favorite board game
            </p>
          </div>

          <div className="max-w-2xl mx-auto mb-12">
            <SearchBar onGameSelect={handleGameSelect} />
          </div>

          {isLoading && (
            <div className="flex justify-center mb-8">
              <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
            </div>
          )}

          <GameGrid games={games} removeGame={removeGame} />
        </div>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
