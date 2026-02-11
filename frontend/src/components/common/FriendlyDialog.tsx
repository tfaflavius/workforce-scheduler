import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  alpha,
  useTheme,
  useMediaQuery,
  Slide,
  Fade,
  CircularProgress,
  Zoom,
  keyframes,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { TransitionProps } from '@mui/material/transitions';

// Animations
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
`;

// Slide transition for mobile
const SlideTransition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export type DialogVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary';

export interface FriendlyDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: DialogVariant;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  loadingText?: string;
  showCloseButton?: boolean;
  disableBackdropClick?: boolean;
  // For confirm dialogs
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  confirmVariant?: 'contained' | 'outlined' | 'text';
}

const variantColors: Record<DialogVariant, { gradient: string; main: string; light: string }> = {
  default: {
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    main: '#6366f1',
    light: '#818cf8',
  },
  success: {
    gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    main: '#10b981',
    light: '#34d399',
  },
  warning: {
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    main: '#f59e0b',
    light: '#fbbf24',
  },
  error: {
    gradient: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
    main: '#ef4444',
    light: '#f87171',
  },
  info: {
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
    main: '#06b6d4',
    light: '#22d3ee',
  },
  primary: {
    gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    main: '#2563eb',
    light: '#60a5fa',
  },
  secondary: {
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    main: '#7c3aed',
    light: '#a78bfa',
  },
};

export const FriendlyDialog: React.FC<FriendlyDialogProps> = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  variant = 'default',
  children,
  actions,
  maxWidth = 'sm',
  loading = false,
  loadingText = 'Se încarcă...',
  showCloseButton = true,
  disableBackdropClick = false,
  confirmText,
  cancelText = 'Anulează',
  onConfirm,
  confirmLoading = false,
  confirmDisabled = false,
  confirmVariant = 'contained',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const colors = variantColors[variant];

  const handleClose = (_event: {}, reason: 'backdropClick' | 'escapeKeyDown') => {
    if (disableBackdropClick && reason === 'backdropClick') return;
    if (confirmLoading) return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth
      fullScreen={isMobile}
      TransitionComponent={isMobile ? SlideTransition : Fade}
      transitionDuration={{ enter: 350, exit: 250 }}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          overflow: 'hidden',
          boxShadow: theme.palette.mode === 'light'
            ? `0 25px 50px -12px ${alpha(colors.main, 0.25)}`
            : `0 25px 50px -12px ${alpha('#000', 0.5)}`,
        },
      }}
    >
      {/* Animated Header */}
      <Box
        sx={{
          background: colors.gradient,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.1)}, transparent)`,
            backgroundSize: '200% 100%',
            animation: `${shimmer} 3s ease-in-out infinite`,
          },
        }}
      >
        {/* Decorative circles */}
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 120,
            height: 120,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.1),
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.08),
          }}
        />

        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: { xs: 2.5, sm: 3 },
            px: { xs: 2.5, sm: 3 },
            pr: showCloseButton ? 7 : undefined,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {icon && (
            <Zoom in={open} timeout={400}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  bgcolor: alpha('#fff', 0.2),
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: `${float} 3s ease-in-out infinite`,
                  boxShadow: `0 8px 32px ${alpha('#000', 0.1)}`,
                  '& > svg': {
                    fontSize: { xs: 26, sm: 30 },
                  },
                }}
              >
                {icon}
              </Box>
            </Zoom>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              component="span"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.15rem', sm: '1.35rem' },
                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                display: 'block',
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.9,
                  mt: 0.5,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </DialogTitle>

        {showCloseButton && (
          <IconButton
            onClick={() => onClose()}
            disabled={confirmLoading}
            sx={{
              position: 'absolute',
              right: { xs: 8, sm: 12 },
              top: { xs: 8, sm: 12 },
              color: 'white',
              bgcolor: alpha('#fff', 0.15),
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease',
              zIndex: 2,
              '&:hover': {
                bgcolor: alpha('#fff', 0.25),
                transform: 'rotate(90deg)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Content */}
      <DialogContent
        sx={{
          p: { xs: 2.5, sm: 3 },
          bgcolor: theme.palette.background.paper,
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
            }}
          >
            <Box
              sx={{
                position: 'relative',
                display: 'inline-flex',
              }}
            >
              <CircularProgress
                size={56}
                thickness={4}
                sx={{
                  color: colors.main,
                  animation: `${pulse} 1.5s ease-in-out infinite`,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: alpha(colors.main, 0.1),
                }}
              />
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2.5, fontWeight: 500 }}
            >
              {loadingText}
            </Typography>
          </Box>
        ) : (
          <Fade in={!loading} timeout={300}>
            <Box>{children}</Box>
          </Fade>
        )}
      </DialogContent>

      {/* Actions */}
      {(actions || onConfirm) && (
        <DialogActions
          sx={{
            px: { xs: 2.5, sm: 3 },
            py: { xs: 2, sm: 2.5 },
            gap: 1.5,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            bgcolor: alpha(theme.palette.background.default, 0.5),
          }}
        >
          {actions || (
            <>
              <Button
                onClick={() => onClose()}
                disabled={confirmLoading}
                sx={{
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  fontWeight: 600,
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.text.secondary, 0.08),
                  },
                }}
              >
                {cancelText}
              </Button>
              <Button
                onClick={onConfirm}
                variant={confirmVariant}
                disabled={confirmLoading || confirmDisabled}
                sx={{
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  fontWeight: 600,
                  minWidth: 120,
                  bgcolor: confirmVariant === 'contained' ? colors.main : undefined,
                  color: confirmVariant === 'contained' ? 'white' : colors.main,
                  borderColor: confirmVariant === 'outlined' ? colors.main : undefined,
                  boxShadow: confirmVariant === 'contained'
                    ? `0 4px 14px ${alpha(colors.main, 0.4)}`
                    : undefined,
                  '&:hover': {
                    bgcolor: confirmVariant === 'contained'
                      ? colors.light
                      : alpha(colors.main, 0.08),
                    borderColor: confirmVariant === 'outlined' ? colors.light : undefined,
                  },
                }}
              >
                {confirmLoading ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  confirmText
                )}
              </Button>
            </>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default FriendlyDialog;
