import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  Grid,
  Chip,
  TextField,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Collapse,
  IconButton,
  Tooltip,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Savings as SavingsIcon,
  AccountBalance as InvestmentsIcon,
  Receipt as ExpensesIcon,
  TrendingUp as TrendingIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  AttachMoney as MoneyIcon,
  Edit as EditIcon,
  Wallet as WalletIcon,
  History as HistoryIcon,
  ArrowDownward as DownIcon,
  ArrowUpward as UpIcon,
} from '@mui/icons-material';
import {
  useGetBudgetPositionsQuery,
  useGetSummaryQuery,
} from '../../../store/api/acquisitions.api';
import {
  useGetInvestmentAnnualBudgetQuery,
  useUpsertInvestmentAnnualBudgetMutation,
  useGetInvestmentAnnualBudgetHistoryQuery,
} from '../../../store/api/investments.api';
import type { BudgetCategory, BudgetPosition } from '../../../types/acquisitions.types';
import { StatCard } from '../../../components/common';
import { useAppSelector } from '../../../store/hooks';
import { isAdminOrAbove } from '../../../utils/roleHelpers';
import { useSnackbar } from '../../../contexts/SnackbarContext';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('ro-RO', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + ' lei';

const BudgetSavingsTab: React.FC = () => {
  const theme = useTheme();
  const { user } = useAppSelector((s) => s.auth);
  const { notifySuccess, notifyError } = useSnackbar();
  const isAdmin = isAdminOrAbove(user?.role);
  const isManager = user?.role === 'MANAGER';
  const canEditAnnual = isAdmin || isManager;

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [category, setCategory] = useState<BudgetCategory | 'ALL'>('INVESTMENTS');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Annual investment envelope (user-set total + computed allocations)
  const { data: annualBudget } = useGetInvestmentAnnualBudgetQuery(year);
  const [upsertAnnualBudget, { isLoading: savingAnnual }] = useUpsertInvestmentAnnualBudgetMutation();
  const [annualDialogOpen, setAnnualDialogOpen] = useState(false);
  const [annualInput, setAnnualInput] = useState('');
  const [annualNotes, setAnnualNotes] = useState('');

  // History dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const { data: historyEntries = [] } = useGetInvestmentAnnualBudgetHistoryQuery(
    year,
    { skip: !historyDialogOpen },
  );

  const openAnnualDialog = () => {
    setAnnualInput(annualBudget?.totalAmount ? String(annualBudget.totalAmount) : '');
    setAnnualNotes(annualBudget?.notes || '');
    setAnnualDialogOpen(true);
  };

  const saveAnnual = async () => {
    const parsed = Number(annualInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0) {
      notifyError('Introdu o suma valida (numar pozitiv)');
      return;
    }
    try {
      await upsertAnnualBudget({
        year,
        totalAmount: parsed,
        notes: annualNotes || undefined,
      }).unwrap();
      notifySuccess(`Buget anual ${year} setat la ${parsed.toLocaleString('ro-RO')} lei`);
      setAnnualDialogOpen(false);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Eroare la salvarea bugetului';
      notifyError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const yearOptions = useMemo(() => {
    const out: number[] = [];
    for (let y = currentYear + 1; y >= currentYear - 4; y--) out.push(y);
    return out;
  }, [currentYear]);

  const { data: positions = [], isLoading } = useGetBudgetPositionsQuery({
    year,
    category: category === 'ALL' ? undefined : category,
  });
  const { data: summary } = useGetSummaryQuery({ year });

  // Sort positions by remainingAmount DESC so the biggest savings show first
  const sorted = useMemo(
    () =>
      [...positions].sort(
        (a, b) => Number(b.remainingAmount || 0) - Number(a.remainingAmount || 0),
      ),
    [positions],
  );

  // Aggregates across the filtered list
  const aggregates = useMemo(() => {
    const filtered = sorted;
    const totalBudgeted = filtered.reduce((s, p) => s + Number(p.totalAmount || 0), 0);
    const totalSpent = filtered.reduce((s, p) => s + Number(p.spentAmount || 0), 0);
    const totalRemaining = filtered.reduce(
      (s, p) => s + Number(p.remainingAmount || 0),
      0,
    );
    const positionsWithRemainder = filtered.filter(
      (p) => Number(p.remainingAmount || 0) > 0.01,
    ).length;
    return { totalBudgeted, totalSpent, totalRemaining, positionsWithRemainder };
  }, [sorted]);

  const usedPercent =
    aggregates.totalBudgeted > 0
      ? Math.round((aggregates.totalSpent / aggregates.totalBudgeted) * 100)
      : 0;

  const renderPositionRow = (bp: BudgetPosition) => {
    const remaining = Number(bp.remainingAmount || 0);
    const total = Number(bp.totalAmount || 0);
    const spent = Number(bp.spentAmount || 0);
    const remainingPct = total > 0 ? (remaining / total) * 100 : 0;
    const acquisitionCount = bp.acquisitions?.length || 0;
    const hasRemainder = remaining > 0.01;
    const isExpanded = expandedId === bp.id;

    return (
      <React.Fragment key={bp.id}>
        <TableRow
          hover
          sx={{
            '& > *': { borderBottom: 'unset' },
            cursor: acquisitionCount > 0 ? 'pointer' : 'default',
          }}
          onClick={() => acquisitionCount > 0 && setExpandedId(isExpanded ? null : bp.id)}
        >
          <TableCell sx={{ width: 32 }}>
            {acquisitionCount > 0 && (
              <IconButton size="small">
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </TableCell>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="body2" fontWeight={600}>
                {bp.name}
              </Typography>
              <Chip
                size="small"
                label={bp.category === 'INVESTMENTS' ? 'Investitii' : 'Curente'}
                color={bp.category === 'INVESTMENTS' ? 'success' : 'warning'}
                variant="outlined"
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {acquisitionCount} achizitii
            </Typography>
          </TableCell>
          <TableCell align="right">
            <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
              {formatCurrency(total)}
            </Typography>
          </TableCell>
          <TableCell align="right">
            <Typography variant="body2" color="warning.dark" sx={{ whiteSpace: 'nowrap' }}>
              {formatCurrency(spent)}
            </Typography>
          </TableCell>
          <TableCell align="right">
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{
                whiteSpace: 'nowrap',
                color: hasRemainder ? 'success.main' : 'text.disabled',
              }}
            >
              {formatCurrency(remaining)}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block' }}
            >
              {remainingPct.toFixed(1)}% din buget
            </Typography>
          </TableCell>
          <TableCell sx={{ width: 140, minWidth: 100 }}>
            <Tooltip
              title={`${(100 - remainingPct).toFixed(1)}% utilizat`}
              placement="top"
              arrow
            >
              <LinearProgress
                variant="determinate"
                value={100 - remainingPct}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: alpha(theme.palette.success.main, 0.15),
                  '& .MuiLinearProgress-bar': {
                    bgcolor:
                      100 - remainingPct >= 100
                        ? theme.palette.error.main
                        : 100 - remainingPct >= 80
                        ? theme.palette.warning.main
                        : theme.palette.success.main,
                    borderRadius: 4,
                  },
                }}
              />
            </Tooltip>
          </TableCell>
        </TableRow>

        {/* Expanded acquisitions */}
        {acquisitionCount > 0 && (
          <TableRow>
            <TableCell colSpan={6} sx={{ p: 0, borderBottom: isExpanded ? undefined : 'none' }}>
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Box sx={{ px: 2, py: 2, bgcolor: alpha(theme.palette.action.hover, 0.4) }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    ACHIZITII IN ACEASTA POZITIE
                  </Typography>
                  <Table size="small" sx={{ mt: 1 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Nume</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Valoare</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Facturat</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Ramas</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bp.acquisitions.map((acq) => {
                        const acqRemaining = Number(acq.remainingAmount || 0);
                        const acqHasRemainder = acqRemaining > 0.01;
                        return (
                          <TableRow key={acq.id}>
                            <TableCell>
                              <Typography variant="body2">{acq.name}</Typography>
                              {acq.isServiceContract && (
                                <Chip
                                  label="Contract servicii"
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 18, fontSize: '0.6rem', mt: 0.5 }}
                                />
                              )}
                            </TableCell>
                            <TableCell align="right">{formatCurrency(Number(acq.value || 0))}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="warning.dark">
                                {formatCurrency(Number(acq.invoicedAmount || 0))}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                color={acqHasRemainder ? 'success.main' : 'text.disabled'}
                              >
                                {formatCurrency(acqRemaining)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              </Collapse>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  return (
    <Box>
      <Alert
        severity="info"
        icon={<InfoIcon />}
        sx={{ mb: 2, borderRadius: 2 }}
      >
        Aici vezi <strong>cat a ramas</strong> de cheltuit din fiecare pozitie bugetara
        si <strong>cat din valoarea anuala totala</strong> mai poti aloca la pozitii noi
        prin rectificari bugetare. Sortarea e de la cea mai mare suma ramasa la cea mai mica.
      </Alert>

      {/* Annual investment envelope banner — visible regardless of category filter */}
      <Card
        sx={{
          mb: 2,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.12)}, ${alpha(theme.palette.primary.main, 0.08)})`,
          border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
        }}
      >
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <WalletIcon sx={{ fontSize: 36, color: 'success.main' }} />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  VALOARE ANUALA TOTALA INVESTITII — {year}
                </Typography>
                <Typography variant="h5" fontWeight={800} color="success.dark">
                  {formatCurrency(Number(annualBudget?.totalAmount || 0))}
                </Typography>
                {annualBudget?.notes && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {annualBudget.notes}
                  </Typography>
                )}
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}>
              <Button
                variant="text"
                color="primary"
                size="small"
                startIcon={<HistoryIcon />}
                onClick={() => setHistoryDialogOpen(true)}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Istoric
              </Button>
              {canEditAnnual && (
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<EditIcon />}
                  onClick={openAnnualDialog}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  {annualBudget?.totalAmount ? 'Modifica' : 'Seteaza valoare anuala'}
                </Button>
              )}
            </Stack>
          </Stack>

          {Number(annualBudget?.totalAmount || 0) > 0 && (
            <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box sx={{ p: 1.25, bgcolor: 'background.paper', borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Alocat la pozitii
                  </Typography>
                  <Typography variant="body1" fontWeight={700} color="primary.main">
                    {formatCurrency(Number(annualBudget?.allocatedToPositions || 0))}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box sx={{ p: 1.25, bgcolor: 'background.paper', borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Cheltuit pe achizitii
                  </Typography>
                  <Typography variant="body1" fontWeight={700} color="warning.dark">
                    {formatCurrency(Number(annualBudget?.spentOnAcquisitions || 0))}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box sx={{ p: 1.25, bgcolor: 'background.paper', borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Ramas in pozitii
                  </Typography>
                  <Typography variant="body1" fontWeight={700} color="info.main">
                    {formatCurrency(Number(annualBudget?.remainingInPositions || 0))}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box
                  sx={{
                    p: 1.25,
                    bgcolor: alpha(theme.palette.success.main, 0.12),
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Disponibil pt pozitii noi
                  </Typography>
                  <Typography variant="body1" fontWeight={800} color="success.main">
                    {formatCurrency(Number(annualBudget?.availableForNewPositions || 0))}
                  </Typography>
                </Box>
              </Grid>

              {/* Progress bar showing how much of annual envelope is used */}
              <Grid size={12}>
                <Tooltip
                  title={`${(((Number(annualBudget?.allocatedToPositions || 0) / (Number(annualBudget?.totalAmount) || 1)) * 100) || 0).toFixed(1)}% din buget alocat la pozitii`}
                  arrow
                >
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(
                      100,
                      Number(annualBudget?.totalAmount)
                        ? (Number(annualBudget?.allocatedToPositions) / Number(annualBudget?.totalAmount)) * 100
                        : 0,
                    )}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: alpha(theme.palette.success.main, 0.15),
                      '& .MuiLinearProgress-bar': {
                        bgcolor:
                          Number(annualBudget?.availableForNewPositions || 0) < 0
                            ? theme.palette.error.main
                            : theme.palette.success.main,
                        borderRadius: 5,
                      },
                    }}
                  />
                </Tooltip>
              </Grid>
            </Grid>
          )}

          {Number(annualBudget?.availableForNewPositions || 0) < 0 && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 1.5 }}>
              Atentie: ai alocat la pozitii mai mult decat valoarea anuala totala. Modifica
              valoarea anuala sau redu sumele unor pozitii.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* History dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon /> Istoric modificari valoare anuala — {year}
        </DialogTitle>
        <DialogContent dividers>
          {historyEntries.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">
                Nicio modificare inregistrata pentru anul {year}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {historyEntries.map((entry, idx) => {
                const oldAmt = entry.oldAmount;
                const newAmt = entry.newAmount;
                const isIncrease = oldAmt !== null && newAmt > oldAmt;
                const isDecrease = oldAmt !== null && newAmt < oldAmt;
                const delta = oldAmt !== null ? newAmt - oldAmt : null;
                const isFirst = idx === historyEntries.length - 1; // oldest = first creation

                return (
                  <Card
                    key={entry.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      borderLeft: `4px solid ${
                        isIncrease
                          ? theme.palette.success.main
                          : isDecrease
                          ? theme.palette.warning.main
                          : theme.palette.primary.main
                      }`,
                    }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                      >
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            {isFirst ? (
                              <Chip label="Setare initiala" size="small" color="primary" />
                            ) : isIncrease ? (
                              <Chip
                                icon={<UpIcon sx={{ fontSize: 14 }} />}
                                label="Marit"
                                size="small"
                                color="success"
                              />
                            ) : isDecrease ? (
                              <Chip
                                icon={<DownIcon sx={{ fontSize: 14 }} />}
                                label="Redus"
                                size="small"
                                color="warning"
                              />
                            ) : (
                              <Chip label="Modificare note" size="small" variant="outlined" />
                            )}
                            <Typography variant="body2" fontWeight={600}>
                              {formatCurrency(newAmt)}
                            </Typography>
                            {oldAmt !== null && (
                              <Typography variant="caption" color="text.secondary">
                                (de la {formatCurrency(oldAmt)})
                              </Typography>
                            )}
                            {delta !== null && delta !== 0 && (
                              <Typography
                                variant="caption"
                                fontWeight={700}
                                color={isIncrease ? 'success.main' : 'warning.dark'}
                              >
                                {delta > 0 ? '+' : ''}
                                {formatCurrency(delta)}
                              </Typography>
                            )}
                          </Stack>
                          {entry.newNotes && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              Note: {entry.newNotes}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {entry.changedBy?.fullName || 'Utilizator necunoscut'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(entry.createdAt).toLocaleString('ro-RO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setHistoryDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Inchide
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit annual budget dialog */}
      <Dialog open={annualDialogOpen} onClose={() => setAnnualDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Valoare anuala investitii — {year}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Suma totala anuala (lei)"
              type="number"
              value={annualInput}
              onChange={(e) => setAnnualInput(e.target.value)}
              fullWidth
              inputProps={{ min: 0, step: '0.01' }}
              autoFocus
            />
            <TextField
              label="Note (optional)"
              value={annualNotes}
              onChange={(e) => setAnnualNotes(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Ex: hotarare consiliu nr X / data Y"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAnnualDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Anuleaza
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={saveAnnual}
            disabled={savingAnnual}
            sx={{ textTransform: 'none' }}
          >
            {savingAnnual ? 'Se salveaza...' : 'Salveaza'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Filters */}
      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent sx={{ py: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField
                select
                size="small"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                label="An"
                sx={{ minWidth: 110 }}
              >
                {yearOptions.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </TextField>

              <ToggleButtonGroup
                size="small"
                value={category}
                exclusive
                onChange={(_, v) => v && setCategory(v)}
                aria-label="Categorie"
              >
                <ToggleButton value="ALL" sx={{ textTransform: 'none' }}>
                  Toate
                </ToggleButton>
                <ToggleButton value="INVESTMENTS" sx={{ textTransform: 'none' }}>
                  <InvestmentsIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  Investitii
                </ToggleButton>
                <ToggleButton value="CURRENT_EXPENSES" sx={{ textTransform: 'none' }}>
                  <ExpensesIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  Curente
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              {sorted.length} pozitii • {aggregates.positionsWithRemainder} cu rest
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Top stats */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Total Bugetat"
            value={formatCurrency(aggregates.totalBudgeted)}
            icon={<MoneyIcon sx={{ color: 'primary.main', fontSize: { xs: 24, sm: 28 } }} />}
            color={theme.palette.primary.main}
            bgColor={alpha(theme.palette.primary.main, 0.12)}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Total Cheltuit"
            value={formatCurrency(aggregates.totalSpent)}
            icon={<TrendingIcon sx={{ color: 'warning.main', fontSize: { xs: 24, sm: 28 } }} />}
            color={theme.palette.warning.main}
            bgColor={alpha(theme.palette.warning.main, 0.12)}
            subtitle={`${usedPercent}% utilizat`}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard
            title="Total Ramas"
            value={formatCurrency(aggregates.totalRemaining)}
            icon={<SavingsIcon sx={{ color: 'success.main', fontSize: { xs: 24, sm: 28 } }} />}
            color={theme.palette.success.main}
            bgColor={alpha(theme.palette.success.main, 0.12)}
            subtitle="Disponibil pentru rectificari"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard
            title="Pozitii cu Rest"
            value={String(aggregates.positionsWithRemainder)}
            icon={<InfoIcon sx={{ color: 'info.main', fontSize: { xs: 24, sm: 28 } }} />}
            color={theme.palette.info.main}
            bgColor={alpha(theme.palette.info.main, 0.12)}
            subtitle={`din ${sorted.length} totale`}
          />
        </Grid>
      </Grid>

      {/* Per-summary banner cross-category */}
      {summary && category === 'ALL' && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <Card sx={{ flex: 1, borderRadius: 2, border: `1px solid ${alpha(theme.palette.success.main, 0.3)}` }}>
            <CardContent sx={{ py: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <InvestmentsIcon sx={{ color: 'success.main' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Investitii — Ramas
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">
                    {formatCurrency(summary.investments?.totalRemaining || 0)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1, borderRadius: 2, border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}` }}>
            <CardContent sx={{ py: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ExpensesIcon sx={{ color: 'warning.main' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Cheltuieli Curente — Ramas
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="warning.main">
                    {formatCurrency(summary.currentExpenses?.totalRemaining || 0)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      {isLoading && <LinearProgress sx={{ mb: 2 }} color="success" />}

      {/* Empty state */}
      {!isLoading && sorted.length === 0 && (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <SavingsIcon sx={{ fontSize: 64, color: alpha(theme.palette.success.main, 0.3), mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Nicio pozitie bugetara pentru anul {year}
          </Typography>
        </Card>
      )}

      {/* Table */}
      {!isLoading && sorted.length > 0 && (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            maxHeight: { xs: 'calc(100dvh - 480px)', sm: 'calc(100dvh - 420px)' },
            overflowX: 'auto',
            '-webkit-overflow-scrolling': 'touch',
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.success.main, 0.08), minWidth: 240 }}>
                  Pozitie bugetara
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.success.main, 0.08) }}>
                  Total
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.success.main, 0.08) }}>
                  Cheltuit
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.success.main, 0.08) }}>
                  Ramas
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.success.main, 0.08) }}>
                  Utilizare
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{sorted.map((bp) => renderPositionRow(bp))}</TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default BudgetSavingsTab;
