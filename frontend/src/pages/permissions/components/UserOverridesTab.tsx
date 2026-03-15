import { useState, useMemo, useCallback, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Autocomplete,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Button,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Save as SaveIcon,
  PersonSearch as PersonSearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useGetUsersQuery } from '../../../store/api/users.api';
import {
  useGetEffectivePermissionsQuery,
  useGetUserOverridesQuery,
  useSetUserOverridesMutation,
} from '../../../store/api/permissions.api';
import {
  RESOURCE_DEFINITIONS,
  ACTION_LABELS,
  SECTIONS,
  TASK_TYPE_DEFINITIONS,
  TASK_TYPE_RESOURCE_MAP,
} from '../../../constants/permissions';
import { getRoleLabel } from '../../../utils/roleHelpers';
import { removeDiacritics } from '../../../utils/removeDiacritics';
import UserFlowParticipation from './UserFlowParticipation';
import type { OverrideItem } from '../../../types/permission.types';

interface UserOption {
  id: string;
  fullName: string;
  role: string;
  department?: { id: string; name: string } | null;
}

const getRoleColor = (role: string) => {
  switch (role) {
    case 'MASTER_ADMIN': return 'secondary';
    case 'ADMIN': return 'error';
    case 'MANAGER': return 'warning';
    case 'USER': return 'info';
    default: return 'default';
  }
};

