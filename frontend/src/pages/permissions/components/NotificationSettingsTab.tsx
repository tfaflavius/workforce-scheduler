import { useState, useMemo, useCallback } from 'react';
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
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  PhoneAndroid as PushIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import {
  useGetNotificationSettingsQuery,
  useBulkUpdateNotificationSettingsMutation,
  useSeedDefaultsMutation,
} from '../../../store/api/permissions.api';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPE_DEFINITIONS,
  NOTIFICATION_CATEGORY_COLORS,
  ROLES,
} from '../../../constants/permissions';

interface LocalChange {
  inAppEnabled?: boolean;
  pushEnabled?: boolean;
}

const NotificationSettingsTab = () => {
  const { data: settings = [], isLoading, refetch } = useGetNotificationSettingsQuery();
  const [bulkUpdate, { isLoading: isSaving }] = useBulkUpdateNotificationSettingsMutation();
  const [seedDefaults, { isLoading: isSeeding }] = useSeedDefaultsMutation();

  const [localChanges, setLocalChanges] = useState<Record<string, LocalChange>>({});
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c, true])),
  );
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Build lookup: settingsMap[notificationType][role] = { id, inAppEnabled, pushEnabled }
  const settingsMap = useMemo(() => {
    const map: Record<string, Record<string, { id: string; inAppEnabled: boolean; pushEnabled: boolean }>> = {};
    for (const s of settings) {
      if (!map[s.notificationType]) map[s.notificationType] = {};
      map[s.notificationType][s.role] = {
        id: s.id,
        inAppEnabled: s.inAppEnabled,
        pushEnabled: s.pushEnabled,
      };
    }
    return map;
  }, [settings]);

  // Group notification types by category
  const typesByCategory = useMemo(() => {
    return NOTIFICATION_CATEGORIES.map((cat) => ({
      category: cat,
      types: NOTIFICATION_TYPE_DEFINITIONS.filter((t) => t.category === cat),
    }));
  }, []);

  const hasChanges = Object.keys(localChanges).length > 0;

  const getEffectiveValue = useCallback(
    (settingId: string, field: 'inAppEnabled' | 'pushEnabled', original: boolean): boolean => {
      const change = localChanges[settingId];
      if (change && change[field] !== undefined) return change[field]!;
      return original;
    },
    [localChanges],
  );

  const handleToggle = useCallback(
    (settingId: string, field: 'inAppEnabled' | 'pushEnabled', currentValue: boolean) => {
      setLocalChanges((prev) => {
        const existing = prev[settingId] || {};
        const newValue = !currentValue;

        // Find original value from settings
        const originalSetting = settings.find((s) => s.id === settingId);
        const originalValue = originalSetting ? originalSetting[field] : currentValue;

        if (newValue === originalValue) {
          // Revert to original — remove this field from changes
          const updated = { ...existing };
          delete updated[field];
          if (Object.keys(updated).length === 0) {
            const rest = { ...prev };
            delete rest[settingId];
            return rest;
          }
          return { ...prev, [settingId]: updated };
        }

        return { ...prev, [settingId]: { ...existing, [field]: newValue } };
      });
    },
    [settings],
  );

  const handleSave = async () => {
    const updates = Object.entries(localChanges).map(([id, change]) => {
      const original = settings.find((s) => s.id === id);
      return {
        id,
        inAppEnabled: change.inAppEnabled ?? original?.inAppEnabled ?? true,
        pushEnabled: change.pushEnabled ?? original?.pushEnabled ?? true,
      };
    });

    try {
      const result = await bulkUpdate({ updates }).unwrap();
      setLocalChanges({});
      setSnackbar({ open: true, message: `${result.updated} setari actualizate cu succes`, severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Eroare la salvarea setarilor', severity: 'error' });
    }
  };

  const handleSeed = async () => {
    try {
      await seedDefaults().unwrap();
      setLocalChanges({});
      refetch();
      setSnackbar({ open: true, message: 'Setari notificari resetate la default', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Eroare la resetarea setarilor', severity: 'error' });
    }
  };

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isEmpty = settings.length === 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" fontWeight="bold">
          Setari Notificari per Rol
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

      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        Configureaza ce tipuri de notificari sunt active per rol. Bifele controleaza notificarile in-app si push separat.
        Modificarile se aplica in maxim 1 minut dupa salvare.
      </Alert>

      {isEmpty && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Nu exista setari de notificari configurate. Apasa &quot;Populeaza Defaults&quot; pentru a initializa (toate activate).
        </Alert>
      )}

      {!isEmpty && (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 340px)', overflowX: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    minWidth: { xs: 160, sm: 220 },
                    backgroundColor: 'background.paper',
                    zIndex: 3,
                  }}
                >
                  Tip Notificare
                </TableCell>
                {ROLES.map((role) => (
                  <TableCell
                    key={role.key}
                    colSpan={2}
                    align="center"
                    sx={{
                      fontWeight: 'bold',
                      backgroundColor: 'background.paper',
                      borderLeft: '1px solid',
                      borderLeftColor: 'divider',
                    }}
                  >
                    <Chip
                      label={role.label}
                      size="small"
                      color={
                        role.key === 'MASTER_ADMIN'
                          ? 'secondary'
                          : role.key === 'ADMIN'
                            ? 'error'
                            : role.key === 'MANAGER'
                              ? 'warning'
                              : 'info'
                      }
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell sx={{ backgroundColor: 'background.paper', zIndex: 3 }} />
                {ROLES.map((role) => (
                  <TableCell
                    key={`${role.key}-sub`}
                    colSpan={2}
                    align="center"
                    sx={{
                      backgroundColor: 'background.paper',
                      borderLeft: '1px solid',
                      borderLeftColor: 'divider',
                      py: 0.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                      <Tooltip title="In-App">
                        <NotificationsIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      </Tooltip>
                      <Tooltip title="Push">
                        <PushIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      </Tooltip>
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {typesByCategory.map(({ category, types }) => {
                const isOpen = openCategories[category] !== false;
                const categoryColor = NOTIFICATION_CATEGORY_COLORS[category] || 'primary';

                return [
                  // Category header row
                  <TableRow
                    key={`cat-${category}`}
                    sx={{ backgroundColor: 'action.hover', cursor: 'pointer' }}
                    onClick={() => toggleCategory(category)}
                  >
                    <TableCell colSpan={1 + ROLES.length * 2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size="small">
                          {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                        <Chip
                          label={category}
                          size="small"
                          color={categoryColor}
                          sx={{ fontWeight: 'bold' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          ({types.length} tipuri)
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>,

                  // Type rows
                  ...types.map((type) => (
                    <TableRow
                      key={type.key}
                      sx={{
                        display: isOpen ? 'table-row' : 'none',
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          {type.label}
                        </Typography>
                      </TableCell>
                      {ROLES.map((role) => {
                        const setting = settingsMap[type.key]?.[role.key];
                        if (!setting) {
                          return (
                            <TableCell
                              key={`${role.key}-empty`}
                              colSpan={2}
                              align="center"
                              sx={{ borderLeft: '1px solid', borderLeftColor: 'divider' }}
                            >
                              <Typography variant="caption" color="text.disabled">-</Typography>
                            </TableCell>
                          );
                        }

                        const inAppValue = getEffectiveValue(setting.id, 'inAppEnabled', setting.inAppEnabled);
                        const pushValue = getEffectiveValue(setting.id, 'pushEnabled', setting.pushEnabled);
                        const isInAppChanged = localChanges[setting.id]?.inAppEnabled !== undefined;
                        const isPushChanged = localChanges[setting.id]?.pushEnabled !== undefined;

                        return [
                          <TableCell
                            key={`${role.key}-inapp`}
                            align="center"
                            sx={{
                              py: 0.25,
                              borderLeft: '1px solid',
                              borderLeftColor: 'divider',
                              backgroundColor: isInAppChanged
                                ? inAppValue
                                  ? 'rgba(76, 175, 80, 0.1)'
                                  : 'rgba(244, 67, 54, 0.1)'
                                : 'transparent',
                              transition: 'background-color 0.2s',
                            }}
                          >
                            <Checkbox
                              checked={inAppValue}
                              onChange={() => handleToggle(setting.id, 'inAppEnabled', inAppValue)}
                              size="small"
                              sx={{ p: { xs: 0.75, sm: 0.5 } }}
                              color="success"
                            />
                          </TableCell>,
                          <TableCell
                            key={`${role.key}-push`}
                            align="center"
                            sx={{
                              py: 0.25,
                              backgroundColor: isPushChanged
                                ? pushValue
                                  ? 'rgba(76, 175, 80, 0.1)'
                                  : 'rgba(244, 67, 54, 0.1)'
                                : 'transparent',
                              transition: 'background-color 0.2s',
                            }}
                          >
                            <Checkbox
                              checked={pushValue}
                              onChange={() => handleToggle(setting.id, 'pushEnabled', pushValue)}
                              size="small"
                              sx={{ p: { xs: 0.75, sm: 0.5 } }}
                              color="info"
                            />
                          </TableCell>,
                        ];
                      })}
                    </TableRow>
                  )),
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
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NotificationSettingsTab;
