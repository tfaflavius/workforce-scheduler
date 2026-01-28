import React from 'react';
import { Chip } from '@mui/material';
import { CheckCircle as ActiveIcon, Block as InactiveIcon } from '@mui/icons-material';

interface UserStatusChipProps {
  isActive: boolean;
  size?: 'small' | 'medium';
}

export const UserStatusChip: React.FC<UserStatusChipProps> = ({ isActive, size = 'small' }) => {
  return (
    <Chip
      label={isActive ? 'Activ' : 'Inactiv'}
      color={isActive ? 'success' : 'default'}
      size={size}
      icon={isActive ? <ActiveIcon /> : <InactiveIcon />}
      variant={isActive ? 'filled' : 'outlined'}
    />
  );
};
