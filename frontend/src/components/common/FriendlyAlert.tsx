import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  alpha,
  useTheme,
  Collapse,
  IconButton,
  keyframes,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface FriendlyAlertProps {
  severity: AlertVariant;
  title?: string;
  message: string;
  show?: boolean;
  onClose?: () => void;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  animated?: boolean;
  compact?: boolean;
}

const alertIcons: Record<AlertVariant, React.ReactNode> = {
  success: <SuccessIcon />,
  error: <ErrorIcon />,
  warning: <WarningIcon />,
  info: <InfoIcon />,
};

const alertColors: Record<AlertVariant, { bg: string; border: string; icon: string }> = {
  success: {
    bg: '#10b981',
    border: '#059669',
    icon: '#10b981',
  },
  error: {
    bg: '#ef4444',
    border: '#dc2626',
    icon: '#ef4444',
  },
  warning: {
    bg: '#f59e0b',
    border: '#d97706',
    icon: '#f59e0b',
  },
  info: {
    bg: '#06b6d4',
    border: '#0891b2',
    icon: '#06b6d4',
  },
};

export const FriendlyAlert: React.FC<FriendlyAlertProps> = ({
  severity,
  title,
  message,
  show = true,
  onClose,
  action,
  icon,
  animated = true,
  compact = false,
}) => {
  const theme = useTheme();
  const colors = alertColors[severity];

  return (
    <Collapse in={show}>
      <Alert
        severity={severity}
        icon={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: compact ? 0.5 : 1,
              borderRadius: 2,
              bgcolor: alpha(colors.icon, 0.15),
              color: colors.icon,
              animation: animated ? `${pulse} 2s ease-in-out infinite` : undefined,
              '& > svg': {
                fontSize: compact ? 20 : 24,
              },
            }}
          >
            {icon || alertIcons[severity]}
          </Box>
        }
        action={
          (onClose || action) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {action}
              {onClose && (
                <IconButton
                  size="small"
                  onClick={onClose}
                  sx={{
                    color: 'inherit',
                    opacity: 0.7,
                    '&:hover': {
                      opacity: 1,
                      bgcolor: alpha(colors.icon, 0.1),
                    },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          )
        }
        sx={{
          borderRadius: 3,
          border: `1px solid ${alpha(colors.border, 0.3)}`,
          bgcolor: theme.palette.mode === 'light'
            ? alpha(colors.bg, 0.08)
            : alpha(colors.bg, 0.15),
          py: compact ? 1 : 1.5,
          px: compact ? 2 : 2.5,
          animation: animated ? `${slideIn} 0.3s ease-out` : undefined,
          boxShadow: `0 4px 12px ${alpha(colors.bg, 0.15)}`,
          '& .MuiAlert-message': {
            py: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          },
          '& .MuiAlert-icon': {
            py: 0,
            alignItems: 'center',
          },
          '& .MuiAlert-action': {
            py: 0,
            alignItems: 'center',
          },
        }}
      >
        {title && (
          <AlertTitle
            sx={{
              fontWeight: 700,
              mb: 0.5,
              fontSize: compact ? '0.9rem' : '1rem',
            }}
          >
            {title}
          </AlertTitle>
        )}
        <Typography
          variant={compact ? 'body2' : 'body1'}
          sx={{
            fontWeight: 500,
            lineHeight: 1.5,
          }}
        >
          {message}
        </Typography>
      </Alert>
    </Collapse>
  );
};

export default FriendlyAlert;
