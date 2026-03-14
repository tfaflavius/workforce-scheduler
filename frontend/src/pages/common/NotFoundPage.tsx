import React from 'react';
import { Box, Typography, Button, Stack, Fade, alpha, useTheme } from '@mui/material';
import { Home as HomeIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

/** Inline SVG illustration for 404 – a broken/lost document */
const NotFoundIllustration: React.FC<{ color: string; secondaryColor: string }> = ({ color, secondaryColor }) => (
  <svg width="180" height="150" viewBox="0 0 180 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Background circle */}
    <circle cx="90" cy="75" r="60" fill={secondaryColor} />
    {/* Document body */}
    <rect x="55" y="30" width="55" height="72" rx="6" fill="white" />
    <rect x="55" y="30" width="55" height="72" rx="6" stroke={color} strokeWidth="2" opacity="0.4" />
    {/* Folded corner */}
    <path d="M95 30 L110 30 L110 45 L95 45 Z" fill={secondaryColor} />
    <path d="M95 30 L95 45 L110 45" stroke={color} strokeWidth="2" opacity="0.4" fill="none" />
    {/* Text lines */}
    <rect x="65" y="52" width="30" height="3" rx="1.5" fill={color} opacity="0.25" />
    <rect x="65" y="60" width="35" height="3" rx="1.5" fill={color} opacity="0.18" />
    <rect x="65" y="68" width="25" height="3" rx="1.5" fill={color} opacity="0.12" />
    {/* Question mark */}
    <text x="80" y="92" fontSize="20" fontWeight="bold" fill={color} opacity="0.35" textAnchor="middle" fontFamily="sans-serif">?</text>
    {/* Magnifying glass */}
    <circle cx="128" cy="95" r="16" stroke={color} strokeWidth="3" fill="white" opacity="0.8" />
    <circle cx="128" cy="95" r="10" fill={color} opacity="0.08" />
    <line x1="139" y1="106" x2="152" y2="119" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.6" />
    {/* X inside magnifying glass */}
    <line x1="123" y1="90" x2="133" y2="100" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    <line x1="133" y1="90" x2="123" y2="100" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    {/* Floating dots for decoration */}
    <circle cx="40" cy="50" r="3" fill={color} opacity="0.15" />
    <circle cx="145" cy="45" r="2.5" fill={color} opacity="0.12" />
    <circle cx="35" cy="100" r="2" fill={color} opacity="0.1" />
    <circle cx="150" cy="70" r="2" fill={color} opacity="0.1" />
  </svg>
);

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Fade in={true} timeout={500}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          px: 3,
        }}
      >
        {/* Floating illustration */}
        <Box
          sx={{
            mb: 2,
            opacity: 0.9,
            animation: 'notFoundFloat 3s ease-in-out infinite',
            '@keyframes notFoundFloat': {
              '0%, 100%': { transform: 'translateY(0px)' },
              '50%': { transform: 'translateY(-8px)' },
            },
          }}
        >
          <NotFoundIllustration
            color={theme.palette.primary.main}
            secondaryColor={alpha(theme.palette.primary.main, 0.08)}
          />
        </Box>

        <Typography
          variant="h3"
          fontWeight={800}
          sx={{
            fontSize: { xs: '2.5rem', sm: '3.5rem' },
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
          }}
        >
          404
        </Typography>

        <Typography
          variant="h6"
          color="text.secondary"
          fontWeight={600}
          gutterBottom
          sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
        >
          Pagina nu a fost gasita
        </Typography>

        <Typography
          variant="body2"
          color="text.disabled"
          sx={{ mb: 4, maxWidth: 400, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
        >
          Pagina pe care o cauti nu exista sau a fost mutata. Verifica adresa URL sau intoarce-te la pagina principala.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{
              px: 3,
              py: 1.25,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
              '&:hover': {
                boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              },
            }}
          >
            Inapoi la Dashboard
          </Button>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{
              px: 3,
              py: 1.25,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Pagina anterioara
          </Button>
        </Stack>
      </Box>
    </Fade>
  );
};

export default NotFoundPage;
