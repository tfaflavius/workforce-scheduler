import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Stack,
  CircularProgress,
  Avatar,
  Divider,
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
  AddLocation as AmplasareIcon,
  RemoveCircle as RevocareIcon,
  Brush as MarcajeIcon,
  Badge as LegitimatiiIcon,
  MilitaryTech as RevolutionarIcon,
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
} from '@mui/icons-material';
import { useGetSchedulesQuery, useGetShiftColleaguesQuery } from '../../store/api/schedulesApi';
import { useGetApprovedLeavesByMonthQuery } from '../../store/api/leaveRequests.api';
import {
  useGetHandicapRequestsQuery,
  useGetHandicapLegitimationsQuery,
  useGetRevolutionarLegitimationsQuery,
} from '../../store/api/handicap.api';
import {
  useStartTimerMutation,
  useStopTimerMutation,
  useGetActiveTimerQuery,
  useGetTimeEntriesQuery,
  useRecordLocationMutation,
} from '../../store/api/time-tracking.api';
import { useAppSelector } from '../../store/hooks';
import type { WorkSchedule, ScheduleAssignment } from '../../types/schedule.types';
import { StatCard } from '../../components/common/StatCard';

// Departament cu acces la Handicap stats
const HANDICAP_DEPARTMENT_NAME = 'Parcari Handicap';
const MAINTENANCE_DEPARTMENT_NAME = 'Intretinere Parcari';

// GPS tracking: capture every 10 minutes when possible
const LOCATION_TRACKING_INTERVAL_MS = 10 * 60 * 1000;
// Minimum time between captures (anti-spam for visibility/focus events)
const LOCATION_MIN_INTERVAL_MS = 2 * 60 * 1000;

// Helper: format seconds to HH:MM:SS
const formatElapsed = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Helper: format date to HH:MM
const formatTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};


const EmployeeDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const currentDate = new Date();

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const monthYear = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const { data: schedules, isLoading } = useGetSchedulesQuery({
    monthYear,
    status: 'APPROVED',
  });

  const { data: approvedLeaves = [] } = useGetApprovedLeavesByMonthQuery(monthYear);

  // Check if user is in Dispecerat or Control department
  const isDispatchDepartment = user?.department?.name === 'Dispecerat' || user?.department?.name === 'Control';

  // Get colleagues on same position (only for Dispecerat/Control)
  const { data: colleaguesData } = useGetShiftColleaguesQuery(undefined, {
    skip: !isDispatchDepartment,
  });

  // Check if user is in Parcari Handicap department
  const isHandicapDepartment = user?.department?.name === HANDICAP_DEPARTMENT_NAME;

  // Check if user is in Intretinere Parcari department
  const isMaintenanceDepartment = user?.department?.name === MAINTENANCE_DEPARTMENT_NAME;

  // Check if user is in Control department
  const isControlDepartment = user?.department?.name === 'Control';

  // Departments with pontaj + GPS tracking
  const hasPontaj = isMaintenanceDepartment || isControlDepartment;

  // Handicap queries - only fetch if user is in Parcari Handicap department
  const { data: handicapRequests = [] } = useGetHandicapRequestsQuery(undefined, {
    skip: !isHandicapDepartment,
  });
  const { data: handicapLegitimations = [] } = useGetHandicapLegitimationsQuery(undefined, {
    skip: !isHandicapDepartment,
  });
  const { data: revolutionarLegitimations = [] } = useGetRevolutionarLegitimationsQuery(undefined, {
    skip: !isHandicapDepartment,
  });

  // ===== PONTAJ (Time Tracking) - pentru Intretinere Parcari + Control =====
  const { data: activeTimer, refetch: refetchActiveTimer } = useGetActiveTimerQuery(undefined, {
    skip: !hasPontaj,
    pollingInterval: hasPontaj ? 30000 : 0, // poll every 30s
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

  // Pontaj local state
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

  // GPS status for user feedback
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'success' | 'error' | 'unavailable' | 'denied'>('idle');
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string>('');
  const [gpsPermissionBlocked, setGpsPermissionBlocked] = useState(false);

  // Capture GPS location with retry logic and longer timeout
  const captureLocation = useCallback(
    async (timeEntryId: string, isAutoRecorded: boolean = true, retryCount: number = 0) => {
      if (!navigator.geolocation) {
        console.warn('[GPS] Geolocation not available in this browser');
        setGpsStatus('unavailable');
        setGpsErrorMessage('Browserul nu suporta localizarea GPS');
        return;
      }

      // Prevent concurrent captures (the main source of duplicates)
      if (isCapturingRef.current) {
        console.log('[GPS] Capture already in progress, skipping');
        return;
      }
      isCapturingRef.current = true;

      const MAX_RETRIES = 2;

      return new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            console.log(`[GPS] Location captured: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (accuracy: ${accuracy?.toFixed(0)}m, auto: ${isAutoRecorded})`);
            try {
              await recordLocationMutation({
                timeEntryId,
                latitude,
                longitude,
                accuracy: accuracy || undefined,
                isAutoRecorded,
              }).unwrap();
              lastCaptureTimeRef.current = Date.now();
              setGpsStatus('success');
              setGpsErrorMessage('');
              setGpsPermissionBlocked(false);
            } catch (err) {
              console.error('[GPS] Failed to send location to server:', err);
              setGpsStatus('error');
              setGpsErrorMessage('Eroare la trimiterea locatiei catre server');
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
            console.warn(`[GPS] Error: ${msg} (code: ${error.code}, retry: ${retryCount}/${MAX_RETRIES})`);

            // Permission denied - no point retrying
            if (error.code === 1) {
              setGpsStatus('denied');
              setGpsErrorMessage('Locatia GPS este blocata! Te rugam sa o activezi din setarile browserului.');
              setGpsPermissionBlocked(true);
              resolve();
              return;
            }

            // Retry for timeout/position unavailable errors
            if (retryCount < MAX_RETRIES && (error.code === 2 || error.code === 3)) {
              const delay = (retryCount + 1) * 5000; // 5s, 10s
              console.log(`[GPS] Retrying in ${delay / 1000}s...`);
              setTimeout(() => {
                captureLocation(timeEntryId, isAutoRecorded, retryCount + 1).then(resolve);
              }, delay);
              return;
            }

            setGpsStatus('error');
            setGpsErrorMessage(msg);
            resolve();
          },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 },
        );
      });
    },
    [recordLocationMutation],
  );

  // Check GPS permission on mount for departments that need it
  useEffect(() => {
    if (!hasPontaj || !navigator.permissions) return;
    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'denied') {
        setGpsPermissionBlocked(true);
        setGpsStatus('denied');
        setGpsErrorMessage('Locatia GPS este blocata! Te rugam sa o activezi din setarile browserului.');
      }
      result.addEventListener('change', () => {
        if (result.state === 'denied') {
          setGpsPermissionBlocked(true);
          setGpsStatus('denied');
        } else {
          setGpsPermissionBlocked(false);
          setGpsStatus('idle');
        }
      });
    }).catch(() => { /* permissions API not supported */ });
  }, [hasPontaj]);

  // Timer counter effect
  useEffect(() => {
    if (activeTimer && !activeTimer.endTime) {
      const startTime = new Date(activeTimer.startTime).getTime();

      const updateElapsed = () => {
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - startTime) / 1000));
      };

      updateElapsed();
      timerIntervalRef.current = setInterval(updateElapsed, 1000);

      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
    } else {
      setElapsedSeconds(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }, [activeTimer]);

  // Periodic location tracking - robust for mobile browsers
  // Mobile browsers KILL setInterval when screen is off or app is in background.
  // Strategy:
  //   1. setInterval every 60s as a best-effort timer (works when screen is on)
  //   2. visibilitychange + focus events: capture IMMEDIATELY when user returns
  //      (with min 2-minute gap to avoid spam)
  //   3. Main interval: 10 minutes for better route tracking
  useEffect(() => {
    if (activeTimer && !activeTimer.endTime) {
      const shouldCapture = (minInterval: number = LOCATION_TRACKING_INTERVAL_MS) => {
        const elapsed = Date.now() - lastCaptureTimeRef.current;
        return lastCaptureTimeRef.current > 0 && elapsed >= minInterval;
      };

      const doCapture = (reason: string) => {
        console.log(`[GPS] ${reason} (${Math.round((Date.now() - lastCaptureTimeRef.current) / 60000)} min since last)`);
        captureLocation(activeTimer.id, true);
      };

      // Regular interval check (every 60s, trigger if 10 min elapsed)
      const checkInterval = () => {
        if (shouldCapture(LOCATION_TRACKING_INTERVAL_MS)) {
          doCapture('Periodic capture (interval)');
        }
      };

      // Visibility/focus: capture if at least 2 min since last (catch up after background)
      const checkResume = () => {
        if (shouldCapture(LOCATION_MIN_INTERVAL_MS)) {
          doCapture('Resume capture (app visible)');
        }
      };

      // On effect mount: check if overdue
      if (lastCaptureTimeRef.current > 0) {
        checkResume();
      }

      // Poll every 60s
      locationIntervalRef.current = setInterval(checkInterval, 60_000);

      // Visibility change (mobile: user opens app again)
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          checkResume();
        }
      };
      // Focus (desktop: user clicks window)
      const handleFocus = () => {
        checkResume();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);

      return () => {
        if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    } else {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    }
  }, [activeTimer, captureLocation]);

  // Listen for GPS capture requests from Service Worker (push-triggered)
  useEffect(() => {
    if (!activeTimer || activeTimer.endTime) return;

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GPS_CAPTURE_REQUEST') {
        console.log('[GPS] Service Worker requested GPS capture (push-triggered)');
        captureLocation(activeTimer.id, true);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [activeTimer, captureLocation]);

  // Handle START - check GPS permission first
  const handleStartTimer = async () => {
    // Check GPS availability before starting timer
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      setGpsErrorMessage('Browserul tau nu suporta GPS. Foloseste Chrome sau Safari.');
      return;
    }

    // Check permission via Permissions API if available
    if (navigator.permissions) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'denied') {
          setGpsPermissionBlocked(true);
          setGpsStatus('denied');
          setGpsErrorMessage('Locatia GPS este blocata! Mergi in setarile browserului si activeaz-o pentru acest site, apoi incearca din nou.');
          return;
        }
      } catch {
        // Permissions API not supported - proceed anyway
      }
    }

    // Try to get GPS BEFORE starting the timer (to trigger the permission prompt)
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            setGpsPermissionBlocked(false);
            resolve();
          },
          (error) => {
            if (error.code === 1) {
              // Permission denied
              setGpsPermissionBlocked(true);
              setGpsStatus('denied');
              setGpsErrorMessage('Locatia GPS este blocata! Permite accesul la locatie si incearca din nou.');
              reject(new Error('GPS denied'));
            } else {
              // Timeout or unavailable - still allow start, GPS might work later
              resolve();
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        );
      });
    } catch {
      // GPS permission denied - don't start timer
      return;
    }

    try {
      setMismatchAlert(null);
      const result = await startTimerMutation().unwrap();
      refetchActiveTimer();
      // Mark capture time NOW to prevent the periodic effect from firing a duplicate
      lastCaptureTimeRef.current = Date.now();
      // Capture initial location in background (don't block start)
      captureLocation(result.id, false).catch(() => {});
    } catch (err: any) {
      console.error('Failed to start timer:', err);
    }
  };

  // Handle STOP
  const handleStopTimer = async () => {
    if (!activeTimer) return;
    try {
      // Try to capture final location but don't block stop (5s timeout)
      try {
        await Promise.race([
          captureLocation(activeTimer.id, false),
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
      } catch {
        // Location capture failed - continue with stop anyway
      }
      // Stop timer
      const result = await stopTimerMutation(activeTimer.id).unwrap();

      // Check schedule mismatch
      if (result.scheduleMismatch) {
        setMismatchAlert({
          show: true,
          type: 'warning',
          expectedHours: result.expectedHours || 0,
          actualHours: result.actualHours || 0,
        });
      } else if (result.expectedHours > 0) {
        setMismatchAlert({
          show: true,
          type: 'success',
          expectedHours: result.expectedHours,
          actualHours: result.actualHours,
        });
      }

      // Clear intervals
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setElapsedSeconds(0);
      refetchActiveTimer();
    } catch (err: any) {
      console.error('Failed to stop timer:', err);
    }
  };

  // ===== END PONTAJ =====

  const myApprovedLeaveDates = useMemo(() => {
    if (!user) return new Set<string>();
    const dates = new Set<string>();
    approvedLeaves
      .filter(leave => leave.userId === user.id)
      .forEach(leave => {
        leave.dates.forEach(date => dates.add(date));
      });
    return dates;
  }, [approvedLeaves, user]);

  const myAssignments = useMemo(() => {
    if (!schedules || !user) return [];
    const allAssignments: ScheduleAssignment[] = [];
    schedules.forEach((schedule: WorkSchedule) => {
      if (schedule.assignments) {
        const userAssignments = schedule.assignments.filter(
          (a) => a.userId === user.id
        );
        allAssignments.push(...userAssignments);
      }
    });
    return allAssignments;
  }, [schedules, user]);

  const getAssignmentForDate = (date: Date): ScheduleAssignment | undefined => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const existingAssignment = myAssignments.find((a) => {
      const assignmentDate = typeof a.shiftDate === 'string'
        ? a.shiftDate.split('T')[0]
        : new Date(a.shiftDate).toISOString().split('T')[0];
      return assignmentDate === dateStr;
    });

    if (existingAssignment) return existingAssignment;

    if (myApprovedLeaveDates.has(dateStr)) {
      return {
        id: `leave-${dateStr}`,
        workScheduleId: '',
        scheduleId: '',
        userId: user?.id || '',
        shiftTypeId: '',
        shiftDate: dateStr,
        isRestDay: true,
        notes: 'Concediu',
        durationHours: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shiftType: {
          id: '',
          name: 'Concediu',
          startTime: '',
          endTime: '',
          durationHours: 0,
          isNightShift: false,
          shiftPattern: 'SHIFT_12H',
          displayOrder: 99,
          createdAt: '',
          updatedAt: '',
        },
      } as ScheduleAssignment;
    }

    return undefined;
  };

  const todayAssignment = getAssignmentForDate(new Date());

  const totalHoursThisMonth = myAssignments.reduce(
    (sum, a) => sum + (a.durationHours || 0),
    0
  );
  const totalShiftsThisMonth = myAssignments.length;
  const nightShifts = myAssignments.filter((a) => a.shiftType?.isNightShift).length;
  const dayShifts = totalShiftsThisMonth - nightShifts;

  const workingDaysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    return workingDays;
  }, [currentDate]);

  const monthlyHoursNorm = workingDaysInMonth * 8;
  const hoursDifference = totalHoursThisMonth - monthlyHoursNorm;

  const monthNames = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
  ];

  // Departamente cu dashboard simplu
  const SIMPLE_DEPARTMENTS = ['Procese Verbale/Facturare', 'Parcometre', 'Achizitii'];
  const isSimpleDepartment = SIMPLE_DEPARTMENTS.includes(user?.department?.name || '');

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  // Dashboard simplu pentru departamentele noi
  if (isSimpleDepartment) {
    const todayStr = `${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    return (
      <Box sx={{ width: '100%', p: { xs: 0, sm: 1 } }}>
        <Fade in={true} timeout={600}>
          <Box
            sx={{
              mb: { xs: 2.5, sm: 3, md: 4 },
              p: { xs: 2.5, sm: 3, md: 4 },
              borderRadius: { xs: 2, sm: 3 },
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.35)',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: -60,
                right: -60,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
              }}
            />
            <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700, mb: 0.5 }}>
              Buna, {user?.fullName?.split(' ')[0]}!
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {todayStr} — {user?.department?.name}
            </Typography>
          </Box>
        </Fade>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Grow in={true} timeout={700}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 20px ${alpha('#3b82f6', 0.2)}` },
                }}
                onClick={() => navigate('/my-schedule')}
              >
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <TodayIcon sx={{ fontSize: 36, color: '#3b82f6', mb: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Programul Meu
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {todayAssignment
                      ? `Astazi: ${todayAssignment.shiftType?.name || 'Program'}`
                      : 'Niciun program astazi'}
                  </Typography>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Grow in={true} timeout={900}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 20px ${alpha('#10b981', 0.2)}` },
                }}
                onClick={() => navigate('/leave-requests')}
              >
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <TimeIcon sx={{ fontSize: 36, color: '#10b981', mb: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Concedii
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Gestioneaza cererile de concediu
                  </Typography>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Grow in={true} timeout={1100}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 20px ${alpha('#8b5cf6', 0.2)}` },
                }}
                onClick={() => navigate('/daily-reports')}
              >
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <TomorrowIcon sx={{ fontSize: 36, color: '#8b5cf6', mb: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Raport Zilnic
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Scrie raportul de astazi
                  </Typography>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
        </Grid>
      </Box>
    );
  }

  // Completed entries for today (excluding active)
  const completedTodayEntries = todayEntries.filter(e => e.endTime);

  return (
    <Box sx={{ width: '100%', p: { xs: 0, sm: 1 } }}>
      {/* Header */}
      <Fade in={true} timeout={600}>
        <Box
          sx={{
            mb: { xs: 2.5, sm: 3, md: 4 },
            p: { xs: 2.5, sm: 3, md: 4 },
            borderRadius: { xs: 2, sm: 3 },
            background: todayAssignment
              ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: todayAssignment
              ? '0 8px 32px rgba(99, 102, 241, 0.35)'
              : '0 8px 32px rgba(16, 185, 129, 0.35)',
          }}
        >
          {/* Background decorations */}
          <Box
            sx={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -40,
              left: -40,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
            }}
          />

          <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2 }}>
                <Avatar
                  sx={{
                    width: { xs: 52, sm: 64 },
                    height: { xs: 52, sm: 64 },
                    bgcolor: 'rgba(255,255,255,0.2)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  }}
                >
                  {todayAssignment ? (
                    <TodayIcon sx={{ fontSize: { xs: 26, sm: 32 } }} />
                  ) : (
                    <PersonIcon sx={{ fontSize: { xs: 26, sm: 32 } }} />
                  )}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="overline"
                    sx={{
                      opacity: 0.85,
                      fontSize: { xs: '0.65rem', sm: '0.75rem' },
                      display: 'block',
                      fontWeight: 600,
                      letterSpacing: '0.5px',
                    }}
                  >
                    Azi, {new Date().toLocaleDateString('ro-RO', {
                      weekday: isMobile ? 'short' : 'long',
                      day: 'numeric',
                      month: isMobile ? 'short' : 'long'
                    })}
                  </Typography>
                  {todayAssignment ? (
                    <>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        sx={{ fontSize: { xs: '1.15rem', sm: '1.5rem' }, lineHeight: 1.2 }}
                        noWrap
                      >
                        {todayAssignment.shiftType?.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          opacity: 0.9,
                          fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          mt: 0.25,
                        }}
                      >
                        {todayAssignment.shiftType?.startTime} - {todayAssignment.shiftType?.endTime} ({todayAssignment.durationHours}h)
                      </Typography>
                      {todayAssignment.workPosition && (
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.75 }}>
                          <LocationIcon sx={{ fontSize: 16 }} />
                          <Box
                            sx={{
                              px: 1,
                              py: 0.25,
                              bgcolor: 'rgba(255,255,255,0.2)',
                              borderRadius: 1,
                            }}
                          >
                            <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              {todayAssignment.workPosition.name}
                            </Typography>
                          </Box>
                        </Stack>
                      )}
                    </>
                  ) : (
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      sx={{ fontSize: { xs: '1.15rem', sm: '1.5rem' } }}
                    >
                      Zi Libera
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  bgcolor: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1,
                    opacity: 0.85,
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    fontWeight: 600,
                  }}
                >
                  Sumar {monthNames[currentMonth - 1]} {currentYear}
                </Typography>
                <Grid container spacing={1}>
                  <Grid size={{ xs: 4, sm: 2.4 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {totalHoursThisMonth}h
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, opacity: 0.85 }}>
                      Total Ore
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 4, sm: 2.4 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {monthlyHoursNorm}h
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, opacity: 0.85 }}>
                      Norma
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 4, sm: 2.4 }}>
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      sx={{
                        fontSize: { xs: '1rem', sm: '1.25rem' },
                        color: hoursDifference > 0 ? '#fca5a5' : hoursDifference < 0 ? '#fcd34d' : '#86efac',
                      }}
                    >
                      {hoursDifference > 0 ? `+${hoursDifference}` : hoursDifference}h
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, opacity: 0.85 }}>
                      Diferenta
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2.4 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {dayShifts}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, opacity: 0.85 }}>
                      Ture Zi
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2.4 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {nightShifts}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, opacity: 0.85 }}>
                      Ture Noapte
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Fade>

      {/* ===== PONTAJ - Intretinere Parcari + Control ===== */}
      {hasPontaj && (
        <Fade in={true} timeout={700}>
          <Box sx={{ mb: { xs: 2.5, sm: 3 } }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{
                mb: { xs: 1.5, sm: 2 },
                fontWeight: 700,
                fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' },
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Pontaj
            </Typography>

            {/* Main Timer Card */}
            <Card
              sx={{
                background: activeTimer && !activeTimer.endTime
                  ? theme.palette.mode === 'light'
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(135deg, #b45309 0%, #92400e 100%)'
                  : theme.palette.mode === 'light'
                    ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                    : 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                mb: 2,
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: -40,
                  right: -40,
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                }}
              />
              <CardContent sx={{ p: { xs: 2, sm: 3 }, position: 'relative' }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'center', sm: 'center' }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  {/* Timer Display */}
                  <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2 }}>
                    <Box
                      sx={{
                        p: { xs: 1.25, sm: 1.5 },
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                      }}
                    >
                      <TimerIcon sx={{ fontSize: { xs: 28, sm: 36 } }} />
                    </Box>
                    <Box>
                      <Typography
                        variant="h3"
                        fontWeight="bold"
                        sx={{
                          fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                          fontFamily: 'monospace',
                          letterSpacing: '2px',
                          lineHeight: 1,
                        }}
                      >
                        {activeTimer && !activeTimer.endTime
                          ? formatElapsed(elapsedSeconds)
                          : '00:00:00'}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          opacity: 0.9,
                          fontSize: { xs: '0.75rem', sm: '0.85rem' },
                          mt: 0.5,
                        }}
                      >
                        {activeTimer && !activeTimer.endTime
                          ? `Tura a inceput la ${formatTime(activeTimer.startTime)}`
                          : 'Nicio tura activa'}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* GPS Permission Blocked Alert */}
                  {gpsPermissionBlocked && (
                    <Alert
                      severity="error"
                      sx={{ width: '100%', borderRadius: 2, fontWeight: 500 }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        GPS BLOCAT - Nu poti porni tura!
                      </Typography>
                      <Typography variant="caption">
                        Mergi in setarile browserului &gt; Permisiuni site &gt; Locatie &gt; Permite.
                        Apoi reincarca pagina si incearca din nou.
                      </Typography>
                    </Alert>
                  )}

                  {/* Start/Stop Button */}
                  <Button
                    variant="contained"
                    size="large"
                    disabled={isStarting || isStopping}
                    onClick={activeTimer && !activeTimer.endTime ? handleStopTimer : handleStartTimer}
                    startIcon={
                      activeTimer && !activeTimer.endTime
                        ? <StopIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
                        : <PlayIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
                    }
                    sx={{
                      bgcolor: activeTimer && !activeTimer.endTime
                        ? 'rgba(239, 68, 68, 0.9)'
                        : 'rgba(255,255,255,0.25)',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: { xs: '0.9rem', sm: '1rem' },
                      px: { xs: 3, sm: 4 },
                      py: { xs: 1.25, sm: 1.5 },
                      borderRadius: 3,
                      minWidth: { xs: '100%', sm: 'auto' },
                      textTransform: 'none',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                      '&:hover': {
                        bgcolor: activeTimer && !activeTimer.endTime
                          ? 'rgba(220, 38, 38, 1)'
                          : 'rgba(255,255,255,0.35)',
                      },
                      '&.Mui-disabled': {
                        bgcolor: 'rgba(255,255,255,0.15)',
                        color: 'rgba(255,255,255,0.5)',
                      },
                    }}
                  >
                    {isStarting
                      ? 'Se porneste...'
                      : isStopping
                        ? 'Se opreste...'
                        : activeTimer && !activeTimer.endTime
                          ? 'Opreste Tura'
                          : 'Porneste Tura'}
                  </Button>
                </Stack>

                {/* GPS Status Indicator - shown only when timer is active */}
                {activeTimer && !activeTimer.endTime && (gpsStatus !== 'idle' || gpsPermissionBlocked) && (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{
                      mt: 1.5,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1.5,
                      bgcolor: gpsStatus === 'success'
                        ? 'rgba(76, 175, 80, 0.15)'
                        : gpsStatus === 'error'
                          ? 'rgba(244, 67, 54, 0.15)'
                          : 'rgba(255, 152, 0, 0.15)',
                    }}
                  >
                    {gpsStatus === 'success' ? (
                      <GpsFixedIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                    ) : (
                      <GpsOffIcon sx={{ fontSize: 16, color: gpsStatus === 'error' ? '#f44336' : '#ff9800' }} />
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.7rem',
                        color: gpsStatus === 'success'
                          ? '#2e7d32'
                          : gpsStatus === 'error'
                            ? '#c62828'
                            : '#e65100',
                      }}
                    >
                      {gpsStatus === 'success'
                        ? 'GPS activ - locatia se inregistreaza automat'
                        : gpsStatus === 'denied'
                          ? 'GPS BLOCAT - activeaza locatia in setarile browserului!'
                          : gpsStatus === 'unavailable'
                            ? gpsErrorMessage || 'GPS indisponibil'
                            : gpsErrorMessage || 'Eroare GPS - locatia nu s-a putut inregistra'}
                    </Typography>
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Mismatch Alert */}
            {mismatchAlert?.show && (
              <Alert
                severity={mismatchAlert.type}
                onClose={() => setMismatchAlert(null)}
                sx={{ mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                {mismatchAlert.type === 'warning'
                  ? `Ai lucrat ${mismatchAlert.actualHours}h, dar programul prevedea ${mismatchAlert.expectedHours}h. Admin-ul a fost notificat.`
                  : `Tura completa conform programului (${mismatchAlert.actualHours}h / ${mismatchAlert.expectedHours}h).`}
              </Alert>
            )}

            {/* Today's entries */}
            {completedTodayEntries.length > 0 && (
              <Card sx={{ mb: 2 }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <HistoryIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: 'text.secondary' }} />
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}
                    >
                      Istoric astazi ({completedTodayEntries.length} {completedTodayEntries.length === 1 ? 'inregistrare' : 'inregistrari'})
                    </Typography>
                  </Stack>
                  <Stack spacing={1}>
                    {completedTodayEntries.map((entry) => (
                      <Box
                        key={entry.id}
                        sx={{
                          p: { xs: 1, sm: 1.5 },
                          bgcolor: alpha(theme.palette.primary.main, 0.04),
                          borderRadius: 1.5,
                          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          flexWrap="wrap"
                          gap={0.5}
                        >
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <TimeIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: 'primary.main' }} />
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                            >
                              {formatTime(entry.startTime)} - {entry.endTime ? formatTime(entry.endTime) : 'In curs'}
                            </Typography>
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Chip
                              label={entry.durationMinutes
                                ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m`
                                : 'In curs'}
                              size="small"
                              color={entry.endTime ? 'primary' : 'warning'}
                              sx={{
                                fontWeight: 600,
                                height: { xs: 22, sm: 26 },
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              }}
                            />
                            {entry.locationLogs && entry.locationLogs.length > 0 && (
                              <Chip
                                icon={<LocationIcon sx={{ fontSize: 14 }} />}
                                label={`${entry.locationLogs.length}`}
                                size="small"
                                variant="outlined"
                                sx={{
                                  height: { xs: 22, sm: 26 },
                                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                }}
                              />
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

      {/* Colleagues on Shift - for Dispecerat/Control departments */}
      {isDispatchDepartment && colleaguesData?.userPosition && (
        <Fade in={true} timeout={700}>
          <Box sx={{ mb: { xs: 2, sm: 3 } }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{
                mb: { xs: 1.5, sm: 2 },
                fontWeight: 700,
                fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' },
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {colleaguesData.userPosition === 'DISP' ? '' : ''}{' '}
              Colegi pe tura - {colleaguesData.userPosition === 'DISP' ? 'Dispecerat' : 'Control'}
            </Typography>
            <Card
              sx={{
                background: theme.palette.mode === 'light'
                  ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
                  : 'linear-gradient(135deg, #0369a1 0%, #075985 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: -40,
                  right: -40,
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                }}
              />
              <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, position: 'relative' }}>
                {/* Today */}
                <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 1.5, sm: 2 } }}>
                  <Box
                    sx={{
                      p: { xs: 1, sm: 1.5 },
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                    }}
                  >
                    {colleaguesData.userPosition === 'DISP'
                      ? <DispatcherIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
                      : <ControlIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
                      Astazi - {new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {colleaguesData.today.length > 0
                        ? `${colleaguesData.today.length} ${colleaguesData.today.length === 1 ? 'persoana' : 'persoane'} pe tura`
                        : 'Nimeni programat'}
                    </Typography>
                  </Box>
                </Stack>

                {colleaguesData.today.length > 0 ? (
                  <List sx={{ py: 0 }}>
                    {colleaguesData.today.map((colleague, index) => (
                      <ListItem
                        key={colleague.id}
                        sx={{
                          bgcolor: colleague.isCurrentUser ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                          borderRadius: 2,
                          mb: index < colleaguesData.today.length - 1 ? 0.75 : 0,
                          px: { xs: 1, sm: 2 },
                          py: { xs: 0.75, sm: 1 },
                          border: colleague.isCurrentUser ? '1px solid rgba(255,255,255,0.4)' : 'none',
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 56 } }}>
                          <Avatar
                            sx={{
                              bgcolor: colleague.isCurrentUser ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)',
                              color: 'white',
                              width: { xs: 32, sm: 40 },
                              height: { xs: 32, sm: 40 },
                            }}
                          >
                            <PersonIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography
                                variant="subtitle1"
                                fontWeight="bold"
                                color="white"
                                sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}
                                noWrap
                              >
                                {colleague.userName}
                              </Typography>
                              {colleague.isCurrentUser && (
                                <Chip
                                  label="Tu"
                                  size="small"
                                  sx={{
                                    bgcolor: 'rgba(255,255,255,0.3)',
                                    color: 'white',
                                    fontWeight: 700,
                                    height: 20,
                                    fontSize: '0.65rem',
                                  }}
                                />
                              )}
                            </Stack>
                          }
                          secondary={
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                              <Chip
                                icon={<TimeIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'white !important' }} />}
                                label={`${colleague.startTime} - ${colleague.endTime}`}
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(255,255,255,0.2)',
                                  color: 'white',
                                  fontWeight: 600,
                                  height: { xs: 24, sm: 28 },
                                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                                  '& .MuiChip-icon': { color: 'white' },
                                  '& .MuiChip-label': { px: { xs: 0.75, sm: 1 } },
                                }}
                              />
                              <Chip
                                label={colleague.shiftCode || colleague.shiftType}
                                size="small"
                                sx={{
                                  bgcolor: colleague.shiftCode === 'Z' ? '#fbbf24' : colleague.shiftCode === 'N' ? '#8b5cf6' : '#10b981',
                                  color: colleague.shiftCode === 'Z' ? '#000' : '#fff',
                                  fontWeight: 700,
                                  height: { xs: 24, sm: 28 },
                                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                                  '& .MuiChip-label': { px: { xs: 0.75, sm: 1 } },
                                }}
                              />
                            </Stack>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Nu exista colegi programati astazi.
                    </Typography>
                  </Box>
                )}

                {/* Tomorrow */}
                <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} sx={{ mt: 2.5, mb: { xs: 1.5, sm: 2 } }}>
                  <Box
                    sx={{
                      p: { xs: 1, sm: 1.5 },
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.15)',
                      display: 'flex',
                    }}
                  >
                    <TomorrowIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
                      Maine - {(() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        return tomorrow.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
                      })()}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {colleaguesData.tomorrow.length > 0
                        ? `${colleaguesData.tomorrow.length} ${colleaguesData.tomorrow.length === 1 ? 'persoana' : 'persoane'} pe tura`
                        : 'Nimeni programat'}
                    </Typography>
                  </Box>
                </Stack>

                {colleaguesData.tomorrow.length > 0 ? (
                  <List sx={{ py: 0 }}>
                    {colleaguesData.tomorrow.map((colleague, index) => (
                      <ListItem
                        key={colleague.id}
                        sx={{
                          bgcolor: colleague.isCurrentUser ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                          borderRadius: 2,
                          mb: index < colleaguesData.tomorrow.length - 1 ? 0.75 : 0,
                          px: { xs: 1, sm: 2 },
                          py: { xs: 0.75, sm: 1 },
                          border: colleague.isCurrentUser ? '1px solid rgba(255,255,255,0.3)' : 'none',
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 56 } }}>
                          <Avatar
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.2)',
                              color: 'white',
                              width: { xs: 32, sm: 40 },
                              height: { xs: 32, sm: 40 },
                            }}
                          >
                            <PersonIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography
                                variant="subtitle1"
                                fontWeight="bold"
                                color="white"
                                sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}
                                noWrap
                              >
                                {colleague.userName}
                              </Typography>
                              {colleague.isCurrentUser && (
                                <Chip
                                  label="Tu"
                                  size="small"
                                  sx={{
                                    bgcolor: 'rgba(255,255,255,0.3)',
                                    color: 'white',
                                    fontWeight: 700,
                                    height: 20,
                                    fontSize: '0.65rem',
                                  }}
                                />
                              )}
                            </Stack>
                          }
                          secondary={
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                              <Chip
                                icon={<TimeIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'white !important' }} />}
                                label={`${colleague.startTime} - ${colleague.endTime}`}
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(255,255,255,0.2)',
                                  color: 'white',
                                  fontWeight: 600,
                                  height: { xs: 24, sm: 28 },
                                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                                  '& .MuiChip-icon': { color: 'white' },
                                  '& .MuiChip-label': { px: { xs: 0.75, sm: 1 } },
                                }}
                              />
                              <Chip
                                label={colleague.shiftCode || colleague.shiftType}
                                size="small"
                                sx={{
                                  bgcolor: colleague.shiftCode === 'Z' ? '#fbbf24' : colleague.shiftCode === 'N' ? '#8b5cf6' : '#10b981',
                                  color: colleague.shiftCode === 'Z' ? '#000' : '#fff',
                                  fontWeight: 700,
                                  height: { xs: 24, sm: 28 },
                                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                                  '& .MuiChip-label': { px: { xs: 0.75, sm: 1 } },
                                }}
                              />
                            </Stack>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2, p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Nu exista colegi programati maine.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Fade>
      )}


      {/* Sectiune Parcari Handicap - doar pentru departamentul Parcari Handicap */}
      {isHandicapDepartment && (
        <>
          <Fade in={true} timeout={1000}>
            <Box sx={{ mt: { xs: 2.5, sm: 3, md: 4 } }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{
                  mb: { xs: 1.5, sm: 2 },
                  fontWeight: 700,
                  fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' },
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Parcari Handicap - Solicitari
              </Typography>
              <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                <Grid size={{ xs: 6, sm: 6, md: 4 }}>
                  <StatCard
                    title="Amplasare Panouri"
                    value={handicapRequests.filter(r => r.requestType === 'AMPLASARE_PANOU').length}
                    subtitle={`${handicapRequests.filter(r => r.requestType === 'AMPLASARE_PANOU' && r.status === 'ACTIVE').length} active`}
                    icon={<AmplasareIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: '#059669' }} />}
                    color="#059669"
                    bgColor={alpha('#059669', 0.12)}
                    onClick={() => navigate('/parking/handicap')}
                    delay={0}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 6, md: 4 }}>
                  <StatCard
                    title="Revocare Panouri"
                    value={handicapRequests.filter(r => r.requestType === 'REVOCARE_PANOU').length}
                    subtitle={`${handicapRequests.filter(r => r.requestType === 'REVOCARE_PANOU' && r.status === 'ACTIVE').length} active`}
                    icon={<RevocareIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: '#dc2626' }} />}
                    color="#dc2626"
                    bgColor={alpha('#dc2626', 0.12)}
                    onClick={() => navigate('/parking/handicap')}
                    delay={100}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 6, md: 4 }}>
                  <StatCard
                    title="Creare Marcaje"
                    value={handicapRequests.filter(r => r.requestType === 'CREARE_MARCAJ').length}
                    subtitle={`${handicapRequests.filter(r => r.requestType === 'CREARE_MARCAJ' && r.status === 'ACTIVE').length} active`}
                    icon={<MarcajeIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: '#0284c7' }} />}
                    color="#0284c7"
                    bgColor={alpha('#0284c7', 0.12)}
                    onClick={() => navigate('/parking/handicap')}
                    delay={200}
                  />
                </Grid>
              </Grid>
            </Box>
          </Fade>

          <Divider sx={{ my: { xs: 2, sm: 3 } }} />

          <Fade in={true} timeout={1200}>
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{
                  mb: { xs: 1.5, sm: 2 },
                  fontWeight: 700,
                  fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' },
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Legitimatii
              </Typography>
              <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                <Grid size={{ xs: 6, sm: 6, md: 6 }}>
                  <StatCard
                    title="Legitimatii Handicap"
                    value={handicapLegitimations.length}
                    subtitle={`${handicapLegitimations.filter(l => l.status === 'ACTIVE').length} active`}
                    icon={<LegitimatiiIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: '#059669' }} />}
                    color="#059669"
                    bgColor={alpha('#059669', 0.12)}
                    onClick={() => navigate('/parking/handicap')}
                    delay={300}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 6, md: 6 }}>
                  <StatCard
                    title="Legitimatii Revolutionar"
                    value={revolutionarLegitimations.length}
                    subtitle={`${revolutionarLegitimations.filter(l => l.status === 'ACTIVE').length} active`}
                    icon={<RevolutionarIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: '#7c3aed' }} />}
                    color="#7c3aed"
                    bgColor={alpha('#7c3aed', 0.12)}
                    onClick={() => navigate('/parking/handicap')}
                    delay={400}
                  />
                </Grid>
              </Grid>
            </Box>
          </Fade>
        </>
      )}
    </Box>
  );
};

export default EmployeeDashboard;
