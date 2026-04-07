import { useState, useMemo, useCallback, memo } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Button,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Collapse,
  useTheme,
  useMediaQuery,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  alpha,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FilterListOff as ResetIcon,
  Create as CreateIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  ArrowRightAlt as ArrowIcon,
} from '@mui/icons-material';
import { useGetAuditLogsQuery, type AuditLogFilters, type AuditLog } from '../../../store/api/audit.api';
import { useGetUsersQuery } from '../../../store/api/users.api';

const ENTITY_LABELS: Record<string, string> = {
  Permission: 'Permisiuni',
  UserOverride: 'Exceptii Utilizator',
  TaskFlowRule: 'Flux Task',
  User: 'Utilizator',
  Schedule: 'Program',
  LeaveRequest: 'Cerere Concediu',
  ParkingIssue: 'Problema Parcare',
  ParkingDamage: 'Prejudiciu Parcare',
  EmailRule: 'Regula Email',
  NotificationSetting: 'Setari Notificari',
  Equipment: 'Echipament',
  ContactFirm: 'Firma Contact',
};

const ACTION_CONFIG: Record<string, { label: string; color: 'success' | 'info' | 'error'; icon: React.ReactNode }> = {
  CREATE: { label: 'Creat', color: 'success', icon: <CreateIcon sx={{ fontSize: 16 }} /> },
  UPDATE: { label: 'Modificat', color: 'info', icon: <EditIcon sx={{ fontSize: 16 }} /> },
  DELETE: { label: 'Sters', color: 'error', icon: <DeleteIcon sx={{ fontSize: 16 }} /> },
};

const ENTITIES = Object.keys(ENTITY_LABELS);
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE'];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

