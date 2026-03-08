import { useState, useMemo, useCallback } from 'react';
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
  Divider,
  Tooltip,
  IconButton,
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
} from '../../../constants/permissions';
import { removeDiacritics } from '../../../utils/removeDiacritics';
import type { OverrideItem } from '../../../types/permission.types';

interface UserOption {
  id: string;
  fullName: string;
  role: string;
  department?: { id: string; name: string } | null;
}

const getRoleColor = (role: string) => {
  switch (role) {
    case 'ADMIN': return 'error';
    case 'MANAGER': return 'warning';
    case 'USER': return 'info';
    default: return 'default';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'ADMIN': return 'Admin';
    case 'MANAGER': return 'Manager';
    case 'USER': return 'Utilizator';
    default: return role;
  }
};

const UserOverridesTab = () => {
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
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 400px)' }}>
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

export default UserOverridesTab;
