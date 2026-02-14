import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Button,
  Stack,
  Typography,
  IconButton,
  Paper,
  Box,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  GetApp as InstallIcon,
  Close as CloseIcon,
  PhoneAndroid as MobileIcon,
  Share as ShareIcon,
} from '@mui/icons-material';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export const InstallPrompt: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(iOS);

    // Listen for install prompt (Chrome, Edge, Samsung Internet)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if user dismissed before (localStorage)
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedAt = dismissed ? parseInt(dismissed) : 0;
      const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);

      // Show again after 7 days
      if (!dismissed || daysSinceDismissed > 7) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show manual instructions after delay
    if (iOS && !standalone) {
      const dismissed = localStorage.getItem('pwa-ios-dismissed');
      const dismissedAt = dismissed ? parseInt(dismissed) : 0;
      const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);

      if (!dismissed || daysSinceDismissed > 14) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem('pwa-ios-dismissed', Date.now().toString());
    } else {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }
  };

  // Don't show if already installed
  if (isStandalone) return null;

  return (
    <Snackbar
      open={showPrompt}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: { xs: 16, sm: 24 } }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 2,
          mx: 2,
          maxWidth: 400,
          borderRadius: 3,
          bgcolor: 'background.paper',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  display: 'flex',
                }}
              >
                <MobileIcon sx={{ color: 'white' }} />
              </Box>
              <Typography variant="subtitle1" fontWeight="bold">
                Instaleaza Aplicatia
              </Typography>
            </Stack>
            <IconButton size="small" onClick={handleDismiss}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {isIOS
              ? 'Adauga WorkSchedule pe ecranul principal pentru acces rapid si notificari.'
              : 'Instaleaza WorkSchedule pe dispozitivul tau pentru acces rapid, notificari push si utilizare offline.'}
          </Typography>

          {!isIOS && deferredPrompt && (
            <Button
              variant="contained"
              startIcon={<InstallIcon />}
              onClick={handleInstall}
              fullWidth
              size={isMobile ? 'large' : 'medium'}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Instaleaza Acum
            </Button>
          )}

          {isIOS && (
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'action.hover',
                borderRadius: 2,
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ShareIcon fontSize="small" color="primary" />
                  <Typography variant="body2">
                    1. Apasa butonul <strong>Share</strong>
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <InstallIcon fontSize="small" color="primary" />
                  <Typography variant="body2">
                    2. Selecteaza <strong>"Add to Home Screen"</strong>
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          )}
        </Stack>
      </Paper>
    </Snackbar>
  );
};

export default InstallPrompt;
