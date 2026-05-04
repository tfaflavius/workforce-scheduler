import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Stack,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Wallet as WalletIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import {
  useGetInvestmentAnnualBudgetQuery,
  useUpsertInvestmentAnnualBudgetMutation,
} from '../../../store/api/investments.api';
import { useAppSelector } from '../../../store/hooks';
import { isAdminOrAbove } from '../../../utils/roleHelpers';
import { useSnackbar } from '../../../contexts/SnackbarContext';

interface Props {
  year: number;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('ro-RO', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + ' lei';

/**
 * Compact annual investment budget envelope card. Designed to live on the
 * main Investitii tab so the user always sees the yearly total + how much is
 * still uncommitted while they work with budget positions and acquisitions.
 *
 * For the full breakdown / per-position remainders / change history, the user
 * goes to the dedicated "Rest Bugetar" tab.
 */
const InvestmentAnnualBudgetCard: React.FC<Props> = ({ year }) => {
  const theme = useTheme();
  const { user } = useAppSelector((s) => s.auth);
  const { notifySuccess, notifyError } = useSnackbar();
  const isAdmin = isAdminOrAbove(user?.role);
  const isManager = user?.role === 'MANAGER';
  const canEdit = isAdmin || isManager;

  const { data: budget } = useGetInvestmentAnnualBudgetQuery(year);
  const [upsert, { isLoading: saving }] = useUpsertInvestmentAnnualBudgetMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  const openDialog = () => {
    setAmountInput(budget?.totalAmount ? String(budget.totalAmount) : '');
    setNotesInput(budget?.notes || '');
    setDialogOpen(true);
  };

  const save = async () => {
    const parsed = Number(amountInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0) {
      notifyError('Introdu o suma valida (numar pozitiv)');
      return;
    }
    try {
      await upsert({ year, totalAmount: parsed, notes: notesInput || undefined }).unwrap();
      notifySuccess(`Buget anual ${year} setat la ${parsed.toLocaleString('ro-RO')} lei`);
      setDialogOpen(false);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Eroare la salvare';
      notifyError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const totalAmount = Number(budget?.totalAmount || 0);
  const allocated = Number(budget?.allocatedToPositions || 0);
  const available = Number(budget?.availableForNewPositions || 0);
  const usedPct = totalAmount > 0 ? Math.min(100, (allocated / totalAmount) * 100) : 0;
  const overAllocated = available < 0;

  return (
    <>
      <Card
        sx={{
          mb: 2,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.10)}, ${alpha(theme.palette.primary.main, 0.06)})`,
          border: `1px solid ${alpha(theme.palette.success.main, 0.25)}`,
        }}
      >
        <CardContent sx={{ py: { xs: 1.5, sm: 2 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <WalletIcon sx={{ fontSize: 32, color: 'success.main' }} />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  BUGET ANUAL TOTAL INVESTITII — {year}
                </Typography>
                <Typography variant="h6" fontWeight={800} color="success.dark">
                  {totalAmount > 0 ? formatCurrency(totalAmount) : 'Nesetat'}
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
              {totalAmount > 0 && (
                <>
                  <Box sx={{ minWidth: 110 }}>
                    <Typography variant="caption" color="text.secondary">
                      Alocat la pozitii
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {formatCurrency(allocated)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      minWidth: 130,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1.5,
                      bgcolor: overAllocated
                        ? alpha(theme.palette.error.main, 0.12)
                        : alpha(theme.palette.success.main, 0.12),
                      border: `1px solid ${alpha(
                        overAllocated ? theme.palette.error.main : theme.palette.success.main,
                        0.4,
                      )}`,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Disponibil pt rectificari
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight={800}
                      color={overAllocated ? 'error.main' : 'success.main'}
                    >
                      {formatCurrency(available)}
                    </Typography>
                  </Box>
                </>
              )}
              {canEdit && (
                <Button
                  variant="outlined"
                  color="success"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={openDialog}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  {totalAmount > 0 ? 'Modifica' : 'Seteaza'}
                </Button>
              )}
            </Stack>
          </Stack>

          {totalAmount > 0 && (
            <Tooltip title={`${usedPct.toFixed(1)}% alocat la pozitii`} arrow>
              <LinearProgress
                variant="determinate"
                value={usedPct}
                sx={{
                  mt: 1.5,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: alpha(theme.palette.success.main, 0.15),
                  '& .MuiLinearProgress-bar': {
                    bgcolor: overAllocated ? theme.palette.error.main : theme.palette.success.main,
                    borderRadius: 4,
                  },
                }}
              />
            </Tooltip>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Valoare anuala investitii — {year}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Suma totala anuala (lei)"
              type="number"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              fullWidth
              inputProps={{ min: 0, step: '0.01' }}
              autoFocus
            />
            <TextField
              label="Note (optional)"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Ex: hotarare consiliu nr X / data Y"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Anuleaza
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={save}
            disabled={saving}
            sx={{ textTransform: 'none' }}
          >
            {saving ? 'Se salveaza...' : 'Salveaza'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InvestmentAnnualBudgetCard;
