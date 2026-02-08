import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Card,
  CardContent,
  Stack,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  TextField,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import {
  useGetCashCollectionsQuery,
  useGetCashCollectionTotalsQuery,
  useGetParkingLotsQuery,
  useGetPaymentMachinesQuery,
  useDeleteCashCollectionMutation,
} from '../../../store/api/parking.api';
import type { CashCollection } from '../../../types/parking.types';
import CreateCollectionDialog from './CreateCollectionDialog';

const CashCollectionsTab: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAppSelector((state) => state.auth);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedParkingLotId, setSelectedParkingLotId] = useState<string>('');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data: parkingLots = [] } = useGetParkingLotsQuery();
  const { data: machines = [] } = useGetPaymentMachinesQuery(selectedParkingLotId || undefined);

  const filters = useMemo(() => ({
    parkingLotIds: selectedParkingLotId ? [selectedParkingLotId] : undefined,
    paymentMachineIds: selectedMachineId ? [selectedMachineId] : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }), [selectedParkingLotId, selectedMachineId, startDate, endDate]);

  const { data: collections = [], isLoading, refetch } = useGetCashCollectionsQuery(
    Object.keys(filters).some(k => filters[k as keyof typeof filters]) ? filters : undefined
  );
  const { data: totals } = useGetCashCollectionTotalsQuery(
    Object.keys(filters).some(k => filters[k as keyof typeof filters]) ? filters : undefined
  );
  const [deleteCollection] = useDeleteCashCollectionMutation();

  const isAdmin = user?.role === 'ADMIN';

  const handleDelete = async (id: string) => {
    if (window.confirm('Ești sigur că vrei să ștergi această ridicare?')) {
      try {
        await deleteCollection(id).unwrap();
      } catch (error) {
        console.error('Error deleting collection:', error);
      }
    }
  };

  const clearFilters = () => {
    setSelectedParkingLotId('');
    setSelectedMachineId('');
    setStartDate('');
    setEndDate('');
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
    }).format(amount);
  };

  const renderCollectionCard = (collection: CashCollection) => (
    <Card key={collection.id} sx={{ mb: 2 }}>
      <CardContent>
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {collection.parkingLot?.name}
            </Typography>
            <Typography variant="h6" color="success.main" fontWeight="bold">
              {formatCurrency(collection.amount)}
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary">
            <strong>Automat:</strong> {collection.paymentMachine?.machineNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Ridicat de:</strong> {collection.collector?.fullName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Data: {formatDate(collection.collectedAt)}
          </Typography>
          {collection.notes && (
            <Typography variant="body2">
              <strong>Note:</strong> {collection.notes}
            </Typography>
          )}

          {isAdmin && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(collection.id)}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );

  const renderCollectionTable = () => (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Parcare</TableCell>
            <TableCell>Automat</TableCell>
            <TableCell align="right">Sumă</TableCell>
            <TableCell>Ridicat de</TableCell>
            <TableCell>Data</TableCell>
            <TableCell>Note</TableCell>
            {isAdmin && <TableCell align="right">Acțiuni</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {collections.map((collection) => (
            <TableRow key={collection.id}>
              <TableCell>{collection.parkingLot?.name}</TableCell>
              <TableCell>{collection.paymentMachine?.machineNumber}</TableCell>
              <TableCell align="right">
                <Typography fontWeight="bold" color="success.main">
                  {formatCurrency(collection.amount)}
                </Typography>
              </TableCell>
              <TableCell>{collection.collector?.fullName}</TableCell>
              <TableCell>{formatDate(collection.collectedAt)}</TableCell>
              <TableCell>{collection.notes || '-'}</TableCell>
              {isAdmin && (
                <TableCell align="right">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(collection.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      {/* Totals Summary */}
      {totals && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'success.50' }}>
          <Typography variant="h6" gutterBottom>
            Sumar Totaluri
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Card sx={{ minWidth: { xs: '100%', sm: 200 } }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  {formatCurrency(totals.totalAmount)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total General ({totals.count} ridicări)
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {totals.byParkingLot.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Per Parcare:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {totals.byParkingLot.map((item) => (
                  <Chip
                    key={item.parkingLotId}
                    label={`${item.parkingLotName}: ${formatCurrency(item.totalAmount)}`}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Paper>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems="center">
          <FilterIcon color="action" />
          <Typography variant="subtitle2" sx={{ minWidth: 50 }}>
            Filtre:
          </Typography>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Parcare</InputLabel>
            <Select
              value={selectedParkingLotId}
              label="Parcare"
              onChange={(e) => {
                setSelectedParkingLotId(e.target.value);
                setSelectedMachineId('');
              }}
            >
              <MenuItem value="">Toate</MenuItem>
              {parkingLots.map((lot) => (
                <MenuItem key={lot.id} value={lot.id}>
                  {lot.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }} disabled={!selectedParkingLotId}>
            <InputLabel>Automat</InputLabel>
            <Select
              value={selectedMachineId}
              label="Automat"
              onChange={(e) => setSelectedMachineId(e.target.value)}
            >
              <MenuItem value="">Toate</MenuItem>
              {machines.map((machine) => (
                <MenuItem key={machine.id} value={machine.id}>
                  {machine.machineNumber}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            type="date"
            label="De la"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 140 }}
          />

          <TextField
            type="date"
            label="Până la"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 140 }}
          />

          <Button size="small" onClick={clearFilters}>
            Resetează
          </Button>
        </Stack>
      </Paper>

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 1 }}>
        <IconButton onClick={() => refetch()}>
          <RefreshIcon />
        </IconButton>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          size={isMobile ? 'small' : 'medium'}
        >
          {isMobile ? 'Adaugă' : 'Înregistrează Ridicare'}
        </Button>
      </Box>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : collections.length === 0 ? (
        <Alert severity="info">Nu există ridicări înregistrate.</Alert>
      ) : isMobile ? (
        collections.map(renderCollectionCard)
      ) : (
        renderCollectionTable()
      )}

      {/* Dialog */}
      <CreateCollectionDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </Box>
  );
};

export default CashCollectionsTab;
