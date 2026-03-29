import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { useScrollDepth } from '@/hooks/useScrollDepth';
import { Loader2 } from 'lucide-react';
import { SearchBar } from './components/SearchBar';
import { GameGrid } from './components/GameGrid';
import { Game } from './types';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  useScrollDepth();

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
      // Fetch game details via API (now returns JSON)
      const response = await fetch(`/api/bgg/details?ids=${gameId}&stats=1`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const newGame: Game = {
          id: item.id,
          name: item.name,
          thumbnail: item.thumbnail,
          year_published: item.year_published,
          type: item.type,
          image: item.image,
          rank: item.rank ?? null,
        };
        setGames((prev) => [...prev, newGame]);
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
              Board Game Art Search
            </h1>
            <p className="text-gray-600">
              Search for your board game art and download it as a PNG.
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
