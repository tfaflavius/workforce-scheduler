import React from 'react';
import {
  Button,
  CircularProgress,
  Box,
  alpha,
  useTheme,
  keyframes,
} from '@mui/material';
import type { ButtonProps } from '@mui/material';

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
`;

const shimmer = keyframes`
  0% { left: -100%; }
  100% { left: 100%; }
`;

export type ButtonVariantExtended = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'ghost';

export interface FriendlyButtonProps extends Omit<ButtonProps, 'variant' | 'color'> {
  colorVariant?: ButtonVariantExtended;
  variant?: 'contained' | 'outlined' | 'text';
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  rounded?: boolean;
  animated?: boolean;
  fullWidthOnMobile?: boolean;
}

const variantColors: Record<ButtonVariantExtended, { main: string; light: string; dark: string }> = {
  primary: { main: '#2563eb', light: '#60a5fa', dark: '#1d4ed8' },
  secondary: { main: '#7c3aed', light: '#a78bfa', dark: '#5b21b6' },
  success: { main: '#10b981', light: '#34d399', dark: '#059669' },
  warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
  error: { main: '#ef4444', light: '#f87171', dark: '#dc2626' },
  info: { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2' },
  ghost: { main: 'transparent', light: 'transparent', dark: 'transparent' },
};

export const FriendlyButton: React.FC<FriendlyButtonProps> = ({
  colorVariant = 'primary',
  variant = 'contained',
  loading = false,
  loadingText,
  icon,
  iconPosition = 'start',
  rounded = false,
  animated = false,
  fullWidthOnMobile = false,
  disabled,
  children,
  sx,
  ...props
}) => {
  const theme = useTheme();
  const colors = variantColors[colorVariant];

  const getVariantStyles = () => {
    if (colorVariant === 'ghost') {
      return {
        bgcolor: 'transparent',
        color: 'text.secondary',
        '&:hover': {
          bgcolor: alpha(theme.palette.text.secondary, 0.08),
        },
      };
    }

    switch (variant) {
      case 'contained':
        return {
          bgcolor: colors.main,
          color: 'white',
          boxShadow: `0 4px 14px ${alpha(colors.main, 0.4)}`,
          '&:hover': {
            bgcolor: colors.dark,
            boxShadow: `0 6px 20px ${alpha(colors.main, 0.5)}`,
          },
        };
      case 'outlined':
        return {
          bgcolor: 'transparent',
          color: colors.main,
          border: `2px solid ${colors.main}`,
          '&:hover': {
            bgcolor: alpha(colors.main, 0.08),
            borderColor: colors.dark,
          },
        };
      case 'text':
        return {
          bgcolor: 'transparent',
          color: colors.main,
          '&:hover': {
            bgcolor: alpha(colors.main, 0.08),
          },
        };
    }
  };

  return (
    <Button
      {...props}
      disabled={disabled || loading}
      sx={{
        borderRadius: rounded ? 10 : 2.5,
        px: { xs: 2.5, sm: 3 },
        py: { xs: 1, sm: 1.25 },
        fontWeight: 600,
        fontSize: { xs: '0.875rem', sm: '0.9375rem' },
        textTransform: 'none',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        ...(fullWidthOnMobile && {
          width: { xs: '100%', sm: 'auto' },
        }),
        ...getVariantStyles(),
        ...(animated && !loading && !disabled && {
          animation: `${pulse} 2s ease-in-out infinite`,
        }),
        '&:active': {
          transform: 'scale(0.97)',
        },
        '&::after': variant === 'contained' && !loading && !disabled ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.2)}, transparent)`,
          transition: 'left 0.5s ease',
        } : {},
        '&:hover::after': {
          animation: `${shimmer} 0.75s ease`,
        },
        '&.Mui-disabled': {
          opacity: 0.6,
          boxShadow: 'none',
        },
        ...sx,
      }}
    >
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CircularProgress
            size={18}
            thickness={5}
            sx={{ color: 'inherit' }}
          />
          {loadingText && <span>{loadingText}</span>}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon && iconPosition === 'start' && (
            <Box sx={{ display: 'flex', '& > svg': { fontSize: 20 } }}>
              {icon}
            </Box>
          )}
          {children}
          {icon && iconPosition === 'end' && (
            <Box sx={{ display: 'flex', '& > svg': { fontSize: 20 } }}>
              {icon}
            </Box>
          )}
        </Box>
      )}
    </Button>
  );
};

export default FriendlyButton;
