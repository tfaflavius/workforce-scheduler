import React, { useMemo, useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Stack,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  useMediaQuery,
  useTheme,
  Fade,
  Grow,
  alpha,
  Button,
  Alert,
} from '@mui/material';
import {
  Today as TodayIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Headset as DispatcherIcon,
  Security as ControlIcon,
  AccessTime as TimeIcon,
  EventNote as TomorrowIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Timer as TimerIcon,
  History as HistoryIcon,
  GpsFixed as GpsFixedIcon,
  GpsOff as GpsOffIcon,
  TrendingUp as TrendingIcon,
  BeachAccess as BeachIcon,
  Description as ReportDocIcon,
  Accessible as AccessibleIcon,
  Home as HomeIcon,
  Gavel as GavelIcon,
  ShoppingCart as ShoppingCartIcon,
  Inventory as InventoryIcon,
  AccountBalance as AccountBalanceIcon,
  ReportProblem as IssuesIcon,
  ArrowForward as ArrowIcon,
  CalendarMonth as CalendarIcon,
  DirectionsCar as CarIcon,
} from '@mui/icons-material';
import { useGetSchedulesQuery, useGetShiftColleaguesQuery } from '../../store/api/schedulesApi';
import { useGetApprovedLeavesByMonthQuery } from '../../store/api/leaveRequests.api';
import {
  useStartTimerMutation,
  useStopTimerMutation,
  useGetActiveTimerQuery,
  useGetTimeEntriesQuery,
  useRecordLocationMutation,
  useReportGpsStatusMutation,
} from '../../store/api/time-tracking.api';
import { useGetUserDashboardStatsQuery } from '../../store/api/userDashboard.api';
import { useAppSelector } from '../../store/hooks';
import type { WorkSchedule, ScheduleAssignment } from '../../types/schedule.types';
import { DashboardSkeleton } from '../../components/common/DashboardSkeleton';
import { GradientHeader } from '../../components/common/GradientHeader';
import { useGetCarStatusTodayQuery } from '../../store/api/pvDisplay.api';
import {
  HANDICAP_DEPARTMENT_NAME,
  MAINTENANCE_DEPARTMENT_NAME,
  DOMICILIU_DEPARTMENT_NAME,
  DISPECERAT_DEPARTMENT_NAME,
  CONTROL_DEPARTMENT_NAME,
  ACHIZITII_DEPARTMENT_NAME,
  PROCESE_VERBALE_DEPARTMENT_NAME,
  PARCOMETRE_DEPARTMENT_NAME,
} from '../../constants/departments';
import { formatTimeManual as formatTime } from '../../utils/dateFormatters';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useSmartPolling } from '../../hooks/useSmartPolling';
import { formatRONCompact } from '../../utils/formatters';

const StatusDistributionChart = React.lazy(() =>
  import('../../components/common/DashboardCharts').then((m) => ({ default: m.StatusDistributionChart })),
);
const WeeklyOverviewChart = React.lazy(() =>
  import('../../components/common/DashboardCharts').then((m) => ({ default: m.WeeklyOverviewChart })),
);

const LOCATION_TRACKING_INTERVAL_MS = 10 * 60 * 1000;
const LOCATION_MIN_INTERVAL_MS = 2 * 60 * 1000;

