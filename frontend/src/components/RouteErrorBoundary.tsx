import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button, Paper, Stack, alpha } from '@mui/material';
import { Refresh as RefreshIcon, Home as HomeIcon } from '@mui/icons-material';

/** Inline SVG illustration for error state */
const ErrorIllustration = () => (
  <svg width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Background cloud */}
    <ellipse cx="80" cy="85" rx="55" ry="12" fill="#f1f5f9" />
    {/* Broken gear */}
    <circle cx="65" cy="48" r="22" stroke="#e2e8f0" strokeWidth="4" fill="white" />
    <circle cx="65" cy="48" r="10" stroke="#e2e8f0" strokeWidth="3" fill="#f8fafc" />
    {/* Gear teeth */}
    <rect x="61" y="22" width="8" height="10" rx="2" fill="#e2e8f0" />
    <rect x="61" y="64" width="8" height="10" rx="2" fill="#e2e8f0" />
    <rect x="39" y="44" width="10" height="8" rx="2" fill="#e2e8f0" />
    <rect x="81" y="44" width="10" height="8" rx="2" fill="#e2e8f0" />
    {/* Warning triangle */}
    <path d="M100 30 L120 65 L80 65 Z" fill="#fff7ed" stroke="#f97316" strokeWidth="2" strokeLinejoin="round" />
    <text x="100" y="58" fontSize="18" fontWeight="bold" fill="#f97316" textAnchor="middle" fontFamily="sans-serif">!</text>
    {/* Lightning bolt crack */}
    <path d="M55 38 L60 45 L56 45 L62 55" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
    {/* Decorative dots */}
    <circle cx="30" cy="35" r="2" fill="#e2e8f0" />
    <circle cx="130" cy="40" r="2.5" fill="#e2e8f0" />
    <circle cx="140" cy="55" r="1.5" fill="#e2e8f0" />
    <circle cx="25" cy="60" r="1.5" fill="#e2e8f0" />
  </svg>
);

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Route-level ErrorBoundary that renders within the MainLayout (no full-page takeover).
 * Use this to wrap route content so that an error in one page doesn't crash the sidebar/navigation.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RouteErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            p: 3,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 5 },
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {/* Floating illustration */}
            <Box
              sx={{
                mb: 2,
                animation: 'errorFloat 3s ease-in-out infinite',
                '@keyframes errorFloat': {
                  '0%, 100%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(-6px)' },
                },
              }}
            >
              <ErrorIllustration />
            </Box>

            <Typography variant="h5" gutterBottom fontWeight={700}>
              Ceva nu a mers bine
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
              A aparut o eroare neasteptata. Poti incerca din nou sau te poti intoarce la pagina principala.
            </Typography>

            {import.meta.env.DEV && this.state.error && (
              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.06),
                  border: '1px solid',
                  borderColor: (theme) => alpha(theme.palette.error.main, 0.15),
                  borderRadius: 2,
                  textAlign: 'left',
                  overflow: 'auto',
                  maxHeight: 120,
                }}
              >
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'error.main',
                    fontSize: '0.7rem',
                  }}
                >
                  {this.state.error.message}
                </Typography>
              </Paper>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleReset}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 3,
                }}
              >
                Incearca din nou
              </Button>
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 3,
                }}
              >
                Dashboard
              </Button>
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
