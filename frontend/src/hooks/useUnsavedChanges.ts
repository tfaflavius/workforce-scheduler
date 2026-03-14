import { useEffect, useCallback } from 'react';

/**
 * Warns the user when they attempt to close/reload the tab while there are
 * unsaved changes.  Pass `isDirty = true` when the form has been modified.
 *
 * Usage:
 *   const [content, setContent] = useState('');
 *   useUnsavedChanges(content !== '');
 */
export function useUnsavedChanges(isDirty: boolean) {
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      // Modern browsers ignore custom message, but returnValue must be set
      e.returnValue = '';
    },
    [isDirty],
  );

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [handleBeforeUnload]);
}

export default useUnsavedChanges;
