import { useState } from 'react';
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
  Stack,
  Tabs,
  Tab,
  Collapse,
  Paper,
  useMediaQuery,
  useTheme,
  Fade,
  Grow,
  alpha,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/slices/auth.slice';
import { supabase } from '../../lib/supabase';

export const LoginPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [activeTab, setActiveTab] = useState(0);
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
      setError('Email sau parola incorecte. Incearca din nou.');
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
      setError('Parola trebuie sa aiba cel putin 6 caractere');
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
          role: 'USER',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Inregistrarea a esuat');
      }

      setSuccess(data.message || 'Cont creat cu succes! Un administrator va aproba contul tau in curand.');
      resetForm();

    } catch (err: any) {
      console.error('Registration failed:', err);
      if (err.message.includes('already exists')) {
        setError('Un cont cu acest email exista deja');
      } else {
        setError(err.message || 'Inregistrarea a esuat. Incearca din nou.');
      }
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
        background: theme.palette.mode === 'light'
          ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #ec4899 100%)'
          : 'linear-gradient(135deg, #1e40af 0%, #5b21b6 50%, #be185d 100%)',
        overflow: 'auto',
        position: 'relative',
      }}
    >
      {/* Animated background shapes */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: { xs: 100, sm: 150, md: 200 },
          height: { xs: 100, sm: 150, md: 200 },
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
          bottom: '15%',
          right: '10%',
          width: { xs: 80, sm: 120, md: 160 },
          height: { xs: 80, sm: 120, md: 160 },
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.03)',
          animation: 'float 8s ease-in-out infinite reverse',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '40%',
          right: '30%',
          width: { xs: 60, sm: 80, md: 100 },
          height: { xs: 60, sm: 80, md: 100 },
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.04)',
          animation: 'float 7s ease-in-out infinite',
          display: { xs: 'none', md: 'block' },
        }}
      />

      {/* Main Container */}
      <Box
        sx={{
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: 'stretch',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Left Side - Branding */}
        <Fade in={true} timeout={800}>
          <Box
            sx={{
              flex: { xs: 'none', lg: 1 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              p: { xs: 3, sm: 4, md: 6 },
              color: 'white',
              minHeight: { xs: 'auto', lg: '100vh' },
            }}
          >
            <Box sx={{ textAlign: 'center', maxWidth: 600, width: '100%' }}>
              {/* Logo */}
              <Grow in={true} timeout={1000}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: { xs: 1.5, sm: 2 },
                    mb: { xs: 2, sm: 4 },
                  }}
                >
                  <Box
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      borderRadius: 3,
                      bgcolor: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    }}
                  >
                    <CalendarIcon sx={{ fontSize: { xs: 36, sm: 48, md: 56 } }} />
                  </Box>
                  <Typography
                    variant="h2"
                    fontWeight="bold"
                    sx={{
                      fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
                      textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    }}
                  >
                    WorkSchedule
                  </Typography>
                </Box>
              </Grow>

              <Fade in={true} timeout={1200}>
                <Typography
                  variant="h5"
                  sx={{
                    mb: { xs: 2, sm: 3 },
                    opacity: 0.95,
                    fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
                    display: { xs: 'none', sm: 'block' },
                    fontWeight: 500,
                  }}
                >
                  Sistem de Gestiune a Programului de Lucru
                </Typography>
              </Fade>

              <Fade in={true} timeout={1400}>
                <Typography
                  variant="body1"
                  sx={{
                    opacity: 0.85,
                    lineHeight: 1.8,
                    display: { xs: 'none', md: 'block' },
                    fontSize: { md: '1rem', lg: '1.1rem' },
                  }}
                >
                  Platforma completa pentru gestionarea programelor de lucru.
                  Managerii creeaza programe, administratorii le aproba, iar
                  angajatii isi pot vizualiza programul zilnic si lunar.
                </Typography>
              </Fade>

              {/* Stats */}
              <Grow in={true} timeout={1600}>
                <Box sx={{ mt: { sm: 5, md: 6 }, display: { xs: 'none', sm: 'block' } }}>
                  <Stack
                    direction="row"
                    spacing={{ sm: 2, md: 4 }}
                    justifyContent="center"
                    flexWrap="wrap"
                  >
                    {[
                      { value: '100+', label: 'Angajati' },
                      { value: '50+', label: 'Programe/Luna' },
                      { value: '99%', label: 'Satisfactie' },
                    ].map((stat) => (
                      <Box
                        key={stat.label}
                        sx={{
                          textAlign: 'center',
                          p: { sm: 2, md: 3 },
                          borderRadius: 3,
                          bgcolor: 'rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(10px)',
                          minWidth: { sm: 100, md: 120 },
                          transition: 'transform 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                          },
                        }}
                      >
                        <Typography
                          variant="h3"
                          fontWeight="bold"
                          sx={{
                            fontSize: { sm: '1.75rem', md: '2.25rem', lg: '2.75rem' },
                            mb: 0.5,
                          }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 500 }}>
                          {stat.label}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Grow>
            </Box>
          </Box>
        </Fade>

        {/* Right Side - Auth Forms */}
        <Grow in={true} timeout={600}>
          <Box
            sx={{
              flex: { xs: 1, lg: 'none' },
              width: { xs: '100%', lg: '50%', xl: '40%' },
              maxWidth: { lg: 560 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              p: { xs: 2, sm: 3, md: 4 },
            }}
          >
            <Paper
              elevation={isMobile ? 0 : 16}
              sx={{
                width: '100%',
                maxWidth: { xs: '100%', sm: 480 },
                p: { xs: 3, sm: 4 },
                borderRadius: { xs: 3, sm: 4 },
                bgcolor: theme.palette.mode === 'light' ? 'white' : alpha('#1e293b', 0.95),
                backdropFilter: 'blur(20px)',
                boxShadow: isMobile ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
            >
              {/* Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant="fullWidth"
                  sx={{
                    '& .MuiTabs-indicator': {
                      height: 3,
                      borderRadius: '3px 3px 0 0',
                    },
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: { xs: '0.9rem', sm: '1rem' },
                      minHeight: 52,
                      transition: 'all 0.3s ease',
                    },
                  }}
                >
                  <Tab label="🔐 Autentificare" />
                  <Tab label="✨ Inregistrare" />
                </Tabs>
              </Box>

              {error && (
                <Fade in={true}>
                  <Alert
                    severity="error"
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                      '& .MuiAlert-message': { fontWeight: 500 },
                    }}
                  >
                    {error}
                  </Alert>
                </Fade>
              )}

              {success && (
                <Fade in={true}>
                  <Alert
                    severity="success"
                    icon={<SuccessIcon />}
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                      '& .MuiAlert-message': { fontWeight: 500 },
                    }}
                  >
                    {success}
                  </Alert>
                </Fade>
              )}

              {/* Login Form */}
              <Collapse in={activeTab === 0}>
                <Typography
                  variant="h5"
                  fontWeight="bold"
                  gutterBottom
                  sx={{ fontSize: { xs: '1.35rem', sm: '1.5rem' } }}
                >
                  Bine ai venit! 👋
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3, fontSize: { xs: '0.875rem', sm: '0.95rem' } }}
                >
                  Autentifica-te pentru a accesa platforma
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
                    size={isMobile ? 'small' : 'medium'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 1.5 }}
                  />

                  <TextField
                    fullWidth
                    label="Parola"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    margin="normal"
                    required
                    autoComplete="current-password"
                    size={isMobile ? 'small' : 'medium'}
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
                            size={isMobile ? 'small' : 'medium'}
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
                      py: { xs: 1.5, sm: 1.75 },
                      fontSize: { xs: '0.95rem', sm: '1.05rem' },
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
                    }}
                  >
                    {isLoading ? (
                      <CircularProgress size={26} color="inherit" />
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
                      sx={{
                        cursor: 'pointer',
                        fontWeight: 600,
                        '&:hover': { textDecoration: 'underline' },
                      }}
                      onClick={() => setActiveTab(1)}
                    >
                      Inregistreaza-te
                    </Typography>
                  </Typography>
                </Box>
              </Collapse>

              {/* Register Form */}
              <Collapse in={activeTab === 1}>
                <Typography
                  variant="h5"
                  fontWeight="bold"
                  gutterBottom
                  sx={{ fontSize: { xs: '1.35rem', sm: '1.5rem' } }}
                >
                  Creeaza un cont 🚀
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3, fontSize: { xs: '0.875rem', sm: '0.95rem' } }}
                >
                  Completeaza datele pentru a te inregistra
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
                    size={isMobile ? 'small' : 'medium'}
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
                    size={isMobile ? 'small' : 'medium'}
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
                    label="Telefon (optional)"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    margin="normal"
                    autoComplete="tel"
                    size={isMobile ? 'small' : 'medium'}
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
                    label="Parola"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    margin="normal"
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
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size={isMobile ? 'small' : 'medium'}
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
                    label="Confirma parola"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    margin="normal"
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
                    sx={{ mb: 2.5 }}
                  />

                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={isLoading || !!success}
                    sx={{
                      py: { xs: 1.5, sm: 1.75 },
                      fontSize: { xs: '0.95rem', sm: '1.05rem' },
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
                    }}
                  >
                    {isLoading ? (
                      <CircularProgress size={26} color="inherit" />
                    ) : (
                      'Creeaza cont'
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
                      sx={{
                        cursor: 'pointer',
                        fontWeight: 600,
                        '&:hover': { textDecoration: 'underline' },
                      }}
                      onClick={() => setActiveTab(0)}
                    >
                      Autentifica-te
                    </Typography>
                  </Typography>
                </Box>
              </Collapse>
            </Paper>
          </Box>
        </Grow>
      </Box>
    </Box>
  );
};

export default LoginPage;
