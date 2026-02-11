import React, { useState } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  alpha,
  useTheme,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Fade,
} from '@mui/material';
import type { SelectProps } from '@mui/material';
import {
  KeyboardArrowDown as ArrowIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

export interface SelectOption {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  color?: string;
  disabled?: boolean;
}

export interface FriendlySelectProps extends Omit<SelectProps, 'variant'> {
  options: SelectOption[];
  startIcon?: React.ReactNode;
  showSuccessState?: boolean;
  hint?: string;
  variant?: 'outlined' | 'filled' | 'standard';
}

export const FriendlySelect: React.FC<FriendlySelectProps> = ({
  options,
  startIcon,
  showSuccessState = false,
  hint,
  label,
  value,
  error,
  onChange,
  sx,
  ...props
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const getStateColor = () => {
    if (error) return theme.palette.error.main;
    if (showSuccessState && value) return theme.palette.success.main;
    if (isFocused) return theme.palette.primary.main;
    return undefined;
  };

  const stateColor = getStateColor();

  return (
    <Box sx={{ width: '100%' }}>
      <FormControl fullWidth error={error}>
        <InputLabel
          sx={{
            '&.Mui-focused': {
              color: stateColor,
            },
          }}
        >
          {label}
        </InputLabel>
        <Select
          {...props}
          value={value}
          label={label}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          IconComponent={(iconProps) => (
            <ArrowIcon
              {...iconProps}
              sx={{
                transition: 'transform 0.3s ease',
                color: stateColor || 'action.active',
              }}
            />
          )}
          startAdornment={
            startIcon ? (
              <InputAdornment position="start">
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: stateColor || 'action.active',
                    transition: 'all 0.2s ease',
                    transform: isFocused ? 'scale(1.1)' : 'scale(1)',
                    ml: 1,
                  }}
                >
                  {startIcon}
                </Box>
              </InputAdornment>
            ) : undefined
          }
          endAdornment={
            showSuccessState && value && !error ? (
              <Fade in>
                <InputAdornment position="end" sx={{ mr: 3 }}>
                  <CheckIcon sx={{ color: 'success.main', fontSize: 20 }} />
                </InputAdornment>
              </Fade>
            ) : undefined
          }
          renderValue={(selected) => {
            const option = options.find(opt => opt.value === selected);
            if (!option) return null;

            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {option.icon && (
                  <Box sx={{ display: 'flex', color: option.color || 'text.secondary' }}>
                    {option.icon}
                  </Box>
                )}
                <Typography>{option.label}</Typography>
                {option.color && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: option.color,
                      ml: 'auto',
                    }}
                  />
                )}
              </Box>
            );
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                borderRadius: 2.5,
                mt: 1,
                boxShadow: theme.palette.mode === 'light'
                  ? '0 10px 40px rgba(0,0,0,0.12)'
                  : '0 10px 40px rgba(0,0,0,0.4)',
                '& .MuiMenuItem-root': {
                  borderRadius: 1.5,
                  mx: 1,
                  my: 0.5,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    transform: 'translateX(4px)',
                  },
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.16),
                    },
                  },
                },
              },
            },
            transformOrigin: { horizontal: 'left', vertical: 'top' },
            anchorOrigin: { horizontal: 'left', vertical: 'bottom' },
          }}
          sx={{
            borderRadius: 2.5,
            '& .MuiSelect-select': {
              pl: startIcon ? 1 : undefined,
            },
            '& .MuiOutlinedInput-notchedOutline': {
              transition: 'all 0.25s ease',
            },
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
            ...sx,
          }}
        >
          {options.map((option) => (
            <MenuItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              sx={{
                py: 1.5,
                px: 2,
              }}
            >
              {option.icon && (
                <ListItemIcon
                  sx={{
                    color: option.color || 'text.secondary',
                    minWidth: 36,
                  }}
                >
                  {option.icon}
                </ListItemIcon>
              )}
              <ListItemText
                primary={option.label}
                secondary={option.description}
                primaryTypographyProps={{
                  fontWeight: value === option.value ? 600 : 400,
                }}
                secondaryTypographyProps={{
                  variant: 'caption',
                }}
              />
              {option.color && (
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: option.color,
                    ml: 2,
                    boxShadow: `0 2px 8px ${alpha(option.color, 0.4)}`,
                  }}
                />
              )}
              {value === option.value && (
                <CheckIcon
                  sx={{
                    ml: 1,
                    color: 'primary.main',
                    fontSize: 20,
                  }}
                />
              )}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {hint && !error && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, px: 1.5, display: 'block' }}
        >
          {hint}
        </Typography>
      )}
    </Box>
  );
};

export default FriendlySelect;
