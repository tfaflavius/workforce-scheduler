import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Paper,
  useMediaQuery,
  useTheme,
  Fade,
  Grow,
  alpha,
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  CalendarMonth as CalendarIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { supabase } from '../../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const ResetPasswordPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [checkingToken, setCheckingToken] = useState(true);

  useEffect(() => {
    // Supabase redirects with hash fragment: #access_token=...&type=recovery
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const token = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (token && type === 'recovery') {
      setAccessToken(token);
      setCheckingToken(false);
      return;
    }

    // Also listen for Supabase auth state changes (PASSWORD_RECOVERY event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session?.access_token) {
        setAccessToken(session.access_token);
        setCheckingToken(false);
      }
    });

    // If no token found after a brief delay, show error
    const timeout = setTimeout(() => {
      if (!accessToken) {
        setCheckingToken(false);
        setError('Link-ul de resetare a expirat sau este invalid. Te rugam sa soliciti un nou link.');
      }
    }, 3000);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Parola trebuie sa aiba cel putin 6 caractere');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Parolele nu coincid');
      return;
    }

    if (!accessToken) {
      setError('Token de resetare invalid. Te rugam sa soliciti un nou link.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'A aparut o eroare');
      }

      setSuccess('Parola a fost resetata cu succes! Te poti autentifica cu noua parola.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'A aparut o eroare. Incearca din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #ec4899 100%)',
        p: 2,
      }}
    >
      <Grow in={true} timeout={600}>
        <Paper
          elevation={16}
          sx={{
            width: '100%',
            maxWidth: 460,
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            bgcolor: theme.palette.mode === 'light' ? 'white' : alpha('#1e293b', 0.95),
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                display: 'inline-flex',
                p: 1.5,
                borderRadius: 3,
                bgcolor: alpha('#7c3aed', 0.1),
                mb: 2,
              }}
            >
              <CalendarIcon sx={{ fontSize: 40, color: '#7c3aed' }} />
            </Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Seteaza Parola Noua
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Introdu noua parola pentru contul tau
            </Typography>
          </Box>

          {checkingToken && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Se verifica link-ul de resetare...
              </Typography>
            </Box>
          )}

          {error && !checkingToken && (
            <Fade in={true}>
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            </Fade>
          )}

          {success && (
            <Fade in={true}>
              <Alert severity="success" icon={<SuccessIcon />} sx={{ mb: 2, borderRadius: 2 }}>
                {success}
              </Alert>
            </Fade>
          )}

          {!checkingToken && !success && accessToken && (
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Parola noua"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                helperText="Minim 6 caractere"
                size={isMobile ? 'small' : 'medium'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Confirma parola noua"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                size={isMobile ? 'small' : 'medium'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={isLoading || !newPassword || !confirmPassword}
                sx={{
                  py: 1.5,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                }}
              >
                {isLoading ? <CircularProgress size={26} color="inherit" /> : 'Reseteaza Parola'}
              </Button>
            </form>
          )}

          {!checkingToken && !accessToken && !success && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="text"
                onClick={() => navigate('/forgot-password')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Solicita un nou link de resetare
              </Button>
            </Box>
          )}
        </Paper>
      </Grow>
    </Box>
  );
};

export default ResetPasswordPage;
