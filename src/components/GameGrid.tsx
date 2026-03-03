import { X, Download } from 'lucide-react';
import { Game } from '../types';
import { useImageDetails } from '../hooks/useImageDetails';
import { proxyImageUrl } from '../utils';

async function downloadResizedPng(src: string, name: string) {
  const isDev = import.meta.env.DEV;
  const endpoint = isDev ? '/img/convert' : '/api/convert';
  const url = `${endpoint}?url=${encodeURIComponent(src)}`;
  const res = await fetch(url);
  if (!res.ok) return;
  const blob = await res.blob();
  const a = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  a.href = objectUrl;
  a.download = `${name}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

interface GameGridProps {
  games: Game[];
  removeGame: (id: string) => void;
}

export function GameGrid({ games, removeGame }: GameGridProps) {
  const gameIds = games.map((game) => game.id);
  const imageDetails = useImageDetails(gameIds);

  if (games.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {games.map((game) => (
        <div
          key={game.id}
          className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-200"
        >
          <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
            <img
              src={proxyImageUrl(game.image || game.thumbnail)}
              alt={game.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {game.image && (
              <button
                onClick={() => downloadResizedPng(game.image!, game.name)}
                className="absolute bottom-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors duration-150 group"
                title={
                  imageDetails[game.id]
                    ? `Download PNG 500px max (${imageDetails[game.id].width}x${
                        imageDetails[game.id].height
                      })`
                    : 'Download PNG 500px max'
                }
              >
                <Download className="w-5 h-5 text-gray-700 group-hover:animate-bounce" />
                {imageDetails[game.id] && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {imageDetails[game.id].width}x{imageDetails[game.id].height}
                    {imageDetails[game.id].size &&
                      `, ${imageDetails[game.id].size}`}
                  </div>
                )}
              </button>
            )}
            <button
              onClick={() => removeGame(game.id)}
              className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors duration-150 grid place-content-center backdrop-filter backdrop-blur-sm hover:animate-[spin_1s_ease-in-out]"
              title="Remove game"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">
              <a href={`https://boardgamegeek.com/boardgame/${game.id}`} target="_blank" rel="noopener noreferrer">
                {game.name}
              </a>
            </h3>
          </div>
        </div>
      ))}
    </div>
  );
}
