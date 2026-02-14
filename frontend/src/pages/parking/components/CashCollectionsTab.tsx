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
  Collapse,
  Fade,
  Grow,
  alpha,
} from '@mui/material';
import DatePickerField from '../../../components/common/DatePickerField';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingIcon,
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
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));
  const { user } = useAppSelector((state) => state.auth);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedParkingLotId, setSelectedParkingLotId] = useState<string>('');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filtersExpanded, setFiltersExpanded] = useState(!isMobile);

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
    if (window.confirm('Esti sigur ca vrei sa stergi aceasta ridicare?')) {
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

  const renderCollectionCard = (collection: CashCollection, index: number) => (
    <Grow in={true} timeout={300 + index * 50} key={collection.id}>
      <Card
        sx={{
          mb: 2,
          borderRadius: 2,
          transition: 'all 0.2s ease',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
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
              <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                {collection.parkingLot?.name}
              </Typography>
              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{
                  color: 'success.main',
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                }}
              >
                {formatCurrency(collection.amount)}
              </Typography>
            </Box>

            <Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.04), p: 1.5, borderRadius: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>Automat:</strong> {collection.paymentMachine?.machineNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Ridicat de:</strong> {collection.collector?.fullName}
              </Typography>
            </Box>

            <Typography variant="caption" color="text.secondary">
              Data: {formatDate(collection.collectedAt)}
            </Typography>
            {collection.notes && (
              <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
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
    </Grow>
  );

  const renderCollectionTable = () => (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: 2,
        '& .MuiTableHead-root': {
          '& .MuiTableCell-root': {
            fontWeight: 700,
            bgcolor: alpha(theme.palette.success.main, 0.05),
          },
        },
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Parcare</TableCell>
            <TableCell>Automat</TableCell>
            <TableCell align="right">Suma</TableCell>
            <TableCell>Ridicat de</TableCell>
            <TableCell>Data</TableCell>
            <TableCell>Note</TableCell>
            {isAdmin && <TableCell align="right">Actiuni</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {collections.map((collection) => (
            <TableRow
              key={collection.id}
              sx={{
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  bgcolor: alpha(theme.palette.success.main, 0.04),
                },
              }}
            >
              <TableCell sx={{ fontWeight: 500 }}>{collection.parkingLot?.name}</TableCell>
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
        <Fade in={true} timeout={500}>
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              mb: 3,
              borderRadius: 2,
              background: theme.palette.mode === 'light'
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Background decorations */}
            <Box
              sx={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
              }}
            />

            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <Box
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                }}
              >
                <TrendingIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
              </Box>
              <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Sumar Totaluri
              </Typography>
            </Stack>

            <Card
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                mb: totals.byParkingLot.length > 0 ? 2 : 0,
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: { xs: 2, sm: 3 } }}>
                <Typography
                  variant="h3"
                  fontWeight="bold"
                  sx={{
                    fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' },
                    mb: 0.5,
                  }}
                >
                  {formatCurrency(totals.totalAmount)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total General ({totals.count} ridicari)
                </Typography>
              </CardContent>
            </Card>

            {totals.byParkingLot.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.9, fontWeight: 600 }}>
                  Per Parcare:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {totals.byParkingLot.map((item) => (
                    <Chip
                      key={item.parkingLotId}
                      label={`${item.parkingLotName}: ${formatCurrency(item.totalAmount)}`}
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontWeight: 600,
                        '& .MuiChip-label': {
                          fontSize: { xs: '0.75rem', sm: '0.813rem' },
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Paper>
        </Fade>
      )}

      {/* Filters */}
      <Grow in={true} timeout={600}>
        <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: 2 }}>
          {isMobile ? (
            <Box>
              <Button
                fullWidth
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                startIcon={<FilterIcon />}
                endIcon={filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{
                  justifyContent: 'space-between',
                  color: 'text.secondary',
                  fontWeight: 500,
                }}
              >
                Filtre
              </Button>
              <Collapse in={filtersExpanded}>
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <FormControl size="small" fullWidth>
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

                  <FormControl size="small" fullWidth disabled={!selectedParkingLotId}>
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

                  <DatePickerField
                    label="De la"
                    value={startDate || null}
                    onChange={(value) => setStartDate(value || '')}
                    size="small"
                    fullWidth
                  />

                  <DatePickerField
                    label="Pana la"
                    value={endDate || null}
                    onChange={(value) => setEndDate(value || '')}
                    size="small"
                    minDate={startDate || undefined}
                    fullWidth
                  />

                  <Button size="small" onClick={clearFilters} variant="outlined" sx={{ borderRadius: 2 }}>
                    Reseteaza Filtre
                  </Button>
                </Stack>
              </Collapse>
            </Box>
          ) : (
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterIcon color="action" />
                <Typography variant="subtitle2" fontWeight="600">
                  Filtre:
                </Typography>
              </Box>

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

              <Box sx={{ minWidth: 160 }}>
                <DatePickerField
                  label="De la"
                  value={startDate || null}
                  onChange={(value) => setStartDate(value || '')}
                  size="small"
                />
              </Box>

              <Box sx={{ minWidth: 160 }}>
                <DatePickerField
                  label="Pana la"
                  value={endDate || null}
                  onChange={(value) => setEndDate(value || '')}
                  size="small"
                  minDate={startDate || undefined}
                />
              </Box>

              <Button size="small" onClick={clearFilters} sx={{ borderRadius: 2 }}>
                Reseteaza
              </Button>
            </Stack>
          )}
        </Paper>
      </Grow>

      {/* Actions */}
      <Grow in={true} timeout={700}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 1 }}>
          <IconButton
            onClick={() => refetch()}
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) },
            }}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            size={isMobile ? 'small' : 'medium'}
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              px: { xs: 2, sm: 3 },
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              },
            }}
          >
            {isMobile ? 'Adauga' : 'Inregistreaza Ridicare'}
          </Button>
        </Box>
      </Grow>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={48} />
        </Box>
      ) : collections.length === 0 ? (
        <Fade in={true} timeout={600}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Nu exista ridicari inregistrate.
          </Alert>
        </Fade>
      ) : isMobile || isTablet ? (
        collections.map((collection, index) => renderCollectionCard(collection, index))
      ) : (
        <Grow in={true} timeout={800}>
          {renderCollectionTable()}
        </Grow>
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
