import { useState, useMemo, memo } from 'react';
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
  TextField,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  NotificationsActive as ImmediateIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import {
  useGetEmailRulesQuery,
  useCreateEmailRuleMutation,
  useUpdateEmailRuleMutation,
  useDeleteEmailRuleMutation,
} from '../../../store/api/permissions.api';
import { useGetDepartmentsQuery } from '../../../store/api/departmentsApi';
import {
  EMAIL_EVENT_TYPES,
  EMAIL_EVENT_TYPE_LABELS,
  EMAIL_EVENT_ACTIONS,
  EMAIL_EVENT_ACTION_LABELS,
  EMAIL_RECIPIENT_TYPES,
  EMAIL_EVENT_TYPE_COLORS,
} from '../../../constants/permissions';
import { getRoleLabel } from '../../../utils/roleHelpers';
import { removeDiacritics } from '../../../utils/removeDiacritics';
import type { EmailNotificationRule, CreateEmailRuleRequest } from '../../../types/permission.types';

const ROLES = [
  { key: 'MASTER_ADMIN', label: 'Master Admin' },
  { key: 'ADMIN', label: 'Admin' },
  { key: 'MANAGER', label: 'Manager' },
  { key: 'USER', label: 'Utilizator' },
];

const getRecipientLabel = (rule: EmailNotificationRule) => {
  switch (rule.recipientType) {
    case 'ROLE':
      return getRoleLabel(rule.recipientRole);
    case 'DEPARTMENT':
      return rule.recipientDepartment ? removeDiacritics(rule.recipientDepartment.name) : 'Departament';
    case 'CREATOR':
      return 'Creatorul';
    case 'ASSIGNED':
      return 'Angajatul Asignat';
    case 'ADMIN_ALL':
      return 'Toti Adminii';
    case 'MANAGER_ALL':
      return 'Toti Managerii';
    default:
      return rule.recipientType;
  }
};

const getRecipientIcon = (recipientType: string) => {
  switch (recipientType) {
    case 'DEPARTMENT':
      return <BusinessIcon sx={{ fontSize: 16 }} />;
    default:
      return <PersonIcon sx={{ fontSize: 16 }} />;
  }
};

const emptyForm: CreateEmailRuleRequest = {
  eventType: '',
  eventAction: '',
  recipientType: 'ROLE',
  recipientRole: null,
  recipientDepartmentId: null,
  description: '',
  sendImmediate: true,
  cronSchedule: null,
  isActive: true,
};

