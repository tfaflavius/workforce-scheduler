import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { GradientHeader, EmptyState } from '../../components/common';
import DatePickerField from '../../components/common/DatePickerField';
import { useAppSelector } from '../../store/hooks';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  type ScheduleTimeRequest,
  useCancelTimeRequestMutation,
  useCreateTimeRequestMutation,
  useGetMyTimeRequestsQuery,
  useGetTimeEligibilityQuery,
  useGetTimeRequestsQuery,
  useRespondTimeRequestMutation,
} from '../../store/api/scheduleTimeRequests.api';

const STATUS: Record<string, { label: string; color: 'warning' | 'success' | 'error' | 'default' }> = {
  PENDING: { label: 'In asteptare', color: 'warning' },
  APPROVED: { label: 'Aprobata', color: 'success' },
  REJECTED: { label: 'Respinsa', color: 'error' },
  CANCELLED: { label: 'Anulata', color: 'default' },
};

const end8h = (start: string) => {
  const [h, m] = start.split(':').map(Number);
  const t = (h * 60 + m + 480) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
const fmt = (d: string) => {
  const [y, m, day] = d.slice(0, 10).split('-');
  return `${day}.${m}.${y}`;
};
const period = (r: { startDate: string; endDate: string }) =>
  r.startDate.slice(0, 10) === r.endDate.slice(0, 10)
    ? fmt(r.startDate)
    : `${fmt(r.startDate)} - ${fmt(r.endDate)}`;
const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
const err = (e: unknown, fallback: string) => {
  const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
};

type Mode = 'day' | 'range' | 'month';

function RequestDialog({ open, onClose, defaultStart, options }: {
  open: boolean;
  onClose: () => void;
  defaultStart: string | null;
  options: Array<{ start: string; label: string }>;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { notifySuccess, notifyError } = useSnackbar();
  const [create, { isLoading }] = useCreateTimeRequestMutation();
  const [mode, setMode] = useState<Mode>('day');
  const [day, setDay] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [start, setStart] = useState<string>('');
  const [reason, setReason] = useState('');

  const today = todayStr();
  const monthOptions = useMemo(() => {
    const now = new Date();
    return [0, 1, 2].map((i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { value, label: d.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' }) };
    });
  }, []);

  const range = (): [string, string] | null => {
    if (mode === 'day') return day ? [day, day] : null;
    if (mode === 'range') return from && to ? [from, to] : null;
    if (!month) return null;
    const [y, m] = month.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    const first = `${month}-01`;
    return [first < today ? today : first, `${month}-${String(last).padStart(2, '0')}`];
  };

  const choices = options.filter((o) => o.start !== defaultStart);

  const submit = async () => {
    const r = range();
    if (!r || !start) return;
    try {
      await create({ startDate: r[0], endDate: r[1], startTime: start, reason: reason.trim() || undefined }).unwrap();
      notifySuccess('Cererea a fost trimisa. Primesti notificare cand e aprobata.');
      onClose();
    } catch (e) {
      notifyError(err(e, 'Cererea nu a putut fi trimisa'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle>Cere program la alta ora</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.25}>
          <Alert severity="info">
            Programul ramane de 8 ore. Dupa aprobare, se schimba automat in programul tau.
          </Alert>
          <ToggleButtonGroup exclusive fullWidth size="small" value={mode} onChange={(_, v) => v && setMode(v)}>
            <ToggleButton value="day" sx={{ textTransform: 'none' }}>O zi</ToggleButton>
            <ToggleButton value="range" sx={{ textTransform: 'none' }}>Mai multe zile</ToggleButton>
            <ToggleButton value="month" sx={{ textTransform: 'none' }}>Toata luna</ToggleButton>
          </ToggleButtonGroup>
          {mode === 'day' && (
            <DatePickerField label="Ziua" value={day || null} onChange={(v) => setDay(v || '')} fullWidth minDate={today} />
          )}
          {mode === 'range' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <DatePickerField label="De la" value={from || null} onChange={(v) => setFrom(v || '')} fullWidth minDate={today} />
              <DatePickerField label="Pana la" value={to || null} onChange={(v) => setTo(v || '')} fullWidth minDate={from || today} />
            </Stack>
          )}
          {mode === 'month' && (
            <TextField select label="Luna" value={month} onChange={(e) => setMonth(e.target.value)} fullWidth>
              {monthOptions.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField select label="Programul dorit" value={start} onChange={(e) => setStart(e.target.value)} fullWidth
            helperText={defaultStart ? `Programul tau obisnuit: ${defaultStart}-${end8h(defaultStart)}` : undefined}>
            {choices.map((o) => (
              <MenuItem key={o.start} value={o.start}>{o.label}</MenuItem>
            ))}
          </TextField>
          <TextField label="Motiv (optional)" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth multiline minRows={2} inputProps={{ maxLength: 500 }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} disabled={isLoading}>Renunta</Button>
        <Button variant="contained" onClick={submit} disabled={isLoading || !range() || !start}>
          {isLoading ? 'Se trimite...' : 'Trimite cererea'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RequestCard({ r, children, showUser }: { r: ScheduleTimeRequest; children?: React.ReactNode; showUser?: boolean }) {
  const st = STATUS[r.status] || STATUS.PENDING;
  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            {showUser && r.user && (
              <Typography variant="subtitle2" fontWeight={700}>
                {r.user.fullName}
                {r.user.department?.name && (
                  <Typography component="span" variant="caption" color="text.secondary"> · {r.user.department.name}</Typography>
                )}
              </Typography>
            )}
            <Typography variant="body2" fontWeight={showUser ? 500 : 700}>
              {r.startTime}-{end8h(r.startTime)} · {period(r)}
            </Typography>
            {r.reason && <Typography variant="caption" color="text.secondary" display="block">Motiv: {r.reason}</Typography>}
            {r.reviewNote && <Typography variant="caption" color="text.secondary" display="block">Mentiune: {r.reviewNote}</Typography>}
            {r.reviewer && r.status !== 'PENDING' && (
              <Typography variant="caption" color="text.disabled" display="block">de {r.reviewer.fullName}</Typography>
            )}
          </Box>
          <Chip size="small" label={st.label} color={st.color} sx={{ flexShrink: 0 }} />
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

export default function ScheduleTimePage() {
  const { user } = useAppSelector((s) => s.auth);
  const isManagement = user?.role === 'ADMIN' || user?.role === 'MASTER_ADMIN' || user?.role === 'MANAGER';
  const { notifySuccess, notifyError } = useSnackbar();
  const { data: elig, isLoading: eligLoading } = useGetTimeEligibilityQuery();
  const eligible = !!elig?.eligible;
  const { data: mine = [] } = useGetMyTimeRequestsQuery(undefined, { skip: !eligible });
  const [tab, setTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const { data: all = [], isFetching } = useGetTimeRequestsQuery(tab === 'PENDING' ? { status: 'PENDING' } : undefined, {
    skip: !isManagement,
  });
  const [cancel] = useCancelTimeRequestMutation();
  const [respond, { isLoading: responding }] = useRespondTimeRequestMutation();
  const [dialog, setDialog] = useState(false);
  const [reject, setReject] = useState<ScheduleTimeRequest | null>(null);
  const [note, setNote] = useState('');

  const doRespond = async (r: ScheduleTimeRequest, status: 'APPROVED' | 'REJECTED', n?: string) => {
    try {
      const res = await respond({ id: r.id, status, note: n }).unwrap();
      if (status === 'APPROVED') {
        const a = res.applied;
        notifySuccess(
          a && a.skipped > 0
            ? `Aprobata. ${a.updated + a.created} zile schimbate; ${a.skipped} zile cu program pus manual nu au fost atinse.`
            : 'Aprobata. Programul a fost actualizat.',
        );
      } else {
        notifySuccess('Cererea a fost respinsa');
      }
      setReject(null);
      setNote('');
    } catch (e) {
      notifyError(err(e, 'Nu am putut salva raspunsul'));
    }
  };

  if (eligLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ width: '100%', p: { xs: 0, sm: 1 } }}>
      <GradientHeader
        title="Ora programului"
        subtitle={eligible ? `Programul tau automat: ${elig?.defaultInterval}` : 'Cererile de program la alta ora'}
        icon={<TimeIcon />}
        gradient="#0f766e 0%, #0891b2 100%"
      />

      {eligible && (
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>Cererile mele</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog(true)} sx={{ textTransform: 'none' }}>
              Cere alta ora
            </Button>
          </Stack>
          {mine.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Poti cere sa vii la alta ora (tot 8 ore) intr-o zi, in mai multe zile sau toata luna, de exemplu 09:00-17:00 sau 13:00-21:00.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {mine.map((r) => (
                <RequestCard key={r.id} r={r}>
                  {r.status === 'PENDING' && (
                    <Button size="small" color="inherit" sx={{ mt: 1, textTransform: 'none' }}
                      onClick={() => cancel(r.id).unwrap().then(() => notifySuccess('Cererea a fost anulata')).catch((e) => notifyError(err(e, 'Nu am putut anula')))}>
                      Anuleaza cererea
                    </Button>
                  )}
                </RequestCard>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {isManagement && (
        <Box>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Cereri de aprobat</Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1.5, minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none' } }}>
            <Tab value="PENDING" label="In asteptare" />
            <Tab value="ALL" label="Toate" />
          </Tabs>
          {isFetching && all.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
          ) : all.length === 0 ? (
            <EmptyState icon={<TimeIcon />} title="Nicio cerere" description={tab === 'PENDING' ? 'Nu sunt cereri in asteptare.' : 'Nu exista cereri.'} />
          ) : (
            <Stack spacing={1}>
              {all.map((r) => (
                <RequestCard key={r.id} r={r} showUser>
                  {r.status === 'PENDING' && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Button size="small" variant="contained" color="success" startIcon={<CheckIcon />} disabled={responding}
                        onClick={() => doRespond(r, 'APPROVED')} sx={{ textTransform: 'none' }}>
                        Aproba
                      </Button>
                      <Button size="small" variant="outlined" color="error" startIcon={<CloseIcon />} disabled={responding}
                        onClick={() => setReject(r)} sx={{ textTransform: 'none' }}>
                        Respinge
                      </Button>
                    </Stack>
                  )}
                </RequestCard>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {!eligible && !isManagement && (
        <Alert severity="info">Nu ai program fix automat, asa ca nu poti cere schimbarea orei aici.</Alert>
      )}

      {eligible && dialog && (
        <RequestDialog open={dialog} onClose={() => setDialog(false)} defaultStart={elig?.defaultStart || null} options={elig?.options || []} />
      )}

      <Dialog open={!!reject} onClose={() => setReject(null)} fullWidth maxWidth="xs">
        <DialogTitle>Respinge cererea</DialogTitle>
        <DialogContent>
          <TextField autoFocus label="Motiv (optional)" value={note} onChange={(e) => setNote(e.target.value)} fullWidth multiline minRows={2} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReject(null)}>Renunta</Button>
          <Button color="error" variant="contained" disabled={responding} onClick={() => reject && doRespond(reject, 'REJECTED', note.trim() || undefined)}>
            Respinge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
