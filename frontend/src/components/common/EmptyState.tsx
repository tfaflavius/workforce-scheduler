import React from 'react';
import { Box, Typography, Button, Fade, alpha, useTheme } from '@mui/material';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const theme = useTheme();

  return (
    <Fade in={true} timeout={500}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 4, sm: 6, md: 8 },
          px: { xs: 2, sm: 3 },
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            mb: { xs: 2, sm: 3 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& .MuiSvgIcon-root': {
              fontSize: { xs: 48, sm: 64 },
              color: theme.palette.primary.main,
            },
          }}
        >
          {icon}
        </Box>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            fontSize: { xs: '1rem', sm: '1.25rem' },
            mb: 1,
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>

        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              maxWidth: 360,
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              mb: actionLabel ? { xs: 2, sm: 3 } : 0,
            }}
          >
            {description}
          </Typography>
        )}

        {actionLabel && onAction && (
          <Button
            variant="contained"
            onClick={onAction}
            sx={{
              px: { xs: 3, sm: 4 },
              py: { xs: 1, sm: 1.25 },
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              fontWeight: 600,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
              '&:hover': {
                boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              },
            }}
          >
            {actionLabel}
          </Button>
        )}
      </Box>
    </Fade>
  );
};

export default EmptyState;
