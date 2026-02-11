import React, { useState } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  alpha,
  useTheme,
  Paper,
  InputAdornment,
  Fade,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

export interface AutocompleteOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  color?: string;
}

export interface FriendlyAutocompleteProps {
  options: string[] | AutocompleteOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  placeholder?: string;
  startIcon?: React.ReactNode;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  freeSolo?: boolean;
  showSuccessState?: boolean;
  hint?: string;
  loading?: boolean;
  multiple?: boolean;
}

export const FriendlyAutocomplete: React.FC<FriendlyAutocompleteProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder,
  startIcon,
  error,
  helperText,
  required,
  disabled,
  freeSolo = false,
  showSuccessState = false,
  hint,
  loading = false,
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Normalize options to AutocompleteOption format
  const normalizedOptions: AutocompleteOption[] = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const getStateColor = () => {
    if (error) return theme.palette.error.main;
    if (showSuccessState && value) return theme.palette.success.main;
    if (isFocused) return theme.palette.primary.main;
    return undefined;
  };

  const stateColor = getStateColor();

  return (
    <Box sx={{ width: '100%' }}>
      <Autocomplete
        options={normalizedOptions}
        value={value ? normalizedOptions.find(opt => opt.value === value) || { value, label: value } : null}
        onChange={(_, newValue) => {
          if (typeof newValue === 'string') {
            onChange(newValue);
          } else if (newValue) {
            onChange(newValue.value);
          } else {
            onChange(null);
          }
        }}
        inputValue={inputValue}
        onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          return option.label;
        }}
        isOptionEqualToValue={(option, val) => option.value === val.value}
        freeSolo={freeSolo}
        disabled={disabled}
        loading={loading}
        PaperComponent={(props) => (
          <Paper
            {...props}
            sx={{
              borderRadius: 2.5,
              mt: 1,
              boxShadow: theme.palette.mode === 'light'
                ? '0 10px 40px rgba(0,0,0,0.12)'
                : '0 10px 40px rgba(0,0,0,0.4)',
              '& .MuiAutocomplete-listbox': {
                p: 1,
              },
              '& .MuiAutocomplete-option': {
                borderRadius: 1.5,
                mx: 0.5,
                my: 0.25,
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  transform: 'translateX(4px)',
                },
                '&[aria-selected="true"]': {
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.16),
                  },
                },
              },
            }}
          />
        )}
        renderOption={(props, option) => (
          <Box component="li" {...props} sx={{ py: 1.5, px: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.5 }}>
              {option.icon && (
                <Box sx={{ color: option.color || 'text.secondary', display: 'flex' }}>
                  {option.icon}
                </Box>
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body1" fontWeight={500}>
                  {option.label}
                </Typography>
                {option.description && (
                  <Typography variant="caption" color="text.secondary">
                    {option.description}
                  </Typography>
                )}
              </Box>
              {option.color && (
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: option.color,
                    boxShadow: `0 2px 6px ${alpha(option.color, 0.4)}`,
                  }}
                />
              )}
              {value === option.value && (
                <CheckIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              )}
            </Box>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            required={required}
            error={error}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  {startIcon && (
                    <InputAdornment position="start">
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          color: stateColor || 'action.active',
                          transition: 'all 0.2s ease',
                          transform: isFocused ? 'scale(1.1)' : 'scale(1)',
                        }}
                      >
                        {startIcon}
                      </Box>
                    </InputAdornment>
                  )}
                  {params.InputProps.startAdornment}
                </>
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
                  {params.InputProps.endAdornment}
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
              },
              '& .MuiInputLabel-root': {
                '&.Mui-focused': {
                  color: stateColor,
                },
              },
            }}
          />
        )}
      />

      {/* Helper text area */}
      <Box sx={{ mt: 0.5, px: 1.5, minHeight: 20 }}>
        {error && helperText && (
          <Typography variant="caption" color="error.main">
            {helperText}
          </Typography>
        )}
        {showSuccessState && value && !error && (
          <Typography variant="caption" color="success.main">
            Selectat
          </Typography>
        )}
        {hint && !error && !(showSuccessState && value) && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default FriendlyAutocomplete;
