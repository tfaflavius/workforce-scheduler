import React from 'react';
import { Box, Chip, alpha, useTheme } from '@mui/material';

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
  icon?: React.ReactNode;
}

export interface FilterChipsProps {
  options: FilterOption[];
  selected: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  size?: 'small' | 'medium';
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  options,
  selected,
  onChange,
  multiple = false,
  size = 'medium',
}) => {
  const theme = useTheme();

  const isSelected = (value: string): boolean => {
    if (multiple) {
      return Array.isArray(selected) && selected.includes(value);
    }
    return selected === value;
  };

  const handleClick = (value: string) => {
    if (multiple) {
      const currentSelected = Array.isArray(selected) ? selected : [];
      if (currentSelected.includes(value)) {
        onChange(currentSelected.filter((v) => v !== value));
      } else {
        onChange([...currentSelected, value]);
      }
    } else {
      onChange(selected === value ? '' : value);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: { xs: 0.75, sm: 1 },
      }}
    >
      {options.map((option) => {
        const chipSelected = isSelected(option.value);
        const chipColor = option.color || theme.palette.primary.main;

        return (
          <Chip
            key={option.value}
            label={option.label}
            icon={option.icon as React.ReactElement}
            size={size}
            onClick={() => handleClick(option.value)}
            sx={{
              fontWeight: chipSelected ? 600 : 500,
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              px: { xs: 0.5, sm: 1 },
              bgcolor: chipSelected ? alpha(chipColor, 0.15) : 'transparent',
              color: chipSelected ? chipColor : 'text.secondary',
              border: `1.5px solid ${chipSelected ? chipColor : alpha(theme.palette.divider, 0.5)}`,
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              '&:hover': {
                bgcolor: alpha(chipColor, chipSelected ? 0.2 : 0.08),
                borderColor: chipColor,
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
              '& .MuiChip-icon': {
                color: chipSelected ? chipColor : 'text.secondary',
                fontSize: { xs: 16, sm: 18 },
              },
            }}
          />
        );
      })}
    </Box>
  );
};

export default FilterChips;
