import { useState, useMemo, memo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  Tooltip,
  TextField,
  useTheme,
  useMediaQuery,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Build as BuildIcon,
  Search as SearchIcon,
  CloudDownload as SeedIcon,
} from '@mui/icons-material';
import {
  useGetEquipmentQuery,
  useCreateEquipmentMutation,
  useUpdateEquipmentMutation,
  useDeleteEquipmentMutation,
  useSeedEquipmentMutation,
} from '../../../store/api/permissions.api';
import type { ParkingEquipmentItem, CreateEquipmentRequest } from '../../../store/api/permissions.api';
import { TableSkeleton } from '../../../components/common';

const CATEGORY_LABELS: Record<string, string> = {
  ISSUE: 'Probleme',
  DAMAGE: 'Prejudicii',
  BOTH: 'Ambele',
};

const CATEGORY_COLORS: Record<string, 'info' | 'warning' | 'success'> = {
  ISSUE: 'info',
  DAMAGE: 'warning',
  BOTH: 'success',
};

const emptyForm: CreateEquipmentRequest = {
  name: '',
  category: 'ISSUE',
  isActive: true,
  sortOrder: 0,
};

const EquipmentTab = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: equipment, isLoading } = useGetEquipmentQuery();
  const [createEquipment] = useCreateEquipmentMutation();
  const [updateEquipment] = useUpdateEquipmentMutation();
  const [deleteEquipment] = useDeleteEquipmentMutation();
  const [seedEquipment, { isLoading: isSeeding }] = useSeedEquipmentMutation();

  const [editDialog, setEditDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEquipmentRequest>(emptyForm);
  const [search, setSearch] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const filtered = useMemo(() => {
    if (!equipment) return [];
    if (!search.trim()) return equipment;
    const s = search.toLowerCase();
    return equipment.filter((e) => e.name.toLowerCase().includes(s));
  }, [equipment, search]);

  const handleEdit = (item: ParkingEquipmentItem) => {
    setEditingId(item.id);
    setForm({ name: item.name, category: item.category, isActive: item.isActive, sortOrder: item.sortOrder });
    setEditDialog(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setEditDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateEquipment({ id: editingId, data: form }).unwrap();
        setSnackbar({ open: true, message: 'Echipament actualizat!', severity: 'success' });
      } else {
        await createEquipment(form).unwrap();
        setSnackbar({ open: true, message: 'Echipament adaugat!', severity: 'success' });
      }
      setEditDialog(false);
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.data?.message || 'Eroare la salvare.', severity: 'error' });
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteEquipment(deleteConfirm).unwrap();
      setSnackbar({ open: true, message: 'Echipament sters.', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Eroare la stergere.', severity: 'error' });
    }
    setDeleteConfirm(null);
  };

  const handleToggleActive = async (item: ParkingEquipmentItem) => {
    try {
      await updateEquipment({ id: item.id, data: { isActive: !item.isActive } }).unwrap();
    } catch {
      setSnackbar({ open: true, message: 'Eroare la actualizare.', severity: 'error' });
    }
  };

  const handleSeed = async () => {
    try {
      const result = await seedEquipment().unwrap();
      setSnackbar({ open: true, message: `${result.created} echipamente importate din constante!`, severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Eroare la importul echipamentelor.', severity: 'error' });
    }
  };

  if (isLoading) {
    return <TableSkeleton rows={5} columns={5} />;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BuildIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Echipamente Parcari
          </Typography>
          {equipment && (
            <Chip
              label={`${equipment.filter((e) => e.isActive).length} active / ${equipment.length} total`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {(!equipment || equipment.length === 0) && (
            <Button
              variant="outlined"
              startIcon={<SeedIcon />}
              onClick={handleSeed}
              disabled={isSeeding}
              size="small"
            >
              {isSeeding ? 'Se importa...' : 'Importa din Constante'}
            </Button>
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd} size="small">
            Adauga
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Gestioneaza echipamentele disponibile in formularele de Probleme si Prejudicii din parcari.
        Categoria determina in ce formular apare echipamentul: Probleme, Prejudicii sau Ambele.
      </Alert>

      {/* Search */}
      <TextField
        placeholder="Cauta echipament..."
        size="small"
        fullWidth
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Cauta echipament"
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {(!equipment || equipment.length === 0) && (
        <Alert severity="warning">
          Nu exista echipamente. Apasa "Importa din Constante" pentru a popula lista din datele existente.
        </Alert>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Nume</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Categorie</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Activ</TableCell>
                {!isMobile && <TableCell sx={{ fontWeight: 700 }} align="center">Ordine</TableCell>}
                <TableCell sx={{ fontWeight: 700 }} align="right">Actiuni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} sx={{ opacity: item.isActive ? 1 : 0.5 }}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={CATEGORY_LABELS[item.category] || item.category}
                      size="small"
                      color={CATEGORY_COLORS[item.category] || 'default'}
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={item.isActive}
                      onChange={() => handleToggleActive(item)}
                      size="small"
                      color="success"
                    />
                  </TableCell>
                  {!isMobile && <TableCell align="center">{item.sortOrder}</TableCell>}
                  <TableCell align="right">
                    <Tooltip title="Editeaza">
                      <IconButton size="small" onClick={() => handleEdit(item)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sterge">
                      <IconButton size="small" color="error" onClick={() => setDeleteConfirm(item.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{editingId ? 'Editeaza Echipament' : 'Adauga Echipament Nou'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nume Echipament"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              size="small"
              fullWidth
              required
              placeholder="Ex: Bariere, Lift, Camere Video"
            />

            <FormControl fullWidth size="small">
              <InputLabel>Categorie</InputLabel>
              <Select
                value={form.category}
                label="Categorie"
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CreateEquipmentRequest['category'] }))}
              >
                <MenuItem value="ISSUE">Probleme</MenuItem>
                <MenuItem value="DAMAGE">Prejudicii</MenuItem>
                <MenuItem value="BOTH">Ambele</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Ordine Sortare"
              type="number"
              value={form.sortOrder ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
              size="small"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Anuleaza</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.name.trim()}
          >
            {editingId ? 'Salveaza' : 'Adauga'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirma Stergerea</DialogTitle>
        <DialogContent>
          <Typography>Esti sigur ca vrei sa stergi acest echipament?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Anuleaza</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirmed}>Sterge</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default memo(EquipmentTab);
