import React from 'react';
import { Box, Typography, Fade, useTheme, useMediaQuery } from '@mui/material';
import { useScrollPosition } from '../../hooks/useScrollPosition';

export interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  gradient?: string;
  children?: React.ReactNode;
  /** Disable compact-on-scroll behavior */
  disableCompact?: boolean;
}

export const GradientHeader: React.FC<GradientHeaderProps> = React.memo(({
  title,
  subtitle,
  icon,
  gradient,
  children,
  disableCompact = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const scrollY = useScrollPosition(20);

  // Compact mode: on mobile, after scrolling 60px, shrink the header
  const isCompact = !disableCompact && isMobile && scrollY > 60;

  // Build default gradient from theme palette
  const defaultGradient = `${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%`;
  const resolvedGradient = gradient || defaultGradient;

  // Adjust gradient for dark mode — use darker variants for better contrast
  const effectiveGradient =
    theme.palette.mode === 'dark'
      ? resolvedGradient
          .replace(theme.palette.primary.main, theme.palette.primary.dark)
          .replace(theme.palette.secondary.main, theme.palette.secondary.dark)
          .replace(theme.palette.success.main, theme.palette.success.dark)
          .replace(theme.palette.info.main, theme.palette.info.dark)
      : resolvedGradient;

  return (
    <Fade in={true} timeout={600}>
      <Box
        sx={{
          mb: { xs: 2, sm: 3 },
          p: isCompact
            ? { xs: 1.25, sm: 2 }
            : { xs: 2, sm: 2.5, md: 3 },
          background: `linear-gradient(135deg, ${effectiveGradient})`,
          borderRadius: { xs: 2, sm: 3 },
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          // Smooth compact transition
          transition: 'padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Background geometric decorations — hide in compact mode for cleanliness */}
        {!isCompact && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            {/* Diagonal line 1 */}
            <Box
              sx={{
                position: 'absolute',
                top: '-20%',
                right: '10%',
                width: 1,
                height: '140%',
                background: 'rgba(255, 255, 255, 0.08)',
                transform: 'rotate(25deg)',
              }}
            />
            {/* Diagonal line 2 */}
            <Box
              sx={{
                position: 'absolute',
                top: '-20%',
                right: '25%',
                width: 1,
                height: '140%',
                background: 'rgba(255, 255, 255, 0.05)',
                transform: 'rotate(25deg)',
              }}
            />
            {/* Diagonal line 3 */}
            <Box
              sx={{
                position: 'absolute',
                top: '-20%',
                right: '40%',
                width: 1,
                height: '140%',
                background: 'rgba(255, 255, 255, 0.03)',
                transform: 'rotate(25deg)',
              }}
            />
            {/* Blurred glow spot */}
            <Box
              sx={{
                position: 'absolute',
                top: '30%',
                right: '-5%',
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.06)',
                filter: 'blur(40px)',
              }}
            />
          </Box>
        )}

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: isCompact ? 1 : { xs: 1.5, sm: 2 },
              mb: children && !isCompact ? { xs: 1.5, sm: 2 } : 0,
            }}
          >
            {icon && (
              <Box
                sx={{
                  p: isCompact ? 0.75 : { xs: 1, sm: 1.5 },
                  borderRadius: isCompact ? 1 : { xs: 1.5, sm: 2 },
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'padding 0.3s ease, border-radius 0.3s ease',
                  '& .MuiSvgIcon-root': {
                    fontSize: isCompact ? 20 : { xs: 24, sm: 28, md: 32 },
                    transition: 'font-size 0.3s ease',
                  },
                }}
              >
                {icon}
              </Box>
            )}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant={isCompact ? 'h6' : 'h4'}
                sx={{
                  fontWeight: 700,
                  fontSize: isCompact
                    ? '1rem'
                    : { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                  lineHeight: 1.2,
                  transition: 'font-size 0.3s ease',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: isCompact ? 'nowrap' : 'normal',
                }}
              >
                {title}
              </Typography>
              {subtitle && !isCompact && (
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.9,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    mt: 0.5,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>

          {children && !isCompact && (
            <Box
              sx={{
                mt: { xs: 1.5, sm: 2 },
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                '& .MuiChip-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontWeight: 500,
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  '& .MuiChip-icon': {
                    color: 'white',
                  },
                },
              }}
            >
              {children}
            </Box>
          )}
        </Box>
      </Box>
    </Fade>
  );
});

GradientHeader.displayName = 'GradientHeader';

export default GradientHeader;
