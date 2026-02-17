import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Tab,
  Tabs,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Tooltip,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  Timer as TimerIcon,
  AccessTime as ClockIcon,
  LocationOn as LocationIcon,
  Map as MapIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { GradientHeader, StatCard } from '../../components/common';
import EmployeeLocationMap, {
  type EmployeeMarker,
  type LocationTrail,
} from '../../components/maps/EmployeeLocationMap';
import {
  useGetAdminActiveTimersQuery,
  useGetAdminTimeEntriesQuery,
  useGetAdminEntryLocationsQuery,
  useGetAdminDepartmentUsersQuery,
  useGetAdminTimeTrackingStatsQuery,
} from '../../store/api/time-tracking.api';
import type { AdminTimeEntriesFilters } from '../../types/time-tracking.types';

// ===== HELPERS =====

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDuration = (minutes: number | null) => {
  if (!minutes) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

const getLiveDuration = (startTime: string) => {
  const now = new Date().getTime();
  const start = new Date(startTime).getTime();
  const diffMin = Math.floor((now - start) / 60000);
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return `${h}h ${m}m`;
};

const getDeptColor = (deptName?: string) => {
  if (!deptName) return '#9e9e9e';
  if (deptName.toLowerCase().includes('intretinere')) return '#4caf50';
  if (deptName.toLowerCase().includes('control')) return '#2196f3';
  return '#9e9e9e';
};

// ===== TAB PANEL =====

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </div>
);

// ===== MAIN COMPONENT =====

