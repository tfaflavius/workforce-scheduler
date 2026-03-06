import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  Snackbar,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ConfirmationNumber as TicketIcon,
  CardMembership as SubscriptionIcon,
  TrendingUp as OccupancyIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { PARKING_STAT_LOCATIONS, PARKING_SUBSCRIPTION_LOCATIONS, isFirstInGroup, getGroupKeys, getGroupTotalSpots } from '../../../constants/parkingStats';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
import {
  useGetDailyTicketsQuery,
  useGetWeeklyTicketsSummaryQuery,
  useGetMonthlyTicketsSummaryQuery,
  useUpsertDailyTicketsMutation,
  useGetMonthlySubscriptionsQuery,
  useUpsertMonthlySubscriptionsMutation,
  useGetWeeklyOccupancyQuery,
  useGetMonthlyOccupancySummaryQuery,
  useUpsertWeeklyOccupancyMutation,
} from '../../../store/api/parkingStats.api';

// ==================== HELPERS ====================

const getTodayStr = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
};

const getCurrentMonthYear = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getMondayOfWeek = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toLocaleDateString('en-CA');
};

const getCurrentWeekStart = () => getMondayOfWeek(new Date());

const generateDayOptions = () => {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const val = d.toLocaleDateString('en-CA');
    const label = d.toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' });
    options.push({ value: val, label });
  }
  return options;
};

