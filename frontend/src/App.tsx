import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Box, CircularProgress } from '@mui/material';
import { store } from './store/store';
import { AppRoutes } from './routes/AppRoutes';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { initializeAuth, updateToken, logout } from './store/slices/auth.slice';
import { supabase } from './lib/supabase';
import { InstallPrompt } from './components/pwa/InstallPrompt';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';

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
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100dvh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return <AppRoutes />;
}

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <BrowserRouter>
            <AppContent />
            <InstallPrompt />
          </BrowserRouter>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
