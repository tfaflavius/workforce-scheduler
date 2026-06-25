import { useState, useMemo, memo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  useTheme,
  useMediaQuery,
  InputAdornment,
} from '@mui/material';
import {
  PhoneIphone as DeviceIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  SimCard as SimIcon,
} from '@mui/icons-material';
import { GradientHeader, FriendlyDialog, EmptyState } from '../../components/common';
import {
  useGetMobileDevicesQuery,
  useCreateMobileDeviceMutation,
  useUpdateMobileDeviceMutation,
  useDeleteMobileDeviceMutation,
  type MobileDevice,
  type MobileDevicePayload,
} from '../../store/api/mobileDevices.api';
import { useGetUsersQuery } from '../../store/api/users.api';
import { useSnackbar } from '../../contexts/SnackbarContext';

const DEVICE_TYPE_OPTIONS = ['Telefon', 'Tableta', 'Modem/Router', 'Alt dispozitiv'];

const emptyForm: MobileDevicePayload = {
  deviceType: '',
  model: '',
  serialImei: '',
  simOperator: '',
  simSerial: '',
  assignedUserId: null,
  notes: '',
};

const MobileDevicesPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { notifySuccess, notifyError } = useSnackbar();

  const [search, setSearch] = useState('');
  const { data: devices = [], isLoading } = useGetMobileDevicesQuery(
    search.trim() ? { search: search.trim() } : undefined,
  );
  const { data: users = [] } = useGetUsersQuery({ isActive: true });

  const [createDevice, { isLoading: creating }] = useCreateMobileDeviceMutation();
  const [updateDevice, { isLoading: updating }] = useUpdateMobileDeviceMutation();
  const [deleteDevice, { isLoading: deleting }] = useDeleteMobileDeviceMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MobileDevicePayload>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<MobileDevice | null>(null);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [users],
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (device: MobileDevice) => {
    setEditingId(device.id);
    setForm({
      deviceType: device.deviceType,
      model: device.model,
      serialImei: device.serialImei || '',
      simOperator: device.simOperator || '',
      simSerial: device.simSerial || '',
      assignedUserId: device.assignedUserId,
      notes: device.notes || '',
    });
    setDialogOpen(true);
  };

  const handleChange = (field: keyof MobileDevicePayload) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.deviceType.trim() || !form.model.trim()) {
      notifyError('Completeaza tipul dispozitivului si modelul.');
      return;
    }
    const payload: MobileDevicePayload = {
      deviceType: form.deviceType.trim(),
      model: form.model.trim(),
      serialImei: form.serialImei?.trim() || null,
      simOperator: form.simOperator?.trim() || null,
      simSerial: form.simSerial?.trim() || null,
      assignedUserId: form.assignedUserId || null,
      notes: form.notes?.trim() || null,
    };
    try {
      if (editingId) {
        await updateDevice({ id: editingId, data: payload }).unwrap();
        notifySuccess('Dispozitivul a fost actualizat.');
      } else {
        await createDevice(payload).unwrap();
        notifySuccess('Dispozitivul a fost adaugat.');
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'data' in err
        ? (err.data as { message?: string })?.message || 'A aparut o eroare la salvare.'
        : 'A aparut o eroare la salvare.';
      notifyError(msg);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDevice(confirmDelete.id).unwrap();
      notifySuccess('Dispozitivul a fost sters.');
      setConfirmDelete(null);
    } catch {
      notifyError('A aparut o eroare la stergere.');
    }
  };

  const renderDash = (v: string | null) => (v && v.trim() ? v : '—');

  return (
    <Box sx={{ width: '100%' }}>
      <GradientHeader
        title="Dispozitive Mobile"
        subtitle="Dispozitive date in folosinta pe user"
        icon={<DeviceIcon />}
        gradient="#1d4ed8 0%, #475569 100%"
      >
        <Chip
          icon={<DeviceIcon sx={{ fontSize: 16 }} />}
          label={`${devices.length} dispozitive`}
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          size="small"
        />
      </GradientHeader>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ my: 2 }} alignItems="stretch">
        <TextField
          placeholder="Cauta dupa tip, model, serie, operator sau user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ whiteSpace: 'nowrap', fontWeight: 600, borderRadius: 2 }}
          fullWidth={isMobile}
        >
          Adauga dispozitiv
        </Button>
      </Stack>

      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : devices.length === 0 ? (
        <EmptyState
          icon={<DeviceIcon sx={{ fontSize: 40 }} />}
          illustration="noItems"
          title="Niciun dispozitiv"
          description="Nu exista dispozitive mobile inregistrate. Adauga primul dispozitiv."
        />
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {devices.map((device) => (
            <Card key={device.id} variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700} noWrap>
                      {device.deviceType} — {device.model}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Serie/IMEI: {renderDash(device.serialImei)}
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                      <SimIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {renderDash(device.simOperator)}{device.simSerial ? ` · ${device.simSerial}` : ''}
                      </Typography>
                    </Stack>
                    <Chip
                      icon={<PersonIcon />}
                      size="small"
                      sx={{ mt: 1 }}
                      color={device.assignedUser ? 'primary' : 'default'}
                      label={device.assignedUser ? device.assignedUser.fullName : 'Nealocat'}
                    />
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => handleOpenEdit(device)} aria-label="Editeaza">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setConfirmDelete(device)} aria-label="Sterge">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tip</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>Serie / IMEI</TableCell>
                <TableCell>Operator SIM</TableCell>
                <TableCell>Serie SIM</TableCell>
                <TableCell>Atribuit user</TableCell>
                <TableCell align="right">Actiuni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id} hover>
                  <TableCell>{device.deviceType}</TableCell>
                  <TableCell>{device.model}</TableCell>
                  <TableCell>{renderDash(device.serialImei)}</TableCell>
                  <TableCell>{renderDash(device.simOperator)}</TableCell>
                  <TableCell>{renderDash(device.simSerial)}</TableCell>
                  <TableCell>
                    {device.assignedUser ? (
                      <Chip icon={<PersonIcon />} size="small" color="primary" label={device.assignedUser.fullName} />
                    ) : (
                      <Chip size="small" label="Nealocat" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Editeaza">
                        <IconButton size="small" onClick={() => handleOpenEdit(device)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sterge">
                        <IconButton size="small" color="error" onClick={() => setConfirmDelete(device)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add / Edit dialog */}
      <FriendlyDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        icon={<DeviceIcon />}
        variant="info"
        title={editingId ? 'Editeaza dispozitivul' : 'Adauga dispozitiv'}
        maxWidth="sm"
        actions={
          <>
            <Button onClick={() => setDialogOpen(false)}>Anuleaza</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={creating || updating}
              startIcon={(creating || updating) ? <CircularProgress size={18} /> : undefined}
            >
              {editingId ? 'Salveaza' : 'Adauga'}
            </Button>
          </>
        }
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            select
            label="Tip dispozitiv"
            value={DEVICE_TYPE_OPTIONS.includes(form.deviceType) || !form.deviceType ? form.deviceType : '__custom'}
            onChange={(e) => {
              const v = e.target.value;
              setForm((prev) => ({ ...prev, deviceType: v === '__custom' ? '' : v }));
            }}
            required
            fullWidth
          >
            {DEVICE_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>
          {!DEVICE_TYPE_OPTIONS.includes(form.deviceType) && (
            <TextField
              label="Specifica tipul dispozitivului"
              value={form.deviceType}
              onChange={handleChange('deviceType')}
              required
              fullWidth
            />
          )}
          <TextField label="Model" value={form.model} onChange={handleChange('model')} required fullWidth />
          <TextField label="Serie / IMEI" value={form.serialImei ?? ''} onChange={handleChange('serialImei')} fullWidth />
          <TextField label="Operator SIM" value={form.simOperator ?? ''} onChange={handleChange('simOperator')} fullWidth />
          <TextField label="Serie SIM" value={form.simSerial ?? ''} onChange={handleChange('simSerial')} fullWidth />
          <TextField
            select
            label="Atribuit user"
            value={form.assignedUserId ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, assignedUserId: e.target.value || null }))}
            fullWidth
          >
            <MenuItem value="">Nealocat</MenuItem>
            {sortedUsers.map((u) => (
              <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Observatii"
            value={form.notes ?? ''}
            onChange={handleChange('notes')}
            multiline
            rows={2}
            fullWidth
          />
        </Stack>
      </FriendlyDialog>

      {/* Delete confirmation */}
      <FriendlyDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        icon={<DeleteIcon />}
        variant="error"
        title="Sterge dispozitivul"
        onConfirm={handleDelete}
        confirmText={deleting ? 'Se sterge...' : 'Sterge'}
        cancelText="Anuleaza"
      >
        <Typography>
          Esti sigur ca vrei sa stergi {confirmDelete?.deviceType} {confirmDelete?.model}? Aceasta actiune este ireversibila.
        </Typography>
      </FriendlyDialog>
    </Box>
  );
};

export default memo(MobileDevicesPage);
