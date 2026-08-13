import { useState, useMemo, memo, type ReactElement } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  IconButton,
  Tooltip,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Chip,
  CircularProgress,
  Grid,
  useTheme,
  alpha,
} from '@mui/material';
import {
  LocalParking as ParkingIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Accessible as HandicapIcon,
  ChildCare as ChildIcon,
  ElectricCar as ElectricIcon,
  Bookmark as ReservedIcon,
  TwoWheeler as MotoIcon,
} from '@mui/icons-material';
import { GradientHeader, FriendlyDialog, EmptyState } from '../../components/common';
import {
  useGetParkingLevelsQuery,
  useCreateParkingLevelMutation,
  useUpdateParkingLevelMutation,
  useDeleteParkingLevelMutation,
  type ParkingLevel,
  type ParkingLevelPayload,
} from '../../store/api/parkingLevels.api';
import { useAppSelector } from '../../store/hooks';
import { isAdminOrAbove } from '../../utils/roleHelpers';
import { useSnackbar } from '../../contexts/SnackbarContext';

type NumField = 'total' | 'normal' | 'handicap' | 'mamaCopil' | 'electric' | 'rezervat' | 'moto';

const NUM_COLUMNS: { key: NumField; label: string }[] = [
  { key: 'total', label: 'Total' },
  { key: 'normal', label: 'Normale' },
  { key: 'handicap', label: 'Handicap' },
  { key: 'mamaCopil', label: 'Mama-copil' },
  { key: 'electric', label: 'Electrice' },
  { key: 'rezervat', label: 'Rezervat' },
  { key: 'moto', label: 'Moto' },
];

// Chip-uri pe categorii, afisate langa numele parcarii (doar cand suma > 0)
const CATEGORY_CHIPS: {
  key: Exclude<NumField, 'total' | 'normal'>;
  label: string;
  color: 'info' | 'secondary' | 'success' | 'warning' | 'default';
  icon: ReactElement;
}[] = [
  { key: 'handicap', label: 'handicap', color: 'info', icon: <HandicapIcon sx={{ fontSize: 15 }} /> },
  { key: 'mamaCopil', label: 'mama-copil', color: 'secondary', icon: <ChildIcon sx={{ fontSize: 15 }} /> },
  { key: 'electric', label: 'electrice', color: 'success', icon: <ElectricIcon sx={{ fontSize: 15 }} /> },
  { key: 'rezervat', label: 'rezervat', color: 'warning', icon: <ReservedIcon sx={{ fontSize: 15 }} /> },
  { key: 'moto', label: 'moto', color: 'default', icon: <MotoIcon sx={{ fontSize: 15 }} /> },
];

const emptyForm: ParkingLevelPayload = {
  parkingName: '',
  levelNumber: '',
  levelName: '',
  total: 0,
  normal: 0,
  handicap: 0,
  mamaCopil: 0,
  electric: 0,
  rezervat: 0,
  moto: 0,
};

