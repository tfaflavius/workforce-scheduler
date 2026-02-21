import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Chip,
  IconButton,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  alpha,
  useTheme,
  useMediaQuery,
  Divider,
  Switch,
  FormControlLabel,
  Collapse,
} from '@mui/material';
import {
  ShoppingCart as ShoppingIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  AccountBalance as InvestmentsIcon,
  Receipt as ExpensesIcon,
  Description as DocIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as CheckIcon,
  Schedule as PendingIcon,
  Close as CloseIcon,
  TrendingUp as TrendingIcon,
  Savings as SavingsIcon,
} from '@mui/icons-material';
import { GradientHeader, StatCard } from '../../components/common';
import {
  useGetBudgetPositionsQuery,
  useGetSummaryQuery,
  useCreateBudgetPositionMutation,
  useUpdateBudgetPositionMutation,
  useDeleteBudgetPositionMutation,
  useCreateAcquisitionMutation,
  useUpdateAcquisitionMutation,
  useDeleteAcquisitionMutation,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
} from '../../store/api/acquisitions.api';
import type {
  BudgetPosition,
  Acquisition,
  AcquisitionInvoice,
  BudgetCategory,
} from '../../types/acquisitions.types';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' lei';
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const AchizitiiPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State
  const [tabValue, setTabValue] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedPositions, setExpandedPositions] = useState<string[]>([]);

  // Dialog states
  const [bpDialogOpen, setBpDialogOpen] = useState(false);
  const [acqDialogOpen, setAcqDialogOpen] = useState(false);
  const [invDialogOpen, setInvDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Edit states
  const [editingBp, setEditingBp] = useState<BudgetPosition | null>(null);
  const [editingAcq, setEditingAcq] = useState<Acquisition | null>(null);
  const [editingInv, setEditingInv] = useState<AcquisitionInvoice | null>(null);
  const [selectedAcquisition, setSelectedAcquisition] = useState<Acquisition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'bp' | 'acq' | 'inv'; id: string; name: string } | null>(null);

  // Form states for Budget Position
  const [bpForm, setBpForm] = useState({
    name: '',
    totalAmount: '',
    description: '',
  });

  // Form states for Acquisition
  const [acqForm, setAcqForm] = useState({
    budgetPositionId: '',
    name: '',
    value: '',
    isFullPurchase: false,
    referat: '',
    caietDeSarcini: '',
    notaJustificativa: '',
    contractNumber: '',
    contractDate: '',
    ordinIncepere: '',
    procesVerbalReceptie: '',
    isServiceContract: false,
    serviceMonths: '',
    serviceStartDate: '',
    receptionDay: '',
    notes: '',
  });

  // Form states for Invoice
  const [invForm, setInvForm] = useState({
    acquisitionId: '',
    invoiceNumber: '',
    invoiceDate: '',
    amount: '',
    monthNumber: '',
    notes: '',
  });

  // Messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Current category based on tab
  const currentCategory: BudgetCategory = tabValue === 0 ? 'INVESTMENTS' : 'CURRENT_EXPENSES';

  // API hooks
  const { data: budgetPositions = [], isLoading } = useGetBudgetPositionsQuery({
    year: selectedYear,
    category: currentCategory,
  });
  const { data: summary } = useGetSummaryQuery({ year: selectedYear });

  // Mutations
  const [createBp, { isLoading: creatingBp }] = useCreateBudgetPositionMutation();
  const [updateBp, { isLoading: updatingBp }] = useUpdateBudgetPositionMutation();
  const [deleteBp] = useDeleteBudgetPositionMutation();
  const [createAcq, { isLoading: creatingAcq }] = useCreateAcquisitionMutation();
  const [updateAcq, { isLoading: updatingAcq }] = useUpdateAcquisitionMutation();
  const [deleteAcq] = useDeleteAcquisitionMutation();
  const [createInv, { isLoading: creatingInv }] = useCreateInvoiceMutation();
  const [updateInv, { isLoading: updatingInv }] = useUpdateInvoiceMutation();
  const [deleteInv] = useDeleteInvoiceMutation();

  // Current category summary
  const categorySummary = useMemo(() => {
    if (!summary) return null;
    return tabValue === 0 ? summary.investments : summary.currentExpenses;
  }, [summary, tabValue]);

  // Year options
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  }, []);

  // ===================== HANDLERS =====================

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const showError = (error: unknown) => {
    const msg = error && typeof error === 'object' && 'data' in error
      ? ((error as any).data as any)?.message || 'A aparut o eroare'
      : 'A aparut o eroare';
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // Budget Position handlers
  const handleOpenBpDialog = (bp?: BudgetPosition) => {
    if (bp) {
      setEditingBp(bp);
      setBpForm({
        name: bp.name,
        totalAmount: String(bp.totalAmount),
        description: bp.description || '',
      });
    } else {
      setEditingBp(null);
      setBpForm({ name: '', totalAmount: '', description: '' });
    }
    setBpDialogOpen(true);
  };

  const handleSaveBp = async () => {
    try {
      if (editingBp) {
        await updateBp({
          id: editingBp.id,
          data: {
            name: bpForm.name,
            totalAmount: Number(bpForm.totalAmount),
            description: bpForm.description || undefined,
          },
        }).unwrap();
        showSuccess('Pozitia bugetara a fost actualizata');
      } else {
        await createBp({
          year: selectedYear,
          category: currentCategory,
          name: bpForm.name,
          totalAmount: Number(bpForm.totalAmount),
          description: bpForm.description || undefined,
        }).unwrap();
        showSuccess('Pozitia bugetara a fost creata');
      }
      setBpDialogOpen(false);
    } catch (error) {
      showError(error);
    }
  };

  // Acquisition handlers
  const handleOpenAcqDialog = (budgetPositionId: string, acq?: Acquisition) => {
    if (acq) {
      setEditingAcq(acq);
      setAcqForm({
        budgetPositionId: acq.budgetPositionId,
        name: acq.name,
        value: String(acq.value),
        isFullPurchase: acq.isFullPurchase,
        referat: acq.referat || '',
        caietDeSarcini: acq.caietDeSarcini || '',
        notaJustificativa: acq.notaJustificativa || '',
        contractNumber: acq.contractNumber || '',
        contractDate: acq.contractDate ? acq.contractDate.split('T')[0] : '',
        ordinIncepere: acq.ordinIncepere || '',
        procesVerbalReceptie: acq.procesVerbalReceptie || '',
        isServiceContract: acq.isServiceContract,
        serviceMonths: acq.serviceMonths ? String(acq.serviceMonths) : '',
        serviceStartDate: acq.serviceStartDate ? acq.serviceStartDate.split('T')[0] : '',
        receptionDay: acq.receptionDay ? String(acq.receptionDay) : '',
        notes: acq.notes || '',
      });
    } else {
      setEditingAcq(null);
      setAcqForm({
        budgetPositionId,
        name: '',
        value: '',
        isFullPurchase: false,
        referat: '',
        caietDeSarcini: '',
        notaJustificativa: '',
        contractNumber: '',
        contractDate: '',
        ordinIncepere: '',
        procesVerbalReceptie: '',
        isServiceContract: false,
        serviceMonths: '',
        serviceStartDate: '',
        receptionDay: '',
        notes: '',
      });
    }
    setAcqDialogOpen(true);
  };

  const handleSaveAcq = async () => {
    try {
      const data: any = {
        name: acqForm.name,
        value: Number(acqForm.value),
        isFullPurchase: acqForm.isFullPurchase,
        referat: acqForm.referat || undefined,
        caietDeSarcini: acqForm.caietDeSarcini || undefined,
        notaJustificativa: acqForm.notaJustificativa || undefined,
        contractNumber: acqForm.contractNumber || undefined,
        contractDate: acqForm.contractDate || undefined,
        ordinIncepere: acqForm.ordinIncepere || undefined,
        procesVerbalReceptie: acqForm.procesVerbalReceptie || undefined,
        isServiceContract: acqForm.isServiceContract,
        serviceMonths: acqForm.serviceMonths ? Number(acqForm.serviceMonths) : undefined,
        serviceStartDate: acqForm.serviceStartDate || undefined,
        receptionDay: acqForm.receptionDay ? Number(acqForm.receptionDay) : undefined,
        notes: acqForm.notes || undefined,
      };

      if (editingAcq) {
        await updateAcq({ id: editingAcq.id, data }).unwrap();
        showSuccess('Achizitia a fost actualizata');
      } else {
        await createAcq({ ...data, budgetPositionId: acqForm.budgetPositionId }).unwrap();
        showSuccess('Achizitia a fost creata');
      }
      setAcqDialogOpen(false);
    } catch (error) {
      showError(error);
    }
  };

  // Invoice handlers
  const handleOpenInvDialog = (acquisitionId: string, inv?: AcquisitionInvoice) => {
    if (inv) {
      setEditingInv(inv);
      setInvForm({
        acquisitionId: inv.acquisitionId,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate ? inv.invoiceDate.split('T')[0] : '',
        amount: String(inv.amount),
        monthNumber: inv.monthNumber ? String(inv.monthNumber) : '',
        notes: inv.notes || '',
      });
    } else {
      setEditingInv(null);
      setInvForm({
        acquisitionId,
        invoiceNumber: '',
        invoiceDate: '',
        amount: '',
        monthNumber: '',
        notes: '',
      });
    }
    setInvDialogOpen(true);
  };

  const handleSaveInv = async () => {
    try {
      const data: any = {
        invoiceNumber: invForm.invoiceNumber,
        invoiceDate: invForm.invoiceDate,
        amount: Number(invForm.amount),
        monthNumber: invForm.monthNumber ? Number(invForm.monthNumber) : undefined,
        notes: invForm.notes || undefined,
      };

      if (editingInv) {
        await updateInv({ id: editingInv.id, data }).unwrap();
        showSuccess('Factura a fost actualizata');
      } else {
        await createInv({ ...data, acquisitionId: invForm.acquisitionId }).unwrap();
        showSuccess('Factura a fost adaugata');
      }
      setInvDialogOpen(false);
    } catch (error) {
      showError(error);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'bp') {
        await deleteBp(deleteTarget.id).unwrap();
        showSuccess('Pozitia bugetara a fost stearsa');
      } else if (deleteTarget.type === 'acq') {
        await deleteAcq(deleteTarget.id).unwrap();
        showSuccess('Achizitia a fost stearsa');
      } else if (deleteTarget.type === 'inv') {
        await deleteInv(deleteTarget.id).unwrap();
        showSuccess('Factura a fost stearsa');
      }
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      showError(error);
    }
  };

  const confirmDelete = (type: 'bp' | 'acq' | 'inv', id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setDeleteConfirmOpen(true);
  };

  const togglePosition = (id: string) => {
    setExpandedPositions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // ===================== RENDER =====================

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header */}
      <GradientHeader
        title="Achizitii"
        subtitle="Gestionare pozitii bugetare si achizitii"
        icon={<ShoppingIcon />}
        gradient="#10b981 0%, #059669 100%"
      />

      {/* Stats */}
      {categorySummary && (
        <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
          <Grid size={{ xs: 6, sm: 6, md: 4 }}>
            <StatCard
              title="Total Bugetat"
              value={formatCurrency(categorySummary.totalBudgeted)}
              icon={<MoneyIcon sx={{ color: '#10b981', fontSize: { xs: 24, sm: 28 } }} />}
              color="#10b981"
              bgColor={alpha('#10b981', 0.12)}
              subtitle={`${categorySummary.count} pozitii`}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 4 }}>
            <StatCard
              title="Total Cheltuit"
              value={formatCurrency(categorySummary.totalSpent)}
              icon={<TrendingIcon sx={{ color: '#f59e0b', fontSize: { xs: 24, sm: 28 } }} />}
              color="#f59e0b"
              bgColor={alpha('#f59e0b', 0.12)}
              subtitle={categorySummary.totalBudgeted > 0
                ? `${Math.round((categorySummary.totalSpent / categorySummary.totalBudgeted) * 100)}% utilizat`
                : '0%'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 12, md: 4 }}>
            <StatCard
              title="Ramas"
              value={formatCurrency(categorySummary.totalRemaining)}
              icon={<SavingsIcon sx={{ color: '#3b82f6', fontSize: { xs: 24, sm: 28 } }} />}
              color="#3b82f6"
              bgColor={alpha('#3b82f6', 0.12)}
            />
          </Grid>
        </Grid>
      )}

      {/* Tabs + Year selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{ flex: 1, minWidth: 0 }}
        >
          <Tab
            icon={<InvestmentsIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label="Investitii"
            sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
          />
          <Tab
            icon={<ExpensesIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label="Cheltuieli Curente"
            sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
          />
        </Tabs>

        <TextField
          select
          size="small"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          sx={{ minWidth: 100 }}
          label="An"
        >
          {yearOptions.map((y) => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </TextField>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenBpDialog()}
          sx={{
            bgcolor: '#10b981',
            '&:hover': { bgcolor: '#059669' },
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {isMobile ? 'Pozitie' : 'Adauga Pozitie'}
        </Button>
      </Box>

      {/* Loading */}
      {isLoading && <LinearProgress sx={{ mb: 2 }} color="success" />}

      {/* Empty state */}
      {!isLoading && budgetPositions.length === 0 && (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <ShoppingIcon sx={{ fontSize: 64, color: alpha('#10b981', 0.3), mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Nicio pozitie bugetara
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Adauga prima pozitie bugetara pentru {tabValue === 0 ? 'Investitii' : 'Cheltuieli Curente'} {selectedYear}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleOpenBpDialog()}
            color="success"
          >
            Adauga Pozitie Bugetara
          </Button>
        </Card>
      )}

      {/* Budget Positions */}
      {budgetPositions.map((bp) => {
        const isExpanded = expandedPositions.includes(bp.id);
        const usedPercent = bp.totalAmount > 0
          ? Math.min(Math.round((bp.spentAmount / bp.totalAmount) * 100), 100)
          : 0;

        return (
          <Card key={bp.id} sx={{ mb: 2, borderRadius: 3, overflow: 'visible' }}>
            {/* Position Header */}
            <CardContent
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: alpha('#10b981', 0.03) },
                pb: isExpanded ? 1 : undefined,
              }}
              onClick={() => togglePosition(bp.id)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <ExpandMoreIcon
                  sx={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s',
                    color: '#10b981',
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.15rem' } }}>
                    {bp.name}
                  </Typography>
                  {bp.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      {bp.description}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="Editare">
                    <IconButton size="small" onClick={() => handleOpenBpDialog(bp)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Sterge">
                    <IconButton size="small" color="error" onClick={() => confirmDelete('bp', bp.id, bp.name)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Amount info */}
              <Box sx={{ display: 'flex', gap: { xs: 1, sm: 3 }, flexWrap: 'wrap', ml: 4.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#10b981' }}>
                    {formatCurrency(bp.totalAmount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Cheltuit</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#f59e0b' }}>
                    {formatCurrency(bp.spentAmount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Ramas</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#3b82f6' }}>
                    {formatCurrency(bp.remainingAmount)}
                  </Typography>
                </Box>
              </Box>

              {/* Progress bar */}
              <Box sx={{ ml: 4.5, mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={usedPercent}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: alpha('#10b981', 0.12),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      bgcolor: usedPercent > 90 ? '#ef4444' : usedPercent > 70 ? '#f59e0b' : '#10b981',
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                  {usedPercent}% utilizat - {bp.acquisitions.length} achizitii
                </Typography>
              </Box>
            </CardContent>

            {/* Expanded: Acquisitions list */}
            <Collapse in={isExpanded}>
              <Divider />
              <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Achizitii
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenAcqDialog(bp.id)}
                    sx={{ textTransform: 'none', color: '#10b981' }}
                  >
                    Adauga Achizitie
                  </Button>
                </Box>

                {bp.acquisitions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    Nicio achizitie adaugata
                  </Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha('#10b981', 0.06) }}>
                          <TableCell sx={{ fontWeight: 700 }}>Denumire</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">Valoare</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">Facturat</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">Ramas</TableCell>
                          {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Contract</TableCell>}
                          {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Tip</TableCell>}
                          <TableCell sx={{ fontWeight: 700 }} align="center">Actiuni</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {bp.acquisitions.map((acq) => (
                          <TableRow
                            key={acq.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => {
                              setSelectedAcquisition(acq);
                              setDetailsDialogOpen(true);
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {acq.name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {formatCurrency(acq.value)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
                                {formatCurrency(acq.invoicedAmount)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                                {formatCurrency(acq.remainingAmount)}
                              </Typography>
                            </TableCell>
                            {!isMobile && (
                              <TableCell>
                                <Typography variant="body2">
                                  {acq.contractNumber || '-'}
                                </Typography>
                              </TableCell>
                            )}
                            {!isMobile && (
                              <TableCell>
                                <Stack direction="row" spacing={0.5}>
                                  {acq.isFullPurchase && (
                                    <Chip label="Totala" size="small" color="success" variant="outlined" />
                                  )}
                                  {acq.isServiceContract && (
                                    <Chip label={`Servicii ${acq.serviceMonths}L`} size="small" color="info" variant="outlined" />
                                  )}
                                </Stack>
                              </TableCell>
                            )}
                            <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                              <Stack direction="row" spacing={0.5} justifyContent="center">
                                <Tooltip title="Adauga factura">
                                  <IconButton size="small" color="success" onClick={() => handleOpenInvDialog(acq.id)}>
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Editare">
                                  <IconButton size="small" onClick={() => handleOpenAcqDialog(bp.id, acq)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Sterge">
                                  <IconButton size="small" color="error" onClick={() => confirmDelete('acq', acq.id, acq.name)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Collapse>
          </Card>
        );
      })}

      {/* ===================== DIALOGS ===================== */}

      {/* Budget Position Dialog */}
      <Dialog
        open={bpDialogOpen}
        onClose={() => setBpDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingBp ? 'Editare Pozitie Bugetara' : 'Pozitie Bugetara Noua'}
          <IconButton onClick={() => setBpDialogOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Denumire pozitie"
              value={bpForm.name}
              onChange={(e) => setBpForm({ ...bpForm, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Suma totala (lei)"
              type="number"
              value={bpForm.totalAmount}
              onChange={(e) => setBpForm({ ...bpForm, totalAmount: e.target.value })}
              required
              inputProps={{ min: 0, step: 0.01 }}
            />
            <TextField
              fullWidth
              label="Descriere (optional)"
              multiline
              rows={2}
              value={bpForm.description}
              onChange={(e) => setBpForm({ ...bpForm, description: e.target.value })}
            />
            <Alert severity="info" variant="outlined">
              Categorie: <strong>{tabValue === 0 ? 'Investitii' : 'Cheltuieli Curente'}</strong> | An: <strong>{selectedYear}</strong>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setBpDialogOpen(false)}>Anuleaza</Button>
          <Button
            variant="contained"
            onClick={handleSaveBp}
            disabled={creatingBp || updatingBp || !bpForm.name || !bpForm.totalAmount}
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
          >
            {creatingBp || updatingBp ? <CircularProgress size={24} /> : editingBp ? 'Salveaza' : 'Creeaza'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Acquisition Dialog */}
      <Dialog
        open={acqDialogOpen}
        onClose={() => setAcqDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingAcq ? 'Editare Achizitie' : 'Achizitie Noua'}
          <IconButton onClick={() => setAcqDialogOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#10b981' }}>
              Informatii Generale
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth
                  label="Denumire achizitie"
                  value={acqForm.name}
                  onChange={(e) => setAcqForm({ ...acqForm, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Valoare (lei)"
                  type="number"
                  value={acqForm.value}
                  onChange={(e) => setAcqForm({ ...acqForm, value: e.target.value })}
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
            </Grid>

            <FormControlLabel
              control={
                <Switch
                  checked={acqForm.isFullPurchase}
                  onChange={(e) => setAcqForm({ ...acqForm, isFullPurchase: e.target.checked })}
                  color="success"
                />
              }
              label="Achizitie totala (toata suma)"
            />

            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#10b981' }}>
              Documente
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Referat"
                  value={acqForm.referat}
                  onChange={(e) => setAcqForm({ ...acqForm, referat: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Caiet de Sarcini"
                  value={acqForm.caietDeSarcini}
                  onChange={(e) => setAcqForm({ ...acqForm, caietDeSarcini: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Nota Justificativa"
                  value={acqForm.notaJustificativa}
                  onChange={(e) => setAcqForm({ ...acqForm, notaJustificativa: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Numar Contract"
                  value={acqForm.contractNumber}
                  onChange={(e) => setAcqForm({ ...acqForm, contractNumber: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Data Contract"
                  type="date"
                  value={acqForm.contractDate}
                  onChange={(e) => setAcqForm({ ...acqForm, contractDate: e.target.value })}
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Ordin de Incepere"
                  value={acqForm.ordinIncepere}
                  onChange={(e) => setAcqForm({ ...acqForm, ordinIncepere: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Proces Verbal de Receptie"
                  value={acqForm.procesVerbalReceptie}
                  onChange={(e) => setAcqForm({ ...acqForm, procesVerbalReceptie: e.target.value })}
                  size="small"
                />
              </Grid>
            </Grid>

            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#10b981' }}>
              Prestari Servicii
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={acqForm.isServiceContract}
                  onChange={(e) => setAcqForm({ ...acqForm, isServiceContract: e.target.checked })}
                  color="info"
                />
              }
              label="Este contract de prestari servicii (plata lunara)"
            />

            <Collapse in={acqForm.isServiceContract}>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Numar luni"
                    type="number"
                    value={acqForm.serviceMonths}
                    onChange={(e) => setAcqForm({ ...acqForm, serviceMonths: e.target.value })}
                    size="small"
                    inputProps={{ min: 1, max: 120 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Data Start"
                    type="date"
                    value={acqForm.serviceStartDate}
                    onChange={(e) => setAcqForm({ ...acqForm, serviceStartDate: e.target.value })}
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Ziua receptiei (din luna)"
                    type="number"
                    value={acqForm.receptionDay}
                    onChange={(e) => setAcqForm({ ...acqForm, receptionDay: e.target.value })}
                    size="small"
                    inputProps={{ min: 1, max: 31 }}
                  />
                </Grid>
              </Grid>
            </Collapse>

            <TextField
              fullWidth
              label="Note (optional)"
              multiline
              rows={2}
              value={acqForm.notes}
              onChange={(e) => setAcqForm({ ...acqForm, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setAcqDialogOpen(false)}>Anuleaza</Button>
          <Button
            variant="contained"
            onClick={handleSaveAcq}
            disabled={creatingAcq || updatingAcq || !acqForm.name || !acqForm.value}
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
          >
            {creatingAcq || updatingAcq ? <CircularProgress size={24} /> : editingAcq ? 'Salveaza' : 'Creeaza'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog
        open={invDialogOpen}
        onClose={() => setInvDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingInv ? 'Editare Factura' : 'Factura Noua'}
          <IconButton onClick={() => setInvDialogOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Numar factura"
              value={invForm.invoiceNumber}
              onChange={(e) => setInvForm({ ...invForm, invoiceNumber: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Data factura"
              type="date"
              value={invForm.invoiceDate}
              onChange={(e) => setInvForm({ ...invForm, invoiceDate: e.target.value })}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              fullWidth
              label="Suma (lei)"
              type="number"
              value={invForm.amount}
              onChange={(e) => setInvForm({ ...invForm, amount: e.target.value })}
              required
              inputProps={{ min: 0, step: 0.01 }}
            />
            <TextField
              fullWidth
              label="Luna din contract (optional, pentru servicii)"
              type="number"
              value={invForm.monthNumber}
              onChange={(e) => setInvForm({ ...invForm, monthNumber: e.target.value })}
              inputProps={{ min: 1 }}
            />
            <TextField
              fullWidth
              label="Note (optional)"
              multiline
              rows={2}
              value={invForm.notes}
              onChange={(e) => setInvForm({ ...invForm, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setInvDialogOpen(false)}>Anuleaza</Button>
          <Button
            variant="contained"
            onClick={handleSaveInv}
            disabled={creatingInv || updatingInv || !invForm.invoiceNumber || !invForm.invoiceDate || !invForm.amount}
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
          >
            {creatingInv || updatingInv ? <CircularProgress size={24} /> : editingInv ? 'Salveaza' : 'Adauga'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Acquisition Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        {selectedAcquisition && (
          <>
            <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {selectedAcquisition.name}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  {selectedAcquisition.isFullPurchase && (
                    <Chip label="Achizitie totala" size="small" color="success" />
                  )}
                  {selectedAcquisition.isServiceContract && (
                    <Chip label={`Servicii - ${selectedAcquisition.serviceMonths} luni`} size="small" color="info" />
                  )}
                </Stack>
              </Box>
              <IconButton onClick={() => setDetailsDialogOpen(false)}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent>
              {/* Summary cards */}
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid size={{ xs: 4 }}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: alpha('#10b981', 0.06), borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">Valoare</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#10b981' }}>
                      {formatCurrency(selectedAcquisition.value)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: alpha('#f59e0b', 0.06), borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">Facturat</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                      {formatCurrency(selectedAcquisition.invoicedAmount)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: alpha('#3b82f6', 0.06), borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">Ramas</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                      {formatCurrency(selectedAcquisition.remainingAmount)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Documents section */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Documente</Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {[
                  { label: 'Referat', value: selectedAcquisition.referat },
                  { label: 'Caiet de Sarcini', value: selectedAcquisition.caietDeSarcini },
                  { label: 'Nota Justificativa', value: selectedAcquisition.notaJustificativa },
                  { label: 'Contract', value: selectedAcquisition.contractNumber },
                  { label: 'Data Contract', value: selectedAcquisition.contractDate ? formatDate(selectedAcquisition.contractDate) : null },
                  { label: 'Ordin Incepere', value: selectedAcquisition.ordinIncepere },
                  { label: 'PV Receptie', value: selectedAcquisition.procesVerbalReceptie },
                ].map((doc, idx) => (
                  <Grid size={{ xs: 6, sm: 6, md: 4 }} key={idx}>
                    <Paper
                      variant="outlined"
                      sx={{ p: 1, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <DocIcon sx={{ fontSize: 18, color: doc.value ? '#10b981' : '#d1d5db' }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                          {doc.label}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }} noWrap>
                          {doc.value || '-'}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Service contract monthly schedule */}
              {selectedAcquisition.isServiceContract && selectedAcquisition.monthlySchedule.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Program Lunar ({selectedAcquisition.serviceMonths} luni)
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha('#3b82f6', 0.06) }}>
                          <TableCell sx={{ fontWeight: 700 }}>Luna</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">Suma asteptata</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Factura</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedAcquisition.monthlySchedule.map((month) => (
                          <TableRow key={month.monthNumber}>
                            <TableCell>Luna {month.monthNumber}</TableCell>
                            <TableCell>{formatDate(month.date)}</TableCell>
                            <TableCell align="right">{formatCurrency(month.expectedAmount)}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={month.status === 'INVOICED' ? 'Facturat' : 'In asteptare'}
                                color={month.status === 'INVOICED' ? 'success' : 'default'}
                                icon={month.status === 'INVOICED' ? <CheckIcon /> : <PendingIcon />}
                              />
                            </TableCell>
                            <TableCell>
                              {month.invoice ? (
                                <Typography variant="body2">
                                  {month.invoice.invoiceNumber} - {formatCurrency(month.invoice.amount)}
                                </Typography>
                              ) : (
                                <Button
                                  size="small"
                                  startIcon={<AddIcon />}
                                  onClick={() => {
                                    setDetailsDialogOpen(false);
                                    handleOpenInvDialog(selectedAcquisition.id);
                                    setInvForm((prev) => ({ ...prev, monthNumber: String(month.monthNumber) }));
                                  }}
                                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                >
                                  Adauga
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {/* Invoices list */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Facturi ({selectedAcquisition.invoices?.length || 0})
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    handleOpenInvDialog(selectedAcquisition.id);
                  }}
                  sx={{ textTransform: 'none', color: '#10b981' }}
                >
                  Adauga Factura
                </Button>
              </Box>

              {selectedAcquisition.invoices && selectedAcquisition.invoices.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha('#f59e0b', 0.06) }}>
                        <TableCell sx={{ fontWeight: 700 }}>Nr. Factura</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Suma</TableCell>
                        {selectedAcquisition.isServiceContract && (
                          <TableCell sx={{ fontWeight: 700 }}>Luna</TableCell>
                        )}
                        <TableCell sx={{ fontWeight: 700 }}>Note</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">Actiuni</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedAcquisition.invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell>{inv.invoiceNumber}</TableCell>
                          <TableCell>{formatDate(inv.invoiceDate)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {formatCurrency(inv.amount)}
                          </TableCell>
                          {selectedAcquisition.isServiceContract && (
                            <TableCell>{inv.monthNumber ? `Luna ${inv.monthNumber}` : '-'}</TableCell>
                          )}
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                              {inv.notes || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <Tooltip title="Editare">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setDetailsDialogOpen(false);
                                    handleOpenInvDialog(selectedAcquisition.id, inv);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Sterge">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setDetailsDialogOpen(false);
                                    confirmDelete('inv', inv.id, inv.invoiceNumber);
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Nicio factura adaugata
                  </Typography>
                </Paper>
              )}

              {selectedAcquisition.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Note</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                    <Typography variant="body2">{selectedAcquisition.notes}</Typography>
                  </Paper>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
              <Button onClick={() => setDetailsDialogOpen(false)}>Inchide</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirmare Stergere</DialogTitle>
        <DialogContent>
          <Typography>
            Esti sigur ca vrei sa stergi{' '}
            {deleteTarget?.type === 'bp' ? 'pozitia bugetara' : deleteTarget?.type === 'acq' ? 'achizitia' : 'factura'}{' '}
            <strong>{deleteTarget?.name}</strong>?
          </Typography>
          {deleteTarget?.type === 'bp' && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Toate achizitiile si facturile asociate vor fi sterse!
            </Alert>
          )}
          {deleteTarget?.type === 'acq' && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Toate facturile asociate vor fi sterse!
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Anuleaza</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Sterge
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error messages */}
      <Snackbar open={!!successMessage} autoHideDuration={4000} onClose={() => setSuccessMessage(null)}>
        <Alert onClose={() => setSuccessMessage(null)} severity="success" variant="filled" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
      <Snackbar open={!!errorMessage} autoHideDuration={5000} onClose={() => setErrorMessage(null)}>
        <Alert onClose={() => setErrorMessage(null)} severity="error" variant="filled" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AchizitiiPage;
