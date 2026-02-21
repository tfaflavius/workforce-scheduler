import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  alpha,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Assignment as MyDaysIcon,
  CheckCircle as CompleteIcon,
  Cancel as UnclaimIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import {
  useGetMyClaimedDaysQuery,
  useUnclaimDayMutation,
  useCompleteDayMutation,
} from '../../../store/api/pvDisplay.api';
import type { PvDisplayDay } from '../../../types/pv-display.types';
import { PV_DAY_STATUS_LABELS, PV_DAY_STATUS_COLORS } from '../../../types/pv-display.types';

const PvMyDaysTab: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  const { data: myDays = [], isLoading, error } = useGetMyClaimedDaysQuery();
  const [unclaimDay, { isLoading: isUnclaiming }] = useUnclaimDayMutation();
  const [completeDay, { isLoading: isCompleting }] = useCompleteDayMutation();

  // Complete dialog state
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completeDayId, setCompleteDayId] = useState<string | null>(null);
  const [observations, setObservations] = useState('');

  const handleUnclaim = async (dayId: string) => {
    if (!window.confirm('Esti sigur ca vrei sa renunti la aceasta zi?')) return;
    try {
      await unclaimDay(dayId).unwrap();
    } catch (err: any) {
      alert(err?.data?.message || 'Eroare la renuntare');
    }
  };

  const handleOpenComplete = (dayId: string) => {
    setCompleteDayId(dayId);
    setObservations('');
    setCompleteDialogOpen(true);
  };

  const handleComplete = async () => {
    if (!completeDayId) return;
    try {
      await completeDay({
        dayId: completeDayId,
        data: { observations: observations || undefined },
      }).unwrap();
      setCompleteDialogOpen(false);
    } catch (err: any) {
      alert(err?.data?.message || 'Eroare la finalizare');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Eroare la incarcarea zilelor tale</Alert>;
  }

  // Separate active days from completed
  const activeDays = myDays.filter(d => d.status !== 'COMPLETED');
  const completedDays = myDays.filter(d => d.status === 'COMPLETED');

  return (
    <Box>
      {myDays.length === 0 ? (
        <Card sx={{ borderRadius: 3, p: 4, textAlign: 'center' }}>
          <MyDaysIcon sx={{ fontSize: 64, color: alpha('#10b981', 0.3), mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Nu ai zile revendicate
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Mergi la Marketplace pentru a revendica zile disponibile.
          </Typography>
        </Card>
      ) : (
        <Stack spacing={3}>
          {/* Active days */}
          {activeDays.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#f59e0b' }}>
                Zile Active ({activeDays.length})
              </Typography>
              <Stack spacing={1.5}>
                {activeDays.map((day) => (
                  <DayCard
                    key={day.id}
                    day={day}
                    userId={user?.id}
                    onUnclaim={() => handleUnclaim(day.id)}
                    onComplete={() => handleOpenComplete(day.id)}
                    isUnclaiming={isUnclaiming}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Completed days */}
          {completedDays.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#10b981' }}>
                Zile Finalizate ({completedDays.length})
              </Typography>
              <Stack spacing={1.5}>
                {completedDays.map((day) => (
                  <DayCard
                    key={day.id}
                    day={day}
                    userId={user?.id}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      )}

      {/* Complete Dialog */}
      <Dialog
        open={completeDialogOpen}
        onClose={() => setCompleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Finalizare Zi Afisare
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Observatii (optional)"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            fullWidth
            multiline
            rows={3}
            sx={{ mt: 1 }}
            placeholder="Adauga observatii despre afisarea de astazi..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCompleteDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Anuleaza
          </Button>
          <Button
            onClick={handleComplete}
            variant="contained"
            disabled={isCompleting}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: '#10b981',
              '&:hover': { bgcolor: '#059669' },
            }}
          >
            {isCompleting ? <CircularProgress size={20} /> : 'Finalizeaza'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ===== Day Card =====

interface DayCardProps {
  day: PvDisplayDay;
  userId?: string;
  onUnclaim?: () => void;
  onComplete?: () => void;
  isUnclaiming?: boolean;
}

const DayCard: React.FC<DayCardProps> = ({ day, userId, onUnclaim, onComplete, isUnclaiming }) => {
  const statusColor = PV_DAY_STATUS_COLORS[day.status];
  const isCompleted = day.status === 'COMPLETED';
  const canUnclaim = !isCompleted && day.status !== 'IN_PROGRESS';
  const canComplete = day.status === 'ASSIGNED' || day.status === 'IN_PROGRESS';
  const assignedCount = (day.controlUser1Id ? 1 : 0) + (day.controlUser2Id ? 1 : 0);

  return (
    <Card
      sx={{
        borderRadius: 2.5,
        border: `1px solid ${alpha(statusColor, 0.3)}`,
        bgcolor: isCompleted ? alpha('#10b981', 0.03) : undefined,
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <CalendarIcon sx={{ fontSize: 18, color: statusColor }} />
              <Typography variant="body1" sx={{ fontWeight: 700, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                {new Date(day.displayDate).toLocaleDateString('ro-RO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </Typography>
              <Chip
                label={PV_DAY_STATUS_LABELS[day.status]}
                size="small"
                sx={{
                  bgcolor: alpha(statusColor, 0.1),
                  color: statusColor,
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  height: 22,
                }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Ziua {day.dayOrder} • {day.noticeCount} procese verbale
              {day.session?.monthYear && ` • Sesiune: ${day.session.monthYear}`}
            </Typography>
            {(day.firstNoticeSeries || day.firstNoticeNumber || day.noticesDateFrom) && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                De la: {day.firstNoticeSeries && `Seria ${day.firstNoticeSeries}`}
                {day.firstNoticeNumber && ` Nr. ${day.firstNoticeNumber}`}
                {day.noticesDateFrom && ` • din ${new Date(day.noticesDateFrom).toLocaleDateString('ro-RO')}`}
                {day.lastNoticeSeries && ` — Pana la: Seria ${day.lastNoticeSeries}`}
                {day.lastNoticeNumber && ` Nr. ${day.lastNoticeNumber}`}
                {day.noticesDateTo && ` • ${new Date(day.noticesDateTo).toLocaleDateString('ro-RO')}`}
              </Typography>
            )}

            {/* Partner */}
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              {day.controlUser1 && day.controlUser1.id !== userId && (
                <Chip
                  avatar={<Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>{day.controlUser1.fullName[0]}</Avatar>}
                  label={`Partener: ${day.controlUser1.fullName}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
              {day.controlUser2 && day.controlUser2.id !== userId && (
                <Chip
                  avatar={<Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>{day.controlUser2.fullName[0]}</Avatar>}
                  label={`Partener: ${day.controlUser2.fullName}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
              {assignedCount < 2 && (
                <Chip
                  label="Se asteapta al 2-lea coleg"
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', borderStyle: 'dashed', color: '#f59e0b' }}
                />
              )}
            </Stack>

            {/* Completion observations */}
            {day.completionObservations && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}
              >
                Observatii: {day.completionObservations}
              </Typography>
            )}
            {day.completedAt && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Finalizat la: {new Date(day.completedAt).toLocaleString('ro-RO')}
              </Typography>
            )}
          </Box>

          {/* Actions */}
          {!isCompleted && (
            <Stack direction="row" spacing={1}>
              {canComplete && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CompleteIcon />}
                  onClick={onComplete}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    bgcolor: '#10b981',
                    '&:hover': { bgcolor: '#059669' },
                    whiteSpace: 'nowrap',
                  }}
                >
                  Finalizeaza
                </Button>
              )}
              {canUnclaim && onUnclaim && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UnclaimIcon />}
                  onClick={onUnclaim}
                  disabled={isUnclaiming}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    color: '#ef4444',
                    borderColor: '#ef4444',
                    '&:hover': { borderColor: '#dc2626', bgcolor: alpha('#ef4444', 0.05) },
                    whiteSpace: 'nowrap',
                  }}
                >
                  Renunta
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default PvMyDaysTab;
