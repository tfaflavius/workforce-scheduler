import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Switch,
  FormControlLabel,
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
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Tooltip,
  Checkbox,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  ArrowForward as ArrowIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import {
  useGetTaskFlowsQuery,
  useUpdateTaskFlowMutation,
  useCreateTaskFlowMutation,
  useDeleteTaskFlowMutation,
} from '../../../store/api/permissions.api';
import { useGetDepartmentsQuery } from '../../../store/api/departmentsApi';
import { TASK_TYPE_LABELS, TASK_TYPE_DEFINITIONS } from '../../../constants/permissions';
import { removeDiacritics } from '../../../utils/removeDiacritics';
import type { TaskFlowRule, CreateTaskFlowRequest } from '../../../types/permission.types';

const ROLES = [
  { key: 'ADMIN', label: 'Admin' },
  { key: 'MANAGER', label: 'Manager' },
  { key: 'USER', label: 'Utilizator' },
];

const getRoleColor = (role: string | null) => {
  switch (role) {
    case 'ADMIN': return 'error';
    case 'MANAGER': return 'warning';
    case 'USER': return 'info';
    default: return 'default';
  }
};

interface FlowStepProps {
  label: string;
  role: string | null;
  department?: { id: string; name: string } | null;
}

const FlowStep = ({ label, role, department }: FlowStepProps) => (
  <Box
    sx={{
      textAlign: 'center',
      p: 1.5,
      borderRadius: 2,
      border: '2px solid',
      borderColor: role === 'ADMIN' ? 'error.main' : role === 'MANAGER' ? 'warning.main' : role === 'USER' ? 'info.main' : 'grey.400',
      backgroundColor: role === 'ADMIN' ? 'error.50' : role === 'MANAGER' ? 'warning.50' : role === 'USER' ? 'info.50' : 'grey.50',
      minWidth: 120,
      flex: 1,
    }}
  >
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
      {label}
    </Typography>
    {role ? (
      <Chip
        icon={<PersonIcon sx={{ fontSize: 16 }} />}
        label={ROLES.find((r) => r.key === role)?.label || role}
        size="small"
        color={getRoleColor(role) as any}
        sx={{ mb: 0.5 }}
      />
    ) : (
      <Chip label="Oricine" size="small" variant="outlined" sx={{ mb: 0.5 }} />
    )}
    {department && (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
        <BusinessIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary">
          {removeDiacritics(department.name)}
        </Typography>
      </Box>
    )}
  </Box>
);

const emptyForm: CreateTaskFlowRequest = {
  taskType: '',
  creatorRole: null,
  creatorDepartmentId: null,
  receiverRole: null,
  receiverDepartmentId: null,
  resolverRole: null,
  resolverDepartmentId: null,
  autoAssign: false,
  isActive: true,
};

