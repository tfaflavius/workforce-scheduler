import React from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

export interface RevealProps {
  children: React.ReactNode;
  /** Intarziere inainte de aparitie (ms) — util pentru efect in cascada. */
  delay?: number;
  /** Durata animatiei (ms). */
  duration?: number;
  sx?: SxProps<Theme>;
}

/**
 * Apparitie subtila (fade + slide-up) pentru sectiuni de continut.
 * Foloseste keyframe-ul global `appFadeInUp` si respecta automat
 * `prefers-reduced-motion` (dezactivat global din tema).
 */
export const Reveal: React.FC<RevealProps> = ({ children, delay = 0, duration = 450, sx }) => (
  <Box
    sx={{
      animation: `appFadeInUp ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
      animationDelay: `${delay}ms`,
      ...sx,
    }}
  >
    {children}
  </Box>
);

export default Reveal;
