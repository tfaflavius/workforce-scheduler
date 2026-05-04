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
} from '@mui/icons-material';
import {
  useGetBudgetPositionsQuery,
  useGetSummaryQuery,
} from '../../../store/api/acquisitions.api';
import type { BudgetCategory, BudgetPosition } from '../../../types/acquisitions.types';
import { StatCard } from '../../../components/common';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('ro-RO', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + ' lei';

const BudgetSavingsTab: React.FC = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [category, setCategory] = useState<BudgetCategory | 'ALL'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        Aici vezi <strong>cat a ramas</strong> de cheltuit din fiecare pozitie bugetara,
        sortat de la cea mai mare suma ramasa la cea mai mica. Foloseste aceste sume
        ca sa planifici rectificarile bugetare si sa creezi pozitii noi pentru economii.
      </Alert>

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
