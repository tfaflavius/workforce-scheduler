import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scroll positions stored per pathname.
 * Uses a module-level Map so positions survive component re-mounts.
 */
const scrollPositions = new Map<string, number>();

/**
 * Saves scroll position when leaving a route and restores it when returning.
 * Works with the browser's back/forward navigation and in-app navigation.
 *
 * This replaces the simple "scroll to top" behavior with a smarter approach:
 * - New navigation (clicking a link) → scrolls to top
 * - Back/forward navigation → restores previous position
 */
export function useScrollRestoration() {
  const { pathname, key } = useLocation();
  const prevPathnameRef = useRef(pathname);
  const prevKeyRef = useRef(key);

  // Save scroll position when navigating away
  useEffect(() => {
    return () => {
      // On unmount/route change, save current scroll position
      scrollPositions.set(prevPathnameRef.current, window.scrollY);
    };
  }, [pathname]);

  // Restore or reset scroll position on route change
  useEffect(() => {
    const isBackNavigation = prevKeyRef.current !== key && scrollPositions.has(pathname);

    if (isBackNavigation) {
      // Restore saved position (with small delay to allow content to render)
      const savedPosition = scrollPositions.get(pathname) || 0;
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedPosition, behavior: 'instant' as ScrollBehavior });
      });
    } else if (prevPathnameRef.current !== pathname) {
      // New navigation → scroll to top
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }

    prevPathnameRef.current = pathname;
    prevKeyRef.current = key;
  }, [pathname, key]);
}