const generateWeekOptions = () => {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  const currentMonday = new Date(today);
  const day = currentMonday.getDay();
  currentMonday.setDate(currentMonday.getDate() - day + (day === 0 ? -6 : 1));

  for (let i = 0; i < 12; i++) {
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() - i * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const val = monday.toLocaleDateString('en-CA');
    const label = `${monday.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    options.push({ value: val, label });
  }
  return options;
};

const generateMonthOptions = () => {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
    options.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
};

const dayOptions = generateDayOptions();
const weekOptions = generateWeekOptions();
const monthOptions = generateMonthOptions();

// ==================== TICKET SECTION ====================

const TicketsSection: React.FC = () => {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDay, setSelectedDay] = useState(getTodayStr());
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekStart());
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [ticketValues, setTicketValues] = useState<Record<string, number>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { data: dailyData, isLoading: dailyLoading } = useGetDailyTicketsQuery(selectedDay, { skip: viewMode !== 'daily' });
  const { data: weeklyData, isLoading: weeklyLoading } = useGetWeeklyTicketsSummaryQuery(selectedWeek, { skip: viewMode !== 'weekly' });
  const { data: monthlyData, isLoading: monthlyLoading } = useGetMonthlyTicketsSummaryQuery(selectedMonth, { skip: viewMode !== 'monthly' });
  const [upsertTickets, { isLoading: saving }] = useUpsertDailyTicketsMutation();

  // Sync daily data to local state
  React.useEffect(() => {
    if (dailyData && viewMode === 'daily') {
      const values: Record<string, number> = {};
      dailyData.forEach(t => { values[t.locationKey] = t.ticketCount; });
      setTicketValues(values);
    }
  }, [dailyData, viewMode]);

  const getTicketValue = useCallback((key: string): number => {
    if (viewMode === 'daily') return ticketValues[key] || 0;
    if (viewMode === 'weekly') return weeklyData?.find(d => d.locationKey === key)?.totalTickets || 0;
    return monthlyData?.find(d => d.locationKey === key)?.totalTickets || 0;
  }, [viewMode, ticketValues, weeklyData, monthlyData]);

  const total = useMemo(() =>
    PARKING_STAT_LOCATIONS.reduce((sum, loc) => sum + getTicketValue(loc.key), 0),
    [getTicketValue]
  );

  const handleSave = async () => {
    try {
      const entries = PARKING_STAT_LOCATIONS.map(loc => ({
        locationKey: loc.key,
        ticketCount: ticketValues[loc.key] || 0,
      }));
      await upsertTickets({ date: selectedDay, entries }).unwrap();
      setSnackbar({ open: true, message: 'Tichete salvate cu succes!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Eroare la salvare', severity: 'error' });
    }
  };

  const isLoading = dailyLoading || weeklyLoading || monthlyLoading;
  const isEditable = viewMode === 'daily';

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
        >
          <ToggleButton value="daily">Zilnic</ToggleButton>
          <ToggleButton value="weekly">Saptamanal</ToggleButton>
          <ToggleButton value="monthly">Lunar</ToggleButton>
        </ToggleButtonGroup>

        {viewMode === 'daily' && (
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 220 } }}>
            <InputLabel>Ziua</InputLabel>
            <Select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} label="Ziua">
              {dayOptions.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        {viewMode === 'weekly' && (
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 280 } }}>
            <InputLabel>Saptamana</InputLabel>
            <Select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} label="Saptamana">
              {weekOptions.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        {viewMode === 'monthly' && (
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 220 } }}>
            <InputLabel>Luna</InputLabel>
            <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} label="Luna">
              {monthOptions.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
        )}
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 320 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#8b5cf6', 0.08) }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Parcare</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    {viewMode === 'daily' ? 'Tichete' : 'Total Tichete'}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {PARKING_STAT_LOCATIONS.map((loc, idx) => {
                  const rows: React.ReactNode[] = [];
                  if (isFirstInGroup(idx) && loc.group) {
                    const groupTotal = getGroupKeys(loc.group).reduce((sum, k) => sum + getTicketValue(k), 0);
                    rows.push(
                      <TableRow key={`group-${loc.group}`} sx={{ bgcolor: alpha('#8b5cf6', 0.06) }}>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>{loc.group}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.85rem' }, color: 'text.secondary' }}>{groupTotal}</TableCell>
                      </TableRow>
                    );
                  }
                  rows.push(
                    <TableRow key={loc.key} hover>
                      <TableCell sx={{ ...(loc.group ? { pl: { xs: 2, sm: 4 } } : {}), fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {loc.group ? `└ ${loc.name}` : loc.name}
                      </TableCell>
                      <TableCell align="right">
                        {isEditable ? (
                          <TextField
                            type="number"
                            size="small"
                            value={ticketValues[loc.key] || ''}
                            onChange={(e) => setTicketValues(prev => ({
                              ...prev,
                              [loc.key]: Number(e.target.value) || 0,
                            }))}
                            sx={{ width: { xs: 70, sm: 100 } }}
                            inputProps={{ min: 0, style: { fontSize: '0.85rem' } }}
                          />
                        ) : (
                          <Typography variant="body2" fontWeight="bold">{getTicketValue(loc.key)}</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                  return rows;
                })}
                <TableRow sx={{ bgcolor: alpha('#8b5cf6', 0.05) }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.8rem', sm: '0.95rem' } }}>TOTAL</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: { xs: '0.8rem', sm: '0.95rem' } }}>{total}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {isEditable && (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' } }}
            >
              {saving ? 'Se salveaza...' : 'Salveaza Tichete'}
            </Button>
          )}
        </>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

// ==================== SUBSCRIPTIONS SECTION ====================

const SubscriptionsSection: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [subValues, setSubValues] = useState<Record<string, number>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { data, isLoading } = useGetMonthlySubscriptionsQuery(selectedMonth);
  const [upsertSubs, { isLoading: saving }] = useUpsertMonthlySubscriptionsMutation();

  React.useEffect(() => {
    if (data) {
      const values: Record<string, number> = {};
      data.forEach(s => { values[s.locationKey] = s.subscriptionCount; });
      setSubValues(values);
    }
  }, [data]);

  const total = useMemo(() =>
    PARKING_SUBSCRIPTION_LOCATIONS.reduce((sum, loc) => sum + (subValues[loc.key] || 0), 0),
    [subValues]
  );

  const handleSave = async () => {
    try {
      const entries = PARKING_SUBSCRIPTION_LOCATIONS.map(loc => ({
        locationKey: loc.key,
        subscriptionCount: subValues[loc.key] || 0,
      }));
      await upsertSubs({ monthYear: selectedMonth, entries }).unwrap();
      setSnackbar({ open: true, message: 'Abonamente salvate cu succes!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Eroare la salvare', severity: 'error' });
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Luna</InputLabel>
          <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} label="Luna">
            {monthOptions.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 400 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#10b981', 0.08) }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Parcare</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Nr. Locuri</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Abonamente</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {PARKING_SUBSCRIPTION_LOCATIONS.map((loc) => (
                  <TableRow key={loc.key} hover>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{loc.name}</TableCell>
                    <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, color: 'text.secondary' }}>{loc.spots}</TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        value={subValues[loc.key] || ''}
                        onChange={(e) => setSubValues(prev => ({
                          ...prev,
                          [loc.key]: Number(e.target.value) || 0,
                        }))}
                        sx={{ width: { xs: 70, sm: 100 } }}
                        inputProps={{ min: 0, style: { fontSize: '0.85rem' } }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: alpha('#10b981', 0.05) }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.8rem', sm: '0.95rem' } }}>TOTAL</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.85rem' }, color: 'text.secondary' }}>
                    {PARKING_SUBSCRIPTION_LOCATIONS.reduce((sum, loc) => sum + loc.spots, 0)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: { xs: '0.8rem', sm: '0.95rem' } }}>{total}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
          >
            {saving ? 'Se salveaza...' : 'Salveaza Abonamente'}
          </Button>
        </>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

// ==================== OCCUPANCY SECTION ====================

const OccupancySection: React.FC = () => {
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekStart());
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [occValues, setOccValues] = useState<Record<string, { min: number; max: number; avg: number }>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { data: weeklyData, isLoading: weeklyLoading } = useGetWeeklyOccupancyQuery(selectedWeek, { skip: viewMode !== 'weekly' });
  const { data: monthlyData, isLoading: monthlyLoading } = useGetMonthlyOccupancySummaryQuery(selectedMonth, { skip: viewMode !== 'monthly' });
  const [upsertOcc, { isLoading: saving }] = useUpsertWeeklyOccupancyMutation();

  React.useEffect(() => {
    if (weeklyData && viewMode === 'weekly') {
      const values: Record<string, { min: number; max: number; avg: number }> = {};
      weeklyData.forEach(o => {
        values[o.locationKey] = { min: o.minOccupancy, max: o.maxOccupancy, avg: Number(o.avgOccupancy) };
      });
      setOccValues(values);
    }
  }, [weeklyData, viewMode]);

  const getOccValue = useCallback((key: string) => {
    if (viewMode === 'weekly') {
      return occValues[key] || { min: 0, max: 0, avg: 0 };
    }
    const m = monthlyData?.find(d => d.locationKey === key);
    return m ? { min: m.avgMin, max: m.avgMax, avg: m.avgAvg } : { min: 0, max: 0, avg: 0 };
  }, [viewMode, occValues, monthlyData]);

  // Coeficient grad ocupare/saptamana = (Medie / Nr. Locuri) * 100 (procent)
  const getWeeklyRate = (avg: number, spots: number) => {
    if (spots === 0) return '0.00%';
    return ((avg / spots) * 100).toFixed(2) + '%';
  };

  const handleSave = async () => {
    try {
      const entries = PARKING_STAT_LOCATIONS.map(loc => {
        const val = occValues[loc.key] || { min: 0, max: 0, avg: 0 };
        return {
          locationKey: loc.key,
          minOccupancy: val.min,
          maxOccupancy: val.max,
          avgOccupancy: val.avg,
        };
      });
      await upsertOcc({ weekStart: selectedWeek, entries }).unwrap();
      setSnackbar({ open: true, message: 'Grad de ocupare salvat cu succes!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Eroare la salvare', severity: 'error' });
    }
  };

  const isLoading = weeklyLoading || monthlyLoading;
  const isEditable = viewMode === 'weekly';

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
        >
          <ToggleButton value="weekly">Saptamanal</ToggleButton>
          <ToggleButton value="monthly">Lunar</ToggleButton>
        </ToggleButtonGroup>

        {viewMode === 'weekly' && (
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 280 } }}>
            <InputLabel>Saptamana</InputLabel>
            <Select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} label="Saptamana">
              {weekOptions.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        {viewMode === 'monthly' && (
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 220 } }}>
            <InputLabel>Luna</InputLabel>
            <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} label="Luna">
              {monthOptions.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
        )}
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: { xs: 540, sm: 700 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#f59e0b', 0.08) }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.7rem', sm: '0.875rem' }, minWidth: { xs: 100, sm: 150 } }}>Parcare</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Nr. Locuri</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Minim</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Maxim</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Medie</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Grad/Săpt.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {PARKING_STAT_LOCATIONS.map((loc, idx) => {
                  const val = getOccValue(loc.key);
                  const rows: React.ReactNode[] = [];
                  if (isFirstInGroup(idx) && loc.group) {
                    const groupSpots = getGroupTotalSpots(loc.group);
                    rows.push(
                      <TableRow key={`group-${loc.group}`} sx={{ bgcolor: alpha('#f59e0b', 0.06) }}>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>{loc.group}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.85rem' }, color: 'text.secondary' }}>{groupSpots}</TableCell>
                        <TableCell colSpan={4} />
                      </TableRow>
                    );
                  }
                  rows.push(
                    <TableRow key={loc.key} hover>
                      <TableCell sx={{ ...(loc.group ? { pl: { xs: 2, sm: 4 } } : {}), fontSize: { xs: '0.7rem', sm: '0.875rem' }, whiteSpace: 'nowrap' }}>
                        {loc.group ? `└ ${loc.name}` : loc.name}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, color: 'text.secondary' }}>
                        {loc.spots}
                      </TableCell>
                      <TableCell align="right" sx={{ px: { xs: 0.5, sm: 2 } }}>
                        {isEditable ? (
                          <TextField
                            type="number"
                            size="small"
                            value={occValues[loc.key]?.min || ''}
                            onChange={(e) => setOccValues(prev => ({
                              ...prev,
                              [loc.key]: { ...prev[loc.key] || { min: 0, max: 0, avg: 0 }, min: Number(e.target.value) || 0 },
                            }))}
                            sx={{ width: { xs: 55, sm: 80 } }}
                            inputProps={{ min: 0, style: { fontSize: '0.8rem', padding: '6px 4px' } }}
                          />
                        ) : (
                          <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{val.min}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ px: { xs: 0.5, sm: 2 } }}>
                        {isEditable ? (
                          <TextField
                            type="number"
                            size="small"
                            value={occValues[loc.key]?.max || ''}
                            onChange={(e) => setOccValues(prev => ({
                              ...prev,
                              [loc.key]: { ...prev[loc.key] || { min: 0, max: 0, avg: 0 }, max: Number(e.target.value) || 0 },
                            }))}
                            sx={{ width: { xs: 55, sm: 80 } }}
                            inputProps={{ min: 0, style: { fontSize: '0.8rem', padding: '6px 4px' } }}
                          />
                        ) : (
                          <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{val.max}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ px: { xs: 0.5, sm: 2 } }}>
                        {isEditable ? (
                          <TextField
                            type="number"
                            size="small"
                            value={occValues[loc.key]?.avg || ''}
                            onChange={(e) => setOccValues(prev => ({
                              ...prev,
                              [loc.key]: { ...prev[loc.key] || { min: 0, max: 0, avg: 0 }, avg: Number(e.target.value) || 0 },
                            }))}
                            sx={{ width: { xs: 60, sm: 90 } }}
                            inputProps={{ min: 0, step: 0.01, style: { fontSize: '0.8rem', padding: '6px 4px' } }}
                          />
                        ) : (
                          <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{val.avg}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="primary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          {getWeeklyRate(val.avg, loc.spots)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                  return rows;
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {isEditable && (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}
            >
              {saving ? 'Se salveaza...' : 'Salveaza Grad Ocupare'}
            </Button>
          )}
        </>
      )}

      {/* Grafic Grad de Ocupare */}
      {!isLoading && (() => {
        const chartLabels = PARKING_STAT_LOCATIONS.map(loc =>
          loc.group ? `${loc.group} - ${loc.name}` : loc.name.replace('Parcarea ', '')
        );
        const chartValues = PARKING_STAT_LOCATIONS.map(loc => {
          const val = getOccValue(loc.key);
          return loc.spots > 0 ? Number(((val.avg / loc.spots) * 100).toFixed(2)) : 0;
        });
        const barColors = chartValues.map(v =>
          v >= 80 ? 'rgba(239, 68, 68, 0.7)' : v >= 50 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(34, 197, 94, 0.7)'
        );
        const borderColors = chartValues.map(v =>
          v >= 80 ? 'rgb(239, 68, 68)' : v >= 50 ? 'rgb(245, 158, 11)' : 'rgb(34, 197, 94)'
        );
        return (
          <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              Grafic Grad de Ocupare (%)
            </Typography>
            <Box sx={{ height: { xs: 250, sm: 300 }, width: '100%' }}>
              <Bar
                data={{
                  labels: chartLabels,
                  datasets: [{
                    label: 'Grad Ocupare (%)',
                    data: chartValues,
                    backgroundColor: barColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `${(ctx.parsed.y ?? 0).toFixed(2)}%`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: { callback: (v) => `${v}%` },
                      title: { display: true, text: 'Grad Ocupare (%)' },
                    },
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 30,
                        font: { size: 10 },
                      },
                    },
                  },
                }}
              />
            </Box>
          </Paper>
        );
      })()}

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

// ==================== MAIN COMPONENT ====================

const ParkingStatsTab: React.FC = () => {
  const [expanded, setExpanded] = useState<string | false>('tickets');

  const handleAccordionChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const sectionStyle = (color: string) => ({
    border: `1px solid ${alpha(color, 0.3)}`,
    borderRadius: 2,
    mb: 2,
    '&:before': { display: 'none' },
    '&.Mui-expanded': { mb: 2 },
  });

  return (
    <Box>
      <Accordion
        expanded={expanded === 'tickets'}
        onChange={handleAccordionChange('tickets')}
        sx={sectionStyle('#8b5cf6')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TicketIcon sx={{ color: '#8b5cf6', fontSize: { xs: 20, sm: 24 } }} />
            <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>Numar Tichete Zilnice</Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <TicketsSection />
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={expanded === 'subscriptions'}
        onChange={handleAccordionChange('subscriptions')}
        sx={sectionStyle('#10b981')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SubscriptionIcon sx={{ color: '#10b981', fontSize: { xs: 20, sm: 24 } }} />
            <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>Numar Abonamente Lunare</Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <SubscriptionsSection />
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={expanded === 'occupancy'}
        onChange={handleAccordionChange('occupancy')}
        sx={sectionStyle('#f59e0b')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <OccupancyIcon sx={{ color: '#f59e0b', fontSize: { xs: 20, sm: 24 } }} />
            <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>Grad de Ocupare Saptamanal</Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <OccupancySection />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default ParkingStatsTab;
