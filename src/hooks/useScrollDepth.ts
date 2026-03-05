import { useEffect, useRef } from 'react';
import { usePostHog } from 'posthog-js/react';

const SCROLL_DEPTH_THRESHOLDS = [0.25, 0.5, 0.75, 1];

export function useScrollDepth() {
  const posthog = usePostHog();
  const capturedDepths = useRef<Set<number>>(new Set());

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollDepth = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

      SCROLL_DEPTH_THRESHOLDS.forEach((threshold) => {
        if (
          scrollDepth >= threshold &&
          !capturedDepths.current.has(threshold)
        ) {
          capturedDepths.current.add(threshold);
          posthog?.capture('$scroll_depth', {
            scroll_depth: Math.round(threshold * 100),
          });
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [posthog]);
}
