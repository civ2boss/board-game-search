export interface Game {
  id: string;
  name: string;
  image: string;
  thumbnail: string;
  year_published: string;
  type: string;
  rank: number | null;
}

// API response interfaces
export interface GameResponse {
  id: string;
  name: string;
  thumbnail: string;
  image: string;
  year_published: string;
  type: string;
  rank: number | null;
  image_size: number | null;
}

export interface SearchResponse {
  items: Array<{ id: string; name: string; type: string }>;
}

export interface DetailsResponse {
  items: GameResponse[];
}
