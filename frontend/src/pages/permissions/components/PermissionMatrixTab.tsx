import { useState, useCallback, useMemo, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
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
  alpha,
  useTheme,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import {
  useGetMatrixQuery,
  useBulkUpdateMutation,
  useSeedDefaultsMutation,
} from '../../../store/api/permissions.api';
import {
  RESOURCE_DEFINITIONS,
  ACTION_LABELS,
  SECTIONS,
  ROLES,
} from '../../../constants/permissions';
import type { BulkUpdateItem } from '../../../types/permission.types';

const PermissionMatrixTab = () => {
  const theme = useTheme();
  const { data: matrix, isLoading, refetch } = useGetMatrixQuery();
  const [bulkUpdate, { isLoading: isSaving }] = useBulkUpdateMutation();
  const [seedDefaults, { isLoading: isSeeding }] = useSeedDefaultsMutation();

  const [localChanges, setLocalChanges] = useState<Record<string, boolean>>({});
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

  const hasChanges = Object.keys(localChanges).length > 0;

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getPermission = useCallback(
    (resourceKey: string, action: string, role: string) => {
      if (!matrix) return null;
      return matrix[resourceKey]?.[action]?.[role]?.['null'] || null;
    },
    [matrix],
  );

  const isAllowed = useCallback(
    (resourceKey: string, action: string, role: string): boolean => {
      const perm = getPermission(resourceKey, action, role);
      if (!perm) return false;
      if (localChanges[perm.id] !== undefined) return localChanges[perm.id];
      return perm.allowed;
    },
    [getPermission, localChanges],
  );

  const handleToggle = useCallback(
    (resourceKey: string, action: string, role: string) => {
      const perm = getPermission(resourceKey, action, role);
      if (!perm) return;

      const currentValue = localChanges[perm.id] !== undefined ? localChanges[perm.id] : perm.allowed;
      const newValue = !currentValue;

      setLocalChanges((prev) => {
        const next = { ...prev };
        if (newValue === perm.allowed) {
          delete next[perm.id];
        } else {
          next[perm.id] = newValue;
        }
        return next;
      });
    },
    [getPermission, localChanges],
  );

  const handleSave = async () => {
    const updates: BulkUpdateItem[] = Object.entries(localChanges).map(([id, allowed]) => ({
      id,
      allowed,
    }));

    try {
      await bulkUpdate({ updates }).unwrap();
      setLocalChanges({});
      setSnackbar({ open: true, message: 'Permisiunile au fost salvate cu succes!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Eroare la salvarea permisiunilor.', severity: 'error' });
    }
  };

  const handleSeed = async () => {
    try {
      await seedDefaults().unwrap();
      setLocalChanges({});
      refetch();
      setSnackbar({ open: true, message: 'Permisiunile implicite au fost populate!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Eroare la popularea permisiunilor.', severity: 'error' });
    }
  };

  const resourcesBySection = useMemo(() => {
    const grouped: Record<string, typeof RESOURCE_DEFINITIONS> = {};
    for (const section of SECTIONS) {
      grouped[section] = RESOURCE_DEFINITIONS.filter((r) => r.section === section);
    }
    return grouped;
  }, []);

  const isEmpty = !matrix || Object.keys(matrix).length === 0;

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" fontWeight="bold">
          Matrice Permisiuni per Rol
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleSeed}
            disabled={isSeeding}
            size="small"
          >
            {isSeeding ? 'Se populeaza...' : 'Populeaza Defaults'}
          </Button>
          {hasChanges && (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={isSaving}
              size="small"
              color="primary"
            >
              {isSaving ? 'Se salveaza...' : `Salveaza (${Object.keys(localChanges).length})`}
            </Button>
          )}
        </Box>
      </Box>

      {isEmpty && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Nu exista permisiuni configurate. Apasa "Populeaza Defaults" pentru a initializa matricea cu valorile implicite.
        </Alert>
      )}

      {!isEmpty && (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: { xs: 'calc(100dvh - 200px)', lg: 'calc(100dvh - 200px)' }, overflowX: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', minWidth: { xs: 140, sm: 220 }, backgroundColor: 'background.paper' }}>
                  Resursa
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: { xs: 60, sm: 80 }, backgroundColor: 'background.paper', textAlign: 'center' }}>
                  Actiune
                </TableCell>
                {ROLES.map((role) => (
                  <TableCell
                    key={role.key}
                    sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: { xs: 70, sm: 100 }, backgroundColor: 'background.paper' }}
                  >
                    <Chip
                      label={role.label}
                      size="small"
                      color={role.key === 'MASTER_ADMIN' ? 'secondary' : role.key === 'ADMIN' ? 'error' : role.key === 'MANAGER' ? 'warning' : 'info'}
                      sx={{ fontWeight: 'bold' }}
                    />
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
                  // Section header row
                  <TableRow
                    key={`section-${section}`}
                    sx={{
                      backgroundColor: 'action.hover',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleSection(section)}
                  >
                    <TableCell colSpan={2 + ROLES.length}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size="small">
                          {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                        <Typography variant="subtitle2" fontWeight="bold" color="primary">
                          {section}
                        </Typography>
                        <Chip label={resources.length} size="small" variant="outlined" />
                      </Box>
                    </TableCell>
                  </TableRow>,
                  // Resource rows (inside collapse)
                  ...resources.flatMap((resource) =>
                    resource.actions.map((action, actionIdx) => (
                      <TableRow
                        key={`${resource.key}-${action}`}
                        sx={{
                          display: isOpen ? 'table-row' : 'none',
                          '&:hover': { backgroundColor: 'action.hover' },
                        }}
                      >
                        {actionIdx === 0 ? (
                          <TableCell
                            rowSpan={resource.actions.length}
                            sx={{
                              fontWeight: 500,
                              borderRight: '1px solid',
                              borderRightColor: 'divider',
                              verticalAlign: 'top',
                              pt: 1.5,
                            }}
                          >
                            {resource.label}
                          </TableCell>
                        ) : null}
                        <TableCell
                          sx={{
                            textAlign: 'center',
                            borderRight: '1px solid',
                            borderRightColor: 'divider',
                            py: 0.5,
                          }}
                        >
                          <Chip
                            label={ACTION_LABELS[action] || action}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 22 }}
                          />
                        </TableCell>
                        {ROLES.map((role) => {
                          const perm = getPermission(resource.key, action, role.key);
                          const allowed = isAllowed(resource.key, action, role.key);
                          const isChanged = perm && localChanges[perm.id] !== undefined;

                          return (
                            <TableCell
                              key={role.key}
                              sx={{
                                textAlign: 'center',
                                py: 0.25,
                                backgroundColor: isChanged
                                  ? allowed
                                    ? alpha(theme.palette.success.main, 0.15)
                                    : alpha(theme.palette.error.main, 0.15)
                                  : 'transparent',
                                transition: 'background-color 0.2s',
                              }}
                            >
                              {perm ? (
                                <Tooltip
                                  title={`${resource.label} - ${ACTION_LABELS[action] || action}: ${allowed ? 'Permis' : 'Interzis'}${isChanged ? ' (modificat)' : ''}`}
                                  arrow
                                >
                                  <Checkbox
                                    checked={allowed}
                                    onChange={() => handleToggle(resource.key, action, role.key)}
                                    size="small"
                                    sx={{
                                      p: { xs: 0.75, sm: 0.5 },
                                      color: 'success.main',
                                      '&.Mui-checked': {
                                        color: 'success.main',
                                      },
                                    }}
                                  />
                                </Tooltip>
                              ) : (
                                <Typography variant="caption" color="text.disabled">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    )),
                  ),
                ];
              })}
            </TableBody>
          </Table>
        </TableContainer>
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

export default memo(PermissionMatrixTab);
