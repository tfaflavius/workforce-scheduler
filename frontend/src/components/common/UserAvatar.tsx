import React from 'react';
import { Avatar, alpha, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

export interface UserAvatarProps {
  /** Full name — first character used as initial */
  name?: string | null;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Optional additional sx overrides */
  sx?: SxProps<Theme>;
}

const sizeMap = {
  small: { width: 32, height: 32, fontSize: '0.875rem' },
  medium: { width: 40, height: 40, fontSize: '1rem' },
  large: { width: 48, height: 48, fontSize: '1.2rem' },
};

/**
 * Reusable user avatar with gradient background and initial.
 * Replaces repeated `charAt(0).toUpperCase()` pattern across the app.
 */
export const UserAvatar: React.FC<UserAvatarProps> = React.memo(({ name, size = 'medium', sx }) => {
  const theme = useTheme();
  const dimensions = sizeMap[size];
  const initial = name?.charAt(0).toUpperCase() || 'U';

  return (
    <Avatar
      aria-label={name ? `Avatar ${name}` : 'Avatar utilizator'}
      sx={{
        width: dimensions.width,
        height: dimensions.height,
        fontSize: dimensions.fontSize,
        fontWeight: 600,
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
        ...sx,
      }}
    >
      {initial}
    </Avatar>
  );
});

UserAvatar.displayName = 'UserAvatar';

export default UserAvatar;
