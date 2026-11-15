import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Slide, Button, Box, IconButton, Typography, alpha, useTheme } from '@mui/material';
import {
  CheckRounded as SuccessIcon,
  PriorityHighRounded as ErrorIcon,
  WarningAmberRounded as WarningIcon,
  InfoOutlined as InfoIcon,
  CloseRounded as CloseIcon,
} from '@mui/icons-material';
import type { AlertColor } from '@mui/material';
import type { SlideProps } from '@mui/material/Slide';

interface SnackbarMessage {
  message: string;
  severity: AlertColor;
  duration?: number;
  /** Optional action button (e.g. "Undo", "Retry", "View") */
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface SnackbarContextType {
  notify: (message: string, severity?: AlertColor, duration?: number) => void;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyWarning: (message: string) => void;
  notifyInfo: (message: string) => void;
  /** Show notification with an action button (e.g. Undo) */
  notifyWithAction: (
    message: string,
    action: { label: string; onClick: () => void },
    severity?: AlertColor,
    duration?: number,
  ) => void;
}

const SnackbarContext = createContext<SnackbarContextType | null>(null);

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

const TOAST_STYLE: Record<AlertColor, { gradient: string; icon: React.ReactNode }> = {
  success: { gradient: 'linear-gradient(135deg, #059669 0%, #22c55e 100%)', icon: <SuccessIcon /> },
  error: { gradient: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)', icon: <ErrorIcon /> },
  warning: { gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', icon: <WarningIcon /> },
  info: { gradient: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)', icon: <InfoIcon /> },
};

/** Notificarea de jos: card din sticla, iconita colorata animata, bara de timp. */
const Toast = React.forwardRef<
  HTMLDivElement,
  { snack: SnackbarMessage; onClose: () => void; onAction: () => void }
>(({ snack, onClose, onAction }, ref) => {
  const theme = useTheme();
  const st = TOAST_STYLE[snack.severity] || TOAST_STYLE.info;
  const isLight = theme.palette.mode === 'light';
  return (
    <Box
      ref={ref}
      role="alert"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minWidth: { xs: 'calc(100vw - 32px)', sm: 340 },
        maxWidth: { xs: 'calc(100vw - 32px)', sm: 480 },
        pl: 1.25,
        pr: 0.5,
        py: 1.1,
        borderRadius: 4,
        bgcolor: alpha(theme.palette.background.paper, isLight ? 0.92 : 0.9),
        backdropFilter: 'saturate(180%) blur(18px)',
        WebkitBackdropFilter: 'saturate(180%) blur(18px)',
        border: `1px solid ${alpha(isLight ? '#0f172a' : '#ffffff', 0.08)}`,
        boxShadow: `0 12px 32px ${alpha('#0f172a', isLight ? 0.18 : 0.5)}`,
      }}
    >
      <Box sx={{ position: 'relative', flexShrink: 0, width: 38, height: 38 }}>
        {/* Inel care se extinde (efect de "reusit") */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: st.gradient,
            animation: 'toastRing 0.9s ease-out both',
            '@keyframes toastRing': {
              from: { transform: 'scale(1)', opacity: 0.55 },
              to: { transform: 'scale(2.1)', opacity: 0 },
            },
          }}
        />
        <Box
          sx={{
            position: 'relative',
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: st.gradient,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            animation: 'toastPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both',
            '@keyframes toastPop': {
              from: { transform: 'scale(0) rotate(-45deg)' },
              to: { transform: 'scale(1) rotate(0)' },
            },
            '& .MuiSvgIcon-root': { fontSize: 22 },
          }}
        >
          {st.icon}
        </Box>
      </Box>
      <Typography variant="body2" sx={{ flex: 1, minWidth: 0, fontWeight: 600, color: 'text.primary' }}>
        {snack.message}
      </Typography>
      {snack.action && (
        <Button size="small" onClick={onAction} sx={{ fontWeight: 700, textTransform: 'none', minWidth: 'auto' }}>
          {snack.action.label}
        </Button>
      )}
      <IconButton size="small" aria-label="Inchide" onClick={onClose} sx={{ color: 'text.secondary' }}>
        <CloseIcon fontSize="small" />
      </IconButton>
      {/* Bara de timp ramas */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          height: 3,
          width: '100%',
          background: st.gradient,
          transformOrigin: 'left',
          animation: `toastTimer ${snack.duration ?? 4000}ms linear both`,
          '@keyframes toastTimer': { from: { transform: 'scaleX(1)' }, to: { transform: 'scaleX(0)' } },
        }}
      />
    </Box>
  );
});
Toast.displayName = 'Toast';

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snack, setSnack] = useState<SnackbarMessage | null>(null);
  const [open, setOpen] = useState(false);
  const [toastKey, setToastKey] = useState(0);

  const notify = useCallback((message: string, severity: AlertColor = 'info', duration = 4000) => {
    // Close current snackbar first to allow re-trigger of same message
    setOpen(false);
    setTimeout(() => {
      setSnack({ message, severity, duration });
      setToastKey((k) => k + 1);
      setOpen(true);
      // Vibratie scurta pe telefon (succes: una, eroare: doua)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator && window.matchMedia?.('(pointer: coarse)').matches) {
        if (severity === 'success') navigator.vibrate(15);
        else if (severity === 'error') navigator.vibrate([20, 60, 20]);
      }
    }, 100);
  }, []);

  const notifyWithAction = useCallback(
    (
      message: string,
      action: { label: string; onClick: () => void },
      severity: AlertColor = 'info',
      duration = 6000,
    ) => {
      setOpen(false);
      setTimeout(() => {
        setSnack({ message, severity, duration, action });
        setToastKey((k) => k + 1);
        setOpen(true);
      }, 100);
    },
    [],
  );

  const notifySuccess = useCallback((message: string) => notify(message, 'success'), [notify]);
  const notifyError = useCallback((message: string) => notify(message, 'error', 6000), [notify]);
  const notifyWarning = useCallback((message: string) => notify(message, 'warning', 5000), [notify]);
  const notifyInfo = useCallback((message: string) => notify(message, 'info'), [notify]);

  const handleClose = (_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  const handleActionClick = () => {
    snack?.action?.onClick();
    setOpen(false);
  };

  return (
    <SnackbarContext.Provider
      value={{ notify, notifySuccess, notifyError, notifyWarning, notifyInfo, notifyWithAction }}
    >
      {children}
      <Snackbar
        open={open}
        autoHideDuration={snack?.duration ?? 4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        TransitionComponent={SlideTransition}
        // Pe telefon apare deasupra barei de jos
        sx={{ bottom: { xs: 'calc(76px + env(safe-area-inset-bottom)) !important', lg: '24px !important' } }}
      >
        <Box>{snack && <Toast key={toastKey} snack={snack} onClose={handleClose} onAction={handleActionClick} />}</Box>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = (): SnackbarContextType => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};