const AdminTimeTrackingPage: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedTrailEntryId, setSelectedTrailEntryId] = useState<string | null>(null);

  // Istoric filters
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [filters, setFilters] = useState<AdminTimeEntriesFilters>({
    startDate: todayStr,
    endDate: todayStr,
  });

  // ===== QUERIES =====
  const { data: stats, isLoading: statsLoading } = useGetAdminTimeTrackingStatsQuery(undefined, {
    pollingInterval: 30000,
  });
  const { data: activeTimers = [], isLoading: activeLoading, refetch: refetchActive } = useGetAdminActiveTimersQuery(undefined, {
    pollingInterval: 30000,
  });
  const { data: departmentUsers = [] } = useGetAdminDepartmentUsersQuery();
  const { data: historyEntries = [], isLoading: historyLoading } = useGetAdminTimeEntriesQuery(filters);
  const { data: trailLocations = [] } = useGetAdminEntryLocationsQuery(selectedTrailEntryId!, {
    skip: !selectedTrailEntryId,
  });

  // ===== REAL-TIME TAB DATA =====

  // Combine active timers + inactive users
  const activeUserIds = new Set(activeTimers.map(t => t.userId));

  const realTimeRows = useMemo(() => {
    const rows: Array<{
      userId: string;
      name: string;
      department: string;
      isActive: boolean;
      startTime?: string;
      lastLocation?: { latitude: number; longitude: number; recordedAt: string };
      entryId?: string;
    }> = [];

    // Active users from timers
    activeTimers.forEach(timer => {
      const lastLog = timer.locationLogs?.length
        ? timer.locationLogs[timer.locationLogs.length - 1]
        : undefined;
      rows.push({
        userId: timer.userId,
        name: timer.user?.fullName || `${timer.user?.firstName || ''} ${timer.user?.lastName || ''}`.trim() || 'Necunoscut',
        department: timer.user?.department?.name || '-',
        isActive: true,
        startTime: timer.startTime,
        lastLocation: lastLog
          ? { latitude: Number(lastLog.latitude), longitude: Number(lastLog.longitude), recordedAt: lastLog.recordedAt }
          : undefined,
        entryId: timer.id,
      });
    });

    // Inactive users (not on shift)
    departmentUsers.forEach(user => {
      if (!activeUserIds.has(user.id)) {
        rows.push({
          userId: user.id,
          name: user.fullName || `${user.firstName} ${user.lastName}`,
          department: user.department?.name || '-',
          isActive: false,
        });
      }
    });

    return rows;
  }, [activeTimers, departmentUsers, activeUserIds]);

  // Markers for active users on map
  const activeMarkers: EmployeeMarker[] = useMemo(() => {
    return realTimeRows
      .filter(r => r.isActive && r.lastLocation)
      .map(r => ({
        id: r.userId,
        name: r.name,
        department: r.department,
        latitude: r.lastLocation!.latitude,
        longitude: r.lastLocation!.longitude,
        lastRecordedAt: r.lastLocation!.recordedAt,
        isActive: true,
      }));
  }, [realTimeRows]);

  // Trail for history tab
  const selectedTrail: LocationTrail | null = useMemo(() => {
    if (!selectedTrailEntryId || trailLocations.length === 0) return null;
    const entry = historyEntries.find(e => e.id === selectedTrailEntryId);
    return {
      locations: trailLocations,
      employeeName: entry?.user?.fullName || `${entry?.user?.firstName || ''} ${entry?.user?.lastName || ''}`.trim() || 'Angajat',
      department: entry?.user?.department?.name || '-',
    };
  }, [selectedTrailEntryId, trailLocations, historyEntries]);

  // ===== LIVE DURATION TICKER =====
  const [, setTick] = useState(0);
  React.useEffect(() => {
    if (tabIndex !== 0) return;
    const timer = setInterval(() => setTick(t => t + 1), 60000); // update every minute
    return () => clearInterval(timer);
  }, [tabIndex]);

  return (
    <Box>
      <GradientHeader
        title="Monitorizare Pontaj"
        subtitle="Vizualizare pontaj si locatii GPS angajati"
        icon={<TimerIcon />}
        gradient="#f59e0b 0%, #ea580c 100%"
      >
        <Chip
          icon={<PersonIcon sx={{ fontSize: 16 }} />}
          label={`${stats?.activeCount || 0} activi`}
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          size="small"
        />
      </GradientHeader>

      {/* Stats Cards */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            title="Ture Active"
            value={statsLoading ? '...' : (stats?.activeCount ?? 0)}
            icon={<TimerIcon sx={{ color: '#f59e0b', fontSize: { xs: 24, sm: 28 } }} />}
            color="#f59e0b"
            bgColor={alpha('#f59e0b', 0.12)}
            subtitle="Acum pe tura"
            delay={0}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            title="Ore Azi"
            value={statsLoading ? '...' : (stats?.totalHoursToday ?? 0)}
            icon={<ClockIcon sx={{ color: '#3b82f6', fontSize: { xs: 24, sm: 28 } }} />}
            color="#3b82f6"
            bgColor={alpha('#3b82f6', 0.12)}
            subtitle="Total ore completate"
            delay={100}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            title="Locatii GPS Azi"
            value={statsLoading ? '...' : (stats?.locationLogsToday ?? 0)}
            icon={<LocationIcon sx={{ color: '#10b981', fontSize: { xs: 24, sm: 28 } }} />}
            color="#10b981"
            bgColor={alpha('#10b981', 0.12)}
            subtitle="Inregistrari locatie"
            delay={200}
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
            }}
          >
            <Tab label="Timp Real" icon={<TimerIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
            <Tab label="Istoric" icon={<ClockIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* ===== TAB: TIMP REAL ===== */}
        <TabPanel value={tabIndex} index={0}>
          <Box sx={{ px: { xs: 1, sm: 2 }, pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Angajati Intretinere Parcari & Control
              </Typography>
              <Tooltip title="Reimprospatare">
                <IconButton size="small" onClick={() => refetchActive()}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {activeLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Table */}
                <Box sx={{ overflowX: 'auto', mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Nume</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Departament</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Ora Start</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Durata</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Ultima Locatie</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {realTimeRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                              Nu sunt angajati in departamentele monitorizate
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        realTimeRows.map(row => (
                          <TableRow key={row.userId} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>{row.name}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={row.department}
                                size="small"
                                sx={{
                                  bgcolor: alpha(getDeptColor(row.department), 0.12),
                                  color: getDeptColor(row.department),
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={row.isActive ? 'Pe Tura' : 'Inactiv'}
                                size="small"
                                color={row.isActive ? 'success' : 'default'}
                                variant={row.isActive ? 'filled' : 'outlined'}
                              />
                            </TableCell>
                            <TableCell>
                              {row.startTime ? formatTime(row.startTime) : '-'}
                            </TableCell>
                            <TableCell>
                              {row.isActive && row.startTime ? (
                                <Typography variant="body2" fontWeight={600} color="success.main">
                                  {getLiveDuration(row.startTime)}
                                </Typography>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {row.lastLocation ? (
                                <Tooltip title={`${row.lastLocation.latitude.toFixed(5)}, ${row.lastLocation.longitude.toFixed(5)}`}>
                                  <Typography variant="body2" color="text.secondary">
                                    {formatTime(row.lastLocation.recordedAt)}
                                  </Typography>
                                </Tooltip>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>

                {/* Map */}
                {activeMarkers.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Harta Locatii Active
                    </Typography>
                    <EmployeeLocationMap markers={activeMarkers} height={450} />
                  </Box>
                )}
              </>
            )}
          </Box>
        </TabPanel>

        {/* ===== TAB: ISTORIC ===== */}
        <TabPanel value={tabIndex} index={1}>
          <Box sx={{ px: { xs: 1, sm: 2 }, pb: 2 }}>
            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Data Start"
                  type="date"
                  value={filters.startDate || ''}
                  onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Data Sfarsit"
                  type="date"
                  value={filters.endDate || ''}
                  onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  label="Angajat"
                  value={filters.userId || ''}
                  onChange={e => setFilters(f => ({ ...f, userId: e.target.value || undefined }))}
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">Toti angajatii</MenuItem>
                  {departmentUsers.map(u => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.fullName || `${u.firstName} ${u.lastName}`}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            {/* History Table */}
            {historyLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Box sx={{ overflowX: 'auto', mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Angajat</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Start</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Stop</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Durata</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Locatii</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Harta</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historyEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                              Nu sunt inregistrari pentru filtrele selectate
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        historyEntries.map(entry => (
                          <TableRow
                            key={entry.id}
                            hover
                            sx={selectedTrailEntryId === entry.id ? { bgcolor: alpha('#f59e0b', 0.08) } : {}}
                          >
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {entry.user?.fullName || `${entry.user?.firstName || ''} ${entry.user?.lastName || ''}`.trim() || '-'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {entry.user?.department?.name || '-'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{formatDate(entry.startTime)}</TableCell>
                            <TableCell>{formatTime(entry.startTime)}</TableCell>
                            <TableCell>{entry.endTime ? formatTime(entry.endTime) : <Chip label="In curs" size="small" color="success" />}</TableCell>
                            <TableCell>{formatDuration(entry.durationMinutes)}</TableCell>
                            <TableCell>
                              <Chip
                                label={entry.locationLogs?.length ?? '?'}
                                size="small"
                                icon={<LocationIcon sx={{ fontSize: 14 }} />}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Tooltip title="Vezi traseu GPS">
                                <IconButton
                                  size="small"
                                  color={selectedTrailEntryId === entry.id ? 'warning' : 'default'}
                                  onClick={() =>
                                    setSelectedTrailEntryId(
                                      selectedTrailEntryId === entry.id ? null : entry.id
                                    )
                                  }
                                >
                                  <MapIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>

                {/* Trail Map */}
                {selectedTrail && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Traseu GPS - {selectedTrail.employeeName}
                    </Typography>
                    <EmployeeLocationMap trails={[selectedTrail]} height={450} />
                  </Box>
                )}
              </>
            )}
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default AdminTimeTrackingPage;