const TaskFlowsTab = () => {
  const { data: flows, isLoading } = useGetTaskFlowsQuery();
  const { data: departments } = useGetDepartmentsQuery();
  const [updateFlow] = useUpdateTaskFlowMutation();
  const [createFlow] = useCreateTaskFlowMutation();
  const [deleteFlow] = useDeleteTaskFlowMutation();

  const [editDialog, setEditDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateTaskFlowRequest>(emptyForm);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleEdit = (flow: TaskFlowRule) => {
    setEditingId(flow.id);
    setForm({
      taskType: flow.taskType,
      creatorRole: flow.creatorRole,
      creatorDepartmentId: flow.creatorDepartmentId,
      receiverRole: flow.receiverRole,
      receiverDepartmentId: flow.receiverDepartmentId,
      resolverRole: flow.resolverRole,
      resolverDepartmentId: flow.resolverDepartmentId,
      autoAssign: flow.autoAssign,
      isActive: flow.isActive,
    });
    setEditDialog(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEditDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateFlow({ id: editingId, data: form }).unwrap();
        setSnackbar({ open: true, message: 'Regula actualizata cu succes!', severity: 'success' });
      } else {
        await createFlow(form).unwrap();
        setSnackbar({ open: true, message: 'Regula creata cu succes!', severity: 'success' });
      }
      setEditDialog(false);
    } catch {
      setSnackbar({ open: true, message: 'Eroare la salvare.', severity: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFlow(id).unwrap();
      setSnackbar({ open: true, message: 'Regula stearsa.', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Eroare la stergere.', severity: 'error' });
    }
  };

  const handleToggleActive = async (flow: TaskFlowRule) => {
    try {
      await updateFlow({ id: flow.id, data: { isActive: !flow.isActive } }).unwrap();
    } catch {
      setSnackbar({ open: true, message: 'Eroare la actualizare.', severity: 'error' });
    }
  };

  const handleToggleAutoAssign = async (flow: TaskFlowRule) => {
    try {
      await updateFlow({ id: flow.id, data: { autoAssign: !flow.autoAssign } }).unwrap();
    } catch {
      setSnackbar({ open: true, message: 'Eroare la actualizare.', severity: 'error' });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          Fluxuri Task-uri
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd} size="small">
          Adauga Regula
        </Button>
      </Box>

      {(!flows || flows.length === 0) && (
        <Alert severity="info">
          Nu exista reguli de flux. Populeaza defaults din tab-ul "Matrice Permisiuni" sau adauga manual.
        </Alert>
      )}

      {/* Flow Cards */}
      <Grid container spacing={2}>
        {flows?.map((flow) => (
          <Grid item xs={12} md={6} key={flow.id}>
            <Card
              variant="outlined"
              sx={{
                opacity: flow.isActive ? 1 : 0.6,
                borderColor: flow.isActive ? 'divider' : 'grey.300',
              }}
            >
              <CardContent sx={{ pb: 1, '&:last-child': { pb: 2 } }}>
                {/* Title row */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {TASK_TYPE_LABELS[flow.taskType] || flow.taskType}
                    </Typography>
                    {!flow.isActive && (
                      <Chip label="Inactiv" size="small" color="default" variant="outlined" />
                    )}
                  </Box>
                  <Box>
                    <Tooltip title="Editeaza">
                      <IconButton size="small" onClick={() => handleEdit(flow)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sterge">
                      <IconButton size="small" color="error" onClick={() => handleDelete(flow.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Flow visualization */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <FlowStep label="Creaza" role={flow.creatorRole} department={flow.creatorDepartment} />
                  <ArrowIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
                  <FlowStep label="Primeste" role={flow.receiverRole} department={flow.receiverDepartment} />
                  <ArrowIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
                  <FlowStep label="Rezolva" role={flow.resolverRole} department={flow.resolverDepartment} />
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* Toggles */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={flow.autoAssign}
                        onChange={() => handleToggleAutoAssign(flow)}
                        size="small"
                      />
                    }
                    label={<Typography variant="caption">Auto-assign</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={flow.isActive}
                        onChange={() => handleToggleActive(flow)}
                        size="small"
                        color="success"
                      />
                    }
                    label={<Typography variant="caption">Activ</Typography>}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Editeaza Regula' : 'Adauga Regula Noua'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tip Task</InputLabel>
              <Select
                value={form.taskType}
                label="Tip Task"
                onChange={(e) => setForm((f) => ({ ...f, taskType: e.target.value }))}
              >
                {TASK_TYPE_DEFINITIONS.map((t) => (
                  <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider><Typography variant="caption">Creator</Typography></Divider>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Rol Creator</InputLabel>
                <Select
                  value={form.creatorRole || ''}
                  label="Rol Creator"
                  onChange={(e) => setForm((f) => ({ ...f, creatorRole: (e.target.value || null) as any }))}
                >
                  <MenuItem value="">Oricine</MenuItem>
                  {ROLES.map((r) => (
                    <MenuItem key={r.key} value={r.key}>{r.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Departament Creator</InputLabel>
                <Select
                  value={form.creatorDepartmentId || ''}
                  label="Departament Creator"
                  onChange={(e) => setForm((f) => ({ ...f, creatorDepartmentId: e.target.value || null }))}
                >
                  <MenuItem value="">Oricare</MenuItem>
                  {departments?.map((d) => (
                    <MenuItem key={d.id} value={d.id}>{removeDiacritics(d.name)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Divider><Typography variant="caption">Receptor</Typography></Divider>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Rol Receptor</InputLabel>
                <Select
                  value={form.receiverRole || ''}
                  label="Rol Receptor"
                  onChange={(e) => setForm((f) => ({ ...f, receiverRole: (e.target.value || null) as any }))}
                >
                  <MenuItem value="">Oricine</MenuItem>
                  {ROLES.map((r) => (
                    <MenuItem key={r.key} value={r.key}>{r.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Departament Receptor</InputLabel>
                <Select
                  value={form.receiverDepartmentId || ''}
                  label="Departament Receptor"
                  onChange={(e) => setForm((f) => ({ ...f, receiverDepartmentId: e.target.value || null }))}
                >
                  <MenuItem value="">Oricare</MenuItem>
                  {departments?.map((d) => (
                    <MenuItem key={d.id} value={d.id}>{removeDiacritics(d.name)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Divider><Typography variant="caption">Rezolvator</Typography></Divider>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Rol Rezolvator</InputLabel>
                <Select
                  value={form.resolverRole || ''}
                  label="Rol Rezolvator"
                  onChange={(e) => setForm((f) => ({ ...f, resolverRole: (e.target.value || null) as any }))}
                >
                  <MenuItem value="">Oricine</MenuItem>
                  {ROLES.map((r) => (
                    <MenuItem key={r.key} value={r.key}>{r.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Departament Rezolvator</InputLabel>
                <Select
                  value={form.resolverDepartmentId || ''}
                  label="Departament Rezolvator"
                  onChange={(e) => setForm((f) => ({ ...f, resolverDepartmentId: e.target.value || null }))}
                >
                  <MenuItem value="">Oricare</MenuItem>
                  {departments?.map((d) => (
                    <MenuItem key={d.id} value={d.id}>{removeDiacritics(d.name)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.autoAssign || false}
                    onChange={(e) => setForm((f) => ({ ...f, autoAssign: e.target.checked }))}
                    size="small"
                  />
                }
                label="Auto-assign"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.isActive !== false}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    size="small"
                  />
                }
                label="Activ"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Anuleaza</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.taskType}>
            {editingId ? 'Salveaza' : 'Adauga'}
          </Button>
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

export default TaskFlowsTab;
