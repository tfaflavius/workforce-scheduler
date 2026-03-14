import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Box, CircularProgress, Fade, Typography, alpha, useTheme } from '@mui/material';
import { store } from './store/store';
import { AppRoutes } from './routes/AppRoutes';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { initializeAuth, updateToken, logout } from './store/slices/auth.slice';
import { supabase } from './lib/supabase';
import { InstallPrompt } from './components/pwa/InstallPrompt';
import { ThemeProvider } from './contexts/ThemeContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { ErrorBoundary } from './components/ErrorBoundary';

/** Branded bootstrap loader shown while auth initializes */
function AppBootstrapLoader() {
  const theme = useTheme();
  return (
    <Fade in={true} timeout={400}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100dvh',
          gap: 2.5,
          bgcolor: 'background.default',
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={28} thickness={4} />
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 500, letterSpacing: '0.02em' }}
        >
          Se incarca...
        </Typography>
      </Box>
    </Fade>
  );
}

function AppContent() {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(initializeAuth());

    // Listen for auth state changes (token refresh, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          dispatch(logout());
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Update the token in Redux when Supabase refreshes it
          dispatch(updateToken(session.access_token));
        } else if (event === 'SIGNED_IN' && session) {
          // Re-initialize auth if signed in
          dispatch(initializeAuth());
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch]);

  if (isLoading) {
    return <AppBootstrapLoader />;
  }

  return <AppRoutes />;
}

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <SnackbarProvider>
            <BrowserRouter>
              <AppContent />
              <InstallPrompt />
            </BrowserRouter>
          </SnackbarProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
