import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Celebration as HolidayIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Save as SaveIcon,
  EventNote as ScheduleIcon,
  BeachAccess as LeaveIcon,
  Edit as EditIcon,
  CheckCircle as OkIcon,
  ErrorOutline as ErrIcon,
} from '@mui/icons-material';
import { GradientHeader, FriendlyDialog, EmptyState } from '../../components/common';
import HolidayChat from './HolidayChat';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAppDispatch } from '../../store/hooks';
import { schedulesApi } from '../../store/api/schedulesApi';
import { leaveRequestsApi } from '../../store/api/leaveRequests.api';
import {
  useGetHolidayPeriodsQuery,
  useGetHolidayPeriodQuery,
  useSaveHolidayPreferencesMutation,
  useUpdateHolidayPeriodMutation,
  useSetHolidayGroupLockMutation,
  useApplyHolidayToScheduleMutation,
  useCreateHolidayLeaveRequestsMutation,
  type HolidayChoice,
  type HolidayPeriod,
} from '../../store/api/holidayPreferences.api';

// ---- Optiuni ----
const CHOICES: Array<{ value: HolidayChoice; label: string; short: string; color: string }> = [
  { value: 'LEAVE', label: 'Concediu', short: 'CO', color: '#f59e0b' },
  { value: 'DAY', label: 'Zi', short: 'Z', color: '#16a34a' },
  { value: 'NIGHT', label: 'Noapte', short: 'N', color: '#4f46e5' },
  { value: 'ANY', label: 'Orice', short: 'O', color: '#64748b' },
];
const CHOICE_MAP = Object.fromEntries(CHOICES.map((c) => [c.value, c])) as Record<
  HolidayChoice,
  (typeof CHOICES)[number]
>;

const WEEKDAYS = ['Duminica', 'Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata'];

/** Eticheta zilei: "Joi 24.12" + numele sarbatorii unde e cazul. */
const dayInfo = (date: string, period: HolidayPeriod, index: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  const [, mm, dd] = date.split('-');
  const label = `${WEEKDAYS[d.getUTCDay()]} ${dd}.${mm}`;
  const fixed: Record<string, string> = {
    '12-24': 'Ajun',
    '12-25': 'Craciun',
    '12-26': 'Craciun',
    '12-31': 'Revelion',
    '01-01': 'Anul Nou',
    '01-02': 'Anul Nou',
  };
  let holiday = fixed[`${mm}-${dd}`];
  if (period.key === 'PASTE') {
    holiday = ['Vinerea Mare', 'Sambata Mare', 'Paste', 'A doua zi de Paste'][index];
  }
  return { label, holiday };
};

const ChoiceChip = ({ choice, size = 'small' }: { choice?: HolidayChoice; size?: 'small' | 'medium' }) => {
  if (!choice) {
    return <Chip label="-" size={size} variant="outlined" sx={{ minWidth: 40, color: 'text.disabled' }} />;
  }
  const c = CHOICE_MAP[choice];
  return (
    <Tooltip title={c.label}>
      <Chip
        label={c.short}
        size={size}
        sx={{ minWidth: 40, fontWeight: 700, bgcolor: alpha(c.color, 0.15), color: c.color, border: `1px solid ${alpha(c.color, 0.4)}` }}
      />
    </Tooltip>
  );
};

