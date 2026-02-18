import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Snackbar,
  Alert,
  alpha,
} from '@mui/material';
import {
  Timer as TimerIcon,
  AccessTime as ClockIcon,
  LocationOn as LocationIcon,
  Map as MapIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Route as RouteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { GradientHeader, StatCard } from '../../components/common';
import EmployeeLocationMap, {
  type EmployeeMarker,
  type LocationTrail,
} from '../../components/maps/EmployeeLocationMap';
import RouteTimeline from '../../components/time-tracking/RouteTimeline';
import {
  useGetAdminActiveTimersQuery,
  useGetAdminTimeEntriesQuery,
  useGetAdminEntryLocationsQuery,
  useGetAdminCombinedLocationsQuery,
  useGetAdminDepartmentUsersQuery,
  useGetAdminTimeTrackingStatsQuery,
  useRequestInstantLocationsMutation,
} from '../../store/api/time-tracking.api';
import type { AdminTimeEntriesFilters, AdminTimeEntry } from '../../types/time-tracking.types';

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

// ===== CONSOLIDATED ENTRY TYPE =====

interface ConsolidatedEntry {
  key: string;
  userId: string;
  userName: string;
  department: string;
  date: string;
  firstStart: string;
  lastEnd: string | null;
  totalDurationMinutes: number;
  totalLocationLogs: number;
  entryCount: number;
  entries: AdminTimeEntry[];
}

// ===== MAIN COMPONENT =====

const AdminTimeTrackingPage: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedTrailEntryId, setSelectedTrailEntryId] = useState<string | null>(null);
  const [selectedRouteEntryId, setSelectedRouteEntryId] = useState<string | null>(null);
  const [selectedCombinedTrailIds, setSelectedCombinedTrailIds] = useState<string[] | null>(null);
  const [selectedCombinedRouteIds, setSelectedCombinedRouteIds] = useState<string[] | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Istoric filters
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [filters, setFilters] = useState<AdminTimeEntriesFilters>({
    startDate: todayStr,
    endDate: todayStr,
  });

  // Snackbar state for GPS request feedback
  const [gpsSnackbar, setGpsSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' }>({
    open: false, message: '', severity: 'info',
  });

  // ===== QUERIES =====
  const { data: stats, isLoading: statsLoading } = useGetAdminTimeTrackingStatsQuery(undefined, {
    pollingInterval: 30000,
  });
  const { data: activeTimers = [], isLoading: activeLoading, refetch: refetchActive } = useGetAdminActiveTimersQuery(undefined, {
    pollingInterval: 30000,
  });
  const [requestInstantLocations, { isLoading: isRequestingLocations }] = useRequestInstantLocationsMutation();
  const { data: departmentUsers = [] } = useGetAdminDepartmentUsersQuery();
  const { data: historyEntries = [], isLoading: historyLoading } = useGetAdminTimeEntriesQuery(filters);
  const { data: trailLocations = [] } = useGetAdminEntryLocationsQuery(selectedTrailEntryId!, {
    skip: !selectedTrailEntryId,
  });
  const { data: combinedTrailLocations = [] } = useGetAdminCombinedLocationsQuery(selectedCombinedTrailIds!, {
    skip: !selectedCombinedTrailIds,
  });

  // ===== REAL-TIME TAB DATA =====

  // Combine active timers + inactive users
  const realTimeRows = useMemo(() => {
    const activeUserIds = new Set(activeTimers.map(t => t.userId));
    const rows: Array<{
      userId: string;
      name: string;
      department: string;
      isActive: boolean;
      startTime?: string;
      lastLocation?: { latitude: number; longitude: number; recordedAt: string; address?: string | null };
      entryId?: string;
    }> = [];

    // Active users from timers
    activeTimers.forEach(timer => {
      // Backend sorts logs DESC (newest first), so [0] is the latest
      const lastLog = timer.locationLogs?.length
        ? timer.locationLogs[0]
        : undefined;
      rows.push({
        userId: timer.userId,
        name: timer.user?.fullName || `${timer.user?.firstName || ''} ${timer.user?.lastName || ''}`.trim() || 'Necunoscut',
        department: timer.user?.department?.name || '-',
        isActive: true,
        startTime: timer.startTime,
        lastLocation: lastLog
          ? { latitude: Number(lastLog.latitude), longitude: Number(lastLog.longitude), recordedAt: lastLog.recordedAt, address: lastLog.address }
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
  }, [activeTimers, departmentUsers]);

  // Markers for active users on map (latest position)
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

  // Trails for active users on real-time map (full route)
  const activeTrails: LocationTrail[] = useMemo(() => {
    return activeTimers
      .filter(timer => timer.locationLogs && timer.locationLogs.length >= 2)
      .map(timer => ({
        // Backend sends DESC, reverse to ASC for trail drawing
        locations: [...timer.locationLogs!].reverse().map(log => ({
          latitude: Number(log.latitude),
          longitude: Number(log.longitude),
          recordedAt: log.recordedAt,
          accuracy: log.accuracy ? Number(log.accuracy) : undefined,
        })),
        employeeName: timer.user?.fullName || 'Angajat',
        department: timer.user?.department?.name || '-',
      }));
  }, [activeTimers]);

  // Trail for history tab (single entry)
  const selectedTrail: LocationTrail | null = useMemo(() => {
    if (!selectedTrailEntryId || trailLocations.length === 0) return null;
    const entry = historyEntries.find(e => e.id === selectedTrailEntryId);
    return {
      locations: trailLocations,
      employeeName: entry?.user?.fullName || `${entry?.user?.firstName || ''} ${entry?.user?.lastName || ''}`.trim() || 'Angajat',
      department: entry?.user?.department?.name || '-',
    };
  }, [selectedTrailEntryId, trailLocations, historyEntries]);

  // Trail for history tab (combined entries)
  const selectedCombinedTrail: LocationTrail | null = useMemo(() => {
    if (!selectedCombinedTrailIds || combinedTrailLocations.length === 0) return null;
    // Find the first entry to get employee info
    const firstEntryId = selectedCombinedTrailIds[0];
    const entry = historyEntries.find(e => e.id === firstEntryId);
    return {
      locations: combinedTrailLocations,
      employeeName: entry?.user?.fullName || `${entry?.user?.firstName || ''} ${entry?.user?.lastName || ''}`.trim() || 'Angajat',
      department: entry?.user?.department?.name || '-',
    };
  }, [selectedCombinedTrailIds, combinedTrailLocations, historyEntries]);

  // ===== CONSOLIDATED HISTORY ENTRIES =====
  const consolidatedEntries: ConsolidatedEntry[] = useMemo(() => {
    const map = new Map<string, ConsolidatedEntry>();

    historyEntries.forEach(entry => {
      const dateKey = formatDate(entry.startTime);
      const userId = entry.user?.id || entry.userId;
      const key = `${userId}-${dateKey}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          userId,
          userName: entry.user?.fullName || `${entry.user?.firstName || ''} ${entry.user?.lastName || ''}`.trim() || '-',
          department: entry.user?.department?.name || '-',
          date: dateKey,
          firstStart: entry.startTime,
          lastEnd: entry.endTime,
          totalDurationMinutes: entry.durationMinutes || 0,
          totalLocationLogs: entry.locationLogs?.length || 0,
          entryCount: 1,
          entries: [entry],
        });
      } else {
        const group = map.get(key)!;
        group.entries.push(entry);
        group.entryCount++;
        group.totalDurationMinutes += entry.durationMinutes || 0;
        group.totalLocationLogs += entry.locationLogs?.length || 0;

        // firstStart = cel mai devreme
        if (new Date(entry.startTime) < new Date(group.firstStart)) {
          group.firstStart = entry.startTime;
        }
        // lastEnd = cel mai tarziu (null daca vreo tura e inca activa)
        if (!entry.endTime) {
          group.lastEnd = null;
        } else if (group.lastEnd && new Date(entry.endTime) > new Date(group.lastEnd)) {
          group.lastEnd = entry.endTime;
        }
      }
    });

    // Sorteaza entries interne cronologic (ASC) in fiecare grup
    map.forEach(group => {
      group.entries.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });

    return Array.from(map.values());
  }, [historyEntries]);

  // ===== CLEAR SELECTIONS ON TAB SWITCH =====
  useEffect(() => {
    setSelectedTrailEntryId(null);
    setSelectedRouteEntryId(null);
    setSelectedCombinedTrailIds(null);
    setSelectedCombinedRouteIds(null);
    setExpandedGroups(new Set());
  }, [tabIndex]);

  // Clear expanded groups on filter change
  useEffect(() => {
    setExpandedGroups(new Set());
    setSelectedTrailEntryId(null);
    setSelectedRouteEntryId(null);
    setSelectedCombinedTrailIds(null);
    setSelectedCombinedRouteIds(null);
  }, [filters]);

  // ===== LIVE DURATION TICKER =====
  const [, setTick] = useState(0);
  React.useEffect(() => {
    if (tabIndex !== 0) return;
    const timer = setInterval(() => setTick(t => t + 1), 60000); // update every minute
    return () => clearInterval(timer);
  }, [tabIndex]);

  // ===== REFRESH WITH INSTANT GPS REQUEST =====
  const handleRefreshWithGps = useCallback(async () => {
    try {
      // 1. Send instant GPS capture push to all active employees
      const result = await requestInstantLocations().unwrap();
      if (result.notifiedCount > 0) {
        setGpsSnackbar({
          open: true,
          message: `Solicitare GPS trimisa la ${result.notifiedCount} din ${result.activeCount} angajati activi. Locatiile se actualizeaza in cateva secunde...`,
          severity: 'success',
        });
      } else if (result.activeCount === 0) {
        setGpsSnackbar({
          open: true,
          message: 'Nu sunt angajati activi pe tura in acest moment.',
          severity: 'info',
        });
      } else {
        setGpsSnackbar({
          open: true,
          message: 'Nu s-au putut trimite notificari GPS. Angajatii nu au push notifications active.',
          severity: 'warning',
        });
      }
    } catch {
      setGpsSnackbar({
        open: true,
        message: 'Eroare la trimiterea solicitarii GPS.',
        severity: 'warning',
      });
    }

    // 2. Refetch data after a short delay to allow GPS captures to arrive
    refetchActive();
    setTimeout(() => refetchActive(), 5000);  // refetch again after 5s for GPS data
    setTimeout(() => refetchActive(), 15000); // and again after 15s
  }, [requestInstantLocations, refetchActive]);

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
              <Tooltip title="Reimprospatare + Solicitare locatie GPS instant">
                <IconButton
                  size="small"
                  onClick={handleRefreshWithGps}
                  disabled={isRequestingLocations}
                  color="warning"
                >
                  {isRequestingLocations ? (
                    <CircularProgress size={18} color="warning" />
                  ) : (
                    <RefreshIcon fontSize="small" />
                  )}
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
                                  <Box>
                                    {row.lastLocation.address && (
                                      <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 200 }}>
                                        {row.lastLocation.address}
                                      </Typography>
                                    )}
                                    <Typography variant="caption" color="text.secondary">
                                      {formatTime(row.lastLocation.recordedAt)}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>

                {/* Map - show if any markers OR trails exist */}
                {(activeMarkers.length > 0 || activeTrails.length > 0) && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Harta Locatii Active ({activeMarkers.length} angajati cu GPS, {activeTrails.length} trasee)
                    </Typography>
                    <EmployeeLocationMap markers={activeMarkers} trails={activeTrails} height={450} />
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

            {/* History Table - Consolidated per employee/day */}
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
                        <TableCell sx={{ fontWeight: 600, width: 40 }} />
                        <TableCell sx={{ fontWeight: 600 }}>Angajat</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Start</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Stop</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Durata</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Locatii</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Ture</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actiuni</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {consolidatedEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                              Nu sunt inregistrari pentru filtrele selectate
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        consolidatedEntries.map(group => {
                          const isExpanded = expandedGroups.has(group.key);
                          const isSingle = group.entryCount === 1;
                          const singleEntry = isSingle ? group.entries[0] : null;

                          return (
                            <React.Fragment key={group.key}>
                              {/* Consolidated row */}
                              <TableRow
                                hover
                                sx={{
                                  cursor: isSingle ? 'default' : 'pointer',
                                  bgcolor: isExpanded ? alpha('#f59e0b', 0.04) : undefined,
                                  '&:hover': { bgcolor: alpha('#f59e0b', 0.06) },
                                }}
                                onClick={() => {
                                  if (!isSingle) {
                                    setExpandedGroups(prev => {
                                      const next = new Set(prev);
                                      if (next.has(group.key)) next.delete(group.key);
                                      else next.add(group.key);
                                      return next;
                                    });
                                  }
                                }}
                              >
                                <TableCell sx={{ width: 40, px: 1 }}>
                                  {!isSingle && (
                                    <IconButton size="small" sx={{ p: 0.25 }}>
                                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                    </IconButton>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Box>
                                    <Typography variant="body2" fontWeight={500}>
                                      {group.userName}
                                    </Typography>
                                    <Chip
                                      label={group.department}
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.7rem',
                                        bgcolor: alpha(getDeptColor(group.department), 0.12),
                                        color: getDeptColor(group.department),
                                        fontWeight: 600,
                                      }}
                                    />
                                  </Box>
                                </TableCell>
                                <TableCell>{group.date}</TableCell>
                                <TableCell>{formatTime(group.firstStart)}</TableCell>
                                <TableCell>
                                  {group.lastEnd
                                    ? formatTime(group.lastEnd)
                                    : <Chip label="In curs" size="small" color="success" sx={{ height: 22 }} />
                                  }
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600}>
                                    {formatDuration(group.totalDurationMinutes)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={group.totalLocationLogs}
                                    size="small"
                                    icon={<LocationIcon sx={{ fontSize: 14 }} />}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  {group.entryCount > 1 ? (
                                    <Chip
                                      label={`${group.entryCount}x`}
                                      size="small"
                                      sx={{
                                        height: 22,
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        bgcolor: alpha('#f59e0b', 0.12),
                                        color: '#92400e',
                                      }}
                                    />
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">1</Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', gap: 0.5 }} onClick={e => e.stopPropagation()}>
                                    {isSingle && singleEntry ? (
                                      <>
                                        <Tooltip title="Vezi traseu pe harta">
                                          <IconButton
                                            size="small"
                                            color={selectedTrailEntryId === singleEntry.id ? 'warning' : 'default'}
                                            onClick={() => {
                                              setSelectedTrailEntryId(selectedTrailEntryId === singleEntry.id ? null : singleEntry.id);
                                              setSelectedRouteEntryId(null);
                                              setSelectedCombinedTrailIds(null);
                                              setSelectedCombinedRouteIds(null);
                                            }}
                                          >
                                            <MapIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Detalii traseu cu strazi">
                                          <IconButton
                                            size="small"
                                            color={selectedRouteEntryId === singleEntry.id ? 'warning' : 'default'}
                                            onClick={() => {
                                              setSelectedRouteEntryId(selectedRouteEntryId === singleEntry.id ? null : singleEntry.id);
                                              setSelectedTrailEntryId(null);
                                              setSelectedCombinedTrailIds(null);
                                              setSelectedCombinedRouteIds(null);
                                            }}
                                          >
                                            <RouteIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      </>
                                    ) : (
                                      <>
                                        {(() => {
                                          const entryIds = group.entries.map(e => e.id);
                                          const isTrailActive = selectedCombinedTrailIds && JSON.stringify(selectedCombinedTrailIds) === JSON.stringify(entryIds);
                                          const isRouteActive = selectedCombinedRouteIds && JSON.stringify(selectedCombinedRouteIds) === JSON.stringify(entryIds);
                                          return (
                                            <>
                                              <Tooltip title="Vezi traseul complet pe harta (toate turele)">
                                                <IconButton
                                                  size="small"
                                                  color={isTrailActive ? 'warning' : 'default'}
                                                  onClick={() => {
                                                    setSelectedCombinedTrailIds(isTrailActive ? null : entryIds);
                                                    setSelectedCombinedRouteIds(null);
                                                    setSelectedTrailEntryId(null);
                                                    setSelectedRouteEntryId(null);
                                                  }}
                                                >
                                                  <MapIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                              <Tooltip title="Detalii traseu complet cu strazi (toate turele)">
                                                <IconButton
                                                  size="small"
                                                  color={isRouteActive ? 'warning' : 'default'}
                                                  onClick={() => {
                                                    setSelectedCombinedRouteIds(isRouteActive ? null : entryIds);
                                                    setSelectedCombinedTrailIds(null);
                                                    setSelectedTrailEntryId(null);
                                                    setSelectedRouteEntryId(null);
                                                  }}
                                                >
                                                  <RouteIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                            </>
                                          );
                                        })()}
                                      </>
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>

                              {/* Expanded sub-rows for multi-entry groups */}
                              {!isSingle && isExpanded && group.entries.map(entry => (
                                <TableRow
                                  key={entry.id}
                                  hover
                                  sx={{
                                    bgcolor: alpha('#f59e0b', 0.02),
                                    ...(selectedTrailEntryId === entry.id || selectedRouteEntryId === entry.id
                                      ? { bgcolor: alpha('#f59e0b', 0.1) }
                                      : {}),
                                  }}
                                >
                                  <TableCell sx={{ width: 40, px: 1 }}>
                                    <Box sx={{ width: 16, height: 16, ml: 0.5, borderLeft: '2px solid', borderBottom: '2px solid', borderColor: alpha('#f59e0b', 0.3), borderBottomLeftRadius: 4 }} />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption" color="text.secondary">
                                      Tura {group.entries.indexOf(entry) + 1}
                                    </Typography>
                                  </TableCell>
                                  <TableCell />
                                  <TableCell>
                                    <Typography variant="body2" fontSize="0.8rem">{formatTime(entry.startTime)}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" fontSize="0.8rem">
                                      {entry.endTime ? formatTime(entry.endTime) : <Chip label="In curs" size="small" color="success" sx={{ height: 20 }} />}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" fontSize="0.8rem">{formatDuration(entry.durationMinutes)}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={entry.locationLogs?.length ?? 0}
                                      size="small"
                                      icon={<LocationIcon sx={{ fontSize: 12 }} />}
                                      variant="outlined"
                                      sx={{ height: 22 }}
                                    />
                                  </TableCell>
                                  <TableCell />
                                  <TableCell>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                      <Tooltip title="Vezi traseu pe harta">
                                        <IconButton
                                          size="small"
                                          color={selectedTrailEntryId === entry.id ? 'warning' : 'default'}
                                          onClick={() => {
                                            setSelectedTrailEntryId(selectedTrailEntryId === entry.id ? null : entry.id);
                                            setSelectedRouteEntryId(null);
                                            setSelectedCombinedTrailIds(null);
                                            setSelectedCombinedRouteIds(null);
                                          }}
                                        >
                                          <MapIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Detalii traseu cu strazi">
                                        <IconButton
                                          size="small"
                                          color={selectedRouteEntryId === entry.id ? 'warning' : 'default'}
                                          onClick={() => {
                                            setSelectedRouteEntryId(selectedRouteEntryId === entry.id ? null : entry.id);
                                            setSelectedTrailEntryId(null);
                                            setSelectedCombinedTrailIds(null);
                                            setSelectedCombinedRouteIds(null);
                                          }}
                                        >
                                          <RouteIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </React.Fragment>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </Box>

                {/* Trail Map - Single entry */}
                {selectedTrail && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Traseu GPS - {selectedTrail.employeeName}
                    </Typography>
                    <EmployeeLocationMap trails={[selectedTrail]} height={450} />
                  </Box>
                )}

                {/* Trail Map - Combined entries */}
                {selectedCombinedTrail && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Traseu GPS Complet - {selectedCombinedTrail.employeeName} ({combinedTrailLocations.length} puncte din toate turele)
                    </Typography>
                    <EmployeeLocationMap trails={[selectedCombinedTrail]} height={450} />
                  </Box>
                )}

                {/* Route Timeline - Single entry */}
                {selectedRouteEntryId && (
                  <RouteTimeline
                    timeEntryId={selectedRouteEntryId}
                    onClose={() => setSelectedRouteEntryId(null)}
                  />
                )}

                {/* Route Timeline - Combined entries */}
                {selectedCombinedRouteIds && (
                  <RouteTimeline
                    timeEntryIds={selectedCombinedRouteIds}
                    onClose={() => setSelectedCombinedRouteIds(null)}
                  />
                )}
              </>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* GPS Request Feedback Snackbar */}
      <Snackbar
        open={gpsSnackbar.open}
        autoHideDuration={6000}
        onClose={() => setGpsSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setGpsSnackbar(s => ({ ...s, open: false }))}
          severity={gpsSnackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {gpsSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminTimeTrackingPage;
