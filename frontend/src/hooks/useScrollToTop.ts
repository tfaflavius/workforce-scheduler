import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls the page (or a given container) to the top whenever the route
 * changes.  Drop it once in the layout component and forget about it.
 *
 * Usage:
 *   useScrollToTop();                  // scrolls window
 *   useScrollToTop(containerRef);      // scrolls a container element
 */
export function useScrollToTop(containerRef?: React.RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (containerRef?.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname, containerRef]);
}

export default useScrollToTop;
