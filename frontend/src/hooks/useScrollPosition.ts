import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook that tracks the scroll position of the window.
 * Uses passive event listener and requestAnimationFrame for zero-impact on scroll performance.
 *
 * @param threshold - Minimum scroll distance before reporting change (px). Default 10.
 * @returns scrollY value (clamped to threshold increments for stability)
 */
export function useScrollPosition(threshold = 10): number {
  const [scrollY, setScrollY] = useState(0);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    if (!ticking.current) {
      ticking.current = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        setScrollY((prev) => {
          // Only update if change exceeds threshold — prevents jittery re-renders
          if (Math.abs(currentY - prev) >= threshold) {
            return currentY;
          }
          return prev;
        });
        ticking.current = false;
      });
    }
  }, [threshold]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return scrollY;
}
