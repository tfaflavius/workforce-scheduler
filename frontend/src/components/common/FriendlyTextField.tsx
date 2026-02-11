import React, { useState } from 'react';
import {
  TextField,
  InputAdornment,
  Box,
  Typography,
  alpha,
  useTheme,
  Collapse,
  Fade,
} from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

export interface FriendlyTextFieldProps extends Omit<TextFieldProps, 'variant'> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  showSuccessState?: boolean;
  successMessage?: string;
  hint?: string;
  characterLimit?: number;
  variant?: 'outlined' | 'filled' | 'standard';
}

export const FriendlyTextField: React.FC<FriendlyTextFieldProps> = ({
  startIcon,
  endIcon,
  showSuccessState = false,
  successMessage,
  hint,
  characterLimit,
  error,
  helperText,
  value,
  onChange,
  onFocus,
  onBlur,
  sx,
  InputProps,
  ...props
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const currentLength = typeof value === 'string' ? value.length : 0;
  const isNearLimit = !!(characterLimit && currentLength > characterLimit * 0.8);
  const isOverLimit = !!(characterLimit && currentLength > characterLimit);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getStateColor = () => {
    if (error || isOverLimit) return theme.palette.error.main;
    if (showSuccessState && value) return theme.palette.success.main;
    if (isFocused) return theme.palette.primary.main;
    return undefined;
  };

  const stateColor = getStateColor();

  return (
    <Box sx={{ width: '100%' }}>
      <TextField
        {...props}
        value={value}
        onChange={onChange}
        error={error || isOverLimit}
        onFocus={handleFocus}
        onBlur={handleBlur}
        InputProps={{
          ...InputProps,
          startAdornment: startIcon ? (
            <InputAdornment position="start">
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stateColor || 'action.active',
                  transition: 'all 0.2s ease',
                  transform: isFocused ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {startIcon}
              </Box>
            </InputAdornment>
          ) : InputProps?.startAdornment,
          endAdornment: (
            <>
              {endIcon && (
                <InputAdornment position="end">
                  {endIcon}
                </InputAdornment>
              )}
              {showSuccessState && value && !error && (
                <Fade in>
                  <InputAdornment position="end">
                    <CheckIcon sx={{ color: 'success.main', fontSize: 20 }} />
                  </InputAdornment>
                </Fade>
              )}
              {(error || isOverLimit) && (
                <Fade in>
                  <InputAdornment position="end">
                    <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
                  </InputAdornment>
                </Fade>
              )}
              {InputProps?.endAdornment}
            </>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2.5,
            transition: 'all 0.25s ease',
            bgcolor: theme.palette.mode === 'light'
              ? alpha(theme.palette.background.paper, 0.8)
              : alpha(theme.palette.background.paper, 0.4),
            '&:hover': {
              bgcolor: theme.palette.background.paper,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.08)}`,
            },
            '&.Mui-focused': {
              bgcolor: theme.palette.background.paper,
              boxShadow: `0 4px 20px ${alpha(stateColor || theme.palette.primary.main, 0.15)}`,
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: 2,
                borderColor: stateColor,
              },
            },
            '&.Mui-error': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.error.main,
              },
            },
          },
          '& .MuiInputLabel-root': {
            '&.Mui-focused': {
              color: stateColor,
            },
          },
          ...sx,
        }}
      />

      {/* Helper text area */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mt: 0.5,
          px: 1.5,
          minHeight: 20,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Collapse in={!!(error && helperText)}>
            <Typography
              variant="caption"
              sx={{
                color: 'error.main',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {helperText}
            </Typography>
          </Collapse>
          <Collapse in={!!(showSuccessState && value && !error && successMessage)}>
            <Typography
              variant="caption"
              sx={{
                color: 'success.main',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {successMessage}
            </Typography>
          </Collapse>
          <Collapse in={!!(hint && !error && !(showSuccessState && value))}>
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          </Collapse>
        </Box>

        {characterLimit && (
          <Typography
            variant="caption"
            sx={{
              color: isOverLimit
                ? 'error.main'
                : isNearLimit
                ? 'warning.main'
                : 'text.secondary',
              fontWeight: isNearLimit ? 600 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            {currentLength}/{characterLimit}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default FriendlyTextField;
