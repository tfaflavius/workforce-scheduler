import React, { Component, type ErrorInfo } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

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
            bgcolor: 'background.default',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 4,
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <ErrorOutlineIcon
              sx={{ fontSize: 64, color: 'error.main', mb: 2 }}
            />
            <Typography variant="h5" gutterBottom fontWeight={600}>
              Ceva nu a mers bine
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              A aparut o eroare neasteptata. Poti incerca sa reincarci pagina
              sau sa te intorci la pagina anterioara.
            </Typography>
            {import.meta.env.DEV && this.state.error && (
              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: 'error.50',
                  borderRadius: 2,
                  textAlign: 'left',
                  overflow: 'auto',
                  maxHeight: 120,
                }}
              >
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {this.state.error.message}
                </Typography>
              </Paper>
            )}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={this.handleReset}
                size="medium"
              >
                Incearca din nou
              </Button>
              <Button
                variant="contained"
                onClick={this.handleReload}
                size="medium"
              >
                Reincarca pagina
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
