import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Card,
  CardContent,
  Stack,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Tooltip,
  Fade,
  Grow,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as ResolveIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Warning as UrgentIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  CalendarMonth as CalendarIcon,
  Gesture as SignatureIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import {
  useGetParkingDamagesQuery,
  useDeleteParkingDamageMutation,
} from '../../../store/api/parking.api';
import type { ParkingDamage, ParkingDamageStatus } from '../../../types/parking.types';
import { DAMAGE_STATUS_LABELS, RESOLUTION_TYPE_LABELS } from '../../../types/parking.types';
import CreateDamageDialog from './CreateDamageDialog';
import ResolveDamageDialog from './ResolveDamageDialog';
import DamageDetailsDialog from './DamageDetailsDialog';
import EditDamageDialog from './EditDamageDialog';
import SignDamageDialog from './SignDamageDialog';

interface ParkingDamagesTabProps {
  initialOpenId?: string | null;
  onOpenIdHandled?: () => void;
}

const ParkingDamagesTab: React.FC<ParkingDamagesTabProps> = ({ initialOpenId, onOpenIdHandled }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));
  const { user } = useAppSelector((state) => state.auth);

  // When opening from notification, show ALL damages so we can find the specific one
  const [statusFilter, setStatusFilter] = useState<'ALL' | ParkingDamageStatus>(initialOpenId ? 'ALL' : 'ACTIVE');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [selectedDamage, setSelectedDamage] = useState<ParkingDamage | null>(null);

  const { data: damages = [], isLoading, refetch } = useGetParkingDamagesQuery(
    statusFilter === 'ALL' ? undefined : statusFilter
  );
  const [deleteDamage] = useDeleteParkingDamageMutation();

  const isAdmin = user?.role === 'ADMIN';
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const deptName = user?.department?.name || '';
  const canComment = isAdminOrManager || ['Dispecerat', 'Intretinere Parcari', 'Control'].includes(deptName);

  // Handle initial open from notification
  useEffect(() => {
    if (initialOpenId && damages.length > 0) {
      const damage = damages.find(d => d.id === initialOpenId);
      if (damage) {
        setSelectedDamage(damage);
        setDetailsDialogOpen(true);
        onOpenIdHandled?.();
      }
    }
  }, [initialOpenId, damages, onOpenIdHandled]);

  const handleResolve = (damage: ParkingDamage) => {
    setSelectedDamage(damage);
    setResolveDialogOpen(true);
  };

  const handleShowDetails = (damage: ParkingDamage) => {
    setSelectedDamage(damage);
    setDetailsDialogOpen(true);
  };

  const handleEdit = (damage: ParkingDamage) => {
    setSelectedDamage(damage);
    setEditDialogOpen(true);
  };

  const handleSign = (damage: ParkingDamage) => {
    setSelectedDamage(damage);
    setSignDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Esti sigur ca vrei sa stergi acest prejudiciu?')) {
      try {
        await deleteDamage(id).unwrap();
      } catch (error) {
        console.error('Error deleting damage:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: ParkingDamageStatus) => {
    return status === 'ACTIVE' ? 'warning' : 'success';
  };

  const urgentCount = damages.filter(d => d.isUrgent && d.status === 'ACTIVE').length;

  // Group damages by month
  const MONTH_NAMES = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
  const damagesByMonth = useMemo(() => {
    const groups: Record<string, { label: string; items: ParkingDamage[]; urgentCount: number }> = {};
    damages.forEach((damage) => {
      const date = new Date(damage.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = { label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`, items: [], urgentCount: 0 };
      }
      groups[key].items.push(damage);
      if (damage.isUrgent && damage.status === 'ACTIVE') groups[key].urgentCount++;
    });
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, group]) => ({ key, ...group }));
  }, [damages]);

  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth()).padStart(2, '0')}`;

  const renderDamageCard = (damage: ParkingDamage, index: number) => (
    <Grow in={true} timeout={300 + index * 50} key={damage.id}>
      <Card
        sx={{
          mb: 2,
          borderLeft: damage.isUrgent ? '4px solid' : 'none',
          borderColor: 'error.main',
          borderRadius: 2,
          transition: 'all 0.2s ease',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.palette.mode === 'light'
              ? '0 6px 20px rgba(0,0,0,0.1)'
              : '0 6px 20px rgba(0,0,0,0.3)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {damage.isUrgent && (
                  <Tooltip title="Urgent - nerezolvat de peste 48h">
                    <UrgentIcon color="error" sx={{ animation: 'pulse 2s infinite' }} />
                  </Tooltip>
                )}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                  {damage.parkingLot?.name}
                </Typography>
              </Box>
              <Chip
                label={DAMAGE_STATUS_LABELS[damage.status]}
                color={getStatusColor(damage.status)}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04), p: 1.5, borderRadius: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>Echipament avariat:</strong> {damage.damagedEquipment}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>Persoana:</strong> {damage.personName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>Telefon:</strong> {damage.phone}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Nr. Masina:</strong> {damage.carPlate}
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
              {damage.description}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Creat: {formatDate(damage.createdAt)} de <strong>{damage.creator?.fullName}</strong>
            </Typography>
            {damage.lastModifier && damage.lastModifiedBy !== damage.createdBy && (
              <Typography variant="caption" color="text.secondary">
                Ultima modificare: de <strong>{damage.lastModifier?.fullName}</strong>
              </Typography>
            )}

            {damage.status === 'FINALIZAT' && damage.resolutionType && (
              <Alert severity="success" sx={{ mt: 1, borderRadius: 1.5 }}>
                <Typography variant="caption">
                  <strong>Finalizat de {damage.resolver?.fullName}</strong><br />
                  <strong>{RESOLUTION_TYPE_LABELS[damage.resolutionType]}:</strong> {damage.resolutionDescription}
                </Typography>
              </Alert>
            )}

            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<InfoIcon />}
                onClick={() => handleShowDetails(damage)}
                sx={{ borderRadius: 2 }}
              >
                Detalii
              </Button>
              {damage.status === 'ACTIVE' && (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<ResolveIcon />}
                  onClick={() => handleResolve(damage)}
                  sx={{ borderRadius: 2 }}
                >
                  Finalizeaza
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<SignatureIcon />}
                onClick={() => handleSign(damage)}
                sx={{ borderRadius: 2 }}
              >
                Semneaza
              </Button>
              {isAdminOrManager && damage.status === 'ACTIVE' && (
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleEdit(damage)}
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                    },
                  }}
                >
                  <EditIcon />
                </IconButton>
              )}
              {isAdmin && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(damage.id)}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Grow>
  );

  const renderDamageTable = (items?: ParkingDamage[]) => (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: 2,
        '& .MuiTableHead-root': {
          '& .MuiTableCell-root': {
            fontWeight: 700,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
          },
        },
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell></TableCell>
            <TableCell>Parcare</TableCell>
            <TableCell>Echipament</TableCell>
            <TableCell>Persoana</TableCell>
            <TableCell>Telefon</TableCell>
            <TableCell>Nr. Masina</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Data</TableCell>
            <TableCell>Creat de</TableCell>
            <TableCell align="right">Actiuni</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(items || damages).map((damage) => (
            <TableRow
              key={damage.id}
              sx={{
                bgcolor: damage.isUrgent ? alpha(theme.palette.error.main, 0.05) : 'inherit',
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              <TableCell>
                {damage.isUrgent && (
                  <Tooltip title="Urgent - nerezolvat de peste 48h">
                    <UrgentIcon color="error" fontSize="small" sx={{ animation: 'pulse 2s infinite' }} />
                  </Tooltip>
                )}
              </TableCell>
              <TableCell sx={{ fontWeight: 500 }}>{damage.parkingLot?.name}</TableCell>
              <TableCell>{damage.damagedEquipment}</TableCell>
              <TableCell>{damage.personName}</TableCell>
              <TableCell>{damage.phone}</TableCell>
              <TableCell>{damage.carPlate}</TableCell>
              <TableCell>
                <Chip
                  label={DAMAGE_STATUS_LABELS[damage.status]}
                  color={getStatusColor(damage.status)}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </TableCell>
              <TableCell>{formatDate(damage.createdAt)}</TableCell>
              <TableCell>
                <Tooltip title={
                  damage.status === 'FINALIZAT' && damage.resolver
                    ? `Finalizat de: ${damage.resolver.fullName}`
                    : damage.lastModifier && damage.lastModifiedBy !== damage.createdBy
                      ? `Modificat de: ${damage.lastModifier.fullName}`
                      : ''
                }>
                  <span>{damage.creator?.fullName}</span>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <IconButton
                    size="small"
                    color="info"
                    onClick={() => handleShowDetails(damage)}
                  >
                    <InfoIcon />
                  </IconButton>
                  {damage.status === 'ACTIVE' && (
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => handleResolve(damage)}
                    >
                      <ResolveIcon />
                    </IconButton>
                  )}
                  <Tooltip title="Adauga semnatura">
                    <IconButton
                      size="small"
                      color="warning"
                      onClick={() => handleSign(damage)}
                    >
                      <SignatureIcon />
                    </IconButton>
                  </Tooltip>
                  {isAdminOrManager && damage.status === 'ACTIVE' && (
                    <Tooltip title="Editeaza">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEdit(damage)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {isAdmin && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(damage.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      {/* Urgent Alert */}
      {urgentCount > 0 && (
        <Fade in={true} timeout={500}>
          <Alert
            severity="error"
            sx={{
              mb: 2,
              borderRadius: 2,
              '& .MuiAlert-message': { fontWeight: 500 },
            }}
            icon={<UrgentIcon sx={{ animation: 'pulse 2s infinite' }} />}
          >
            <strong>{urgentCount}</strong> prejudicii urgente nerezolvate de peste 48 de ore!
          </Alert>
        </Fade>
      )}

      {/* Actions */}
      <Grow in={true} timeout={600}>
        <Paper
          sx={{
            p: { xs: 1, sm: 1.5 },
            mb: 2,
            borderRadius: 2,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
            gap: { xs: 1, md: 1.5 },
          }}
        >
          <Tabs
            value={statusFilter}
            onChange={(_, v) => setStatusFilter(v)}
            variant="fullWidth"
            sx={{
              width: '100%',
              minHeight: 40,
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
              '& .MuiTab-root': {
                fontWeight: 600,
                fontSize: '0.8rem',
                minHeight: 40,
                px: 1,
                minWidth: 0,
                textTransform: 'none',
              },
            }}
          >
            <Tab label="Active" value="ACTIVE" />
            <Tab label="Finalizate" value="FINALIZAT" />
            <Tab label="Toate" value="ALL" />
          </Tabs>

          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ flexShrink: 0 }}>
            <IconButton
              onClick={() => refetch()}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) },
              }}
            >
              <RefreshIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: 18 }} />}
              onClick={() => setCreateDialogOpen(true)}
              size="small"
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                py: 0.75,
                px: 2,
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
              }}
            >
              Adauga
            </Button>
          </Stack>
        </Paper>
      </Grow>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={48} />
        </Box>
      ) : damages.length === 0 ? (
        <Fade in={true} timeout={600}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Nu exista prejudicii in aceasta categorie.
          </Alert>
        </Fade>
      ) : (
        damagesByMonth.map((group) => (
          <Accordion
            key={group.key}
            defaultExpanded={group.key === currentMonthKey}
            sx={{
              mb: 1,
              borderRadius: '12px !important',
              overflow: 'hidden',
              '&:before': { display: 'none' },
              boxShadow: theme.palette.mode === 'light'
                ? '0 1px 4px rgba(0,0,0,0.06)'
                : '0 1px 4px rgba(0,0,0,0.2)',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                bgcolor: alpha(theme.palette.warning.main, 0.06),
                '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.1) },
                minHeight: { xs: 48, sm: 56 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 1 }}>
                <CalendarIcon sx={{ color: 'warning.main', fontSize: { xs: 20, sm: 22 } }} />
                <Typography fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, flex: 1 }}>
                  {group.label}
                </Typography>
                <Chip
                  label={`${group.items.length} prejudicii`}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    color: 'warning.dark',
                  }}
                />
                {group.urgentCount > 0 && (
                  <Chip
                    label={`${group.urgentCount} urgente`}
                    size="small"
                    color="error"
                    sx={{ fontWeight: 700, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
              {isMobile || isTablet ? (
                group.items.map((damage, index) => renderDamageCard(damage, index))
              ) : (
                renderDamageTable(group.items)
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* Dialogs */}
      <CreateDamageDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />

      {selectedDamage && (
        <>
          <ResolveDamageDialog
            open={resolveDialogOpen}
            onClose={() => {
              setResolveDialogOpen(false);
              setSelectedDamage(null);
            }}
            damage={selectedDamage}
          />
          <DamageDetailsDialog
            open={detailsDialogOpen}
            onClose={() => {
              setDetailsDialogOpen(false);
              setSelectedDamage(null);
            }}
            damage={selectedDamage}
            canComment={canComment}
          />
          <EditDamageDialog
            open={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setSelectedDamage(null);
            }}
            damage={selectedDamage}
          />
          <SignDamageDialog
            open={signDialogOpen}
            onClose={() => {
              setSignDialogOpen(false);
              setSelectedDamage(null);
            }}
            damage={selectedDamage}
          />
        </>
      )}

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Box>
  );
};

export default ParkingDamagesTab;
