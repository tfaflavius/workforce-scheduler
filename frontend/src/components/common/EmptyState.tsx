import React from 'react';
import { Box, Typography, Button, Fade, alpha, useTheme } from '@mui/material';

/** Lightweight inline SVG illustrations for empty states */
const illustrations: Record<string, React.FC<{ color: string; secondaryColor: string }>> = {
  /** Generic empty box / no data */
  noData: ({ color, secondaryColor }) => (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="30" width="80" height="55" rx="6" fill={secondaryColor} />
      <rect x="25" y="25" width="70" height="55" rx="6" fill={color} opacity="0.15" />
      <rect x="30" y="20" width="60" height="55" rx="6" fill={color} opacity="0.25" />
      <path d="M50 45 L60 55 L70 40" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
      <circle cx="60" cy="47" r="15" stroke={color} strokeWidth="2" fill="none" opacity="0.3" />
    </svg>
  ),
  /** Search / no results found */
  noResults: ({ color, secondaryColor }) => (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="52" cy="45" r="25" stroke={color} strokeWidth="3" fill={secondaryColor} />
      <circle cx="52" cy="45" r="18" fill={color} opacity="0.1" />
      <line x1="70" y1="63" x2="90" y2="83" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <line x1="44" y1="40" x2="60" y2="50" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="44" y1="50" x2="60" y2="40" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </svg>
  ),
  /** Empty list / no items */
  noItems: ({ color, secondaryColor }) => (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="15" width="70" height="70" rx="8" fill={secondaryColor} />
      <rect x="35" y="28" width="35" height="4" rx="2" fill={color} opacity="0.3" />
      <rect x="35" y="40" width="50" height="4" rx="2" fill={color} opacity="0.2" />
      <rect x="35" y="52" width="42" height="4" rx="2" fill={color} opacity="0.15" />
      <rect x="35" y="64" width="30" height="4" rx="2" fill={color} opacity="0.1" />
      <circle cx="85" cy="70" r="15" fill={color} opacity="0.15" />
      <path d="M80 70 L85 75 L92 65" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
  ),
  /** No notifications */
  noNotifications: ({ color, secondaryColor }) => (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M60 20 C45 20 35 32 35 45 L35 58 L28 68 L92 68 L85 58 L85 45 C85 32 75 20 60 20Z" fill={secondaryColor} />
      <path d="M60 20 C45 20 35 32 35 45 L35 58 L28 68 L92 68 L85 58 L85 45 C85 32 75 20 60 20Z" fill={color} opacity="0.15" />
      <ellipse cx="60" cy="78" rx="10" ry="5" fill={color} opacity="0.25" />
      <circle cx="60" cy="15" r="3" fill={color} opacity="0.4" />
      <path d="M48 44 C48 44 55 50 72 44" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  ),
  /** Calendar / no schedule */
  noSchedule: ({ color, secondaryColor }) => (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="22" y="25" width="76" height="60" rx="8" fill={secondaryColor} />
      <rect x="22" y="25" width="76" height="18" rx="8" fill={color} opacity="0.2" />
      <rect x="22" y="35" width="76" height="8" fill={color} opacity="0.2" />
      <circle cx="40" cy="30" r="4" fill={color} opacity="0.3" />
      <circle cx="80" cy="30" r="4" fill={color} opacity="0.3" />
      <line x1="40" y1="22" x2="40" y2="28" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="80" y1="22" x2="80" y2="28" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <rect x="32" y="52" width="12" height="10" rx="2" fill={color} opacity="0.1" />
      <rect x="54" y="52" width="12" height="10" rx="2" fill={color} opacity="0.1" />
      <rect x="76" y="52" width="12" height="10" rx="2" fill={color} opacity="0.1" />
      <rect x="32" y="68" width="12" height="10" rx="2" fill={color} opacity="0.1" />
      <rect x="54" y="68" width="12" height="10" rx="2" fill={color} opacity="0.15" />
    </svg>
  ),
  /** No reports */
  noReports: ({ color, secondaryColor }) => (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="10" width="50" height="65" rx="6" fill={secondaryColor} />
      <rect x="35" y="5" width="50" height="65" rx="6" fill={color} opacity="0.12" />
      <rect x="42" y="22" width="30" height="3" rx="1.5" fill={color} opacity="0.3" />
      <rect x="42" y="30" width="24" height="3" rx="1.5" fill={color} opacity="0.2" />
      <rect x="42" y="38" width="28" height="3" rx="1.5" fill={color} opacity="0.15" />
      <rect x="42" y="48" width="30" height="12" rx="3" fill={color} opacity="0.1" />
      <path d="M45 56 L50 52 L55 55 L62 49 L68 54" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
      <circle cx="80" cy="75" r="16" fill={color} opacity="0.12" />
      <path d="M75 75 L80 80 L88 70" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </svg>
  ),
};

export type EmptyStateIllustration = keyof typeof illustrations;

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional SVG illustration shown above the icon circle. Choices: noData, noResults, noItems, noNotifications, noSchedule, noReports */
  illustration?: EmptyStateIllustration;
}

export const EmptyState: React.FC<EmptyStateProps> = React.memo(({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  illustration,
}) => {
  const theme = useTheme();

  const IllustrationComponent = illustration ? illustrations[illustration] : null;

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
        {/* Optional SVG illustration */}
        {IllustrationComponent && (
          <Box
            sx={{
              mb: { xs: 1, sm: 2 },
              opacity: 0.85,
              animation: 'emptyStateFloat 3s ease-in-out infinite',
              '@keyframes emptyStateFloat': {
                '0%, 100%': { transform: 'translateY(0px)' },
                '50%': { transform: 'translateY(-6px)' },
              },
            }}
          >
            <IllustrationComponent
              color={theme.palette.primary.main}
              secondaryColor={alpha(theme.palette.primary.main, 0.08)}
            />
          </Box>
        )}

        {/* Icon circle */}
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
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
