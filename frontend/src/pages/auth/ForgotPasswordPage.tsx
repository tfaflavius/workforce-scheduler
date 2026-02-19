import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Paper,
  useMediaQuery,
  useTheme,
  Fade,
  Grow,
  alpha,
} from '@mui/material';
import {
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const ForgotPasswordPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'A aparut o eroare');
      }

      setSuccess(data.message);
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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated background shapes */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '8%',
          width: { xs: 80, sm: 120, md: 160 },
          height: { xs: 80, sm: 120, md: 160 },
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          animation: 'float 6s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-20px)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '12%',
          right: '8%',
          width: { xs: 60, sm: 100, md: 130 },
          height: { xs: 60, sm: 100, md: 130 },
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.03)',
          animation: 'float 8s ease-in-out infinite reverse',
          animationDelay: '2s',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          right: '25%',
          width: { xs: 40, sm: 60, md: 80 },
          height: { xs: 40, sm: 60, md: 80 },
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.04)',
          animation: 'float 7s ease-in-out infinite',
          animationDelay: '4s',
          display: { xs: 'none', md: 'block' },
        }}
      />

      <Grow in={true} timeout={600}>
        <Paper
          elevation={16}
          sx={{
            width: '100%',
            maxWidth: 460,
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            bgcolor: theme.palette.mode === 'light' ? 'white' : alpha('#1e293b', 0.95),
            position: 'relative',
            zIndex: 1,
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
              Resetare Parola
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Introdu adresa de email asociata contului tau si iti vom trimite un link de resetare.
            </Typography>
          </Box>

          {error && (
            <Fade in={true}>
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            </Fade>
          )}

          {success && (
            <Fade in={true}>
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                {success}
              </Alert>
            </Fade>
          )}

          {!success ? (
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Adresa de Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                size={isMobile ? 'small' : 'medium'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
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
                disabled={isLoading || !email}
                sx={{
                  py: 1.5,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
                    boxShadow: '0 6px 20px rgba(37, 99, 235, 0.5)',
                    transform: 'translateY(-2px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  mb: 2,
                }}
              >
                {isLoading ? <CircularProgress size={26} color="inherit" /> : 'Trimite link de resetare'}
              </Button>
            </form>
          ) : null}

          <Box sx={{ textAlign: 'center' }}>
            <Button
              component={RouterLink}
              to="/login"
              startIcon={<ArrowBackIcon />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Inapoi la autentificare
            </Button>
          </Box>
        </Paper>
      </Grow>
    </Box>
  );
};

export default ForgotPasswordPage;
