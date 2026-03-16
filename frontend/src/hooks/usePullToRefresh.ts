import { useEffect, useRef, useState, useCallback } from 'react';

interface PullToRefreshOptions {
  /** Minimum pull distance to trigger refresh (px) */
  threshold?: number;
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void> | void;
  /** Whether pull-to-refresh is enabled */
  enabled?: boolean;
}

/**
 * Hook for pull-to-refresh gesture on mobile.
 * Returns state for showing the refresh indicator.
 */
export function usePullToRefresh({
  threshold = 80,
  onRefresh,
  enabled = true,
}: PullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing) return;
    if (window.scrollY <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  }, [enabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current || !enabled || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0 && window.scrollY <= 0) {
      // Apply resistance — pull gets harder the further you go
      const resistance = Math.min(diff * 0.4, threshold * 1.5);
      setPullDistance(resistance);
    }
  }, [enabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(0);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(15);
      }

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isRefreshing, pullDistance };
}
