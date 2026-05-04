import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  alpha,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  AssignmentTurnedIn as NotesIcon,
  CalendarMonth as CalendarIcon,
  Info as InfoIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import {
  useGetControlNotesMatrixQuery,
  useUpsertControlNoteMutation,
  useDeleteControlNoteCellMutation,
} from '../../../store/api/controlNotes.api';
import { useAppSelector } from '../../../store/hooks';
import { isAdminOrAbove } from '../../../utils/roleHelpers';
import { useSnackbar } from '../../../contexts/SnackbarContext';

const PARCOMETRE_DEPARTMENT_NAME = 'Parcometre';

const ControlNotesTab: React.FC = () => {
  const theme = useTheme();
  const { user } = useAppSelector((s) => s.auth);
  const { notifySuccess, notifyError } = useSnackbar();
  const isAdmin = isAdminOrAbove(user?.role);
  const isManager = user?.role === 'MANAGER';
  const isParcometre = user?.department?.name === PARCOMETRE_DEPARTMENT_NAME;
  const canEdit = isAdmin || isManager || isParcometre;

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);

  const { data: matrix, isLoading } = useGetControlNotesMatrixQuery(year);
  const [upsert, { isLoading: saving }] = useUpsertControlNoteMutation();
  const [deleteCell, { isLoading: deleting }] = useDeleteControlNoteCellMutation();

  const yearOptions = useMemo(() => {
    const out: number[] = [];
    for (let y = currentYear + 1; y >= currentYear - 4; y--) out.push(y);
    return out;
  }, [currentYear]);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    userId: string;
    fullName: string;
    month: number;
    monthLabel: string;
    currentCount: number | null;
    currentMarker: string | null;
  } | null>(null);
  const [countInput, setCountInput] = useState('');
  const [markerInput, setMarkerInput] = useState('');

  const openEdit = (
    userId: string,
    fullName: string,
    month: number,
    monthLabel: string,
    currentCount: number | null,
    currentMarker: string | null,
  ) => {
    if (!canEdit) return;
    setEditTarget({ userId, fullName, month, monthLabel, currentCount, currentMarker });
    setCountInput(currentCount !== null ? String(currentCount) : '');
    setMarkerInput(currentMarker || '');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const trimmedMarker = markerInput.trim();
    const countTrimmed = countInput.trim();

    // Empty count + empty marker = delete the cell
    if (!countTrimmed && !trimmedMarker) {
      try {
        await deleteCell({
          userId: editTarget.userId,
          year,
          month: editTarget.month,
        }).unwrap();
        notifySuccess('Celula a fost golita');
        setEditOpen(false);
      } catch (err: any) {
        notifyError(err?.data?.message || err?.message || 'Eroare la stergere');
      }
      return;
    }

    const parsed = countTrimmed ? Number(countTrimmed) : 0;
    if (countTrimmed && (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed))) {
      notifyError('Numarul de note trebuie sa fie un numar intreg pozitiv');
      return;
    }

    try {
      await upsert({
        userId: editTarget.userId,
        year,
        month: editTarget.month,
        count: parsed,
        marker: trimmedMarker || null,
      }).unwrap();
      notifySuccess(`${editTarget.fullName} — ${editTarget.monthLabel}: ${parsed} note`);
      setEditOpen(false);
    } catch (err: any) {
      notifyError(err?.data?.message || err?.message || 'Eroare la salvare');
    }
  };

  const renderCell = (
    userId: string,
    fullName: string,
    month: number,
    monthLabel: string,
    count: number | null,
    marker: string | null,
  ) => {
    const isEmpty = count === null && !marker;
    return (
      <TableCell
        key={month}
        align="center"
        onClick={() => openEdit(userId, fullName, month, monthLabel, count, marker)}
        sx={{
          cursor: canEdit ? 'pointer' : 'default',
          fontSize: { xs: '0.7rem', sm: '0.8rem' },
          px: 0.75,
          py: 0.75,
          minWidth: 50,
          color: isEmpty ? 'text.disabled' : 'inherit',
          fontWeight: isEmpty ? 400 : 600,
          '&:hover': canEdit ? { bgcolor: alpha(theme.palette.primary.main, 0.06) } : undefined,
        }}
      >
        {marker ? (
          <Chip
            label={marker}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.65rem',
              bgcolor: alpha(theme.palette.warning.main, 0.18),
              color: 'warning.dark',
              fontWeight: 700,
            }}
          />
        ) : count !== null ? (
          count
        ) : (
          <Typography variant="caption" color="text.disabled">
            —
          </Typography>
        )}
      </TableCell>
    );
  };

  return (
    <Box>
      <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2, borderRadius: 2 }}>
        Tabelul afiseaza <strong>numarul de note de constatare</strong> emise de fiecare
        user din departamentul <strong>Control</strong> pe fiecare luna. Datele sunt
        introduse de userii din <strong>Parcometre</strong>. Header-ul fiecarei luni arata
        zilele lucratoare (excludem weekend-urile si sarbatorile legale). Media pe zi este
        calculata raportand totalul la numarul de zile lucratoare din lunile cu date.
      </Alert>

      {/* Top filter + summary */}
      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent sx={{ py: 2 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'center' }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <NotesIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  CONTROL PARCARI — NOTE DE CONSTATARE
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {year}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField
                select
                size="small"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                label="An"
                sx={{ minWidth: 110 }}
              >
                {yearOptions.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </TextField>

              {matrix && (
                <>
                  <Box sx={{ minWidth: 110 }}>
                    <Typography variant="caption" color="text.secondary">
                      Total an
                    </Typography>
                    <Typography variant="body1" fontWeight={800} color="primary.main">
                      {matrix.totals.grandTotal.toLocaleString('ro-RO')}
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 130 }}>
                    <Typography variant="caption" color="text.secondary">
                      Zile lucratoare cu date
                    </Typography>
                    <Typography variant="body1" fontWeight={700}>
                      {matrix.totals.totalWorkingDays}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      minWidth: 130,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.success.main, 0.12),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Media / zi lucratoare
                    </Typography>
                    <Typography variant="body1" fontWeight={800} color="success.main">
                      {matrix.totals.averagePerWorkingDay.toFixed(2)}
                    </Typography>
                  </Box>
                </>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && matrix && matrix.users.length === 0 && (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <NotesIcon sx={{ fontSize: 64, color: alpha(theme.palette.primary.main, 0.3), mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Niciun user din Control si nicio data pentru anul {year}
          </Typography>
        </Card>
      )}

      {!isLoading && matrix && matrix.users.length > 0 && (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            maxHeight: 'calc(100dvh - 360px)',
            overflowX: 'auto',
            '-webkit-overflow-scrolling': 'touch',
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              {/* Working days info row */}
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    minWidth: 220,
                    position: 'sticky',
                    left: 0,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    zIndex: 3,
                    borderRight: '1px solid',
                    borderRightColor: 'divider',
                  }}
                >
                  Agent
                </TableCell>
                {matrix.months.map((m) => (
                  <TableCell
                    key={m.month}
                    align="center"
                    sx={{
                      fontWeight: 700,
                      px: 0.5,
                      bgcolor: alpha(theme.palette.primary.main, 0.06),
                    }}
                  >
                    <Tooltip
                      title={
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            <strong>{m.totalDays}</strong> zile in luna
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            <strong>{m.weekendDays}</strong> zile weekend
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            <strong>{m.holidayDays}</strong> sarbatori (in zile lucratoare)
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
                            {m.workingDays} zile lucratoare
                          </Typography>
                          {m.holidayDates.length > 0 && (
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                              Sarbatori: {m.holidayDates.map(d => d.slice(8, 10)).join(', ')}
                            </Typography>
                          )}
                        </Box>
                      }
                      arrow
                    >
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                          {m.label}
                        </Typography>
                        <Stack direction="row" spacing={0.25} justifyContent="center" alignItems="center" sx={{ mt: 0.25 }}>
                          <CalendarIcon sx={{ fontSize: 11, color: 'text.secondary' }} />
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                            {m.workingDays}z
                          </Typography>
                        </Stack>
                      </Box>
                    </Tooltip>
                  </TableCell>
                ))}
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 700,
                    minWidth: 80,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                  }}
                >
                  Total
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 700,
                    minWidth: 90,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                  }}
                >
                  Media/zi
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matrix.users.map((u) => (
                <TableRow key={u.userId} hover>
                  <TableCell
                    sx={{
                      position: 'sticky',
                      left: 0,
                      bgcolor: 'background.paper',
                      zIndex: 1,
                      borderRight: '1px solid',
                      borderRightColor: 'divider',
                      minWidth: 220,
                    }}
                  >
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {u.agentCode && (
                        <Chip
                          label={u.agentCode}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.6rem', minWidth: 28 }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{
                          color: u.isActive ? 'inherit' : 'text.disabled',
                          fontSize: { xs: '0.75rem', sm: '0.85rem' },
                        }}
                      >
                        {u.fullName}
                      </Typography>
                      {!u.isActive && (
                        <Chip
                          label="Inactiv"
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.6rem' }}
                        />
                      )}
                    </Stack>
                  </TableCell>
                  {matrix.months.map((m, i) =>
                    renderCell(
                      u.userId,
                      u.fullName,
                      m.month,
                      m.label,
                      u.monthlyCounts[i],
                      u.monthlyMarkers[i],
                    ),
                  )}
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 800,
                      bgcolor: alpha(theme.palette.success.main, 0.06),
                      color: 'success.dark',
                    }}
                  >
                    {u.total.toLocaleString('ro-RO')}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 700,
                      bgcolor: alpha(theme.palette.success.main, 0.06),
                    }}
                  >
                    {u.averagePerWorkingDay.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}

              {/* Footer: monthly totals */}
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 0,
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    zIndex: 1,
                    fontWeight: 800,
                    borderRight: '1px solid',
                    borderRightColor: 'divider',
                  }}
                >
                  TOTAL LUNAR
                </TableCell>
                {matrix.months.map((m) => (
                  <TableCell key={m.month} align="center" sx={{ fontWeight: 700 }}>
                    {m.totalCount > 0 ? m.totalCount.toLocaleString('ro-RO') : '—'}
                  </TableCell>
                ))}
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 800,
                    bgcolor: alpha(theme.palette.success.main, 0.15),
                    color: 'success.dark',
                  }}
                >
                  {matrix.totals.grandTotal.toLocaleString('ro-RO')}
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 800,
                    bgcolor: alpha(theme.palette.success.main, 0.15),
                  }}
                >
                  {matrix.totals.averagePerWorkingDay.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <EditIcon /> {editTarget?.fullName} — {editTarget?.monthLabel} {year}
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Numar note de constatare"
              type="number"
              value={countInput}
              onChange={(e) => setCountInput(e.target.value)}
              fullWidth
              inputProps={{ min: 0, step: 1 }}
              autoFocus
              helperText="Lasa gol pentru a sterge celula"
            />
            <TextField
              label="Marker special (optional)"
              value={markerInput}
              onChange={(e) => setMarkerInput(e.target.value)}
              fullWidth
              inputProps={{ maxLength: 20 }}
              placeholder="Ex: CO, BO, P (pentru concediu, boala, parcometre)"
              helperText="Folosit cand user-ul nu a fost activ in luna respectiva"
            />
            {!canEdit && (
              <Alert severity="warning">
                Doar departamentul Parcometre si administratorii pot modifica.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ textTransform: 'none' }}>
            Anuleaza
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={saveEdit}
            disabled={!canEdit || saving || deleting}
            sx={{ textTransform: 'none' }}
          >
            {saving || deleting ? 'Se salveaza...' : 'Salveaza'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ControlNotesTab;
