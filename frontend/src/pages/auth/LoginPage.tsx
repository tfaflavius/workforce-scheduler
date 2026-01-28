import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Paper,
  Stack,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as ManagerIcon,
  Badge as EmployeeIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/slices/auth.slice';
import { supabase } from '../../lib/supabase';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (authData.session) {
        // Get user data from backend
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${authData.session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to get user data');
        }

        const user = await response.json();
        dispatch(setCredentials({ user, token: authData.session.access_token }));
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword);
  };

  const testAccounts = [
    {
      role: 'Administrator',
      email: 'admin@workforce.com',
      password: 'admin123',
      icon: <AdminIcon sx={{ color: '#d32f2f' }} />,
      color: '#ffebee',
      borderColor: '#d32f2f',
    },
    {
      role: 'Manager',
      email: 'manager@workforce.com',
      password: 'manager123',
      icon: <ManagerIcon sx={{ color: '#ed6c02' }} />,
      color: '#fff3e0',
      borderColor: '#ed6c02',
    },
    {
      role: 'Angajat',
      email: 'angajat@workforce.com',
      password: 'angajat123',
      icon: <EmployeeIcon sx={{ color: '#0288d1' }} />,
      color: '#e3f2fd',
      borderColor: '#0288d1',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {/* Left Side - Branding */}
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 6,
          color: 'white',
        }}
      >
        <Box sx={{ textAlign: 'center', maxWidth: 500 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              mb: 4,
            }}
          >
            <CalendarIcon sx={{ fontSize: 64 }} />
            <Typography variant="h2" fontWeight="bold">
              WorkSchedule
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ mb: 3, opacity: 0.9 }}>
            Sistem de Gestiune a Programului de Lucru
          </Typography>

          <Typography variant="body1" sx={{ opacity: 0.8, lineHeight: 1.8 }}>
            Platforma completă pentru gestionarea programelor de lucru.
            Managerii creează programe, administratorii le aprobă, iar
            angajații își pot vizualiza programul zilnic și lunar.
          </Typography>

          <Box sx={{ mt: 6 }}>
            <Stack direction="row" spacing={4} justifyContent="center">
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight="bold">100+</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Angajați</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight="bold">50+</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Programe/Lună</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight="bold">99%</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Satisfacție</Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Right Side - Login Form */}
      <Box
        sx={{
          flex: { xs: 1, md: 0 },
          width: { md: 500 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'white',
          p: { xs: 2, sm: 4 },
        }}
      >
        <Container maxWidth="sm">
          {/* Mobile Logo */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              mb: 4,
            }}
          >
            <CalendarIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h5" fontWeight="bold" color="primary">
              WorkSchedule
            </Typography>
          </Box>

          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Bine ai venit!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Autentifică-te pentru a accesa platforma
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Email sau parolă incorecte. Încearcă din nou.
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Adresa de Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              autoComplete="email"
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Parolă"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
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
              disabled={isLoading}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
                },
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Autentificare'
              )}
            </Button>
          </form>

          <Divider sx={{ my: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Conturi de test
            </Typography>
          </Divider>

          {/* Test Accounts */}
          <Stack spacing={1.5}>
            {testAccounts.map((account) => (
              <Paper
                key={account.role}
                elevation={0}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: account.color,
                    borderColor: account.borderColor,
                    transform: 'translateX(4px)',
                  },
                }}
                onClick={() => handleQuickLogin(account.email, account.password)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {account.icon}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {account.role}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {account.email}
                    </Typography>
                  </Box>
                  <PersonIcon color="action" fontSize="small" />
                </Box>
              </Paper>
            ))}
          </Stack>

          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            textAlign="center"
            sx={{ mt: 4 }}
          >
            Click pe un cont pentru a completa automat credențialele
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default LoginPage;
