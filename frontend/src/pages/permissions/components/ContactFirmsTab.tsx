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
  Alert,
  Snackbar,
  Tooltip,
  TextField,
  Checkbox,
  FormControlLabel,
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
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Business as BusinessIcon,
  Search as SearchIcon,
  CloudDownload as SeedIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import {
  useGetContactFirmsQuery,
  useCreateContactFirmMutation,
  useUpdateContactFirmMutation,
  useDeleteContactFirmMutation,
  useSeedContactFirmsMutation,
} from '../../../store/api/permissions.api';
import type { ContactFirmItem, CreateContactFirmRequest } from '../../../store/api/permissions.api';
import { TableSkeleton } from '../../../components/common';

const emptyForm: CreateContactFirmRequest = {
  name: '',
  email: '',
  phone: '',
  contactPerson: '',
  isInternal: false,
  isActive: true,
  sortOrder: 0,
};

const ContactFirmsTab = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: firms, isLoading } = useGetContactFirmsQuery();
  const [createFirm] = useCreateContactFirmMutation();
  const [updateFirm] = useUpdateContactFirmMutation();
  const [deleteFirm] = useDeleteContactFirmMutation();
  const [seedFirms, { isLoading: isSeeding }] = useSeedContactFirmsMutation();

  const [editDialog, setEditDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateContactFirmRequest>(emptyForm);
  const [search, setSearch] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const filtered = useMemo(() => {
    if (!firms) return [];
    if (!search.trim()) return firms;
    const s = search.toLowerCase();
    return firms.filter(
      (f) =>
        f.name.toLowerCase().includes(s) ||
        f.email?.toLowerCase().includes(s) ||
        f.phone?.toLowerCase().includes(s) ||
        f.contactPerson?.toLowerCase().includes(s),
    );
  }, [firms, search]);

  const handleEdit = (item: ContactFirmItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      email: item.email || '',
      phone: item.phone || '',
      contactPerson: item.contactPerson || '',
      isInternal: item.isInternal,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
    });
    setEditDialog(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setEditDialog(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        contactPerson: form.contactPerson?.trim() || null,
      };
      if (editingId) {
        await updateFirm({ id: editingId, data: payload }).unwrap();
        setSnackbar({ open: true, message: 'Firma actualizata!', severity: 'success' });
      } else {
        await createFirm(payload).unwrap();
        setSnackbar({ open: true, message: 'Firma adaugata!', severity: 'success' });
      }
      setEditDialog(false);
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.data?.message || 'Eroare la salvare.', severity: 'error' });
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteFirm(deleteConfirm).unwrap();
      setSnackbar({ open: true, message: 'Firma stearsa.', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Eroare la stergere.', severity: 'error' });
    }
    setDeleteConfirm(null);
  };

  const handleToggleActive = async (item: ContactFirmItem) => {
    try {
      await updateFirm({ id: item.id, data: { isActive: !item.isActive } }).unwrap();
    } catch {
      setSnackbar({ open: true, message: 'Eroare la actualizare.', severity: 'error' });
    }
  };

  const handleSeed = async () => {
    try {
      const result = await seedFirms().unwrap();
      setSnackbar({ open: true, message: `${result.created} firme importate din constante!`, severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Eroare la importul firmelor.', severity: 'error' });
    }
  };

  if (isLoading) {
    return <TableSkeleton rows={5} columns={7} />;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Firme Contact
          </Typography>
          {firms && (
            <Chip
              label={`${firms.filter((f) => f.isActive).length} active / ${firms.length} total`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {(!firms || firms.length === 0) && (
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
        Gestioneaza firmele/compartimentele contactate in problemele de parcari.
        Firmele marcate ca "Interna" declanseaza notificari automate catre echipa de intretinere.
      </Alert>

      {/* Search */}
      <TextField
        placeholder="Cauta firma, email, telefon..."
        size="small"
        fullWidth
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Cauta firma, email, telefon"
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

      {(!firms || firms.length === 0) && (
        <Alert severity="warning">
          Nu exista firme. Apasa "Importa din Constante" pentru a popula lista din datele existente.
        </Alert>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Nume</TableCell>
                {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>}
                {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Telefon</TableCell>}
                {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>}
                <TableCell sx={{ fontWeight: 700 }} align="center">Tip</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Activ</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actiuni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} sx={{ opacity: item.isActive ? 1 : 0.5 }}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                      {isMobile && item.email && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EmailIcon sx={{ fontSize: 12 }} /> {item.email}
                        </Typography>
                      )}
                      {isMobile && item.phone && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon sx={{ fontSize: 12 }} /> {item.phone}
                        </Typography>
                      )}
                      {isMobile && item.contactPerson && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 12 }} /> {item.contactPerson}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  {!isMobile && (
                    <TableCell>
                      <Typography variant="body2" color={item.email ? 'text.primary' : 'text.disabled'}>
                        {item.email || '-'}
                      </Typography>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell>
                      <Typography variant="body2" color={item.phone ? 'text.primary' : 'text.disabled'}>
                        {item.phone || '-'}
                      </Typography>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell>
                      <Typography variant="body2" color={item.contactPerson ? 'text.primary' : 'text.disabled'}>
                        {item.contactPerson || '-'}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell align="center">
                    <Chip
                      label={item.isInternal ? 'Interna' : 'Externa'}
                      size="small"
                      color={item.isInternal ? 'error' : 'default'}
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
        <DialogTitle>{editingId ? 'Editeaza Firma' : 'Adauga Firma Noua'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nume Firma"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              size="small"
              fullWidth
              required
              placeholder="Ex: Electrica, Stingprod"
            />

            <Divider><Typography variant="caption">Date Contact (optional)</Typography></Divider>

            <TextField
              label="Email"
              type="email"
              value={form.email || ''}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              size="small"
              fullWidth
              placeholder="email@firma.ro"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Telefon"
              value={form.phone || ''}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              size="small"
              fullWidth
              placeholder="07xx xxx xxx"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Persoana de Legatura"
              value={form.contactPerson || ''}
              onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
              size="small"
              fullWidth
              placeholder="Nume si prenume"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Divider><Typography variant="caption">Setari</Typography></Divider>

            <FormControlLabel
              control={
                <Checkbox
                  checked={form.isInternal || false}
                  onChange={(e) => setForm((f) => ({ ...f, isInternal: e.target.checked }))}
                  size="small"
                  color="error"
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Firma Interna</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Firmele interne declanseaza notificari automate catre echipa de intretinere
                  </Typography>
                </Box>
              }
            />

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
            disabled={!form.name?.trim()}
          >
            {editingId ? 'Salveaza' : 'Adauga'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirma Stergerea</DialogTitle>
        <DialogContent>
          <Typography>Esti sigur ca vrei sa stergi aceasta firma?</Typography>
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

export default memo(ContactFirmsTab);
