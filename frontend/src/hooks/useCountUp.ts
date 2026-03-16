import { useState, useEffect, useRef } from 'react';

/**
 * Hook for animated count-up numbers.
 * Animates from 0 to the target value over the specified duration.
 */
export function useCountUp(
  target: number,
  duration: number = 800,
  delay: number = 0
): number {
  const [current, setCurrent] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const prevTargetRef = useRef(0);

  useEffect(() => {
    if (target === prevTargetRef.current) return;

    const startValue = prevTargetRef.current;
    prevTargetRef.current = target;

    const timeout = setTimeout(() => {
      startTimeRef.current = null;

      const animate = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(startValue + (target - startValue) * eased);

        setCurrent(value);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  return current;
}
