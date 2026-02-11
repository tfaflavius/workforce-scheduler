import React, { useState } from 'react';
import {
  Box,
  Typography,
  alpha,
  useTheme,
  useMediaQuery,
  Fade,
} from '@mui/material';
import { DatePicker, MobileDatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import {
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import type { Dayjs } from 'dayjs';
import 'dayjs/locale/ro';

export interface FriendlyDatePickerProps {
  label?: string;
  value: Dayjs | null;
  onChange: (date: Dayjs | null) => void;
  minDate?: Dayjs;
  maxDate?: Dayjs;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  showSuccessState?: boolean;
  hint?: string;
  format?: string;
  openTo?: 'day' | 'month' | 'year';
  views?: ('day' | 'month' | 'year')[];
  disablePast?: boolean;
  disableFuture?: boolean;
}

export const FriendlyDatePicker: React.FC<FriendlyDatePickerProps> = ({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  error,
  helperText,
  required,
  disabled,
  showSuccessState = false,
  hint,
  format = 'DD.MM.YYYY',
  openTo = 'day',
  views = ['year', 'month', 'day'],
  disablePast,
  disableFuture,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isFocused, setIsFocused] = useState(false);

  const getStateColor = () => {
    if (error) return theme.palette.error.main;
    if (showSuccessState && value) return theme.palette.success.main;
    if (isFocused) return theme.palette.primary.main;
    return undefined;
  };

  const stateColor = getStateColor();

  const commonProps = {
    label,
    value,
    onChange,
    minDate,
    maxDate,
    disabled,
    format,
    openTo,
    views,
    disablePast,
    disableFuture,
    onOpen: () => setIsFocused(true),
    onClose: () => setIsFocused(false),
    slotProps: {
      textField: {
        required,
        error,
        fullWidth: true,
        InputProps: {
          startAdornment: (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mr: 1,
                color: stateColor || 'action.active',
                transition: 'all 0.2s ease',
                transform: isFocused ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              <CalendarIcon />
            </Box>
          ),
          endAdornment: (
            <>
              {showSuccessState && value && !error && (
                <Fade in>
                  <Box sx={{ display: 'flex', mr: 1 }}>
                    <CheckIcon sx={{ color: 'success.main', fontSize: 20 }} />
                  </Box>
                </Fade>
              )}
              {error && (
                <Fade in>
                  <Box sx={{ display: 'flex', mr: 1 }}>
                    <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
                  </Box>
                </Fade>
              )}
            </>
          ),
        },
        sx: {
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
          },
          '& .MuiInputLabel-root': {
            '&.Mui-focused': {
              color: stateColor,
            },
          },
        },
      },
      popper: {
        sx: {
          '& .MuiPaper-root': {
            borderRadius: 3,
            boxShadow: theme.palette.mode === 'light'
              ? '0 20px 60px rgba(0,0,0,0.15)'
              : '0 20px 60px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          },
          '& .MuiPickersCalendarHeader-root': {
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            px: 2,
            py: 1.5,
            '& .MuiPickersCalendarHeader-label': {
              fontWeight: 600,
            },
          },
          '& .MuiDayCalendar-header': {
            '& .MuiTypography-root': {
              fontWeight: 600,
              color: 'text.secondary',
            },
          },
          '& .MuiPickersDay-root': {
            borderRadius: 2,
            transition: 'all 0.15s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              transform: 'scale(1.1)',
            },
            '&.Mui-selected': {
              bgcolor: theme.palette.primary.main,
              fontWeight: 700,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              },
            },
            '&.MuiPickersDay-today': {
              borderColor: theme.palette.primary.main,
              borderWidth: 2,
            },
          },
          '& .MuiYearCalendar-root, & .MuiMonthCalendar-root': {
            '& .MuiPickersYear-yearButton, & .MuiPickersMonth-monthButton': {
              borderRadius: 2,
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.12),
              },
              '&.Mui-selected': {
                bgcolor: theme.palette.primary.main,
                fontWeight: 700,
              },
            },
          },
        },
      },
      dialog: {
        sx: {
          '& .MuiDialog-paper': {
            borderRadius: 3,
          },
          '& .MuiPickersCalendarHeader-root': {
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            px: 2,
            py: 1.5,
          },
          '& .MuiPickersDay-root': {
            borderRadius: 2,
            transition: 'all 0.15s ease',
            '&.Mui-selected': {
              bgcolor: theme.palette.primary.main,
              fontWeight: 700,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
            },
          },
        },
      },
    },
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
      <Box sx={{ width: '100%' }}>
        {isMobile ? (
          <MobileDatePicker {...commonProps} />
        ) : (
          <DatePicker {...commonProps} />
        )}

        {/* Helper text area */}
        <Box sx={{ mt: 0.5, px: 1.5, minHeight: 20 }}>
          {error && helperText && (
            <Typography variant="caption" color="error.main">
              {helperText}
            </Typography>
          )}
          {showSuccessState && value && !error && (
            <Typography variant="caption" color="success.main">
              Dată selectată
            </Typography>
          )}
          {hint && !error && !(showSuccessState && value) && (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          )}
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default FriendlyDatePicker;
