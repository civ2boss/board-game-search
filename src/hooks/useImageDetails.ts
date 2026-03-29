import { useState, useEffect } from 'react';
import { proxyImageUrl } from '../utils';

interface ImageDetails {
  width: number;
  height: number;
  size?: string;
}

// Cache for storing image details
const imageDetailsCache = new Map<string, ImageDetails>();

export function useImageDetails(gameIds: string[]) {
  const [details, setDetails] = useState<Record<string, ImageDetails>>({});

  const gameIdsString = gameIds.sort().join(',');

  useEffect(() => {
    // Initialize with cached values first
    const initialDetails: Record<string, ImageDetails> = {};
    const uncachedIds: string[] = [];

    gameIds.forEach(id => {
      const cached = imageDetailsCache.get(id);
      if (cached) {
        initialDetails[id] = cached;
      } else {
        uncachedIds.push(id);
      }
    });

    // Set initial state with cached values
    if (Object.keys(initialDetails).length > 0) {
      setDetails(initialDetails);
    }

    // Only fetch if there are uncached IDs
    if (uncachedIds.length > 0) {
      let isMounted = true;

      fetch(`/api/bgg/details?ids=${uncachedIds.join(',')}`)
        .then(response => response.json())
        .then(data => {
          if (!isMounted) return;

          const newDetails: Record<string, ImageDetails> = { ...initialDetails };
          const promises: Promise<void>[] = [];

          (data.items || []).forEach((item: { id: string; image: string; image_size: number | null }) => {
            if (item.id && item.image) {
              promises.push(
                new Promise<void>((resolve) => {
                  const img = new Image();
                  img.onload = () => {
                    if (!isMounted) return;

                    const details: ImageDetails = {
                      width: img.width,
                      height: img.height,
                      size: item.image_size ? `${(item.image_size / (1024 * 1024)).toFixed(2)}MB` : undefined,
                    };
                    
                    imageDetailsCache.set(item.id, details);
                    newDetails[item.id] = details;
                    resolve();
                  };
                  img.onerror = () => resolve();
                  img.src = proxyImageUrl(item.image);
                })
              );
            }
          });

          Promise.all(promises).then(() => {
            if (isMounted) {
              setDetails(newDetails);
            }
          });
        })
        .catch(error => {
          console.error('Error fetching game details:', error);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [gameIdsString, gameIds]);

  return details;
}
