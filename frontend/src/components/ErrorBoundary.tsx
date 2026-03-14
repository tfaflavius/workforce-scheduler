import React, { Component, type ErrorInfo } from 'react';
import { Box, Typography, Button, Paper, Stack } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

/** Top-level crash illustration — server / broken screen */
const CrashIllustration = () => (
  <svg width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Monitor */}
    <rect x="30" y="15" width="100" height="68" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
    <rect x="36" y="21" width="88" height="50" rx="4" fill="white" />
    {/* Screen crack */}
    <path d="M80 21 L72 38 L82 42 L68 71" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    {/* Sad face on screen */}
    <circle cx="68" cy="42" r="3" fill="#94a3b8" />
    <circle cx="92" cy="42" r="3" fill="#94a3b8" />
    <path d="M72 54 Q80 48 88 54" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Monitor stand */}
    <rect x="72" y="83" width="16" height="8" rx="2" fill="#e2e8f0" />
    <rect x="60" y="91" width="40" height="4" rx="2" fill="#e2e8f0" />
    {/* Warning particles */}
    <circle cx="22" cy="30" r="2" fill="#fbbf24" opacity="0.6" />
    <circle cx="140" cy="25" r="2.5" fill="#fbbf24" opacity="0.5" />
    <circle cx="18" cy="70" r="1.5" fill="#ef4444" opacity="0.4" />
    <circle cx="145" cy="65" r="2" fill="#ef4444" opacity="0.3" />
    {/* Sparks */}
    <path d="M42 28 L46 32" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <path d="M118 28 L114 32" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
  </svg>
);

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100dvh',
            p: 3,
            bgcolor: '#f8fafc',
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
              borderColor: '#e2e8f0',
            }}
          >
            {/* Floating illustration */}
            <Box
              sx={{
                mb: 2,
                animation: 'crashFloat 3s ease-in-out infinite',
                '@keyframes crashFloat': {
                  '0%, 100%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(-6px)' },
                },
              }}
            >
              <CrashIllustration />
            </Box>

            <Typography variant="h5" gutterBottom fontWeight={700} color="#1e293b">
              Ceva nu a mers bine
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: '#64748b', maxWidth: 360, mx: 'auto' }}>
              A aparut o eroare neasteptata. Poti incerca sa reincarci pagina
              sau sa te intorci la pagina anterioara.
            </Typography>

            {import.meta.env.DEV && this.state.error && (
              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: '#fef2f2',
                  border: '1px solid #fecaca',
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
                    color: '#dc2626',
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
                onClick={this.handleReload}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 3,
                  bgcolor: '#2563eb',
                  '&:hover': { bgcolor: '#1d4ed8' },
                }}
              >
                Reincarca pagina
              </Button>
              <Button
                variant="outlined"
                onClick={this.handleReset}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 3,
                  color: '#64748b',
                  borderColor: '#cbd5e1',
                  '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
                }}
              >
                Incearca din nou
              </Button>
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