/** Format date for display */
const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Render changes as key-value pairs */
const ChangesDisplay = ({ changes }: { changes?: Record<string, { old: any; new: any }> }) => {
  const theme = useTheme();

  if (!changes || Object.keys(changes).length === 0) {
    return (
      <Typography variant="caption" color="text.disabled" fontStyle="italic">
        Fara detalii
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {Object.entries(changes).map(([field, { old: oldVal, new: newVal }]) => (
        <Box
          key={field}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flexWrap: 'wrap',
            fontSize: '0.75rem',
          }}
        >
          <Chip
            label={field}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
          />
          <Typography
            variant="caption"
            sx={{
              bgcolor: alpha(theme.palette.error.main, 0.08),
              color: theme.palette.error.main,
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              textDecoration: 'line-through',
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {oldVal === null || oldVal === undefined ? 'null' : String(oldVal)}
          </Typography>
          <ArrowIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          <Typography
            variant="caption"
            sx={{
              bgcolor: alpha(theme.palette.success.main, 0.08),
              color: theme.palette.success.main,
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              fontWeight: 600,
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {newVal === null || newVal === undefined ? 'null' : String(newVal)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

/** Expandable row component */
const AuditRow = memo(({ log, isMobile }: { log: AuditLog; isMobile: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const actionCfg = ACTION_CONFIG[log.action] || { label: log.action, color: 'info' as const, icon: <HistoryIcon sx={{ fontSize: 16 }} /> };
  const hasChanges = log.changes && Object.keys(log.changes).length > 0;

  return (
    <>
      <TableRow
        hover
        onClick={hasChanges ? () => setExpanded(!expanded) : undefined}
        sx={{
          cursor: hasChanges ? 'pointer' : 'default',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.04),
          },
        }}
      >
        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
          {formatDate(log.createdAt)}
        </TableCell>
        {!isMobile && (
          <TableCell>
            <Stack direction="row" alignItems="center" spacing={1}>
              <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Box>
                <Typography variant="body2" fontWeight={600} fontSize="0.8rem">
                  {log.user?.fullName || 'Sistem'}
                </Typography>
                {log.user?.email && (
                  <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                    {log.user.email}
                  </Typography>
                )}
              </Box>
            </Stack>
          </TableCell>
        )}
        <TableCell>
          <Chip
            icon={actionCfg.icon as React.ReactElement}
            label={isMobile ? actionCfg.label.charAt(0) : actionCfg.label}
            size="small"
            color={actionCfg.color}
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: '0.7rem' }}
          />
        </TableCell>
        <TableCell>
          <Chip
            label={ENTITY_LABELS[log.entity] || log.entity}
            size="small"
            variant="filled"
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              fontSize: '0.7rem',
              fontWeight: 500,
            }}
          />
        </TableCell>
        {!isMobile && (
          <TableCell sx={{ maxWidth: 300, fontSize: '0.8rem' }}>
            <Typography variant="body2" noWrap title={log.description || ''}>
              {log.description || '—'}
            </Typography>
          </TableCell>
        )}
        <TableCell align="right" sx={{ width: 40 }}>
          {hasChanges && (
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          )}
        </TableCell>
      </TableRow>
      {hasChanges && (
        <TableRow>
          <TableCell colSpan={isMobile ? 4 : 6} sx={{ py: 0, borderBottom: expanded ? undefined : 'none' }}>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box
                sx={{
                  py: 1.5,
                  px: 2,
                  my: 0.5,
                  bgcolor: alpha(theme.palette.background.default, 0.5),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                }}
              >
                {isMobile && log.user && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Utilizator: <strong>{log.user.fullName}</strong>
                    </Typography>
                  </Box>
                )}
                {isMobile && log.description && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {log.description}
                    </Typography>
                  </Box>
                )}
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Modificari:
                </Typography>
                <ChangesDisplay changes={log.changes} />
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});

AuditRow.displayName = 'AuditRow';

const AuditTab = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Filter state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Applied filters (only update on search click)
  const [appliedFilters, setAppliedFilters] = useState<AuditLogFilters>({ limit: 25, offset: 0 });

  // Queries
  const { data: users = [] } = useGetUsersQuery({});
  const { data: auditResponse, isLoading, isFetching } = useGetAuditLogsQuery(appliedFilters);

  const auditLogs = auditResponse?.data || [];
  const total = auditResponse?.total || 0;

  // User options for autocomplete
  const userOptions = useMemo(() =>
    users.map((u: any) => ({ id: u.id, label: `${u.fullName} (${u.email})` })),
    [users]
  );

  const handleSearch = useCallback(() => {
    const filters: AuditLogFilters = {
      limit: rowsPerPage,
      offset: 0,
    };
    if (selectedUserId) filters.userId = selectedUserId;
    if (selectedAction) filters.action = selectedAction;
    if (selectedEntity) filters.entity = selectedEntity;
    if (dateFrom) filters.from = dateFrom;
    if (dateTo) filters.to = dateTo;
    setPage(0);
    setAppliedFilters(filters);
  }, [selectedUserId, selectedAction, selectedEntity, dateFrom, dateTo, rowsPerPage]);

  const handleReset = useCallback(() => {
    setSelectedUserId('');
    setSelectedAction('');
    setSelectedEntity('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
    setRowsPerPage(25);
    setAppliedFilters({ limit: 25, offset: 0 });
  }, []);

  const handlePageChange = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
    setAppliedFilters((prev) => ({ ...prev, offset: newPage * rowsPerPage }));
  }, [rowsPerPage]);

  const handleRowsPerPageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setRowsPerPage(newSize);
    setPage(0);
    setAppliedFilters((prev) => ({ ...prev, limit: newSize, offset: 0 }));
  }, []);

  return (
    <Box>
      {/* Stats summary */}
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
      >
        <Chip
          icon={<HistoryIcon />}
          label={`${total} inregistrari gasite`}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
        {isFetching && <CircularProgress size={20} sx={{ ml: 1 }} />}
      </Stack>

      {/* Filters */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          borderRadius: 2,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ md: 'flex-end' }}
          flexWrap="wrap"
          useFlexGap
        >
          {/* User filter */}
          <Autocomplete
            size="small"
            options={userOptions}
            value={userOptions.find((o: any) => o.id === selectedUserId) || null}
            onChange={(_, val) => setSelectedUserId(val?.id || '')}
            renderInput={(params) => (
              <TextField {...params} label="Utilizator" placeholder="Cauta utilizator..." />
            )}
            sx={{ minWidth: { xs: '100%', md: 250 } }}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
          />

          {/* Action filter */}
          <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 140 } }}>
            <InputLabel>Actiune</InputLabel>
            <Select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              label="Actiune"
            >
              <MenuItem value="">Toate</MenuItem>
              {ACTIONS.map((a) => (
                <MenuItem key={a} value={a}>
                  {ACTION_CONFIG[a]?.label || a}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Entity filter */}
          <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 180 } }}>
            <InputLabel>Entitate</InputLabel>
            <Select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              label="Entitate"
            >
              <MenuItem value="">Toate</MenuItem>
              {ENTITIES.map((e) => (
                <MenuItem key={e} value={e}>
                  {ENTITY_LABELS[e]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Date range */}
          <TextField
            size="small"
            type="date"
            label="De la"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { xs: '48%', md: 150 } }}
          />
          <TextField
            size="small"
            type="date"
            label="Pana la"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { xs: '48%', md: 150 } }}
          />

          {/* Action buttons */}
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              size="small"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Cauta
            </Button>
            <Tooltip title="Reseteaza filtrele">
              <Button
                variant="outlined"
                size="small"
                startIcon={<ResetIcon />}
                onClick={handleReset}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Reset
              </Button>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* Results table */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : auditLogs.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Nu s-au gasit inregistrari in audit log. Actiunile utilizatorilor vor aparea aici pe masura ce sunt efectuate.
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: { xs: 'calc(100dvh - 280px)', lg: 'calc(100dvh - 260px)' } }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Data / Ora</TableCell>
                  {!isMobile && <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Utilizator</TableCell>}
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Actiune</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Entitate</TableCell>
                  {!isMobile && <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Descriere</TableCell>}
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', width: 40 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.map((log) => (
                  <AuditRow key={log.id} log={log} isMobile={isMobile} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            labelRowsPerPage={isMobile ? 'Rand:' : 'Randuri pe pagina:'}
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} din ${count}`}
          />
        </Paper>
      )}
    </Box>
  );
};

export default memo(AuditTab);
