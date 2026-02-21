import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  IconButton,
  CircularProgress,
  Alert,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Collapse,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CalendarMonth as CalendarIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Send as SendIcon,
  ArrowBack as BackIcon,
  Description as PvIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import {
  useGetPvSessionsQuery,
  useCreatePvSessionMutation,
  useDeletePvSessionMutation,
  useGetPvSessionCommentsQuery,
  useAddPvSessionCommentMutation,
  useGetPvSessionHistoryQuery,
} from '../../../store/api/pvDisplay.api';
import type {
  PvDisplaySession,
  PvDisplayDay,
  CreatePvDisplaySessionDto,
  PvDisplayDayDto,
} from '../../../types/pv-display.types';
import {
  PV_SESSION_STATUS_LABELS,
  PV_SESSION_STATUS_COLORS,
  PV_DAY_STATUS_LABELS,
  PV_DAY_STATUS_COLORS,
} from '../../../types/pv-display.types';

const PvSessionsTab: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'ADMIN';
  const isPvf = user?.department?.name === 'Procese Verbale/Facturare';
  const canCreate = isAdmin || isPvf;

  const { data: sessions = [], isLoading, error } = useGetPvSessionsQuery();
  const [createSession, { isLoading: isCreating }] = useCreatePvSessionMutation();
  const [deleteSession] = useDeletePvSessionMutation();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [detailsTab, setDetailsTab] = useState<'days' | 'comments' | 'history'>('days');

  // Create form state - Step 1
  const [monthYear, setMonthYear] = useState('');
  const [description, setDescription] = useState('');
  const [daysCount, setDaysCount] = useState(5);
  const [startDate, setStartDate] = useState('');
  const [defaultNoticeCount, setDefaultNoticeCount] = useState(30);

  // Create form state - Step 2 (per-day details)
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [generatedDays, setGeneratedDays] = useState<PvDisplayDayDto[]>([]);

  const handleOpenCreate = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    setMonthYear(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`);
    setDescription('');
    setDaysCount(5);
    setStartDate('');
    setDefaultNoticeCount(30);
    setCreateStep(1);
    setGeneratedDays([]);
    setCreateDialogOpen(true);
  };

  const generateConsecutiveDays = (start: string, count: number): PvDisplayDayDto[] => {
    const days: PvDisplayDayDto[] = [];
    const date = new Date(start);

    let dayOrder = 1;
    while (days.length < count) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days.push({
          displayDate: date.toISOString().split('T')[0],
          dayOrder,
          noticeCount: defaultNoticeCount,
          firstNoticeSeries: '',
          firstNoticeNumber: '',
          lastNoticeSeries: '',
          lastNoticeNumber: '',
          noticesDateFrom: '',
          noticesDateTo: '',
        });
        dayOrder++;
      }
      date.setDate(date.getDate() + 1);
    }

    return days;
  };

  const handleGenerateDays = () => {
    if (!startDate) return;
    const days = generateConsecutiveDays(startDate, daysCount);
    setGeneratedDays(days);
    setCreateStep(2);
  };

  const updateDay = (index: number, field: keyof PvDisplayDayDto, value: string | number) => {
    setGeneratedDays(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleCreate = async () => {
    if (!monthYear || generatedDays.length === 0) return;

    try {
      // Clean empty strings to undefined
      const cleanDays = generatedDays.map(day => ({
        ...day,
        firstNoticeSeries: day.firstNoticeSeries || undefined,
        firstNoticeNumber: day.firstNoticeNumber || undefined,
        lastNoticeSeries: day.lastNoticeSeries || undefined,
        lastNoticeNumber: day.lastNoticeNumber || undefined,
        noticesDateFrom: day.noticesDateFrom || undefined,
        noticesDateTo: day.noticesDateTo || undefined,
      }));

      const dto: CreatePvDisplaySessionDto = {
        monthYear,
        description: description || undefined,
        days: cleanDays,
      };
      await createSession(dto).unwrap();
      setCreateDialogOpen(false);
    } catch (err) {
      console.error('Error creating session:', err);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm('Esti sigur ca vrei sa stergi aceasta sesiune?')) return;
    try {
      await deleteSession(sessionId).unwrap();
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const toggleExpanded = (sessionId: string) => {
    setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId);
    setDetailsTab('days');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Eroare la incarcarea sesiunilor</Alert>;
  }

  return (
    <Box>
      {/* Action bar */}
      {canCreate && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            }}
          >
            Sesiune Noua
          </Button>
        </Box>
      )}

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <Card sx={{ borderRadius: 3, p: 4, textAlign: 'center' }}>
          <CalendarIcon sx={{ fontSize: 64, color: alpha('#3b82f6', 0.3), mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Nu exista sesiuni de afisare
          </Typography>
          {canCreate && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Creeaza prima sesiune folosind butonul de mai sus.
            </Typography>
          )}
        </Card>
      ) : (
        <Stack spacing={2}>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isExpanded={expandedSessionId === session.id}
              onToggle={() => toggleExpanded(session.id)}
              onDelete={isAdmin ? () => handleDelete(session.id) : undefined}
              detailsTab={detailsTab}
              setDetailsTab={setDetailsTab}
            />
          ))}
        </Stack>
      )}

      {/* Create Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {createStep === 2 && (
              <IconButton size="small" onClick={() => setCreateStep(1)}>
                <BackIcon />
              </IconButton>
            )}
            <span>
              {createStep === 1
                ? 'Creare Sesiune Afisare PV'
                : 'Detalii Procese Verbale per Zi'}
            </span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {createStep === 1 ? (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                label="Luna / An"
                type="month"
                value={monthYear}
                onChange={(e) => setMonthYear(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Data inceput (prima zi de afisare)"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                helperText="Se vor genera automat zilele consecutive (fara weekend)"
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Numar zile"
                  type="number"
                  value={daysCount}
                  onChange={(e) => setDaysCount(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                  fullWidth
                  inputProps={{ min: 1, max: 5 }}
                  helperText="Maxim 5 zile"
                />
                <TextField
                  label="Nr. PV per zi (default)"
                  type="number"
                  value={defaultNoticeCount}
                  onChange={(e) => setDefaultNoticeCount(Math.max(1, parseInt(e.target.value) || 30))}
                  fullWidth
                  inputProps={{ min: 1 }}
                />
              </Stack>
              <TextField
                label="Descriere (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Completeaza detaliile proceselor verbale pentru fiecare zi. Seria, numarul si datele se completeaza separat per zi.
              </Alert>
              {generatedDays.map((day, index) => {
                const dateObj = new Date(day.displayDate);
                const dayLabel = dateObj.toLocaleDateString('ro-RO', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                });

                return (
                  <Card
                    key={day.dayOrder}
                    variant="outlined"
                    sx={{
                      borderRadius: 2.5,
                      borderColor: alpha('#3b82f6', 0.3),
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        px: 2,
                        py: 1,
                        bgcolor: alpha('#3b82f6', 0.06),
                        borderBottom: `1px solid ${alpha('#3b82f6', 0.15)}`,
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <PvIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                          Ziua {day.dayOrder} — {dayLabel}
                        </Typography>
                      </Stack>
                    </Box>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack spacing={2}>
                        {/* Nr PV */}
                        <TextField
                          label="Numar procese verbale"
                          type="number"
                          value={day.noticeCount}
                          onChange={(e) => updateDay(index, 'noticeCount', Math.max(1, parseInt(e.target.value) || 30))}
                          size="small"
                          inputProps={{ min: 1 }}
                          sx={{ maxWidth: 220 }}
                        />

                        {/* De la - serie + numar + data */}
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                            De la (primul PV):
                          </Typography>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <TextField
                              label="Serie"
                              value={day.firstNoticeSeries || ''}
                              onChange={(e) => updateDay(index, 'firstNoticeSeries', e.target.value)}
                              size="small"
                              sx={{ flex: 1 }}
                              placeholder="ex: ABC"
                            />
                            <TextField
                              label="Numar"
                              value={day.firstNoticeNumber || ''}
                              onChange={(e) => updateDay(index, 'firstNoticeNumber', e.target.value)}
                              size="small"
                              sx={{ flex: 1 }}
                              placeholder="ex: 001234"
                            />
                            <TextField
                              label="Data PV de la"
                              type="date"
                              value={day.noticesDateFrom || ''}
                              onChange={(e) => updateDay(index, 'noticesDateFrom', e.target.value)}
                              size="small"
                              InputLabelProps={{ shrink: true }}
                              sx={{ flex: 1 }}
                            />
                          </Stack>
                        </Box>

                        {/* Pana la - serie + numar + data */}
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                            Pana la (ultimul PV) — optional:
                          </Typography>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <TextField
                              label="Serie"
                              value={day.lastNoticeSeries || ''}
                              onChange={(e) => updateDay(index, 'lastNoticeSeries', e.target.value)}
                              size="small"
                              sx={{ flex: 1 }}
                              placeholder="ex: ABC"
                            />
                            <TextField
                              label="Numar"
                              value={day.lastNoticeNumber || ''}
                              onChange={(e) => updateDay(index, 'lastNoticeNumber', e.target.value)}
                              size="small"
                              sx={{ flex: 1 }}
                              placeholder="ex: 001264"
                            />
                            <TextField
                              label="Data PV pana la"
                              type="date"
                              value={day.noticesDateTo || ''}
                              onChange={(e) => updateDay(index, 'noticesDateTo', e.target.value)}
                              size="small"
                              InputLabelProps={{ shrink: true }}
                              sx={{ flex: 1 }}
                            />
                          </Stack>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Anuleaza
          </Button>
          {createStep === 1 ? (
            <Button
              onClick={handleGenerateDays}
              variant="contained"
              disabled={!startDate || !monthYear}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              }}
            >
              Genereaza Zile
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              variant="contained"
              disabled={isCreating}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              }}
            >
              {isCreating ? <CircularProgress size={20} /> : 'Creeaza Sesiunea'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ===== Session Card Component =====

interface SessionCardProps {
  session: PvDisplaySession;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  detailsTab: 'days' | 'comments' | 'history';
  setDetailsTab: (tab: 'days' | 'comments' | 'history') => void;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  isExpanded,
  onToggle,
  onDelete,
  detailsTab,
  setDetailsTab,
}) => {
  const statusColor = PV_SESSION_STATUS_COLORS[session.status];
  const totalDays = session.days?.length || 0;
  const completedDays = session.days?.filter(d => d.status === 'COMPLETED').length || 0;
  const fullyAssignedDays = session.days?.filter(d =>
    d.controlUser1Id && d.controlUser2Id
  ).length || 0;

  return (
    <Card
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${alpha(statusColor, 0.3)}`,
        transition: 'all 0.2s',
        '&:hover': { boxShadow: `0 4px 16px ${alpha(statusColor, 0.15)}` },
      }}
    >
      <CardContent
        sx={{ cursor: 'pointer', p: { xs: 2, sm: 2.5 } }}
        onClick={onToggle}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                {session.monthYear}
              </Typography>
              <Chip
                label={PV_SESSION_STATUS_LABELS[session.status]}
                size="small"
                sx={{
                  bgcolor: alpha(statusColor, 0.1),
                  color: statusColor,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />
            </Stack>
            {session.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {session.description}
              </Typography>
            )}
            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {totalDays} zile • {fullyAssignedDays}/{totalDays} asignate • {completedDays}/{totalDays} finalizate
              </Typography>
            </Stack>
            {session.creator && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Creat de {session.creator.fullName} • {new Date(session.createdAt).toLocaleDateString('ro-RO')}
              </Typography>
            )}
          </Box>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            {onDelete && (
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                sx={{ color: '#ef4444' }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Stack>
        </Stack>
      </CardContent>

      <Collapse in={isExpanded}>
        <Divider />
        <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
          {/* Details tabs */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            {(['days', 'comments', 'history'] as const).map((tab) => (
              <Chip
                key={tab}
                label={tab === 'days' ? 'Zile' : tab === 'comments' ? 'Comentarii' : 'Istoric'}
                size="small"
                onClick={() => setDetailsTab(tab)}
                variant={detailsTab === tab ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: detailsTab === tab ? 700 : 500,
                  bgcolor: detailsTab === tab ? alpha('#3b82f6', 0.1) : undefined,
                }}
              />
            ))}
          </Stack>

          {detailsTab === 'days' && (
            <DaysSection days={session.days || []} />
          )}
          {detailsTab === 'comments' && (
            <CommentsSection sessionId={session.id} />
          )}
          {detailsTab === 'history' && (
            <HistorySection sessionId={session.id} />
          )}
        </Box>
      </Collapse>
    </Card>
  );
};

// ===== Days Section =====

const formatDateRo = (date: string | Date | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const DaysSection: React.FC<{ days: PvDisplayDay[] }> = ({ days }) => {
  if (days.length === 0) {
    return <Typography variant="body2" color="text.secondary">Nicio zi adaugata.</Typography>;
  }

  return (
    <Stack spacing={1}>
      {days.map((day) => {
        const statusColor = PV_DAY_STATUS_COLORS[day.status];
        const assignedCount = (day.controlUser1Id ? 1 : 0) + (day.controlUser2Id ? 1 : 0);
        const hasPvDetails = day.firstNoticeSeries || day.firstNoticeNumber || day.noticesDateFrom;

        return (
          <Card
            key={day.id}
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: alpha(statusColor, 0.3),
              bgcolor: alpha(statusColor, 0.03),
            }}
          >
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
                      Ziua {day.dayOrder} — {new Date(day.displayDate).toLocaleDateString('ro-RO', { weekday: 'long', day: '2-digit', month: 'long' })}
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
                    {day.noticeCount} procese verbale • {assignedCount}/2 Control asignati
                  </Typography>
                </Box>
                <Chip
                  label={`${assignedCount}/2`}
                  size="small"
                  sx={{
                    bgcolor: assignedCount === 2 ? alpha('#10b981', 0.15) : alpha('#f59e0b', 0.15),
                    color: assignedCount === 2 ? '#10b981' : '#f59e0b',
                    fontWeight: 700,
                  }}
                />
              </Stack>

              {/* PV Details */}
              {hasPvDetails && (
                <Box sx={{ mt: 1, p: 1, bgcolor: alpha('#8b5cf6', 0.04), borderRadius: 1.5, border: `1px solid ${alpha('#8b5cf6', 0.1)}` }}>
                  <Stack spacing={0.5}>
                    {(day.firstNoticeSeries || day.firstNoticeNumber) && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        <strong>De la:</strong> Seria {day.firstNoticeSeries || '—'}, Nr. {day.firstNoticeNumber || '—'}
                        {day.noticesDateFrom && ` • Data: ${formatDateRo(day.noticesDateFrom)}`}
                      </Typography>
                    )}
                    {!day.firstNoticeSeries && !day.firstNoticeNumber && day.noticesDateFrom && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        <strong>Data PV de la:</strong> {formatDateRo(day.noticesDateFrom)}
                      </Typography>
                    )}
                    {(day.lastNoticeSeries || day.lastNoticeNumber || day.noticesDateTo) && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        <strong>Pana la:</strong>{' '}
                        {(day.lastNoticeSeries || day.lastNoticeNumber)
                          ? `Seria ${day.lastNoticeSeries || '—'}, Nr. ${day.lastNoticeNumber || '—'}`
                          : ''}
                        {day.noticesDateTo && ` • Data: ${formatDateRo(day.noticesDateTo)}`}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )}

              {(day.controlUser1 || day.controlUser2) && (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {day.controlUser1 && (
                    <Chip
                      avatar={<Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>{day.controlUser1.fullName[0]}</Avatar>}
                      label={day.controlUser1.fullName}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  )}
                  {day.controlUser2 && (
                    <Chip
                      avatar={<Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>{day.controlUser2.fullName[0]}</Avatar>}
                      label={day.controlUser2.fullName}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  )}
                </Stack>
              )}
              {day.completionObservations && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                  Observatii: {day.completionObservations}
                </Typography>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
};

// ===== Comments Section =====

const CommentsSection: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const { data: comments = [], isLoading } = useGetPvSessionCommentsQuery(sessionId);
  const [addComment, { isLoading: isAdding }] = useAddPvSessionCommentMutation();
  const [newComment, setNewComment] = useState('');

  const handleAdd = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment({ sessionId, content: newComment.trim() }).unwrap();
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  if (isLoading) {
    return <CircularProgress size={24} />;
  }

  return (
    <Box>
      {/* Add comment */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Adauga un comentariu..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          fullWidth
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
        <IconButton
          onClick={handleAdd}
          disabled={!newComment.trim() || isAdding}
          sx={{ color: '#3b82f6' }}
        >
          <SendIcon />
        </IconButton>
      </Stack>

      {comments.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Niciun comentariu.</Typography>
      ) : (
        <Stack spacing={1}>
          {comments.map((comment) => (
            <Card key={comment.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: '#3b82f6' }}>
                    {comment.user?.fullName?.[0] || '?'}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    {comment.user?.fullName || 'Utilizator'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(comment.createdAt).toLocaleString('ro-RO')}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ pl: 4 }}>
                  {comment.content}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

// ===== History Section =====

const HistorySection: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const { data: history = [], isLoading } = useGetPvSessionHistoryQuery(sessionId);

  if (isLoading) {
    return <CircularProgress size={24} />;
  }

  if (history.length === 0) {
    return <Typography variant="body2" color="text.secondary">Niciun istoric.</Typography>;
  }

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      CREATED: 'Creat',
      UPDATED: 'Modificat',
      DELETED: 'Sters',
      CLAIMED: 'Revendicat',
      UNCLAIMED: 'Renuntat',
      FINALIZED: 'Finalizat',
      ADMIN_ASSIGNED: 'Asignat de admin',
    };
    return labels[action] || action;
  };

  return (
    <Stack spacing={1}>
      {history.map((entry) => (
        <Stack key={entry.id} direction="row" spacing={1.5} alignItems="flex-start">
          <HistoryIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.3 }} />
          <Box>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              <strong>{entry.user?.fullName || 'Sistem'}</strong> — {getActionLabel(entry.action)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(entry.createdAt).toLocaleString('ro-RO')}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
};

export default PvSessionsTab;
