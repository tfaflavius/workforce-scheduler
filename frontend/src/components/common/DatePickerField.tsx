import React, { useMemo } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import { useTheme, useMediaQuery } from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ro';

// Set Romanian locale globally
dayjs.locale('ro');

interface DatePickerFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  required?: boolean;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  // For birthday picker - allows viewing years easily
  openTo?: 'day' | 'month' | 'year';
  views?: ('day' | 'month' | 'year')[];
  // If true, uses year picker first (for birthdate)
  isBirthDate?: boolean;
}

const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  error = false,
  helperText,
  fullWidth = true,
  size = 'medium',
  required = false,
  disabled = false,
  minDate,
  maxDate,
  openTo,
  views,
  isBirthDate = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Convert string to Dayjs
  const dateValue = value ? dayjs(value) : null;

  // Convert Dayjs to string
  const handleChange = (newValue: Dayjs | null) => {
    if (newValue && newValue.isValid()) {
      onChange(newValue.format('YYYY-MM-DD'));
    } else {
      onChange(null);
    }
  };

  // For birthdate, start with year selection
  const pickerOpenTo = isBirthDate ? 'year' : (openTo || 'day');
  const pickerViews = isBirthDate ? ['year', 'month', 'day'] as const : (views || ['year', 'month', 'day'] as const);

  // Min/max dates (memoized to avoid recreating Dayjs objects every render)
  const minDateValue = useMemo(() => minDate ? dayjs(minDate) : undefined, [minDate]);
  const maxDateValue = useMemo(() => maxDate ? dayjs(maxDate) : (isBirthDate ? dayjs() : undefined), [maxDate, isBirthDate]);

  // Shared slot props
  const slotProps = {
    textField: {
      fullWidth,
      size,
      required,
      error,
      helperText,
    },
    toolbar: {
      hidden: false,
    },
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
      {isMobile ? (
        <MobileDatePicker
          label={label}
          value={dateValue}
          onChange={(newValue) => handleChange(newValue as Dayjs | null)}
          openTo={pickerOpenTo}
          views={pickerViews as ('year' | 'month' | 'day')[]}
          minDate={minDateValue}
          maxDate={maxDateValue}
          disabled={disabled}
          slotProps={slotProps}
          format="DD.MM.YYYY"
          yearsPerRow={3}
        />
      ) : (
        <DatePicker
          label={label}
          value={dateValue}
          onChange={(newValue) => handleChange(newValue as Dayjs | null)}
          openTo={pickerOpenTo}
          views={pickerViews as ('year' | 'month' | 'day')[]}
          minDate={minDateValue}
          maxDate={maxDateValue}
          disabled={disabled}
          slotProps={slotProps}
          format="DD.MM.YYYY"
          yearsPerRow={3}
        />
      )}
    </LocalizationProvider>
  );
};

export default React.memo(DatePickerField);
