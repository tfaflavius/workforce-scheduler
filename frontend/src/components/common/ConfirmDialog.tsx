import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  alpha,
  useTheme,
  useMediaQuery,
  Fade,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  /** Additional detail text shown in smaller font */
  detail?: string;
  /** Visual style: 'danger' for destructive, 'warning' for caution, 'info' for neutral */
  variant?: 'danger' | 'warning' | 'info';
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

const variantConfig = {
  danger: { icon: <DeleteIcon />, palette: 'error' as const },
  warning: { icon: <WarningIcon />, palette: 'warning' as const },
  info: { icon: <InfoIcon />, palette: 'info' as const },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  detail,
  variant = 'danger',
  confirmLabel = 'Confirma',
  cancelLabel = 'Anuleaza',
  isLoading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const config = variantConfig[variant];
  const color = theme.palette[config.palette].main;

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: { xs: 2, sm: 3 },
          mx: { xs: 2 },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: { xs: 2.5, sm: 3 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Fade in={open} timeout={300}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                bgcolor: alpha(color, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
                '& .MuiSvgIcon-root': {
                  fontSize: 26,
                  color,
                },
              }}
            >
              {config.icon}
            </Box>
          </Fade>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.125rem' } }}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', pb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: detail ? 1 : 0 }}>
          {message}
        </Typography>
        {detail && (
          <Typography variant="caption" color="text.disabled">
            {detail}
          </Typography>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 2.5 },
          pt: 1,
          flexDirection: isMobile ? 'column-reverse' : 'row',
          gap: 1,
        }}
      >
        <Button
          onClick={onClose}
          disabled={isLoading}
          fullWidth={isMobile}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            color: 'text.secondary',
          }}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={isLoading}
          fullWidth={isMobile}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            bgcolor: color,
            '&:hover': { bgcolor: theme.palette[config.palette].dark },
          }}
        >
          {isLoading ? 'Se proceseaza...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
