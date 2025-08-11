import { useState, useEffect, useMemo } from 'react';
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

  // Memoize the gameIds array to prevent unnecessary re-renders
  const memoizedGameIds = useMemo(() => gameIds.sort().join(','), [gameIds]);

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

      fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${uncachedIds.join(',')}`)
        .then(response => response.text())
        .then(text => {
          if (!isMounted) return;

          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, 'text/xml');
          const items = xmlDoc.getElementsByTagName('item');

          const newDetails: Record<string, ImageDetails> = { ...initialDetails };
          const promises: Promise<void>[] = [];

          Array.from(items).forEach(item => {
            const id = item.getAttribute('id');
            const imageElement = item.querySelector('image');
            const imageUrl = imageElement?.textContent;
            const size = imageElement?.getAttribute('size');

            if (id && imageUrl) {
              promises.push(
                new Promise<void>((resolve) => {
                  const img = new Image();
                  img.onload = () => {
                    if (!isMounted) return;

                    const details: ImageDetails = {
                      width: img.width,
                      height: img.height,
                      size: size ? `${(parseInt(size) / (1024 * 1024)).toFixed(2)}MB` : undefined,
                    };
                    
                    imageDetailsCache.set(id, details);
                    newDetails[id] = details;
                    resolve();
                  };
                  img.onerror = () => resolve();
                  img.src = proxyImageUrl(imageUrl);
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
  }, [memoizedGameIds]); // Only depend on the memoized string

  return details;
}