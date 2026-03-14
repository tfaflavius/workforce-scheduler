import { useState, useCallback, useRef } from 'react';

/**
 * Copy text to the system clipboard with success/error feedback.
 *
 * Usage:
 *   const { copy, copied } = useCopyToClipboard();
 *   <IconButton onClick={() => copy('some-id')}>
 *     {copied ? <CheckIcon /> : <ContentCopyIcon />}
 *   </IconButton>
 */
export function useCopyToClipboard(resetDelay = 2000) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (!navigator?.clipboard) {
        // Fallback for older browsers
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        } catch {
          console.warn('Copy to clipboard failed');
          return false;
        }
      } else {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          console.warn('Copy to clipboard failed');
          return false;
        }
      }

      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), resetDelay);
      return true;
    },
    [resetDelay],
  );

  return { copy, copied };
}

export default useCopyToClipboard;
