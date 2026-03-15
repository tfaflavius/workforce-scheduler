import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import type {
  ShiftFilter,
  DayFilter,
  WorkPositionFilter,
  CalendarDay,
  MonthOption,
  WorkPosition,
  Department,
} from './scheduleHelpers';

export interface ScheduleFiltersProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  monthOptions: MonthOption[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  departmentFilter: string;
  onDepartmentFilterChange: (dept: string) => void;
  departments: Department[];
  shiftFilter: ShiftFilter;
  onShiftFilterChange: (filter: ShiftFilter) => void;
  workPositionFilter: WorkPositionFilter;
  onWorkPositionFilterChange: (filter: WorkPositionFilter) => void;
  workPositions: WorkPosition[];
  dayFilter: DayFilter;
  onDayFilterChange: (day: DayFilter) => void;
  calendarDays: CalendarDay[];
}

const ScheduleFilters: React.FC<ScheduleFiltersProps> = ({
  selectedMonth,
  onMonthChange,
  monthOptions,
  searchQuery,
  onSearchChange,
  departmentFilter,
  onDepartmentFilterChange,
  departments,
  shiftFilter,
  onShiftFilterChange,
  workPositionFilter,
  onWorkPositionFilterChange,
  workPositions,
  dayFilter,
  onDayFilterChange,
  calendarDays,
}) => {
  const hasActiveFilters =
    searchQuery !== '' ||
    departmentFilter !== 'ALL' ||
    shiftFilter !== 'ALL' ||
    workPositionFilter !== 'ALL' ||
    dayFilter !== 'ALL';

  return (
    <Paper sx={{ p: { xs: 1.5, sm: 2 }, width: '100%' }}>
      <Stack spacing={{ xs: 1.5, sm: 2 }}>
        {/* Month Selector */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarIcon color="action" fontSize="small" />
            <Typography variant="subtitle2" fontWeight="medium">Luna:</Typography>
          </Stack>
          <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }} size="small">
            <Select
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
            >
              {monthOptions.map(({ value, label }) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Filters */}
        <Box>
          {/* Filter header - desktop/tablet only */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: 'none', sm: 'flex' }, mb: 1.5 }}>
            <FilterIcon color="action" fontSize="small" />
            <Typography variant="subtitle2" fontWeight="medium">Filtre:</Typography>
          </Stack>

          {/* Responsive filter grid */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(6, 1fr)',
            },
            gap: { xs: 0.75, sm: 1.5, md: 2 },
          }}>
            {/* Search */}
            <TextField
              placeholder="Cauta angajat..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              size="small"
              fullWidth
              aria-label="Cauta angajat"
            />

            {/* Department */}
            <FormControl size="small" fullWidth>
              <InputLabel>Departament</InputLabel>
              <Select
                value={departmentFilter}
                onChange={(e) => onDepartmentFilterChange(e.target.value)}
                label="Departament"
              >
                <MenuItem value="ALL">Toate</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Shift Type */}
            <FormControl size="small" fullWidth>
              <InputLabel>Tip Tura</InputLabel>
              <Select
                value={shiftFilter}
                onChange={(e) => onShiftFilterChange(e.target.value as ShiftFilter)}
                label="Tip Tura"
              >
                <MenuItem value="ALL">Toate</MenuItem>
                <MenuItem value="12H">12 ore</MenuItem>
                <MenuItem value="8H">8 ore</MenuItem>
                <MenuItem value="VACATION">Concedii</MenuItem>
                <MenuItem value="FREE">Liber</MenuItem>
              </Select>
            </FormControl>

            {/* Work Position */}
            <FormControl size="small" fullWidth>
              <InputLabel>Loc Munca</InputLabel>
              <Select
                value={workPositionFilter}
                onChange={(e) => onWorkPositionFilterChange(e.target.value)}
                label="Loc Munca"
              >
                <MenuItem value="ALL">Toate</MenuItem>
                {workPositions.map((pos) => (
                  <MenuItem key={pos.id} value={pos.shortName || pos.name}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {pos.color && (
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: pos.color,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Typography component="span" sx={{ fontSize: '0.875rem' }}>
                        {pos.name}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Day */}
            <FormControl size="small" fullWidth>
              <InputLabel>Zi</InputLabel>
              <Select
                value={dayFilter}
                onChange={(e) => onDayFilterChange(e.target.value)}
                label="Zi"
              >
                <MenuItem value="ALL">Toate zilele</MenuItem>
                {calendarDays.map(({ day, dayOfWeek, isWeekend }) => (
                  <MenuItem key={day} value={String(day)}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography
                        component="span"
                        sx={{
                          fontWeight: 'bold',
                          color: isWeekend ? 'error.main' : 'text.primary',
                          fontSize: '0.875rem'
                        }}
                      >
                        {day}
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          color: isWeekend ? 'error.main' : 'text.secondary',
                          fontSize: '0.75rem'
                        }}
                      >
                        {dayOfWeek}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  onSearchChange('');
                  onDepartmentFilterChange('ALL');
                  onShiftFilterChange('ALL');
                  onWorkPositionFilterChange('ALL');
                  onDayFilterChange('ALL');
                }}
                sx={{
                  height: 40,
                  whiteSpace: 'nowrap',
                }}
              >
                Reseteaza
              </Button>
            )}
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
};

export default React.memo(ScheduleFilters);