const formatElapsed = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const EmployeeDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { notifyError } = useSnackbar();
  const currentDate = new Date();

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const monthYear = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const departmentName = user?.department?.name || '';

  const { data: schedules, isLoading } = useGetSchedulesQuery({ monthYear, status: 'APPROVED' });
  const { data: approvedLeaves = [] } = useGetApprovedLeavesByMonthQuery(monthYear);

  // User dashboard stats (department-specific)
  const userPollingInterval = useSmartPolling(60000);
  const { data: deptStats } = useGetUserDashboardStatsQuery(undefined, {
    pollingInterval: userPollingInterval,
  });

  const isDispatchDepartment = departmentName === DISPECERAT_DEPARTMENT_NAME || departmentName === CONTROL_DEPARTMENT_NAME;
  const { data: colleaguesData } = useGetShiftColleaguesQuery(undefined, { skip: !isDispatchDepartment });

  const isMaintenanceDepartment = departmentName === MAINTENANCE_DEPARTMENT_NAME;
  const isControlDepartment = departmentName === CONTROL_DEPARTMENT_NAME;
  const isHandicapDepartment = departmentName === HANDICAP_DEPARTMENT_NAME;
  const isDomiciliuDepartment = departmentName === DOMICILIU_DEPARTMENT_NAME;
  const isAchizitiiDepartment = departmentName === ACHIZITII_DEPARTMENT_NAME;
  const isPvfDepartment = departmentName === PROCESE_VERBALE_DEPARTMENT_NAME;
  const isParcometreDepartment = departmentName === PARCOMETRE_DEPARTMENT_NAME;

  const needsCarStatus = isDispatchDepartment || isControlDepartment || isPvfDepartment || isDomiciliuDepartment || isAchizitiiDepartment;
  const { data: carStatus } = useGetCarStatusTodayQuery(undefined, { skip: !needsCarStatus });

  const hasPontaj = isMaintenanceDepartment || isControlDepartment;

  // ===== PONTAJ (Time Tracking) =====
  const { data: activeTimer, refetch: refetchActiveTimer } = useGetActiveTimerQuery(undefined, {
    skip: !hasPontaj,
    pollingInterval: hasPontaj ? 30000 : 0,
  });

  const todayISO = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const { data: todayEntries = [] } = useGetTimeEntriesQuery(
    { startDate: `${todayISO}T00:00:00`, endDate: `${todayISO}T23:59:59` },
    { skip: !hasPontaj },
  );

  const [startTimerMutation, { isLoading: isStarting }] = useStartTimerMutation();
  const [stopTimerMutation, { isLoading: isStopping }] = useStopTimerMutation();
  const [recordLocationMutation] = useRecordLocationMutation();
  const [reportGpsStatusMutation] = useReportGpsStatusMutation();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mismatchAlert, setMismatchAlert] = useState<{
    show: boolean;
    type: 'success' | 'warning';
    expectedHours: number;
    actualHours: number;
  } | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCaptureTimeRef = useRef<number>(0);
  const isCapturingRef = useRef<boolean>(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const gpsWorkerRef = useRef<Worker | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  const goToMySchedule = useCallback(() => navigate('/my-schedule'), [navigate]);
  const goToLeaveRequests = useCallback(() => navigate('/leave-requests'), [navigate]);
  const goToDailyReports = useCallback(() => navigate('/daily-reports'), [navigate]);
  const goToParkingHandicap = useCallback(() => navigate('/parking/handicap'), [navigate]);
  const goToParking = useCallback(() => navigate('/parking'), [navigate]);

  const todayDateShort = useMemo(
    () => new Date().toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' }),
    [],
  );
  const todayDateLong = useMemo(
    () => new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' }),
    [],
  );

  const [gpsStatus, setGpsStatus] = useState<'idle' | 'success' | 'error' | 'unavailable' | 'denied'>('idle');
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string>('');
  const [gpsPermissionBlocked, setGpsPermissionBlocked] = useState(false);
  const lastReportedGpsStatusRef = useRef<string | null>(null);

  const reportGpsStatusToServer = useCallback(
    (status: 'active' | 'denied' | 'error' | 'unavailable', errorMessage?: string) => {
      if (!activeTimer || activeTimer.endTime) return;
      if (lastReportedGpsStatusRef.current === status) return;
      lastReportedGpsStatusRef.current = status;
      reportGpsStatusMutation({ timeEntryId: activeTimer.id, status, errorMessage }).catch(() => {});
    },
    [activeTimer, reportGpsStatusMutation],
  );

  const captureLocation = useCallback(
    async (timeEntryId: string, isAutoRecorded: boolean = true, retryCount: number = 0) => {
      if (!navigator.geolocation) {
        setGpsStatus('unavailable');
        setGpsErrorMessage('Browserul nu suporta localizarea GPS');
        reportGpsStatusToServer('unavailable', 'Browserul nu suporta localizarea GPS');
        return;
      }
      if (isCapturingRef.current) return;
      isCapturingRef.current = true;
      const MAX_RETRIES = 2;
      return new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            try {
              await recordLocationMutation({ timeEntryId, latitude, longitude, accuracy: accuracy || undefined, isAutoRecorded }).unwrap();
              lastCaptureTimeRef.current = Date.now();
              setGpsStatus('success');
              setGpsErrorMessage('');
              setGpsPermissionBlocked(false);
              reportGpsStatusToServer('active');
            } catch {
              setGpsStatus('error');
              setGpsErrorMessage('Eroare la trimiterea locatiei catre server');
              reportGpsStatusToServer('error', 'Eroare la trimiterea locatiei catre server');
            }
            isCapturingRef.current = false;
            resolve();
          },
          (error) => {
            isCapturingRef.current = false;
            const reasons: Record<number, string> = {
              1: 'Permisiune refuzata - activeaza locatia in setarile browserului',
              2: 'Pozitia nu a putut fi determinata - activeaza GPS-ul pe telefon',
              3: 'Timeout - GPS-ul nu a raspuns in timp util',
            };
            const msg = reasons[error.code] || error.message;
            if (error.code === 1) {
              setGpsStatus('denied');
              setGpsErrorMessage('Locatia GPS este blocata! Te rugam sa o activezi din setarile browserului.');
              setGpsPermissionBlocked(true);
              reportGpsStatusToServer('denied', 'Locatia GPS este blocata');
              resolve();
              return;
            }
            if (retryCount < MAX_RETRIES && (error.code === 2 || error.code === 3)) {
              const delay = (retryCount + 1) * 5000;
              setTimeout(() => { captureLocation(timeEntryId, isAutoRecorded, retryCount + 1).then(resolve); }, delay);
              return;
            }
            setGpsStatus('error');
            setGpsErrorMessage(msg);
            reportGpsStatusToServer('error', msg);
            resolve();
          },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 },
        );
      });
    },
    [recordLocationMutation, reportGpsStatusToServer],
  );

  // GPS permission check on mount
  useEffect(() => {
    if (!hasPontaj || !navigator.permissions) return;
    let permissionStatus: PermissionStatus | null = null;
    const handlePermissionChange = () => {
      if (permissionStatus) {
        if (permissionStatus.state === 'denied') { setGpsPermissionBlocked(true); setGpsStatus('denied'); reportGpsStatusToServer('denied', 'Locatia GPS a fost blocata'); }
        else { setGpsPermissionBlocked(false); setGpsStatus('idle'); }
      }
    };
    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      permissionStatus = result;
      if (result.state === 'denied') {
        setGpsPermissionBlocked(true); setGpsStatus('denied');
        setGpsErrorMessage('Locatia GPS este blocata! Te rugam sa o activezi din setarile browserului.');
        reportGpsStatusToServer('denied', 'Locatia GPS este blocata la verificarea initiala');
      }
      result.addEventListener('change', handlePermissionChange);
    }).catch(() => {});
    return () => { if (permissionStatus) permissionStatus.removeEventListener('change', handlePermissionChange); };
  }, [hasPontaj, reportGpsStatusToServer]);

  // Timer counter
  useEffect(() => {
    if (activeTimer && !activeTimer.endTime) {
      const startTime = new Date(activeTimer.startTime).getTime();
      const updateElapsed = () => setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      updateElapsed();
      timerIntervalRef.current = setInterval(updateElapsed, 1000);
      return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
    } else {
      setElapsedSeconds(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }, [activeTimer]);

  // Wake Lock
  useEffect(() => {
    if (!activeTimer || activeTimer.endTime) {
      if (wakeLockRef.current) { wakeLockRef.current.release().catch(() => {}); wakeLockRef.current = null; }
      return;
    }
    const requestWakeLock = async () => {
      try { if ('wakeLock' in navigator) { wakeLockRef.current = await navigator.wakeLock.request('screen'); } } catch {}
    };
    requestWakeLock();
    const handleVisibilityForWakeLock = () => { if (!document.hidden && activeTimer && !activeTimer.endTime) requestWakeLock(); };
    document.addEventListener('visibilitychange', handleVisibilityForWakeLock);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityForWakeLock);
      if (wakeLockRef.current) { wakeLockRef.current.release().catch(() => {}); wakeLockRef.current = null; }
    };
  }, [activeTimer]);

  // Web Worker for background GPS
  useEffect(() => {
    if (activeTimer && !activeTimer.endTime) {
      try {
        const worker = new Worker('/gps-worker.js');
        gpsWorkerRef.current = worker;
        worker.onmessage = (event) => {
          if (event.data.type === 'TICK') {
            const elapsed = Date.now() - lastCaptureTimeRef.current;
            if (lastCaptureTimeRef.current > 0 && elapsed >= LOCATION_TRACKING_INTERVAL_MS) captureLocation(activeTimer.id, true);
          }
        };
        worker.postMessage({ type: 'START', interval: 30000 });
      } catch {}
      return () => { if (gpsWorkerRef.current) { gpsWorkerRef.current.postMessage({ type: 'STOP' }); gpsWorkerRef.current.terminate(); gpsWorkerRef.current = null; } };
    } else {
      if (gpsWorkerRef.current) { gpsWorkerRef.current.postMessage({ type: 'STOP' }); gpsWorkerRef.current.terminate(); gpsWorkerRef.current = null; }
    }
  }, [activeTimer, captureLocation]);

  // Silent audio for iOS
  useEffect(() => {
    if (activeTimer && !activeTimer.endTime) {
      try {
        const audio = new Audio('/silence.wav');
        audio.loop = true; audio.volume = 0.01;
        const playPromise = audio.play();
        if (playPromise) playPromise.then(() => { silentAudioRef.current = audio; }).catch(() => {});
      } catch {}
      return () => { if (silentAudioRef.current) { silentAudioRef.current.pause(); silentAudioRef.current.src = ''; silentAudioRef.current = null; } };
    } else {
      if (silentAudioRef.current) { silentAudioRef.current.pause(); silentAudioRef.current.src = ''; silentAudioRef.current = null; }
    }
  }, [activeTimer]);

  // Periodic location tracking
  useEffect(() => {
    if (activeTimer && !activeTimer.endTime) {
      const shouldCapture = (minInterval: number = LOCATION_TRACKING_INTERVAL_MS) => {
        const elapsed = Date.now() - lastCaptureTimeRef.current;
        return lastCaptureTimeRef.current > 0 && elapsed >= minInterval;
      };
      const doCapture = () => captureLocation(activeTimer.id, true);
      const checkInterval = () => { if (shouldCapture(LOCATION_TRACKING_INTERVAL_MS)) doCapture(); };
      const checkResume = () => { if (shouldCapture(LOCATION_MIN_INTERVAL_MS)) doCapture(); };

      if (lastCaptureTimeRef.current === 0) { lastCaptureTimeRef.current = Date.now(); captureLocation(activeTimer.id, true); }
      else checkResume();

      locationIntervalRef.current = setInterval(checkInterval, 30_000);
      const handleVisibilityChange = () => { if (!document.hidden) checkResume(); };
      const handleFocus = () => checkResume();
      const handlePageShow = (e: PageTransitionEvent) => { if (e.persisted) checkResume(); };
      const handleOnline = () => checkResume();

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      window.addEventListener('pageshow', handlePageShow);
      window.addEventListener('online', handleOnline);

      if ('serviceWorker' in navigator && 'periodicSync' in (navigator.serviceWorker.ready || {})) {
        navigator.serviceWorker.ready.then(async (registration) => {
          try {
            // @ts-expect-error - periodicSync not yet in TS types
            const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
            if (status.state === 'granted') {
              // @ts-expect-error - periodicSync not yet in TS types
              await registration.periodicSync.register('gps-capture', { minInterval: LOCATION_TRACKING_INTERVAL_MS });
            }
          } catch {}
        });
      }

      return () => {
        if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('pageshow', handlePageShow);
        window.removeEventListener('online', handleOnline);
      };
    } else {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    }
  }, [activeTimer, captureLocation]);

  // SW GPS capture listener
  useEffect(() => {
    if (!activeTimer || activeTimer.endTime) return;
    const handleSWMessage = (event: MessageEvent) => { if (event.data?.type === 'GPS_CAPTURE_REQUEST') captureLocation(activeTimer.id, true); };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => { navigator.serviceWorker?.removeEventListener('message', handleSWMessage); };
  }, [activeTimer, captureLocation]);

  const handleStartTimer = async () => {
    if (!navigator.geolocation) { setGpsStatus('unavailable'); setGpsErrorMessage('Browserul tau nu suporta GPS. Foloseste Chrome sau Safari.'); return; }
    if (navigator.permissions) {
      try { const perm = await navigator.permissions.query({ name: 'geolocation' }); if (perm.state === 'denied') { setGpsPermissionBlocked(true); setGpsStatus('denied'); setGpsErrorMessage('Locatia GPS este blocata! Mergi in setarile browserului si activeaz-o pentru acest site, apoi incearca din nou.'); return; } } catch {}
    }
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => { setGpsPermissionBlocked(false); resolve(); },
          (error) => { if (error.code === 1) { setGpsPermissionBlocked(true); setGpsStatus('denied'); setGpsErrorMessage('Locatia GPS este blocata! Permite accesul la locatie si incearca din nou.'); reject(new Error('GPS denied')); } else resolve(); },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        );
      });
    } catch { return; }
    try {
      setMismatchAlert(null);
      const result = await startTimerMutation().unwrap();
      refetchActiveTimer();
      lastCaptureTimeRef.current = Date.now();
      captureLocation(result.id, false).catch(() => {});
    } catch {
      notifyError('Eroare la pornirea pontajului.');
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    try {
      try { await Promise.race([captureLocation(activeTimer.id, false), new Promise((resolve) => setTimeout(resolve, 5000))]); } catch {}
      const result = await stopTimerMutation(activeTimer.id).unwrap();
      if (result.scheduleMismatch) {
        setMismatchAlert({ show: true, type: 'warning', expectedHours: result.expectedHours || 0, actualHours: result.actualHours || 0 });
      } else if (result.expectedHours > 0) {
        setMismatchAlert({ show: true, type: 'success', expectedHours: result.expectedHours, actualHours: result.actualHours });
      }
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setElapsedSeconds(0);
      refetchActiveTimer();
    } catch {
      notifyError('Eroare la oprirea pontajului.');
    }
  };

  // ===== Schedule computations =====
  const myApprovedLeaveDates = useMemo(() => {
    if (!user) return new Set<string>();
    const dates = new Set<string>();
    approvedLeaves.filter(leave => leave.userId === user.id).forEach(leave => { leave.dates.forEach(date => dates.add(date)); });
    return dates;
  }, [approvedLeaves, user]);

  const myAssignments = useMemo(() => {
    if (!schedules || !user) return [];
    const allAssignments: ScheduleAssignment[] = [];
    schedules.forEach((schedule: WorkSchedule) => {
      if (schedule.assignments) {
        allAssignments.push(...schedule.assignments.filter((a) => a.userId === user.id));
      }
    });
    return allAssignments;
  }, [schedules, user]);

  const getAssignmentForDate = (date: Date): ScheduleAssignment | undefined => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const existing = myAssignments.find((a) => {
      const ad = typeof a.shiftDate === 'string' ? a.shiftDate.split('T')[0] : new Date(a.shiftDate).toISOString().split('T')[0];
      return ad === dateStr;
    });
    if (existing) return existing;
    if (myApprovedLeaveDates.has(dateStr)) {
      return {
        id: `leave-${dateStr}`, workScheduleId: '', scheduleId: '', userId: user?.id || '', shiftTypeId: '',
        shiftDate: dateStr, isRestDay: true, notes: 'Concediu', durationHours: 0,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        shiftType: { id: '', name: 'Concediu', startTime: '', endTime: '', durationHours: 0, isNightShift: false, shiftPattern: 'SHIFT_12H', displayOrder: 99, createdAt: '', updatedAt: '' },
      } as ScheduleAssignment;
    }
    return undefined;
  };

  const todayAssignment = getAssignmentForDate(new Date());
  const totalHoursThisMonth = myAssignments.reduce((sum, a) => sum + (a.durationHours || 0), 0);
  const totalShiftsThisMonth = myAssignments.length;
  const nightShifts = myAssignments.filter((a) => a.shiftType?.isNightShift).length;
  const dayShifts = totalShiftsThisMonth - nightShifts;

  const workingDaysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let wd = 0;
    for (let day = 1; day <= daysInMonth; day++) { const dow = new Date(year, month, day).getDay(); if (dow !== 0 && dow !== 6) wd++; }
    return wd;
  }, [currentDate]);

  const monthlyHoursNorm = workingDaysInMonth * 8;
  const hoursDifference = totalHoursThisMonth - monthlyHoursNorm;

  const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
  const completedTodayEntries = todayEntries.filter(e => e.endTime);

  if (isLoading) return <DashboardSkeleton />;

  // ===== GRADIENT COLORS PER DEPARTMENT =====
  const deptGradients: Record<string, string> = {
    [DISPECERAT_DEPARTMENT_NAME]: '#0f172a 0%, #1e3a5f 100%',
    [CONTROL_DEPARTMENT_NAME]: '#0f172a 0%, #1e293b 100%',
    [MAINTENANCE_DEPARTMENT_NAME]: '#1a1a2e 0%, #16213e 100%',
    [HANDICAP_DEPARTMENT_NAME]: '#0f172a 0%, #1e3a5f 100%',
    [DOMICILIU_DEPARTMENT_NAME]: '#0f172a 0%, #1e293b 100%',
    [PROCESE_VERBALE_DEPARTMENT_NAME]: '#1a1a2e 0%, #0f172a 100%',
    [PARCOMETRE_DEPARTMENT_NAME]: '#0f172a 0%, #1e293b 100%',
    [ACHIZITII_DEPARTMENT_NAME]: '#0f172a 0%, #16213e 100%',
  };

  return (
    <Box sx={{ width: '100%', p: { xs: 0, sm: 1 } }}>
      {/* Header */}
      <GradientHeader
        title={`Buna, ${user?.fullName?.split(' ')[0] || 'User'}!`}
        subtitle={`${new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — ${departmentName}`}
        icon={<TrendingIcon />}
        gradient={deptGradients[departmentName] || '#3b82f6 0%, #8b5cf6 100%'}
      />

      {/* Car Status Banner */}
      {needsCarStatus && carStatus?.carInUse && (
        <Fade in={true} timeout={500}>
          <Alert severity="warning" icon={<CarIcon />} sx={{ mb: { xs: 2, sm: 3 }, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>Masina indisponibila — Afisare Procese Verbale</Typography>
            {carStatus.days.map((day) => (
              <Typography key={day.id} variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                {day.displayDate} — {[day.controlUser1Name, day.controlUser2Name].filter(Boolean).join(', ')} • Estimativ pana la {day.estimatedReturn}
              </Typography>
            ))}
          </Alert>
        </Fade>
      )}

      {/* Today's Shift Info + Monthly Summary */}
      <Fade in={true} timeout={600}>
        <Card
          sx={{
            mb: { xs: 2, sm: 3 },
            background: todayAssignment
              ? theme.palette.mode === 'light' ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
              : theme.palette.mode === 'light' ? 'linear-gradient(135deg, #1e293b 0%, #374151 100%)' : 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <CardContent sx={{ p: { xs: 2, sm: 3 }, position: 'relative' }}>
            <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2 }}>
                  <Avatar sx={{ width: { xs: 48, sm: 56 }, height: { xs: 48, sm: 56 }, bgcolor: 'rgba(255,255,255,0.2)' }}>
                    {todayAssignment ? <TodayIcon sx={{ fontSize: { xs: 24, sm: 28 } }} /> : <PersonIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="overline" sx={{ opacity: 0.85, fontSize: { xs: '0.65rem', sm: '0.75rem' }, display: 'block', fontWeight: 600 }}>
                      Azi, {isMobile ? todayDateShort : todayDateLong}
                    </Typography>
                    {todayAssignment ? (
                      <>
                        <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1.4rem' }, lineHeight: 1.2 }} noWrap>
                          {todayAssignment.shiftType?.name}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.8rem', sm: '0.875rem' }, mt: 0.25 }}>
                          {todayAssignment.shiftType?.startTime} - {todayAssignment.shiftType?.endTime} ({todayAssignment.durationHours}h)
                        </Typography>
                        {todayAssignment.workPosition && (
                          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.75 }}>
                            <LocationIcon sx={{ fontSize: 16 }} />
                            <Box sx={{ px: 1, py: 0.25, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1 }}>
                              <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{todayAssignment.workPosition.name}</Typography>
                            </Box>
                          </Stack>
                        )}
                      </>
                    ) : (
                      <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1.4rem' } }}>Zi Libera</Typography>
                    )}
                  </Box>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.85, fontSize: { xs: '0.7rem', sm: '0.8rem' }, fontWeight: 600 }}>
                    Sumar {monthNames[currentMonth - 1]} {currentYear}
                  </Typography>
                  <Grid container spacing={1}>
                    {[
                      { value: `${totalHoursThisMonth}h`, label: 'Total Ore' },
                      { value: `${monthlyHoursNorm}h`, label: 'Norma' },
                      { value: `${hoursDifference > 0 ? '+' : ''}${hoursDifference}h`, label: 'Diferenta', color: hoursDifference > 0 ? '#fca5a5' : hoursDifference < 0 ? '#fcd34d' : '#86efac' },
                      { value: String(dayShifts), label: 'Ture Zi' },
                      { value: String(nightShifts), label: 'Ture Noapte' },
                    ].map((item) => (
                      <Grid key={item.label} size={{ xs: 4, sm: 2.4 }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, color: item.color || 'inherit' }}>{item.value}</Typography>
                        <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, opacity: 0.85 }}>{item.label}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Fade>

      {/* Quick Actions */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
        {[
          { label: 'Programul Meu', icon: <CalendarIcon sx={{ fontSize: 28, color: 'primary.main' }} />, onClick: goToMySchedule, color: theme.palette.primary.main },
          { label: 'Concedii', icon: <BeachIcon sx={{ fontSize: 28, color: 'success.main' }} />, onClick: goToLeaveRequests, color: theme.palette.success.main, badge: deptStats?.leaveRequests?.pending },
          { label: 'Raport Zilnic', icon: <ReportDocIcon sx={{ fontSize: 28, color: 'secondary.main' }} />, onClick: goToDailyReports, color: theme.palette.secondary.main, badge: deptStats?.dailyReports?.draft },
        ].map((action) => (
          <Grid key={action.label} size={{ xs: 4 }}>
            <Grow in={true} timeout={700}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 20px ${alpha(action.color, 0.2)}` },
                }}
                onClick={action.onClick}
              >
                <CardContent sx={{ p: { xs: 1.5, sm: 2 }, textAlign: 'center', position: 'relative' }}>
                  {action.badge ? (
                    <Chip label={action.badge} size="small" sx={{ position: 'absolute', top: 8, right: 8, height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: alpha(theme.palette.warning.main, 0.15), color: theme.palette.warning.main }} />
                  ) : null}
                  <Box sx={{ mb: 0.5 }}>{action.icon}</Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>{action.label}</Typography>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
        ))}
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Left Column */}
        <Grid size={{ xs: 12, lg: 8 }}>
          {/* PONTAJ Section */}
          {hasPontaj && (
            <Fade in={true} timeout={700}>
              <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                <Card
                  sx={{
                    background: activeTimer && !activeTimer.endTime
                      ? theme.palette.mode === 'light' ? 'linear-gradient(135deg, #292524 0%, #44403c 100%)' : 'linear-gradient(135deg, #1c1917 0%, #292524 100%)'
                      : theme.palette.mode === 'light' ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: 'white', position: 'relative', overflow: 'hidden', mb: 2,
                  }}
                >
                  <Box sx={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                  <CardContent sx={{ p: { xs: 2, sm: 3 }, position: 'relative' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'center', sm: 'center' }} justifyContent="space-between" spacing={2}>
                      <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2 }}>
                        <Box sx={{ p: { xs: 1.25, sm: 1.5 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex' }}>
                          <TimerIcon sx={{ fontSize: { xs: 28, sm: 36 } }} />
                        </Box>
                        <Box>
                          <Typography variant="h3" fontWeight="bold" sx={{ fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' }, fontFamily: 'monospace', letterSpacing: '2px', lineHeight: 1 }}>
                            {activeTimer && !activeTimer.endTime ? formatElapsed(elapsedSeconds) : '00:00:00'}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.85rem' }, mt: 0.5 }}>
                            {activeTimer && !activeTimer.endTime ? `Tura a inceput la ${formatTime(activeTimer.startTime)}` : 'Nicio tura activa'}
                          </Typography>
                        </Box>
                      </Stack>
                      {gpsPermissionBlocked && (
                        <Alert severity="error" sx={{ width: '100%', borderRadius: 2, fontWeight: 500 }}>
                          <Typography variant="body2" fontWeight={600}>GPS BLOCAT - Nu poti porni tura!</Typography>
                          <Typography variant="caption">Mergi in setarile browserului &gt; Permisiuni site &gt; Locatie &gt; Permite. Apoi reincarca pagina si incearca din nou.</Typography>
                        </Alert>
                      )}
                      <Button
                        variant="contained" size="large" disabled={isStarting || isStopping}
                        onClick={activeTimer && !activeTimer.endTime ? handleStopTimer : handleStartTimer}
                        startIcon={activeTimer && !activeTimer.endTime ? <StopIcon sx={{ fontSize: { xs: 24, sm: 28 } }} /> : <PlayIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />}
                        sx={{
                          bgcolor: activeTimer && !activeTimer.endTime ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.25)',
                          color: 'white', fontWeight: 700, fontSize: { xs: '0.9rem', sm: '1rem' }, px: { xs: 3, sm: 4 }, py: { xs: 1.25, sm: 1.5 },
                          borderRadius: 3, minWidth: { xs: '100%', sm: 'auto' }, textTransform: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                          '&:hover': { bgcolor: activeTimer && !activeTimer.endTime ? 'rgba(220,38,38,1)' : 'rgba(255,255,255,0.35)' },
                          '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' },
                        }}
                      >
                        {isStarting ? 'Se porneste...' : isStopping ? 'Se opreste...' : activeTimer && !activeTimer.endTime ? 'Opreste Tura' : 'Porneste Tura'}
                      </Button>
                    </Stack>
                    {activeTimer && !activeTimer.endTime && (gpsStatus !== 'idle' || gpsPermissionBlocked) && (
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1.5, px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: gpsStatus === 'success' ? 'rgba(76,175,80,0.15)' : gpsStatus === 'error' ? 'rgba(244,67,54,0.15)' : 'rgba(255,152,0,0.15)' }}>
                        {gpsStatus === 'success' ? <GpsFixedIcon sx={{ fontSize: 16, color: '#4caf50' }} /> : <GpsOffIcon sx={{ fontSize: 16, color: gpsStatus === 'error' ? '#f44336' : '#ff9800' }} />}
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: gpsStatus === 'success' ? '#2e7d32' : gpsStatus === 'error' ? '#c62828' : '#e65100' }}>
                          {gpsStatus === 'success' ? 'GPS activ - locatia se inregistreaza automat' : gpsStatus === 'denied' ? 'GPS BLOCAT - activeaza locatia in setarile browserului!' : gpsErrorMessage || 'Eroare GPS'}
                        </Typography>
                      </Stack>
                    )}
                  </CardContent>
                </Card>
                {mismatchAlert?.show && (
                  <Alert severity={mismatchAlert.type} onClose={() => setMismatchAlert(null)} sx={{ mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    {mismatchAlert.type === 'warning'
                      ? `Ai lucrat ${mismatchAlert.actualHours}h, dar programul prevedea ${mismatchAlert.expectedHours}h. Admin-ul a fost notificat.`
                      : `Tura completa conform programului (${mismatchAlert.actualHours}h / ${mismatchAlert.expectedHours}h).`}
                  </Alert>
                )}
                {completedTodayEntries.length > 0 && (
                  <Card>
                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                        <HistoryIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: 'text.secondary' }} />
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                          Istoric astazi ({completedTodayEntries.length} {completedTodayEntries.length === 1 ? 'inregistrare' : 'inregistrari'})
                        </Typography>
                      </Stack>
                      <Stack spacing={1}>
                        {completedTodayEntries.map((entry) => (
                          <Box key={entry.id} sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: 1.5, border: `1px solid ${alpha(theme.palette.divider, 0.08)}` }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={0.5}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <TimeIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: 'primary.main' }} />
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                  {formatTime(entry.startTime)} - {entry.endTime ? formatTime(entry.endTime) : 'In curs'}
                                </Typography>
                              </Stack>
                              <Stack direction="row" alignItems="center" spacing={0.75}>
                                <Chip label={entry.durationMinutes ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m` : 'In curs'} size="small" color={entry.endTime ? 'primary' : 'warning'} sx={{ fontWeight: 600, height: { xs: 22, sm: 26 }, fontSize: { xs: '0.7rem', sm: '0.75rem' } }} />
                                {entry.locationLogs && entry.locationLogs.length > 0 && (
                                  <Chip icon={<LocationIcon sx={{ fontSize: 14 }} />} label={`${entry.locationLogs.length}`} size="small" variant="outlined" sx={{ height: { xs: 22, sm: 26 }, fontSize: { xs: '0.7rem', sm: '0.75rem' } }} />
                                )}
                              </Stack>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Box>
            </Fade>
          )}

          {/* Department-Specific Charts */}

          {/* Handicap Charts */}
          {(isHandicapDepartment || isMaintenanceDepartment) && deptStats?.handicap && (
            <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Suspense fallback={null}>
                  <StatusDistributionChart
                    title="Solicitari Handicap"
                    icon={<AccessibleIcon sx={{ color: theme.palette.info.main, fontSize: 20 }} />}
                    height={{ xs: 180, sm: 220 }}
                    data={[
                      { label: 'Amplasare', value: deptStats.handicap.requestsByType.amplasare, color: theme.palette.success.main },
                      { label: 'Revocare', value: deptStats.handicap.requestsByType.revocare, color: theme.palette.error.main },
                      { label: 'Marcaje', value: deptStats.handicap.requestsByType.marcaje, color: theme.palette.info.main },
                    ]}
                  />
                </Suspense>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Suspense fallback={null}>
                  <WeeklyOverviewChart
                    title="Legitimatii Active"
                    icon={<AccessibleIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />}
                    height={{ xs: 180, sm: 220 }}
                    data={[
                      { label: 'Handicap', value: deptStats.handicap.legitimationsCount, color: theme.palette.primary.main },
                      { label: 'Revolutionar', value: deptStats.handicap.revolutionarCount, color: theme.palette.secondary.main },
                    ]}
                  />
                </Suspense>
              </Grid>
            </Grid>
          )}

          {/* Domiciliu Charts */}
          {(isDomiciliuDepartment || isMaintenanceDepartment || isHandicapDepartment) && deptStats?.domiciliu && (
            <Box sx={{ mb: { xs: 2, sm: 3 } }}>
              <Suspense fallback={null}>
                <StatusDistributionChart
                  title="Parcari Domiciliu"
                  icon={<HomeIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />}
                  height={{ xs: 180, sm: 220 }}
                  data={[
                    { label: 'Trasare Locuri', value: deptStats.domiciliu.byType.trasareLocuri, color: theme.palette.primary.main },
                    { label: 'Revocare Locuri', value: deptStats.domiciliu.byType.revocareLocuri, color: theme.palette.error.main },
                    { label: 'Amplasare Panou', value: deptStats.domiciliu.byType.amplasarePanou, color: theme.palette.success.main },
                    { label: 'Revocare Panou', value: deptStats.domiciliu.byType.revocarePanou, color: theme.palette.secondary.main },
                    { label: 'Finalizate', value: deptStats.domiciliu.finalizat, color: theme.palette.grey[400] },
                  ]}
                />
              </Suspense>
            </Box>
          )}

          {/* Control Sesizari Charts */}
          {(isControlDepartment || isMaintenanceDepartment) && deptStats?.controlSesizari && (
            <Box sx={{ mb: { xs: 2, sm: 3 } }}>
              <Suspense fallback={null}>
                <StatusDistributionChart
                  title="Control Sesizari"
                  icon={<GavelIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />}
                  height={{ xs: 180, sm: 220 }}
                  data={[
                    { label: 'Zona Rosu', value: deptStats.controlSesizari.byZone.rosu, color: theme.palette.error.main },
                    { label: 'Zona Galben', value: deptStats.controlSesizari.byZone.galben, color: '#f59e0b' },
                    { label: 'Zona Alb', value: deptStats.controlSesizari.byZone.alb, color: theme.palette.grey[500] },
                    { label: 'Finalizate', value: deptStats.controlSesizari.finalizat, color: theme.palette.success.main },
                  ]}
                />
              </Suspense>
            </Box>
          )}

          {/* Parking Charts (Dispecerat / Maintenance) */}
          {(departmentName === DISPECERAT_DEPARTMENT_NAME || isMaintenanceDepartment) && deptStats?.parking && (
            <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Suspense fallback={null}>
                  <WeeklyOverviewChart
                    title="Parcari Etajate"
                    icon={<IssuesIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />}
                    height={{ xs: 160, sm: 200 }}
                    data={[
                      { label: 'Probleme', value: deptStats.parking.activeIssues, color: theme.palette.error.main },
                      { label: 'Prejudicii', value: deptStats.parking.activeDamages, color: theme.palette.warning.main },
                      { label: 'Incasari', value: deptStats.parking.cashTotal.count, color: theme.palette.success.main },
                    ]}
                  />
                </Suspense>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Grow in={true} timeout={800}>
                  <Card
                    sx={{
                      height: '100%', cursor: 'pointer', transition: 'all 0.3s',
                      background: theme.palette.mode === 'light' ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                      color: 'white', position: 'relative', overflow: 'hidden',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 28px rgba(15,23,42,0.4)' },
                    }}
                    onClick={goToParking}
                  >
                    <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 }, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                      <Typography variant="overline" sx={{ fontWeight: 600, fontSize: '0.7rem', opacity: 0.9 }}>Total Incasari Automate</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5, fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                        {formatRONCompact(deptStats.parking.cashTotal.totalAmount)}
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', opacity: 0.85 }}>{deptStats.parking.cashTotal.count} ridicari</Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            </Grid>
          )}

          {/* Achizitii Charts */}
          {isAchizitiiDepartment && deptStats?.revenue && deptStats?.achizitii && (
            <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Suspense fallback={null}>
                  <WeeklyOverviewChart
                    title={`Incasari / Cheltuieli — ${deptStats.revenue.month}/${deptStats.revenue.year}`}
                    icon={<AccountBalanceIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />}
                    height={{ xs: 160, sm: 200 }}
                    data={[
                      { label: 'Incasari', value: deptStats.revenue.incasari, color: theme.palette.success.main },
                      { label: 'Incasari Card', value: deptStats.revenue.incasariCard, color: theme.palette.info.main },
                      { label: 'Cheltuieli', value: deptStats.revenue.cheltuieli, color: theme.palette.error.main },
                    ]}
                  />
                </Suspense>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Suspense fallback={null}>
                  <WeeklyOverviewChart
                    title={`Achizitii ${currentYear}`}
                    icon={<ShoppingCartIcon sx={{ color: theme.palette.info.main, fontSize: 20 }} />}
                    height={{ xs: 160, sm: 200 }}
                    data={[
                      { label: 'Investitii', value: deptStats.achizitii.investments, color: theme.palette.primary.main },
                      { label: 'Chelt. Curente', value: deptStats.achizitii.currentExpenses, color: theme.palette.warning.main },
                      { label: 'Total Cheltuit', value: deptStats.achizitii.totalSpent, color: theme.palette.error.main },
                    ]}
                  />
                </Suspense>
              </Grid>
            </Grid>
          )}

          {/* Equipment Stock Charts (Parcometre / Maintenance) */}
          {(isParcometreDepartment || isMaintenanceDepartment) && deptStats?.equipmentStock && (
            <Box sx={{ mb: { xs: 2, sm: 3 } }}>
              <Suspense fallback={null}>
                <WeeklyOverviewChart
                  title="Stoc Echipamente"
                  icon={<InventoryIcon sx={{ color: theme.palette.info.main, fontSize: 20 }} />}
                  height={{ xs: 160, sm: 200 }}
                  data={[
                    { label: 'Definitii', value: deptStats.equipmentStock.definitionsCount, color: theme.palette.primary.main },
                    { label: 'Cantitate', value: deptStats.equipmentStock.totalQuantity, color: theme.palette.success.main },
                    { label: 'Categorii', value: deptStats.equipmentStock.categoriesCount, color: theme.palette.info.main },
                  ]}
                />
              </Suspense>
            </Box>
          )}

          {/* Colleagues Section (Dispecerat / Control) */}
          {isDispatchDepartment && colleaguesData?.userPosition && (
            <Fade in={true} timeout={700}>
              <Card
                sx={{
                  mb: { xs: 2, sm: 3 },
                  background: theme.palette.mode === 'light' ? 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  color: 'white', position: 'relative', overflow: 'hidden',
                }}
              >
                <Box sx={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, position: 'relative' }}>
                  <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 1.5, sm: 2 } }}>
                    <Box sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex' }}>
                      {colleaguesData.userPosition === 'DISP' ? <DispatcherIcon sx={{ fontSize: { xs: 22, sm: 28 } }} /> : <ControlIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
                        Colegi pe Tura — Astazi
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {colleaguesData.today.length > 0 ? `${colleaguesData.today.length} ${colleaguesData.today.length === 1 ? 'persoana' : 'persoane'}` : 'Nimeni programat'}
                      </Typography>
                    </Box>
                  </Stack>
                  {colleaguesData.today.length > 0 ? (
                    <List sx={{ py: 0 }}>
                      {colleaguesData.today.map((colleague, index) => (
                        <ListItem key={colleague.id} sx={{ bgcolor: colleague.isCurrentUser ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', borderRadius: 2, mb: index < colleaguesData.today.length - 1 ? 0.75 : 0, px: { xs: 1, sm: 2 }, py: { xs: 0.75, sm: 1 }, border: colleague.isCurrentUser ? '1px solid rgba(255,255,255,0.4)' : 'none' }}>
                          <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 56 } }}>
                            <Avatar sx={{ bgcolor: colleague.isCurrentUser ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)', color: 'white', width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}>
                              <PersonIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Typography variant="subtitle1" fontWeight="bold" color="white" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }} noWrap>{colleague.userName}</Typography>
                                {colleague.isCurrentUser && <Chip label="Tu" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.3)', color: 'white', fontWeight: 700, height: 20, fontSize: '0.65rem' }} />}
                              </Stack>
                            }
                            secondary={
                              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                                <Chip icon={<TimeIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'white !important' }} />} label={`${colleague.startTime} - ${colleague.endTime}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, height: { xs: 24, sm: 28 }, fontSize: { xs: '0.7rem', sm: '0.8rem' }, '& .MuiChip-icon': { color: 'white' } }} />
                                <Chip label={colleague.shiftCode || colleague.shiftType} size="small" sx={{ bgcolor: colleague.shiftCode === 'Z' ? '#fbbf24' : colleague.shiftCode === 'N' ? '#8b5cf6' : '#10b981', color: colleague.shiftCode === 'Z' ? '#000' : '#fff', fontWeight: 700, height: { xs: 24, sm: 28 }, fontSize: { xs: '0.7rem', sm: '0.8rem' } }} />
                              </Stack>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>Nu exista colegi programati astazi.</Typography>
                    </Box>
                  )}
                  {/* Tomorrow */}
                  {colleaguesData.tomorrow.length > 0 && (
                    <>
                      <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} sx={{ mt: 2.5, mb: { xs: 1.5, sm: 2 } }}>
                        <Box sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex' }}>
                          <TomorrowIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
                            Maine — {(() => { const t = new Date(); t.setDate(t.getDate() + 1); return t.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' }); })()}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            {`${colleaguesData.tomorrow.length} ${colleaguesData.tomorrow.length === 1 ? 'persoana' : 'persoane'}`}
                          </Typography>
                        </Box>
                      </Stack>
                      <List sx={{ py: 0 }}>
                        {colleaguesData.tomorrow.map((colleague, index) => (
                          <ListItem key={colleague.id} sx={{ bgcolor: colleague.isCurrentUser ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', borderRadius: 2, mb: index < colleaguesData.tomorrow.length - 1 ? 0.75 : 0, px: { xs: 1, sm: 2 }, py: { xs: 0.75, sm: 1 }, border: colleague.isCurrentUser ? '1px solid rgba(255,255,255,0.3)' : 'none' }}>
                            <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 56 } }}>
                              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}>
                                <PersonIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <Typography variant="subtitle1" fontWeight="bold" color="white" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }} noWrap>{colleague.userName}</Typography>
                                  {colleague.isCurrentUser && <Chip label="Tu" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.3)', color: 'white', fontWeight: 700, height: 20, fontSize: '0.65rem' }} />}
                                </Stack>
                              }
                              secondary={
                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                                  <Chip icon={<TimeIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'white !important' }} />} label={`${colleague.startTime} - ${colleague.endTime}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, height: { xs: 24, sm: 28 }, fontSize: { xs: '0.7rem', sm: '0.8rem' }, '& .MuiChip-icon': { color: 'white' } }} />
                                  <Chip label={colleague.shiftCode || colleague.shiftType} size="small" sx={{ bgcolor: colleague.shiftCode === 'Z' ? '#fbbf24' : colleague.shiftCode === 'N' ? '#8b5cf6' : '#10b981', color: colleague.shiftCode === 'Z' ? '#000' : '#fff', fontWeight: 700, height: { xs: 24, sm: 28 }, fontSize: { xs: '0.7rem', sm: '0.8rem' } }} />
                                </Stack>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                </CardContent>
              </Card>
            </Fade>
          )}
        </Grid>

        {/* Right Column — Summary cards */}
        <Grid size={{ xs: 12, lg: 4 }}>
          {/* Leave Requests Summary */}
          <Fade in={true} timeout={800}>
            <Card sx={{ mb: { xs: 2, sm: 3 } }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <BeachIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                  <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                    Concedii
                  </Typography>
                </Stack>
                <Stack spacing={1}>
                  {[
                    { label: 'In asteptare', value: deptStats?.leaveRequests?.pending || 0, color: theme.palette.warning.main },
                    { label: 'Aprobate', value: deptStats?.leaveRequests?.approved || 0, color: theme.palette.success.main },
                    { label: 'Total cereri', value: deptStats?.leaveRequests?.total || 0, color: theme.palette.info.main },
                  ].map((item) => (
                    <Stack key={item.label} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.25, borderRadius: 1.5, bgcolor: alpha(item.color, 0.06), borderLeft: `3px solid ${item.color}` }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>{item.label}</Typography>
                      <Chip label={item.value} size="small" sx={{ fontWeight: 700, bgcolor: alpha(item.color, 0.15), color: item.color, height: 24, minWidth: 32, '& .MuiChip-label': { px: 1 } }} />
                    </Stack>
                  ))}
                </Stack>
                <Button fullWidth variant="text" endIcon={<ArrowIcon />} onClick={goToLeaveRequests} sx={{ mt: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
                  Gestioneaza concedii
                </Button>
              </CardContent>
            </Card>
          </Fade>

          {/* Daily Reports Summary */}
          <Fade in={true} timeout={900}>
            <Card sx={{ mb: { xs: 2, sm: 3 } }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <ReportDocIcon sx={{ color: theme.palette.secondary.main, fontSize: 20 }} />
                  <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                    Rapoarte Zilnice
                  </Typography>
                </Stack>
                <Stack spacing={1}>
                  {[
                    { label: 'Trimise', value: deptStats?.dailyReports?.submitted || 0, color: theme.palette.success.main },
                    { label: 'Draft', value: deptStats?.dailyReports?.draft || 0, color: theme.palette.grey[500] },
                  ].map((item) => (
                    <Stack key={item.label} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.25, borderRadius: 1.5, bgcolor: alpha(item.color, 0.06), borderLeft: `3px solid ${item.color}` }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>{item.label}</Typography>
                      <Chip label={item.value} size="small" sx={{ fontWeight: 700, bgcolor: alpha(item.color, 0.15), color: item.color, height: 24, minWidth: 32, '& .MuiChip-label': { px: 1 } }} />
                    </Stack>
                  ))}
                </Stack>
                <Button fullWidth variant="text" endIcon={<ArrowIcon />} onClick={goToDailyReports} sx={{ mt: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
                  Scrie raportul
                </Button>
              </CardContent>
            </Card>
          </Fade>

          {/* Handicap Quick Nav */}
          {isHandicapDepartment && (
            <Fade in={true} timeout={1000}>
              <Card sx={{ mb: { xs: 2, sm: 3 } }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <AccessibleIcon sx={{ color: theme.palette.info.main, fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                      Actiuni Rapide
                    </Typography>
                  </Stack>
                  <Button fullWidth variant="outlined" endIcon={<ArrowIcon />} onClick={goToParkingHandicap} sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
                    Parcari Handicap
                  </Button>
                </CardContent>
              </Card>
            </Fade>
          )}

          {/* Parking Quick Nav */}
          {(departmentName === DISPECERAT_DEPARTMENT_NAME || isMaintenanceDepartment) && (
            <Fade in={true} timeout={1000}>
              <Card>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <IssuesIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                      Actiuni Rapide
                    </Typography>
                  </Stack>
                  <Button fullWidth variant="outlined" endIcon={<ArrowIcon />} onClick={goToParking} sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
                    Parcari Etajate
                  </Button>
                </CardContent>
              </Card>
            </Fade>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default EmployeeDashboard;