const ParkingLevelsPage = () => {
  const theme = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  const canEdit = isAdminOrAbove(user?.role) || user?.role === 'MANAGER';
  const { notifySuccess, notifyError } = useSnackbar();

  const { data: levels = [], isLoading } = useGetParkingLevelsQuery();
  const [createLevel, { isLoading: creating }] = useCreateParkingLevelMutation();
  const [updateLevel, { isLoading: updating }] = useUpdateParkingLevelMutation();
  const [deleteLevel, { isLoading: deleting }] = useDeleteParkingLevelMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ParkingLevelPayload>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<ParkingLevel | null>(null);

  // Grupare pe parcare, in ordinea din baza de date
  const groups = useMemo(() => {
    const map = new Map<string, ParkingLevel[]>();
    [...levels]
      .sort((a, b) => a.parkingOrder - b.parkingOrder || a.levelOrder - b.levelOrder)
      .forEach((l) => {
        if (!map.has(l.parkingName)) map.set(l.parkingName, []);
        map.get(l.parkingName)!.push(l);
      });
    return Array.from(map.entries()).map(([name, rows]) => ({ name, rows }));
  }, [levels]);

  const sumField = (rows: ParkingLevel[], key: NumField) =>
    rows.reduce((acc, r) => acc + (r[key] || 0), 0);

  const handleOpenAddParking = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenAddLevel = (parkingName: string) => {
    setEditingId(null);
    setForm({ ...emptyForm, parkingName });
    setDialogOpen(true);
  };

  const handleOpenEdit = (level: ParkingLevel) => {
    setEditingId(level.id);
    setForm({
      parkingName: level.parkingName,
      levelNumber: level.levelNumber || '',
      levelName: level.levelName || '',
      total: level.total,
      normal: level.normal,
      handicap: level.handicap,
      mamaCopil: level.mamaCopil,
      electric: level.electric,
      rezervat: level.rezervat,
      moto: level.moto,
    });
    setDialogOpen(true);
  };

  const handleNum = (field: NumField) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: Math.max(0, parseInt(e.target.value, 10) || 0) }));

  const handleSave = async () => {
    if (!form.parkingName.trim()) {
      notifyError('Completeaza numele parcarii.');
      return;
    }
    const payload: ParkingLevelPayload = {
      ...form,
      parkingName: form.parkingName.trim(),
      levelNumber: form.levelNumber?.trim() || null,
      levelName: form.levelName?.trim() || null,
    };
    try {
      if (editingId) {
        await updateLevel({ id: editingId, data: payload }).unwrap();
        notifySuccess('Nivel actualizat.');
      } else {
        await createLevel(payload).unwrap();
        notifySuccess('Nivel adaugat.');
      }
      setDialogOpen(false);
    } catch {
      notifyError('A aparut o eroare la salvare.');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteLevel(confirmDelete.id).unwrap();
      notifySuccess('Nivel sters.');
      setConfirmDelete(null);
    } catch {
      notifyError('A aparut o eroare la stergere.');
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <GradientHeader
        title="Locuri pe Nivele — Parcari Etajate"
        subtitle="Numarul de locuri pe fiecare nivel, pe categorii"
        icon={<ParkingIcon />}
        gradient="#1d4ed8 0%, #475569 100%"
      >
        <Chip
          icon={<ParkingIcon sx={{ fontSize: 16 }} />}
          label={`${groups.length} parcari`}
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          size="small"
        />
      </GradientHeader>

      {canEdit && (
        <Stack direction="row" justifyContent="flex-end" sx={{ my: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddParking} sx={{ fontWeight: 600, borderRadius: 2 }}>
            Adauga parcare / nivel
          </Button>
        </Stack>
      )}

      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
      ) : groups.length === 0 ? (
        <EmptyState icon={<ParkingIcon sx={{ fontSize: 40 }} />} title="Nicio parcare" description="Nu exista date despre nivele." />
      ) : (
        <Stack spacing={2.5}>
          {groups.map((group) => (
            <Paper key={group.name} sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                  <ParkingIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>{group.name}</Typography>
                  <Chip size="small" label={`${sumField(group.rows, 'total')} locuri`} color="primary" />
                  {CATEGORY_CHIPS.map((chip) => {
                    const val = sumField(group.rows, chip.key);
                    if (val <= 0) return null;
                    return (
                      <Chip
                        key={chip.key}
                        size="small"
                        icon={chip.icon}
                        label={`${val} ${chip.label}`}
                        color={chip.color}
                        variant="outlined"
                      />
                    );
                  })}
                </Stack>
                {canEdit && (
                  <Button size="small" startIcon={<AddIcon />} onClick={() => handleOpenAddLevel(group.name)}>
                    Adauga nivel
                  </Button>
                )}
              </Stack>

              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nivel</TableCell>
                      <TableCell>Denumire</TableCell>
                      {NUM_COLUMNS.map((c) => (
                        <TableCell key={c.key} align="right">{c.label}</TableCell>
                      ))}
                      {canEdit && <TableCell align="right">Actiuni</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.rows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{row.levelNumber || '—'}</TableCell>
                        <TableCell>{row.levelName || '—'}</TableCell>
                        {NUM_COLUMNS.map((c) => (
                          <TableCell key={c.key} align="right">{row[c.key] || 0}</TableCell>
                        ))}
                        {canEdit && (
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="Editeaza">
                                <IconButton size="small" onClick={() => handleOpenEdit(row)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Sterge">
                                <IconButton size="small" color="error" onClick={() => setConfirmDelete(row)} disabled={deleting}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {/* Rand de totaluri (insumat din nivele) */}
                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                      <TableCell sx={{ fontWeight: 700 }} colSpan={2}>Total parcare</TableCell>
                      {NUM_COLUMNS.map((c) => (
                        <TableCell key={c.key} align="right" sx={{ fontWeight: 700 }}>
                          {sumField(group.rows, c.key)}
                        </TableCell>
                      ))}
                      {canEdit && <TableCell />}
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Add / Edit dialog */}
      <FriendlyDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        icon={<ParkingIcon />}
        variant="info"
        title={editingId ? 'Editeaza nivelul' : 'Adauga nivel'}
        maxWidth="sm"
        actions={
          <>
            <Button onClick={() => setDialogOpen(false)}>Anuleaza</Button>
            <Button variant="contained" onClick={handleSave} disabled={creating || updating}
              startIcon={(creating || updating) ? <CircularProgress size={18} /> : undefined}>
              {editingId ? 'Salveaza' : 'Adauga'}
            </Button>
          </>
        }
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label="Parcare"
            value={form.parkingName}
            onChange={(e) => setForm((prev) => ({ ...prev, parkingName: e.target.value }))}
            required
            fullWidth
          />
          <Stack direction="row" spacing={2}>
            <TextField label="Nivel (ex: -1, 0, 1)" value={form.levelNumber ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, levelNumber: e.target.value }))} fullWidth />
            <TextField label="Denumire nivel" value={form.levelName ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, levelName: e.target.value }))} fullWidth />
          </Stack>
          <Grid container spacing={2}>
            {NUM_COLUMNS.map((c) => (
              <Grid size={{ xs: 6, sm: 4 }} key={c.key}>
                <TextField
                  label={c.label}
                  type="number"
                  value={form[c.key] ?? 0}
                  onChange={handleNum(c.key)}
                  fullWidth
                  inputProps={{ min: 0 }}
                />
              </Grid>
            ))}
          </Grid>
          <Typography variant="caption" color="text.secondary">
            „Total" e numarul de locuri pe acel nivel. Totalul parcarii se calculeaza automat prin insumarea nivelelor.
          </Typography>
        </Stack>
      </FriendlyDialog>

      {/* Delete confirmation */}
      <FriendlyDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        icon={<DeleteIcon />}
        variant="error"
        title="Sterge nivelul"
        onConfirm={handleDelete}
        confirmText={deleting ? 'Se sterge...' : 'Sterge'}
        cancelText="Anuleaza"
      >
        <Typography>
          Esti sigur ca vrei sa stergi nivelul {confirmDelete?.levelName || confirmDelete?.levelNumber} din {confirmDelete?.parkingName}?
        </Typography>
      </FriendlyDialog>
    </Box>
  );
};

export default memo(ParkingLevelsPage);
