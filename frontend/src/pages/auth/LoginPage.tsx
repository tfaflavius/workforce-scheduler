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
  Stack,
  Tabs,
  Tab,
  Collapse,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/slices/auth.slice';
import { supabase } from '../../lib/supabase';

export const LoginPage = () => {
  const [activeTab, setActiveTab] = useState(0); // 0 = Login, 1 = Register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhone('');
    setError(null);
    setSuccess(null);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    resetForm();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (authData.session) {
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
      setError('Email sau parolă incorecte. Încearcă din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Parolele nu coincid');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Parola trebuie să aibă cel puțin 6 caractere');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phone: phone || undefined,
          role: 'ANGAJAT',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Înregistrarea a eșuat');
      }

      // Show success message - don't auto-login (requires admin approval)
      setSuccess(data.message || 'Cont creat cu succes! Un administrator va aproba contul tău în curând.');

      // Reset form
      resetForm();

    } catch (err: any) {
      console.error('Registration failed:', err);
      if (err.message.includes('already exists')) {
        setError('Un cont cu acest email există deja');
      } else {
        setError(err.message || 'Înregistrarea a eșuat. Încearcă din nou.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {/* Left Side - Branding (hidden on mobile) */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
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

      {/* Right Side - Auth Forms */}
      <Box
        sx={{
          width: { xs: '100%', md: 480 },
          minWidth: { xs: '100%', md: 480 },
          flexShrink: 0,
          minHeight: { xs: '100vh', md: '100vh' },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'white',
          p: { xs: 3, sm: 4 },
          overflowY: 'auto',
        }}
      >
        <Container maxWidth="sm" sx={{ my: 'auto', py: 2 }}>
          {/* Mobile Logo */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              mb: 3,
            }}
          >
            <CalendarIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h5" fontWeight="bold" color="primary">
              WorkSchedule
            </Typography>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                },
              }}
            >
              <Tab label="Autentificare" />
              <Tab label="Înregistrare" />
            </Tabs>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {/* Login Form */}
          <Collapse in={activeTab === 0}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Bine ai venit!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Autentifică-te pentru a accesa platforma
            </Typography>

            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Adresa de Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                autoComplete="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1 }}
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

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Nu ai cont?{' '}
                <Typography
                  component="span"
                  variant="body2"
                  color="primary"
                  sx={{ cursor: 'pointer', fontWeight: 500 }}
                  onClick={() => setActiveTab(1)}
                >
                  Înregistrează-te
                </Typography>
              </Typography>
            </Box>
          </Collapse>

          {/* Register Form */}
          <Collapse in={activeTab === 1}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Creează un cont
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Completează datele pentru a te înregistra
            </Typography>

            <form onSubmit={handleRegister}>
              <TextField
                fullWidth
                label="Nume complet"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                margin="normal"
                required
                autoComplete="name"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1 }}
              />

              <TextField
                fullWidth
                label="Adresa de Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                autoComplete="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1 }}
              />

              <TextField
                fullWidth
                label="Telefon (opțional)"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                margin="normal"
                autoComplete="tel"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1 }}
              />

              <TextField
                fullWidth
                label="Parolă"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                autoComplete="new-password"
                helperText="Minim 6 caractere"
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
                sx={{ mb: 1 }}
              />

              <TextField
                fullWidth
                label="Confirmă parola"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                required
                autoComplete="new-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={isLoading || !!success}
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
                  'Creează cont'
                )}
              </Button>
            </form>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Ai deja un cont?{' '}
                <Typography
                  component="span"
                  variant="body2"
                  color="primary"
                  sx={{ cursor: 'pointer', fontWeight: 500 }}
                  onClick={() => setActiveTab(0)}
                >
                  Autentifică-te
                </Typography>
              </Typography>
            </Box>
          </Collapse>
        </Container>
      </Box>
    </Box>
  );
};

export default LoginPage;
