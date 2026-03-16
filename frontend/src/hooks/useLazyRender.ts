import { useRef, useState, useEffect } from 'react';

/**
 * Delays rendering of a component until its placeholder scrolls into the viewport.
 * Useful for expensive below-fold sections (charts, large tables) that shouldn't
 * render on initial page load.
 *
 * @param rootMargin - How far from the viewport to start rendering (e.g. '200px').
 *                     Larger values start rendering earlier (less visible pop-in).
 * @returns [ref, shouldRender] — attach ref to a placeholder Box, render content when shouldRender is true.
 *
 * Usage:
 * ```tsx
 * const [ref, shouldRender] = useLazyRender('200px');
 * return (
 *   <Box ref={ref}>
 *     {shouldRender ? <ExpensiveChart /> : <Skeleton height={300} />}
 *   </Box>
 * );
 * ```
 */
export function useLazyRender(rootMargin = '200px'): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || shouldRender) return;

    // Fallback for browsers without IntersectionObserver (very rare)
    if (!('IntersectionObserver' in window)) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect(); // Stop observing after first visibility
        }
      },
      { rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [rootMargin, shouldRender]);

  return [ref, shouldRender];
}