const EmailNotificationRulesTab = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: rules, isLoading } = useGetEmailRulesQuery();
  const { data: departments } = useGetDepartmentsQuery();
  const [createRule] = useCreateEmailRuleMutation();
  const [updateRule] = useUpdateEmailRuleMutation();
  const [deleteRule] = useDeleteEmailRuleMutation();

  const [editDialog, setEditDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEmailRuleRequest>(emptyForm);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Group rules by event type
  const rulesByEventType = useMemo(() => {
    if (!rules) return {};
    const grouped: Record<string, EmailNotificationRule[]> = {};
    for (const rule of rules) {
      if (!grouped[rule.eventType]) grouped[rule.eventType] = [];
      grouped[rule.eventType].push(rule);
    }
    return grouped;
  }, [rules]);

  const handleEdit = (rule: EmailNotificationRule) => {
    setEditingId(rule.id);
    setForm({
      eventType: rule.eventType,
      eventAction: rule.eventAction,
      recipientType: rule.recipientType,
      recipientRole: rule.recipientRole,
      recipientDepartmentId: rule.recipientDepartmentId,
      description: rule.description,
      sendImmediate: rule.sendImmediate,
      cronSchedule: rule.cronSchedule,
      isActive: rule.isActive,
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
        await updateRule({ id: editingId, data: form }).unwrap();
        setSnackbar({ open: true, message: 'Regula actualizata cu succes!', severity: 'success' });
      } else {
        await createRule(form).unwrap();
        setSnackbar({ open: true, message: 'Regula creata cu succes!', severity: 'success' });
      }
      setEditDialog(false);
    } catch {
      setSnackbar({ open: true, message: 'Eroare la salvare.', severity: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRule(id).unwrap();
      setSnackbar({ open: true, message: 'Regula stearsa.', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Eroare la stergere.', severity: 'error' });
    }
  };

  const handleToggleActive = async (rule: EmailNotificationRule) => {
    try {
      await updateRule({ id: rule.id, data: { isActive: !rule.isActive } }).unwrap();
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

  const renderRuleCard = (rule: EmailNotificationRule) => (
    <Card
      key={rule.id}
      variant="outlined"
      sx={{
        opacity: rule.isActive ? 1 : 0.5,
        borderColor: rule.isActive ? 'divider' : 'grey.300',
        mb: 1.5,
      }}
    >
      <CardContent sx={{ pb: 1, '&:last-child': { pb: 1.5 }, py: 1.5 }}>
        {/* Top row: action + recipient + controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Flow visualization: Event Action → Recipient */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
              <Chip
                label={EMAIL_EVENT_ACTION_LABELS[rule.eventAction] || rule.eventAction}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: '0.75rem' }}
              />
              <ArrowIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              <Chip
                icon={getRecipientIcon(rule.recipientType)}
                label={getRecipientLabel(rule)}
                size="small"
                color={rule.recipientType === 'DEPARTMENT' ? 'info' : rule.recipientType === 'ADMIN_ALL' ? 'error' : rule.recipientType === 'MANAGER_ALL' ? 'warning' : 'default'}
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: '0.75rem' }}
              />
              {rule.sendImmediate ? (
                <Chip
                  icon={<ImmediateIcon sx={{ fontSize: 14 }} />}
                  label="Imediat"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 22 }}
                />
              ) : (
                <Chip
                  icon={<ScheduleIcon sx={{ fontSize: 14 }} />}
                  label={rule.cronSchedule || 'Programat'}
                  size="small"
                  color="secondary"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 22 }}
                />
              )}
              {!rule.isActive && <Chip label="Inactiv" size="small" color="default" variant="outlined" sx={{ fontSize: '0.65rem', height: 22 }} />}
            </Box>

            {/* Description */}
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 0.5 }}>
              {rule.description}
            </Typography>
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
            <Tooltip title={rule.isActive ? 'Dezactiveaza' : 'Activeaza'}>
              <Switch
                checked={rule.isActive}
                onChange={() => handleToggleActive(rule)}
                size="small"
                color="success"
              />
            </Tooltip>
            <Tooltip title="Editeaza">
              <IconButton size="small" onClick={() => handleEdit(rule)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Sterge">
              <IconButton size="small" color="error" onClick={() => handleDelete(rule.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Fluxuri Email Notificari
          </Typography>
          {rules && (
            <Chip
              label={`${rules.filter((r) => r.isActive).length} active / ${rules.length} total`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd} size="small">
          Adauga Regula
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Configureaza cine primeste email-uri, pentru ce evenimente si cand. Fiecare regula defineste un flux de notificare.
      </Alert>

      {(!rules || rules.length === 0) && (
        <Alert severity="warning">
          Nu exista reguli de email. Populeaza defaults din tab-ul "Matrice Permisiuni" (butonul Seed Defaults) sau adauga manual.
        </Alert>
      )}

      {/* Rules grouped by event type */}
      {rules && rules.length > 0 && Object.entries(rulesByEventType).map(([eventType, typeRules]) => (
        <Box key={eventType} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              label={EMAIL_EVENT_TYPE_LABELS[eventType] || eventType}
              size="small"
              color={EMAIL_EVENT_TYPE_COLORS[eventType] || 'default'}
              sx={{ fontWeight: 700, fontSize: '0.8rem' }}
            />
            <Chip
              label={`${typeRules.filter((r) => r.isActive).length} activ${typeRules.filter((r) => r.isActive).length !== 1 ? 'e' : ''}`}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          </Box>
          {typeRules.map((rule) => renderRuleCard(rule))}
        </Box>
      ))}

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{editingId ? 'Editeaza Regula Email' : 'Adauga Regula Email Noua'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Event Type */}
            <FormControl fullWidth size="small">
              <InputLabel>Tip Eveniment</InputLabel>
              <Select
                value={form.eventType}
                label="Tip Eveniment"
                onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}
              >
                {EMAIL_EVENT_TYPES.map((t) => (
                  <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Event Action */}
            <FormControl fullWidth size="small">
              <InputLabel>Actiune</InputLabel>
              <Select
                value={form.eventAction}
                label="Actiune"
                onChange={(e) => setForm((f) => ({ ...f, eventAction: e.target.value }))}
              >
                {EMAIL_EVENT_ACTIONS.map((a) => (
                  <MenuItem key={a.key} value={a.key}>{a.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider><Typography variant="caption">Destinatar</Typography></Divider>

            {/* Recipient Type */}
            <FormControl fullWidth size="small">
              <InputLabel>Tip Destinatar</InputLabel>
              <Select
                value={form.recipientType}
                label="Tip Destinatar"
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    recipientType: e.target.value,
                    recipientRole: null,
                    recipientDepartmentId: null,
                  }))
                }
              >
                {EMAIL_RECIPIENT_TYPES.map((r) => (
                  <MenuItem key={r.key} value={r.key}>{r.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Conditional: Role selector */}
            {form.recipientType === 'ROLE' && (
              <FormControl fullWidth size="small">
                <InputLabel>Rol</InputLabel>
                <Select
                  value={form.recipientRole || ''}
                  label="Rol"
                  onChange={(e) => setForm((f) => ({ ...f, recipientRole: e.target.value || null }))}
                >
                  {ROLES.map((r) => (
                    <MenuItem key={r.key} value={r.key}>{r.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Conditional: Department selector */}
            {form.recipientType === 'DEPARTMENT' && (
              <FormControl fullWidth size="small">
                <InputLabel>Departament</InputLabel>
                <Select
                  value={form.recipientDepartmentId || ''}
                  label="Departament"
                  onChange={(e) => setForm((f) => ({ ...f, recipientDepartmentId: e.target.value || null }))}
                >
                  {departments?.map((d) => (
                    <MenuItem key={d.id} value={d.id}>{removeDiacritics(d.name)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Divider><Typography variant="caption">Programare</Typography></Divider>

            {/* Send Immediate toggle */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.sendImmediate !== false}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sendImmediate: e.target.checked,
                      cronSchedule: e.target.checked ? null : f.cronSchedule,
                    }))
                  }
                  size="small"
                />
              }
              label="Trimite imediat"
            />

            {/* Cron Schedule (only if not immediate) */}
            {!form.sendImmediate && (
              <TextField
                label="Program (ex: 08:00 L-V, Vineri 20:30)"
                value={form.cronSchedule || ''}
                onChange={(e) => setForm((f) => ({ ...f, cronSchedule: e.target.value || null }))}
                size="small"
                fullWidth
                placeholder="08:00 L-V"
              />
            )}

            <Divider><Typography variant="caption">Descriere</Typography></Divider>

            {/* Description */}
            <TextField
              label="Descriere (limba romana)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              size="small"
              fullWidth
              multiline
              rows={2}
              placeholder="Ex: Trimite notificare la creare problema noua"
            />

            {/* Active */}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Anuleaza</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.eventType || !form.eventAction || !form.description}
          >
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

export default memo(EmailNotificationRulesTab);
