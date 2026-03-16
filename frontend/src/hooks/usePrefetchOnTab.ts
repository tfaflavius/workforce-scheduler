import { useEffect, useRef } from 'react';

/**
 * Prefetches data for adjacent tabs when user is on a specific tab.
 * Runs prefetch functions for tabs ±1 from the current active tab,
 * using requestIdleCallback to avoid blocking the main thread.
 *
 * @param currentTab - Currently active tab index
 * @param prefetchFns - Map of tab index → prefetch function
 *
 * Usage:
 * ```tsx
 * const dispatch = useAppDispatch();
 *
 * usePrefetchOnTab(tabValue, {
 *   0: () => dispatch(someApi.endpoints.getDataA.initiate(undefined)),
 *   1: () => dispatch(someApi.endpoints.getDataB.initiate(undefined)),
 *   2: () => dispatch(someApi.endpoints.getDataC.initiate(undefined)),
 * });
 * ```
 */
export function usePrefetchOnTab(
  currentTab: number,
  prefetchFns: Record<number, () => void>,
): void {
  const prefetchedRef = useRef(new Set<number>());

  useEffect(() => {
    // Mark current tab as "seen"
    prefetchedRef.current.add(currentTab);

    // Prefetch adjacent tabs (±1) if not already prefetched
    const adjacentTabs = [currentTab - 1, currentTab + 1];

    adjacentTabs.forEach((tabIndex) => {
      if (
        prefetchFns[tabIndex] &&
        !prefetchedRef.current.has(tabIndex)
      ) {
        prefetchedRef.current.add(tabIndex);

        const schedule = 'requestIdleCallback' in window
          ? (window as any).requestIdleCallback
          : (fn: () => void) => setTimeout(fn, 150);

        schedule(() => {
          prefetchFns[tabIndex]();
        });
      }
    });
  }, [currentTab, prefetchFns]);
}
