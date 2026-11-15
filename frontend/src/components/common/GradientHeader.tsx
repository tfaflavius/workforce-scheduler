import React from 'react';
import { Box, Typography, Fade, useTheme, useMediaQuery } from '@mui/material';
import { useScrollPosition } from '../../hooks/useScrollPosition';
import { BRAND_GRADIENT, BRAND_GRADIENT_DARK, BRAND_GLOW } from '../../theme/brand';

export interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  gradient?: string;
  children?: React.ReactNode;
  /** Disable compact-on-scroll behavior */
  disableCompact?: boolean;
  /** Ceas live (ora:minut) in dreapta antetului */
  showClock?: boolean;
}

/** Ceas care se actualizeaza singur, cu doua puncte care clipesc. */
const LiveClock = () => {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return (
    <Box
      sx={{
        px: { xs: 1.25, sm: 1.75 },
        py: { xs: 0.5, sm: 0.75 },
        borderRadius: 3,
        bgcolor: 'rgba(255, 255, 255, 0.16)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        backdropFilter: 'blur(8px)',
        fontWeight: 800,
        fontSize: { xs: '1.1rem', sm: '1.5rem' },
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.02em',
        flexShrink: 0,
        lineHeight: 1.2,
      }}
      aria-label={`Ora ${hh}:${mm}`}
    >
      {hh}
      <Box
        component="span"
        sx={{ animation: 'clockBlink 1s steps(2, start) infinite', '@keyframes clockBlink': { to: { visibility: 'hidden' } } }}
      >
        :
      </Box>
      {mm}
    </Box>
  );
};

export const GradientHeader: React.FC<GradientHeaderProps> = React.memo(({
  title,
  subtitle,
  icon,
  gradient,
  children,
  disableCompact = false,
  showClock = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const scrollY = useScrollPosition(20);

  // Compact mode: on mobile, after scrolling 30px, shrink the header
  const isCompact = !disableCompact && isMobile && scrollY > 30;

  // Acelasi gradient de brand pe toate paginile (inainte fiecare pagina avea alta culoare,
  // ceea ce facea aplicatia sa para "petice"). Prop-ul `gradient` e pastrat pentru
  // compatibilitate, dar ignorat intentionat.
  void gradient;
  const background = theme.palette.mode === 'dark' ? BRAND_GRADIENT_DARK : BRAND_GRADIENT;

  return (
    <Fade in={true} timeout={250}>
      <Box
        sx={{
          mb: { xs: 2, sm: 3 },
          p: isCompact
            ? { xs: 1.25, sm: 2 }
            : { xs: 1.75, sm: 2.25, md: 2.75 },
          background,
          borderRadius: { xs: 3, sm: 4 },
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: BRAND_GLOW,
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
            {/* Cercuri luminoase decorative */}
            <Box
              sx={{
                position: 'absolute',
                top: -60,
                right: -40,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(103, 232, 249, 0.45) 0%, transparent 70%)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: -80,
                right: '28%',
                width: 180,
                height: 180,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, transparent 70%)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 28,
                width: 64,
                height: 64,
                borderRadius: '50%',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                display: { xs: 'none', sm: 'block' },
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
            {showClock && !isCompact && <LiveClock />}
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
