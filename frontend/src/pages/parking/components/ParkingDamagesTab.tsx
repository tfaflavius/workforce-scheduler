import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as ResolveIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Warning as UrgentIcon,
  Info as InfoIcon,
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

const ParkingDamagesTab: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAppSelector((state) => state.auth);

  const [statusFilter, setStatusFilter] = useState<'ALL' | ParkingDamageStatus>('ACTIVE');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDamage, setSelectedDamage] = useState<ParkingDamage | null>(null);

  const { data: damages = [], isLoading, refetch } = useGetParkingDamagesQuery(
    statusFilter === 'ALL' ? undefined : statusFilter
  );
  const [deleteDamage] = useDeleteParkingDamageMutation();

  const isAdmin = user?.role === 'ADMIN';
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleResolve = (damage: ParkingDamage) => {
    setSelectedDamage(damage);
    setResolveDialogOpen(true);
  };

  const handleShowDetails = (damage: ParkingDamage) => {
    setSelectedDamage(damage);
    setDetailsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Ești sigur că vrei să ștergi acest prejudiciu?')) {
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

  const renderDamageCard = (damage: ParkingDamage) => (
    <Card
      key={damage.id}
      sx={{
        mb: 2,
        borderLeft: damage.isUrgent ? '4px solid' : 'none',
        borderColor: 'error.main',
      }}
    >
      <CardContent>
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {damage.isUrgent && (
                <Tooltip title="Urgent - nerezolvat de peste 48h">
                  <UrgentIcon color="error" />
                </Tooltip>
              )}
              <Typography variant="subtitle1" fontWeight="bold">
                {damage.parkingLot?.name}
              </Typography>
            </Box>
            <Chip
              label={DAMAGE_STATUS_LABELS[damage.status]}
              color={getStatusColor(damage.status)}
              size="small"
            />
          </Box>

          <Typography variant="body2" color="text.secondary">
            <strong>Echipament avariat:</strong> {damage.damagedEquipment}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Persoană:</strong> {damage.personName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Telefon:</strong> {damage.phone}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Nr. Mașină:</strong> {damage.carPlate}
          </Typography>
          <Typography variant="body2">
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
            <Alert severity="success" sx={{ mt: 1 }}>
              <Typography variant="caption">
                <strong>Finalizat de {damage.resolver?.fullName}</strong><br />
                <strong>{RESOLUTION_TYPE_LABELS[damage.resolutionType]}:</strong> {damage.resolutionDescription}
              </Typography>
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<InfoIcon />}
              onClick={() => handleShowDetails(damage)}
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
              >
                Finalizează
              </Button>
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
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  const renderDamageTable = () => (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell></TableCell>
            <TableCell>Parcare</TableCell>
            <TableCell>Echipament</TableCell>
            <TableCell>Persoană</TableCell>
            <TableCell>Telefon</TableCell>
            <TableCell>Nr. Mașină</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Data</TableCell>
            <TableCell>Creat de</TableCell>
            <TableCell align="right">Acțiuni</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {damages.map((damage) => (
            <TableRow
              key={damage.id}
              sx={{
                bgcolor: damage.isUrgent ? 'error.50' : 'inherit',
              }}
            >
              <TableCell>
                {damage.isUrgent && (
                  <Tooltip title="Urgent - nerezolvat de peste 48h">
                    <UrgentIcon color="error" fontSize="small" />
                  </Tooltip>
                )}
              </TableCell>
              <TableCell>{damage.parkingLot?.name}</TableCell>
              <TableCell>{damage.damagedEquipment}</TableCell>
              <TableCell>{damage.personName}</TableCell>
              <TableCell>{damage.phone}</TableCell>
              <TableCell>{damage.carPlate}</TableCell>
              <TableCell>
                <Chip
                  label={DAMAGE_STATUS_LABELS[damage.status]}
                  color={getStatusColor(damage.status)}
                  size="small"
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
        <Alert severity="error" sx={{ mb: 2 }} icon={<UrgentIcon />}>
          <strong>{urgentCount}</strong> prejudicii urgente nerezolvate de peste 48 de ore!
        </Alert>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Tabs
          value={statusFilter}
          onChange={(_, v) => setStatusFilter(v)}
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{ minWidth: isMobile ? '100%' : 'auto' }}
        >
          <Tab label="Active" value="ACTIVE" />
          <Tab label="Finalizate" value="FINALIZAT" />
          <Tab label="Toate" value="ALL" />
        </Tabs>

        <Stack direction="row" spacing={1}>
          <IconButton onClick={() => refetch()}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            size={isMobile ? 'small' : 'medium'}
          >
            {isMobile ? 'Adaugă' : 'Adaugă Prejudiciu'}
          </Button>
        </Stack>
      </Box>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : damages.length === 0 ? (
        <Alert severity="info">Nu există prejudicii în această categorie.</Alert>
      ) : isMobile ? (
        damages.map(renderDamageCard)
      ) : (
        renderDamageTable()
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
            canComment={isAdminOrManager}
          />
        </>
      )}
    </Box>
  );
};

export default ParkingDamagesTab;
