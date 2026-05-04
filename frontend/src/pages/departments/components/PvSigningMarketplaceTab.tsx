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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Store as MarketplaceIcon,
  PersonAdd as ClaimIcon,
  CheckCircle as AssignedIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import { isAdminOrAbove } from '../../../utils/roleHelpers';
import {
  useGetSigningAvailableDaysQuery,
  useClaimSigningDayMutation,
  useAdminAssignSigningDayMutation,
  useGetMaintenanceUsersQuery,
} from '../../../store/api/pvSigning.api';
import type { PvSigningDay, AdminAssignPvSigningDayDto } from '../../../types/pv-signing.types';
import { PV_DAY_STATUS_COLORS } from '../../../types/pv-signing.types';
import { MAINTENANCE_DEPARTMENT_NAME } from '../../../constants/departments';
import { useSnackbar } from '../../../contexts/SnackbarContext';

const PvSigningMarketplaceTab: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { notifyError } = useSnackbar();
  const isAdmin = isAdminOrAbove(user?.role);
  const isMaintenance = user?.department?.name === MAINTENANCE_DEPARTMENT_NAME;
  const canClaim = isMaintenance || isAdmin;

  // Refetch on tab focus, on mount if cache is older than 30s, and poll every
  // 60s so newly created sessions show up automatically without manual refresh.
  const { data: days = [], isLoading, error, refetch } = useGetSigningAvailableDaysQuery(undefined, {
    refetchOnFocus: true,
    refetchOnMountOrArgChange: 30,
    refetchOnReconnect: true,
    pollingInterval: 60000,
  });
  const [claimDay] = useClaimSigningDayMutation();
  const [claimingDayId, setClaimingDayId] = useState<string | null>(null);
  const [adminAssignDay] = useAdminAssignSigningDayMutation();

  // Admin assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignDayId, setAssignDayId] = useState<string | null>(null);
  const [assignSlot, setAssignSlot] = useState<'1' | '2'>('1');
  const [assignUserId, setAssignUserId] = useState('');
  const { data: maintenanceUsers = [] } = useGetMaintenanceUsersQuery(undefined, { skip: !isAdmin });

  const handleClaim = async (dayId: string) => {
    try {
      setClaimingDayId(dayId);
      await claimDay(dayId).unwrap();
    } catch (err: any) {
      notifyError(err?.data?.message || 'Eroare la revendicare');
    } finally {
      setClaimingDayId(null);
    }
  };

  const handleOpenAssign = (dayId: string, slot: '1' | '2') => {
    setAssignDayId(dayId);
    setAssignSlot(slot);
    setAssignUserId('');
    setAssignDialogOpen(true);
  };

  const handleAdminAssign = async () => {
    if (!assignDayId || !assignUserId) return;
    try {
      const dto: AdminAssignPvSigningDayDto = { userId: assignUserId, slot: assignSlot };
      await adminAssignDay({ dayId: assignDayId, data: dto }).unwrap();
      setAssignDialogOpen(false);
    } catch (err: any) {
      notifyError(err?.data?.message || 'Eroare la asignare');
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
    return <Alert severity="error">Eroare la incarcarea zilelor disponibile</Alert>;
  }

  // Group days by session
  const daysBySession = days.reduce((acc, day) => {
    const sessionKey = day.session?.id || 'unknown';
    if (!acc[sessionKey]) acc[sessionKey] = [];
    acc[sessionKey].push(day);
    return acc;
  }, {} as Record<string, PvSigningDay[]>);

  return (
    <Box>
      {/* Manual refresh button */}
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => refetch()}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          Reincarca
        </Button>
      </Stack>

      {days.length === 0 ? (
        <Card sx={{ borderRadius: 3, p: 4, textAlign: 'center' }}>
          <MarketplaceIcon sx={{ fontSize: 64, color: alpha('#f59e0b', 0.3), mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Nu exista zile disponibile
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Zilele vor aparea aici dupa ce departamentul PV/Facturare creeaza o sesiune noua.
          </Typography>
        </Card>
      ) : (
        <Stack spacing={3}>
          {Object.entries(daysBySession).map(([sessionKey, sessionDays]) => (
            <Box key={sessionKey}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: '#3b82f6',
                  mb: 1.5,
                  fontSize: { xs: '0.85rem', sm: '0.95rem' },
                }}
              >
                Sesiune: {sessionDays[0]?.session?.monthYear || sessionKey}
              </Typography>
              <Stack spacing={1.5}>
                {sessionDays.map((day) => {
                  const assignedCount = (day.maintenanceUser1Id ? 1 : 0) + (day.maintenanceUser2Id ? 1 : 0);
                  const statusColor = PV_DAY_STATUS_COLORS[day.status];
                  const isFullyAssigned = assignedCount === 2;
                  const alreadyClaimed = day.maintenanceUser1Id === user?.id || day.maintenanceUser2Id === user?.id;
                  // Past day: cannot be claimed any more, mark as history
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const dayDateStr = String(day.signingDate).slice(0, 10);
                  const isPast = dayDateStr < todayStr;
                  const isCompleted = day.status === 'COMPLETED';

                  return (
                    <Card
                      key={day.id}
                      sx={{
                        borderRadius: 2.5,
                        border: `1px solid ${alpha(statusColor, 0.3)}`,
                        overflow: 'hidden',
                        transition: 'all 0.2s',
                        opacity: isPast || isCompleted ? 0.55 : isFullyAssigned ? 0.85 : 1,
                        '&:hover': !isFullyAssigned && !isPast ? { boxShadow: `0 4px 16px ${alpha(statusColor, 0.15)}` } : {},
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
                              <Typography variant="body1" sx={{ fontWeight: 700, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                                {new Date(day.signingDate).toLocaleDateString('ro-RO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                              </Typography>
                              <Chip
                                label={`${assignedCount}/2`}
                                size="small"
                                sx={{
                                  bgcolor: isFullyAssigned ? alpha('#10b981', 0.15) : alpha('#f59e0b', 0.15),
                                  color: isFullyAssigned ? '#10b981' : '#f59e0b',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                }}
                              />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              Ziua {day.dayOrder} • {day.noticeCount} procese verbale
                              {day.firstNoticeSeries && ` • Seria ${day.firstNoticeSeries}`}
                              {day.firstNoticeNumber && ` Nr. ${day.firstNoticeNumber}`}
                              {day.noticesDateFrom && ` • din ${new Date(day.noticesDateFrom).toLocaleDateString('ro-RO')}`}
                            </Typography>

                            {/* Assigned users */}
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              {/* Slot 1 */}
                              {day.maintenanceUser1 ? (
                                <Chip
                                  avatar={<Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>{day.maintenanceUser1.fullName[0]}</Avatar>}
                                  label={day.maintenanceUser1.fullName}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              ) : (
                                isAdmin && (
                                  <Chip
                                    label="Slot 1 - Liber"
                                    size="small"
                                    variant="outlined"
                                    onClick={() => handleOpenAssign(day.id, '1')}
                                    sx={{ fontSize: '0.7rem', borderStyle: 'dashed', cursor: 'pointer' }}
                                  />
                                )
                              )}
                              {/* Slot 2 */}
                              {day.maintenanceUser2 ? (
                                <Chip
                                  avatar={<Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>{day.maintenanceUser2.fullName[0]}</Avatar>}
                                  label={day.maintenanceUser2.fullName}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              ) : (
                                isAdmin && day.maintenanceUser1Id && (
                                  <Chip
                                    label="Slot 2 - Liber"
                                    size="small"
                                    variant="outlined"
                                    onClick={() => handleOpenAssign(day.id, '2')}
                                    sx={{ fontSize: '0.7rem', borderStyle: 'dashed', cursor: 'pointer' }}
                                  />
                                )
                              )}
                            </Stack>
                          </Box>

                          {/* Action buttons */}
                          <Stack direction="row" spacing={1}>
                            {canClaim && !isFullyAssigned && !alreadyClaimed && !isPast && (
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<ClaimIcon />}
                                onClick={() => handleClaim(day.id)}
                                disabled={claimingDayId === day.id}
                                sx={{
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  bgcolor: '#f59e0b',
                                  '&:hover': { bgcolor: '#d97706' },
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Revendica
                              </Button>
                            )}
                            {alreadyClaimed && (
                              <Chip
                                icon={<AssignedIcon />}
                                label={isCompleted ? 'Finalizat' : 'Revendicat'}
                                color={isCompleted ? 'default' : 'success'}
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                            {isFullyAssigned && !alreadyClaimed && (
                              <Chip
                                icon={<AssignedIcon />}
                                label={isCompleted ? 'Finalizat' : 'Complet'}
                                size="small"
                                sx={{
                                  bgcolor: alpha(isCompleted ? '#6b7280' : '#10b981', 0.1),
                                  color: isCompleted ? '#6b7280' : '#10b981',
                                  fontWeight: 600,
                                }}
                              />
                            )}
                            {isPast && !isFullyAssigned && !alreadyClaimed && (
                              <Chip
                                label="Trecut"
                                size="small"
                                sx={{
                                  bgcolor: alpha('#6b7280', 0.1),
                                  color: '#6b7280',
                                  fontWeight: 600,
                                }}
                              />
                            )}
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      {/* Admin Assign Dialog */}
      <Dialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Asignare manuala - Slot {assignSlot}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Utilizator Intretinere</InputLabel>
            <Select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              label="Utilizator Intretinere"
            >
              {maintenanceUsers.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.fullName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAssignDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Anuleaza
          </Button>
          <Button
            onClick={handleAdminAssign}
            variant="contained"
            disabled={!assignUserId}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Asigneaza
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default React.memo(PvSigningMarketplaceTab);