/** Editorul pe zile (folosit pentru propriul rand si de manager pentru oricine). */
const DayEditor = ({
  days,
  period,
  choices,
  value,
  onChange,
  disabled,
}: {
  days: string[];
  period: HolidayPeriod;
  choices: HolidayChoice[];
  value: Record<string, HolidayChoice | null>;
  onChange: (date: string, choice: HolidayChoice | null) => void;
  disabled?: boolean;
}) => (
  <Stack spacing={1.25} divider={<Divider flexItem />}>
    {days.map((date, i) => {
      const { label, holiday } = dayInfo(date, period, i);
      return (
        <Stack
          key={date}
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction={{ xs: 'row', md: 'column' }} spacing={{ xs: 1, md: 0 }} alignItems={{ xs: 'baseline', md: 'flex-start' }} sx={{ minWidth: 150 }}>
            <Typography fontWeight={600}>{label}</Typography>
            {holiday && (
              <Typography variant="caption" color="text.secondary">
                {holiday}
              </Typography>
            )}
          </Stack>
          <ToggleButtonGroup
            exclusive
            size="small"
            disabled={disabled}
            value={value[date] ?? null}
            onChange={(_, v: HolidayChoice | null) => onChange(date, v)}
            sx={{ width: { xs: '100%', md: 'auto' } }}
          >
            {CHOICES.filter((c) => choices.includes(c.value)).map((c) => (
              <ToggleButton
                key={c.value}
                value={c.value}
                sx={{
                  flex: { xs: 1, md: 'initial' },
                  px: { xs: 0.5, md: 1.5 },
                  minWidth: { xs: 0, md: 72 },
                  minHeight: 40,
                  fontSize: { xs: '0.8rem', md: '0.8125rem' },
                  textTransform: 'none',
                  '&.Mui-selected, &.Mui-selected:hover': {
                    bgcolor: alpha(c.color, 0.16),
                    color: c.color,
                    borderColor: alpha(c.color, 0.5),
                    fontWeight: 700,
                  },
                }}
              >
                {c.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      );
    })}
  </Stack>
);

const HolidayPreferencesPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { notifySuccess, notifyError } = useSnackbar();
  const dispatch = useAppDispatch();

  const location = useLocation();
  const navState = location.state as { periodId?: string; groupKey?: string; openChat?: boolean } | null;
  // Grupul (departamentul): angajatii il au fix, managerul/adminul il pot schimba
  const [groupKey, setGroupKey] = useState<string | undefined>(navState?.groupKey);
  const { data: periodsData, isLoading: loadingPeriods } = useGetHolidayPeriodsQuery(groupKey);
  const periods = periodsData?.periods ?? [];
  const groups = periodsData?.groups ?? [];
  const activeGroup = groupKey || periodsData?.groupKey;
  const [selectedId, setSelectedId] = useState<string | null>(navState?.periodId || null);
  const chatRef = useRef<HTMLDivElement>(null);
  const [pendingChatScroll, setPendingChatScroll] = useState(!!navState?.openChat);
  useEffect(() => {
    if (!selectedId && periods.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      setSelectedId((periods.find((p) => p.endDate >= today) || periods[0]).id);
    }
  }, [periods, selectedId]);

  // Reincarcare la 30s: fiecare vede ce pun colegii aproape in timp real
  const { data, isFetching } = useGetHolidayPeriodQuery(
    { id: selectedId!, group: activeGroup },
    { skip: !selectedId || !activeGroup, pollingInterval: 30000 },
  );

  // Venit dintr-o notificare de chat: deruleaza la discutie dupa ce se incarca perioada
  useEffect(() => {
    if (pendingChatScroll && data) {
      const t = setTimeout(() => {
        chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setPendingChatScroll(false);
        window.history.replaceState({}, document.title);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [pendingChatScroll, data]);

  const [savePrefs, { isLoading: saving }] = useSaveHolidayPreferencesMutation();
  const [updatePeriod, { isLoading: updatingPeriod }] = useUpdateHolidayPeriodMutation();
  const [setGroupLock, { isLoading: lockingGroup }] = useSetHolidayGroupLockMutation();
  const [applySchedule, { isLoading: applying }] = useApplyHolidayToScheduleMutation();
  const [createLeaves, { isLoading: creatingLeaves }] = useCreateHolidayLeaveRequestsMutation();

  const prefMap = useMemo(() => {
    const m: Record<string, Record<string, HolidayChoice>> = {};
    data?.preferences.forEach((p) => {
      (m[p.userId] ||= {})[p.date] = p.choice;
    });
    return m;
  }, [data]);

  const isGroupMember = !!data?.users.some((u) => u.id === data.currentUserId);
  const locked = !!data?.locked;
  const groupChoices = data?.group.choices ?? CHOICES.map((c) => c.value);
  const visibleChoices = CHOICES.filter((c) => groupChoices.includes(c.value));

  // ---- Propriul rand ----
  const [myDraft, setMyDraft] = useState<Record<string, HolidayChoice | null>>({});
  const [myDirty, setMyDirty] = useState(false);
  useEffect(() => {
    if (data && !myDirty) setMyDraft({ ...(prefMap[data.currentUserId] || {}) });
  }, [data, prefMap, myDirty]);

  const saveRow = async (userId: string | undefined, draft: Record<string, HolidayChoice | null>) => {
    if (!data) return false;
    try {
      await savePrefs({
        periodId: data.period.id,
        userId,
        preferences: data.days.map((date) => ({ date, choice: draft[date] ?? null })),
      }).unwrap();
      return true;
    } catch (err: unknown) {
      notifyError((err as { data?: { message?: string } })?.data?.message || 'Eroare la salvare');
      return false;
    }
  };

  // ---- Editare de catre manager ----
  const [editUser, setEditUser] = useState<{ id: string; fullName: string } | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, HolidayChoice | null>>({});

  // ---- Date perioada (manager) ----
  const [periodDates, setPeriodDates] = useState({ startDate: '', endDate: '' });
  useEffect(() => {
    if (data) setPeriodDates({ startDate: data.period.startDate, endDate: data.period.endDate });
  }, [data?.period.id, data?.period.startDate, data?.period.endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Actiuni manager ----
  const [confirmAction, setConfirmAction] = useState<'schedule' | 'leave' | null>(null);
  const [resultDialog, setResultDialog] = useState<{ title: string; lines: Array<{ ok: boolean; text: string }> } | null>(null);
  const userName = (id: string) => data?.users.find((u) => u.id === id)?.fullName || id;

  const runConfirmed = async () => {
    if (!data || !confirmAction) return;
    try {
      if (confirmAction === 'schedule') {
        const r = await applySchedule({ id: data.period.id, group: data.group.key }).unwrap();
        dispatch(schedulesApi.util.invalidateTags(['Schedule']));
        setResultDialog({
          title: r.status === 'APPROVED' ? 'Program precompletat si aprobat' : 'Program precompletat si trimis spre aprobare',
          lines: r.results.map((x) => ({
            ok: x.ok,
            text: `${userName(x.userId)} - ${x.month}: ${x.ok ? `${x.days} zile puse in program` : x.error}`,
          })),
        });
      } else {
        const r = await createLeaves({ id: data.period.id, group: data.group.key }).unwrap();
        dispatch(leaveRequestsApi.util.invalidateTags(['LeaveRequests']));
        setResultDialog({
          title: 'Cereri de concediu create (in asteptare)',
          lines: r.results.map((x) => ({
            ok: x.ok,
            text: `${x.userName}: ${x.startDate.split('-').reverse().join('.')} - ${x.endDate.split('-').reverse().join('.')}${x.ok ? '' : ` - ${x.error}`}`,
          })),
        });
      }
      setConfirmAction(null);
    } catch (err: unknown) {
      notifyError((err as { data?: { message?: string } })?.data?.message || 'Eroare la executie');
    }
  };

  // ---- Sumar pe zi ----
  const daySummary = useMemo(() => {
    if (!data) return [];
    return data.days.map((date, i) => {
      const groups: Record<HolidayChoice | 'NONE', string[]> = { LEAVE: [], DAY: [], NIGHT: [], ANY: [], NONE: [] };
      data.users.forEach((u) => {
        const c = prefMap[u.id]?.[date];
        (groups[c || 'NONE'] ||= []).push(u.fullName);
      });
      return { date, ...dayInfo(date, data.period, i), groups };
    });
  }, [data, prefMap]);

  if (loadingPeriods) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <GradientHeader
        title={data?.group ? `Sarbatori - ${data.group.name}` : 'Sarbatori'}
        subtitle="Alege cum vrei turele si concediul de sarbatori si vezi ce au ales colegii"
        icon={<HolidayIcon />}
      />

      {/* Managerul / adminul aleg departamentul */}
      {groups.length > 1 && (
        <TextField
          select
          size="small"
          label="Departament"
          value={activeGroup || ''}
          onChange={(e) => {
            setGroupKey(e.target.value);
            setMyDirty(false);
          }}
          sx={{ mb: 2, minWidth: { xs: '100%', md: 320 } }}
        >
          {groups.map((g) => (
            <MenuItem key={g.key} value={g.key}>
              {g.name}
            </MenuItem>
          ))}
        </TextField>
      )}

      {periods.length === 0 ? (
        <EmptyState icon={<HolidayIcon sx={{ fontSize: 64 }} />} title="Nicio perioada de sarbatori" description="Perioadele apar automat." />
      ) : (
        <>
          <Tabs
            value={selectedId || false}
            onChange={(_, v) => {
              setSelectedId(v);
              setMyDirty(false);
            }}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ mb: 2 }}
          >
            {periods.map((p) => (
              <Tab
                key={p.id}
                value={p.id}
                label={
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    {p.locked && <LockIcon sx={{ fontSize: 16 }} />}
                    <span>{p.name}</span>
                  </Stack>
                }
              />
            ))}
          </Tabs>

          {!data ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2.5}>
              <Alert severity={locked ? 'warning' : 'info'} icon={locked ? <LockIcon /> : undefined}>
                <strong>{data.period.name}:</strong> {data.days.length} zile (
                {data.days[0].split('-').reverse().join('.')} - {data.days[data.days.length - 1].split('-').reverse().join('.')}).{' '}
                {locked
                  ? 'Perioada este inchisa - doar managerul mai poate modifica preferintele.'
                  : `Alege pentru fiecare zi: ${visibleChoices.map((c) => c.label).join(', ')}. Colegii din ${data.group.name} vad ce alegi, ca sa va puteti intelege.`}
              </Alert>

              {/* Preferintele mele */}
              {isGroupMember && (
                <Card>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1.05rem', md: '1.25rem' } }}>
                        Preferintele mele
                      </Typography>
                      <Button
                        variant="contained"
                        size={isMobile ? 'small' : 'medium'}
                        sx={{ flexShrink: 0 }}
                        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                        disabled={locked || saving || !myDirty}
                        onClick={async () => {
                          if (await saveRow(undefined, myDraft)) {
                            setMyDirty(false);
                            notifySuccess('Preferintele au fost salvate. Colegii le vad acum.');
                          }
                        }}
                      >
                        Salveaza
                      </Button>
                    </Stack>
                    <DayEditor
                      days={data.days}
                      period={data.period}
                      choices={groupChoices}
                      value={myDraft}
                      disabled={locked}
                      onChange={(date, choice) => {
                        setMyDraft((d) => ({ ...d, [date]: choice }));
                        setMyDirty(true);
                      }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Pe telefon discutia vine imediat dupa propriile alegeri (sumarul e lung) */}
              {isMobile && (
                <Box ref={chatRef} sx={{ scrollMarginTop: 80 }}>
                <HolidayChat
                  periodId={data.period.id}
                  group={data.group.key}
                  groupName={data.group.name}
                  currentUserId={data.currentUserId}
                  canModerate={data.canManage}
                />
              </Box>
              )}

              {/* Sumar pe zile */}
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                  Ce a ales fiecare
                  {isFetching && <CircularProgress size={14} sx={{ ml: 1 }} />}
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 1.5,
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: `repeat(${Math.min(data.days.length, 4)}, 1fr)` },
                  }}
                >
                  {daySummary.map((d) => (
                    <Paper key={d.date} variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 3 }}>
                      <Typography fontWeight={700}>{d.label}</Typography>
                      {d.holiday && (
                        <Typography variant="caption" color="text.secondary">
                          {d.holiday}
                        </Typography>
                      )}
                      <Stack spacing={{ xs: 0.75, md: 1 }} sx={{ mt: { xs: 1, md: 1.5 } }}>
                        {visibleChoices.map((c) => (
                          <Box key={c.value}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c.color }} />
                              <Typography variant="body2" fontWeight={600}>
                                {c.label}: {(d.groups[c.value] || []).length}
                              </Typography>
                            </Stack>
                            {(d.groups[c.value] || []).length > 0 && (
                              <Typography variant="body2" color="text.secondary" sx={{ pl: 2.25 }}>
                                {d.groups[c.value].join(', ')}
                              </Typography>
                            )}
                          </Box>
                        ))}
                        {d.groups.NONE.length > 0 && (
                          <Typography variant="caption" color="text.disabled" sx={{ pl: 2.25 }}>
                            Necompletat: {d.groups.NONE.join(', ')}
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  ))}
                </Box>
              </Box>

              {/* Chat-ul perioadei (pe desktop dupa sumar) */}
              {!isMobile && (
                <Box ref={chatRef} sx={{ scrollMarginTop: 80 }}>
                <HolidayChat
                  periodId={data.period.id}
                  group={data.group.key}
                  groupName={data.group.name}
                  currentUserId={data.currentUserId}
                  canModerate={data.canManage}
                />
              </Box>
              )}

              {/* Tabel complet (desktop) */}
              {!isMobile && (
                <Card>
                  <Stack direction="row" spacing={2} sx={{ px: 2, pt: 2 }} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" color="text.secondary">
                      Legenda:
                    </Typography>
                    {visibleChoices.map((c) => (
                      <Stack key={c.value} direction="row" spacing={0.75} alignItems="center">
                        <ChoiceChip choice={c.value} />
                        <Typography variant="body2">{c.label}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Coleg</TableCell>
                          {daySummary.map((d) => (
                            <TableCell key={d.date} align="center" sx={{ fontWeight: 700 }}>
                              {d.label}
                              {d.holiday && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  {d.holiday}
                                </Typography>
                              )}
                            </TableCell>
                          ))}
                          {data.canManage && <TableCell />}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.users.map((u) => (
                          <TableRow
                            key={u.id}
                            hover
                            sx={u.id === data.currentUserId ? { bgcolor: alpha(theme.palette.primary.main, 0.05) } : undefined}
                          >
                            <TableCell sx={{ fontWeight: u.id === data.currentUserId ? 700 : 400 }}>
                              {u.fullName}
                              {u.id === data.currentUserId && ' (tu)'}
                            </TableCell>
                            {data.days.map((date) => (
                              <TableCell key={date} align="center">
                                <ChoiceChip choice={prefMap[u.id]?.[date]} />
                              </TableCell>
                            ))}
                            {data.canManage && (
                              <TableCell align="right">
                                <Tooltip title={`Modifica preferintele lui ${u.fullName}`}>
                                  <Button
                                    size="small"
                                    startIcon={<EditIcon />}
                                    onClick={() => {
                                      setEditUser(u);
                                      setEditDraft({ ...(prefMap[u.id] || {}) });
                                    }}
                                  >
                                    Modifica
                                  </Button>
                                </Tooltip>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              )}

              {/* Panou manager / admin */}
              {data.canManage && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                      Administrare perioada
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Datele perioadei sunt comune tuturor departamentelor. Inchiderea, precompletarea si
                      cererile de concediu se aplica doar pentru {data.group.name}.
                    </Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} sx={{ mb: 2 }}>
                      <TextField
                        type="date"
                        size="small"
                        fullWidth={isMobile}
                        label="De la"
                        InputLabelProps={{ shrink: true }}
                        value={periodDates.startDate}
                        onChange={(e) => setPeriodDates((p) => ({ ...p, startDate: e.target.value }))}
                      />
                      <TextField
                        type="date"
                        size="small"
                        fullWidth={isMobile}
                        label="Pana la"
                        InputLabelProps={{ shrink: true }}
                        value={periodDates.endDate}
                        onChange={(e) => setPeriodDates((p) => ({ ...p, endDate: e.target.value }))}
                      />
                      <Button
                        variant="outlined"
                        disabled={
                          updatingPeriod ||
                          (periodDates.startDate === data.period.startDate && periodDates.endDate === data.period.endDate)
                        }
                        onClick={async () => {
                          try {
                            await updatePeriod({ id: data.period.id, ...periodDates }).unwrap();
                            notifySuccess('Perioada a fost actualizata');
                          } catch (err: unknown) {
                            notifyError((err as { data?: { message?: string } })?.data?.message || 'Eroare');
                          }
                        }}
                      >
                        Salveaza datele
                      </Button>
                    </Stack>
                    {isMobile && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Modifica preferintele unui coleg:
                      </Typography>
                    )}
                    {isMobile && (
                      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 2 }}>
                        {data.users.map((u) => (
                          <Chip
                            key={u.id}
                            icon={<EditIcon />}
                            label={u.fullName}
                            onClick={() => {
                              setEditUser(u);
                              setEditDraft({ ...(prefMap[u.id] || {}) });
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                      <Button
                        variant="outlined"
                        color={locked ? 'success' : 'warning'}
                        startIcon={locked ? <LockOpenIcon /> : <LockIcon />}
                        disabled={lockingGroup}
                        onClick={async () => {
                          await setGroupLock({ id: data.period.id, group: data.group.key, locked: !locked }).unwrap();
                          notifySuccess(
                            locked
                              ? `Perioada a fost redeschisa pentru ${data.group.name}`
                              : `Perioada a fost inchisa pentru ${data.group.name}`,
                          );
                        }}
                      >
                        {locked ? 'Redeschide perioada' : 'Inchide perioada'}
                      </Button>
                      <Button variant="contained" startIcon={<ScheduleIcon />} onClick={() => setConfirmAction('schedule')}>
                        Precompleteaza programul
                      </Button>
                      <Button variant="contained" color="warning" startIcon={<LeaveIcon />} onClick={() => setConfirmAction('leave')}>
                        Creeaza cereri de concediu
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          )}
        </>
      )}

      {/* Editare de catre manager */}
      {data && (
        <FriendlyDialog
          open={!!editUser}
          onClose={() => setEditUser(null)}
          icon={<EditIcon />}
          variant="primary"
          title={`Preferinte: ${editUser?.fullName || ''}`}
          subtitle={data.period.name}
          onConfirm={async () => {
            if (editUser && (await saveRow(editUser.id, editDraft))) {
              notifySuccess('Preferintele au fost salvate');
              setEditUser(null);
            }
          }}
          confirmText="Salveaza"
          confirmLoading={saving}
        >
          <DayEditor
            days={data.days}
            period={data.period}
            choices={groupChoices}
            value={editDraft}
            onChange={(date, choice) => setEditDraft((d) => ({ ...d, [date]: choice }))}
          />
        </FriendlyDialog>
      )}

      {/* Confirmare actiuni */}
      <FriendlyDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        icon={confirmAction === 'leave' ? <LeaveIcon /> : <ScheduleIcon />}
        variant={confirmAction === 'leave' ? 'warning' : 'primary'}
        title={confirmAction === 'leave' ? 'Creeaza cereri de concediu' : 'Precompleteaza programul'}
        maxWidth="xs"
        onConfirm={runConfirmed}
        confirmText="Continua"
        confirmLoading={applying || creatingLeaves}
      >
        {confirmAction === 'schedule' ? (
          <Typography variant="body2">
            Pentru colegii din <strong>{data?.group.name}</strong>: zilele marcate <strong>Zi</strong> /{' '}
            <strong>Noapte</strong> primesc tura obisnuita a fiecaruia (cea mai frecventa din program), iar{' '}
            <strong>Concediu</strong> apare ca CO. Zilele cu <strong>Orice</strong> sau necompletate si restul lunii
            raman neschimbate. Programul modificat de un manager se trimite spre aprobare; cel modificat de un admin e aprobat
            direct.
          </Typography>
        ) : (
          <Typography variant="body2">
            Pentru zilele marcate <strong>Concediu</strong> se creeaza cereri de concediu de odihna, grupate pe zile
            consecutive. Cererile apar <strong>In asteptare</strong> si se aproba normal din Gestionare Concedii (atunci se
            scad si zilele din sold). Cererile care se suprapun cu altele existente sunt sarite.
          </Typography>
        )}
      </FriendlyDialog>

      {/* Rezultate */}
      <FriendlyDialog
        open={!!resultDialog}
        onClose={() => setResultDialog(null)}
        icon={<OkIcon />}
        variant="success"
        title={resultDialog?.title || ''}
        maxWidth="sm"
        actions={<Button onClick={() => setResultDialog(null)}>Inchide</Button>}
      >
        <Stack spacing={1}>
          {resultDialog?.lines.map((l, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
              {l.ok ? <OkIcon color="success" fontSize="small" /> : <ErrIcon color="error" fontSize="small" />}
              <Typography variant="body2">{l.text}</Typography>
            </Stack>
          ))}
        </Stack>
      </FriendlyDialog>
    </Box>
  );
};

export default memo(HolidayPreferencesPage);
