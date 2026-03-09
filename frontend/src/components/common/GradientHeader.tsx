import React from 'react';
import { Box, Typography, Fade, useTheme } from '@mui/material';

export interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  gradient?: string;
  children?: React.ReactNode;
}

export const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  subtitle,
  icon,
  gradient = '#2563eb 0%, #7c3aed 100%',
  children,
}) => {
  const theme = useTheme();

  // Adjust gradient for dark mode
  const effectiveGradient =
    theme.palette.mode === 'dark'
      ? gradient
          .replace('#2563eb', '#1e40af')
          .replace('#7c3aed', '#5b21b6')
          .replace('#10b981', '#047857')
          .replace('#059669', '#065f46')
          .replace('#6366f1', '#4f46e5')
          .replace('#8b5cf6', '#7c3aed')
      : gradient;

  return (
    <Fade in={true} timeout={600}>
      <Box
        sx={{
          mb: { xs: 2, sm: 3 },
          p: { xs: 2, sm: 2.5, md: 3 },
          background: `linear-gradient(135deg, ${effectiveGradient})`,
          borderRadius: { xs: 2, sm: 3 },
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        }}
      >
        {/* Background geometric decorations */}
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
        </Box>

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1.5, sm: 2 },
              mb: children ? { xs: 1.5, sm: 2 } : 0,
            }}
          >
            {icon && (
              <Box
                sx={{
                  p: { xs: 1, sm: 1.5 },
                  borderRadius: { xs: 1.5, sm: 2 },
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '& .MuiSvgIcon-root': {
                    fontSize: { xs: 24, sm: 28, md: 32 },
                  },
                }}
              >
                {icon}
              </Box>
            )}
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                  lineHeight: 1.2,
                }}
              >
                {title}
              </Typography>
              {subtitle && (
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

          {children && (
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
};

export default GradientHeader;