const UserOverridesTab = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: users, isLoading: usersLoading } = useGetUsersQuery();
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Principal: true,
    Operatiuni: true,
    Administrare: true,
    Parcari: true,
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data: effective, isLoading: effectiveLoading } = useGetEffectivePermissionsQuery(
    selectedUser?.id || '',
    { skip: !selectedUser },
  );
  const { data: overrides, isLoading: overridesLoading } = useGetUserOverridesQuery(
    selectedUser?.id || '',
    { skip: !selectedUser },
  );
  const [setUserOverrides, { isLoading: isSaving }] = useSetUserOverridesMutation();

  const overrideMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (overrides) {
      for (const o of overrides) {
        map[`${o.resourceKey}:${o.action}`] = o.allowed;
      }
    }
    return map;
  }, [overrides]);

  const getEffectiveValue = useCallback(
    (resourceKey: string, action: string): boolean => {
      const key = `${resourceKey}:${action}`;
      if (localOverrides[key] !== undefined) return localOverrides[key];
      if (effective?.permissions?.[key] !== undefined) return effective.permissions[key];
      return false;
    },
    [effective, localOverrides],
  );

  const isOverridden = useCallback(
    (resourceKey: string, action: string): boolean => {
      const key = `${resourceKey}:${action}`;
      return localOverrides[key] !== undefined || overrideMap[key] !== undefined;
    },
    [overrideMap, localOverrides],
  );

  const hasLocalChanges = Object.keys(localOverrides).length > 0;

  const handleToggle = (resourceKey: string, action: string) => {
    const key = `${resourceKey}:${action}`;
    const currentValue = getEffectiveValue(resourceKey, action);
    setLocalOverrides((prev) => ({ ...prev, [key]: !currentValue }));
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    // Merge existing overrides with local changes
    const mergedOverrides: Record<string, boolean> = { ...overrideMap, ...localOverrides };

    const overrideItems: OverrideItem[] = Object.entries(mergedOverrides).map(([key, allowed]) => {
      const [resourceKey, action] = key.split(':');
      return { resourceKey, action, allowed };
    });

    try {
      await setUserOverrides({ userId: selectedUser.id, overrides: overrideItems }).unwrap();
      setLocalOverrides({});
      setSnackbar({ open: true, message: 'Override-urile au fost salvate!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Eroare la salvare.', severity: 'error' });
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const userOptions: UserOption[] = useMemo(
    () =>
      (users || [])
        .filter((u) => u.isActive)
        .map((u) => ({
          id: u.id,
          fullName: removeDiacritics(u.fullName),
          role: u.role,
          department: u.department
            ? { id: u.department.id, name: removeDiacritics(u.department.name) }
            : null,
        })),
    [users],
  );

  const resourcesBySection = useMemo(() => {
    const grouped: Record<string, typeof RESOURCE_DEFINITIONS> = {};
    for (const section of SECTIONS) {
      grouped[section] = RESOURCE_DEFINITIONS.filter((r) => r.section === section);
    }
    return grouped;
  }, []);

  const isDataLoading = effectiveLoading || overridesLoading;

  // Quick grant dialog state
  const [grantDialog, setGrantDialog] = useState(false);
  const [grantTaskType, setGrantTaskType] = useState('');
  const [grantActions, setGrantActions] = useState<Record<string, boolean>>({
    view: true,
    create: false,
    edit: false,
    resolve: false,
  });

  const availableActionsForGrant = useMemo(() => {
    if (!grantTaskType) return [];
    const resourceKeys = TASK_TYPE_RESOURCE_MAP[grantTaskType] || [];
    const actionsSet = new Set<string>();
    for (const rk of resourceKeys) {
      const resDef = RESOURCE_DEFINITIONS.find((r) => r.key === rk);
      if (resDef) resDef.actions.forEach((a) => actionsSet.add(a));
    }
    return Array.from(actionsSet);
  }, [grantTaskType]);

  const handleGrantAccess = async () => {
    if (!selectedUser || !grantTaskType) return;
    const resourceKeys = TASK_TYPE_RESOURCE_MAP[grantTaskType] || [];
    const newOverrides: Record<string, boolean> = {};

    for (const rk of resourceKeys) {
      const resDef = RESOURCE_DEFINITIONS.find((r) => r.key === rk);
      if (!resDef) continue;
      for (const action of resDef.actions) {
        if (grantActions[action]) {
          newOverrides[`${rk}:${action}`] = true;
        }
      }
    }

    // Merge with existing overrides + local overrides
    const mergedOverrides: Record<string, boolean> = { ...overrideMap, ...localOverrides, ...newOverrides };

    const overrideItems: OverrideItem[] = Object.entries(mergedOverrides).map(([key, allowed]) => {
      const [resourceKey, action] = key.split(':');
      return { resourceKey, action, allowed };
    });

    try {
      await setUserOverrides({ userId: selectedUser.id, overrides: overrideItems }).unwrap();
      setLocalOverrides({});
      setGrantDialog(false);
      setGrantTaskType('');
      setGrantActions({ view: true, create: false, edit: false, resolve: false });
      setSnackbar({ open: true, message: 'Accesul a fost acordat cu succes!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Eroare la acordarea accesului.', severity: 'error' });
    }
  };

  return (
    <Box>
      {/* User selector */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <PersonSearchIcon color="primary" />
          <Typography variant="subtitle1" fontWeight="bold">
            Selecteaza Utilizator
          </Typography>
        </Box>
        <Autocomplete
          options={userOptions}
          getOptionLabel={(opt) => opt.fullName}
          value={selectedUser}
          onChange={(_e, value) => {
            setSelectedUser(value);
            setLocalOverrides({});
          }}
          loading={usersLoading}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Cauta utilizator..."
              size="small"
            />
          )}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2">{option.fullName}</Typography>
                <Chip
                  label={getRoleLabel(option.role)}
                  size="small"
                  color={getRoleColor(option.role) as any}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
                {option.department && (
                  <Typography variant="caption" color="text.secondary">
                    ({option.department.name})
                  </Typography>
                )}
              </Box>
            </li>
          )}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
        />
      </Paper>

      {/* User info */}
      {selectedUser && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body1" fontWeight="bold">
              {selectedUser.fullName}
            </Typography>
            <Chip
              label={getRoleLabel(selectedUser.role)}
              size="small"
              color={getRoleColor(selectedUser.role) as any}
            />
            {selectedUser.department && (
              <Chip
                label={selectedUser.department.name}
                size="small"
                variant="outlined"
              />
            )}
            {hasLocalChanges && (
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={isSaving}
                size="small"
                sx={{ ml: 'auto' }}
              >
                {isSaving ? 'Se salveaza...' : `Salveaza Override-uri (${Object.keys(localOverrides).length})`}
              </Button>
            )}
          </Box>
        </Paper>
      )}

      {/* Flow Participation */}
      {selectedUser && (
        <UserFlowParticipation
          user={{
            id: selectedUser.id,
            fullName: selectedUser.fullName,
            role: selectedUser.role,
            department: selectedUser.department,
          }}
          onGrantAccess={() => setGrantDialog(true)}
        />
      )}

      {/* Loading */}
      {selectedUser && isDataLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* No user selected */}
      {!selectedUser && (
        <Alert severity="info">
          Selecteaza un utilizator pentru a vedea si modifica permisiunile individuale.
        </Alert>
      )}

      {/* Permission table */}
      {selectedUser && effective && !isDataLoading && (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 400px)', overflowX: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 200, backgroundColor: 'background.paper' }}>
                  Resursa
                </TableCell>
                {Object.keys(ACTION_LABELS).map((action) => (
                  <TableCell
                    key={action}
                    sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: 80, backgroundColor: 'background.paper' }}
                  >
                    <Typography variant="caption" fontWeight="bold">
                      {ACTION_LABELS[action]}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {SECTIONS.map((section) => {
                const resources = resourcesBySection[section] || [];
                if (resources.length === 0) return null;
                const isOpen = openSections[section] !== false;

                return [
                  <TableRow
                    key={`section-${section}`}
                    sx={{ backgroundColor: 'action.hover', cursor: 'pointer' }}
                    onClick={() => toggleSection(section)}
                  >
                    <TableCell colSpan={1 + Object.keys(ACTION_LABELS).length}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size="small">
                          {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                        <Typography variant="subtitle2" fontWeight="bold" color="primary">
                          {section}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>,
                  ...resources.map((resource) => (
                    <TableRow
                      key={resource.key}
                      sx={{
                        display: isOpen ? 'table-row' : 'none',
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>{resource.label}</TableCell>
                      {Object.keys(ACTION_LABELS).map((action) => {
                        const hasAction = resource.actions.includes(action);
                        if (!hasAction) {
                          return (
                            <TableCell key={action} sx={{ textAlign: 'center' }}>
                              <Typography variant="caption" color="text.disabled">-</Typography>
                            </TableCell>
                          );
                        }

                        const allowed = getEffectiveValue(resource.key, action);
                        const overridden = isOverridden(resource.key, action);
                        const hasLocalChange = localOverrides[`${resource.key}:${action}`] !== undefined;

                        return (
                          <TableCell
                            key={action}
                            sx={{
                              textAlign: 'center',
                              py: 0.25,
                              backgroundColor: overridden
                                ? allowed
                                  ? 'rgba(76, 175, 80, 0.12)'
                                  : 'rgba(244, 67, 54, 0.12)'
                                : 'transparent',
                              border: hasLocalChange ? '2px solid' : undefined,
                              borderColor: hasLocalChange
                                ? allowed
                                  ? 'success.main'
                                  : 'error.main'
                                : undefined,
                            }}
                          >
                            <Tooltip
                              title={
                                overridden
                                  ? `Override: ${allowed ? 'Permis' : 'Interzis'}${hasLocalChange ? ' (nesalvat)' : ''}`
                                  : `Default (${selectedUser.role}): ${allowed ? 'Permis' : 'Interzis'}`
                              }
                              arrow
                            >
                              <Checkbox
                                checked={allowed}
                                onChange={() => handleToggle(resource.key, action)}
                                size="small"
                                sx={{
                                  p: 0.5,
                                  color: allowed ? '#4caf50' : 'rgba(0,0,0,0.26)',
                                  '&.Mui-checked': { color: '#4caf50' },
                                }}
                              />
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  )),
                ];
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Legend */}
      {selectedUser && effective && !isDataLoading && (
        <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(76, 175, 80, 0.12)', border: '1px solid #4caf50', borderRadius: 0.5 }} />
            <Typography variant="caption">Override permis</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(244, 67, 54, 0.12)', border: '1px solid #f44336', borderRadius: 0.5 }} />
            <Typography variant="caption">Override interzis</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: 'transparent', border: '1px solid grey', borderRadius: 0.5 }} />
            <Typography variant="caption">Default (din rol)</Typography>
          </Box>
        </Box>
      )}

      {/* Grant Access Dialog */}
      <Dialog open={grantDialog} onClose={() => setGrantDialog(false)} maxWidth="xs" fullWidth fullScreen={isMobile}>
        <DialogTitle>Adauga Acces la Flux</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tip Task</InputLabel>
              <Select
                value={grantTaskType}
                label="Tip Task"
                onChange={(e) => {
                  setGrantTaskType(e.target.value);
                  setGrantActions({ view: true, create: false, edit: false, resolve: false });
                }}
              >
                {TASK_TYPE_DEFINITIONS.map((t) => (
                  <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {grantTaskType && (
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                  Actiuni:
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Resurse asociate: {(TASK_TYPE_RESOURCE_MAP[grantTaskType] || []).map((rk) => {
                    const rd = RESOURCE_DEFINITIONS.find((r) => r.key === rk);
                    return rd?.label || rk;
                  }).join(', ')}
                </Typography>
                {availableActionsForGrant.map((action) => (
                  <FormControlLabel
                    key={action}
                    control={
                      <Checkbox
                        checked={grantActions[action] || false}
                        onChange={(e) =>
                          setGrantActions((prev) => ({ ...prev, [action]: e.target.checked }))
                        }
                        size="small"
                      />
                    }
                    label={ACTION_LABELS[action] || action}
                  />
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrantDialog(false)}>Anuleaza</Button>
          <Button
            variant="contained"
            onClick={handleGrantAccess}
            disabled={!grantTaskType || !Object.values(grantActions).some(Boolean)}
          >
            Acorda Acces
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

export default memo(UserOverridesTab);
