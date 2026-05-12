import { useState, useEffect } from 'react';

/**
 * Returns a polling interval that adapts to tab visibility.
 *
 * When the browser tab is visible the hook returns `activeInterval`.
 * When the tab is hidden it returns `inactiveInterval` (default 0 = disabled),
 * saving battery and network on mobile devices.
 */
export function useSmartPolling(activeInterval: number, inactiveInterval = 0): number {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handler = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return isVisible ? activeInterval : inactiveInterval;
}
