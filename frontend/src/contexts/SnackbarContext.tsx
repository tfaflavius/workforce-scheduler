import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';
import type { AlertColor } from '@mui/material';
import type { SlideProps } from '@mui/material/Slide';

interface SnackbarMessage {
  message: string;
  severity: AlertColor;
  duration?: number;
}

interface SnackbarContextType {
  notify: (message: string, severity?: AlertColor, duration?: number) => void;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyWarning: (message: string) => void;
  notifyInfo: (message: string) => void;
}

const SnackbarContext = createContext<SnackbarContextType | null>(null);

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snack, setSnack] = useState<SnackbarMessage | null>(null);
  const [open, setOpen] = useState(false);

  const notify = useCallback((message: string, severity: AlertColor = 'info', duration = 4000) => {
    // Close current snackbar first to allow re-trigger of same message
    setOpen(false);
    setTimeout(() => {
      setSnack({ message, severity, duration });
      setOpen(true);
    }, 100);
  }, []);

  const notifySuccess = useCallback((message: string) => notify(message, 'success'), [notify]);
  const notifyError = useCallback((message: string) => notify(message, 'error', 6000), [notify]);
  const notifyWarning = useCallback((message: string) => notify(message, 'warning', 5000), [notify]);
  const notifyInfo = useCallback((message: string) => notify(message, 'info'), [notify]);

  const handleClose = (_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  return (
    <SnackbarContext.Provider value={{ notify, notifySuccess, notifyError, notifyWarning, notifyInfo }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={snack?.duration ?? 4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        TransitionComponent={SlideTransition}
        sx={{ mb: { xs: 1, sm: 2 } }}
      >
        <Alert
          onClose={handleClose}
          severity={snack?.severity ?? 'info'}
          variant="filled"
          elevation={6}
          sx={{ width: '100%', borderRadius: 2, fontWeight: 500 }}
        >
          {snack?.message}
        </Alert>
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
