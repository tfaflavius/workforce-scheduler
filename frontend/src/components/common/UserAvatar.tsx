import React from 'react';
import { Avatar, alpha, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { nameGradient, nameInitials } from '../../theme/brand';

export interface UserAvatarProps {
  /** Full name — first character used as initial */
  name?: string | null;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Optional additional sx overrides */
  sx?: SxProps<Theme>;
}

const sizeMap = {
  small: { width: 32, height: 32, fontSize: '0.75rem' },
  medium: { width: 40, height: 40, fontSize: '0.9rem' },
  large: { width: 48, height: 48, fontSize: '1.05rem' },
};

/**
 * Reusable user avatar with gradient background and initial.
 * Replaces repeated `charAt(0).toUpperCase()` pattern across the app.
 */
export const UserAvatar: React.FC<UserAvatarProps> = React.memo(({ name, size = 'medium', sx }) => {
  const theme = useTheme();
  const dimensions = sizeMap[size];
  const initial = nameInitials(name);

  return (
    <Avatar
      aria-label={name ? `Avatar ${name}` : 'Avatar utilizator'}
      sx={{
        width: dimensions.width,
        height: dimensions.height,
        fontSize: dimensions.fontSize,
        fontWeight: 600,
        background: nameGradient(name),
        color: '#fff',
        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
        border: `2px solid ${alpha('#ffffff', 0.6)}`,
        transition: 'all 0.25s ease',
        '&:hover': {
          boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}, 0 4px 16px ${alpha(theme.palette.primary.main, 0.35)}`,
          transform: 'scale(1.05)',
        },
        ...sx,
      }}
    >
      {initial}
    </Avatar>
  );
});

UserAvatar.displayName = 'UserAvatar';

export default UserAvatar;
