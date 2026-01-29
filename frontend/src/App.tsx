import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme, CssBaseline, Box, CircularProgress } from '@mui/material';
import { store } from './store/store';
import { AppRoutes } from './routes/AppRoutes';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { initializeAuth, updateToken, logout } from './store/slices/auth.slice';
import { supabase } from './lib/supabase';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function AppContent() {
  const dispatch = useAppDispatch();
  const { isLoading, isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(initializeAuth());

    // Listen for auth state changes (token refresh, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.access_token ? 'has token' : 'no token');

        if (event === 'SIGNED_OUT') {
          dispatch(logout());
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Update the token in Redux when Supabase refreshes it
          dispatch(updateToken(session.access_token));
        } else if (event === 'SIGNED_IN' && session && !isAuthenticated) {
          // Re-initialize auth if signed in but not authenticated in Redux
          dispatch(initializeAuth());
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch, isAuthenticated]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
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
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
