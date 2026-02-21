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
import {
  useGetAvailableDaysQuery,
  useClaimDayMutation,
  useAdminAssignDayMutation,
  useGetControlUsersQuery,
} from '../../../store/api/pvDisplay.api';
import type { PvDisplayDay, AdminAssignPvDayDto } from '../../../types/pv-display.types';
import { PV_DAY_STATUS_COLORS } from '../../../types/pv-display.types';

const PvMarketplaceTab: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'ADMIN';
  const isControl = user?.department?.name === 'Control';
  const canClaim = isControl || isAdmin;

  const { data: days = [], isLoading, error } = useGetAvailableDaysQuery();
  const [claimDay, { isLoading: isClaiming }] = useClaimDayMutation();
  const [adminAssignDay] = useAdminAssignDayMutation();

  // Admin assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignDayId, setAssignDayId] = useState<string | null>(null);
  const [assignSlot, setAssignSlot] = useState<'1' | '2'>('1');
  const [assignUserId, setAssignUserId] = useState('');
  const { data: controlUsers = [] } = useGetControlUsersQuery(undefined, { skip: !isAdmin });

  const handleClaim = async (dayId: string) => {
    try {
      await claimDay(dayId).unwrap();
    } catch (err: any) {
      alert(err?.data?.message || 'Eroare la revendicare');
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
      const dto: AdminAssignPvDayDto = { userId: assignUserId, slot: assignSlot };
      await adminAssignDay({ dayId: assignDayId, data: dto }).unwrap();
      setAssignDialogOpen(false);
    } catch (err: any) {
      alert(err?.data?.message || 'Eroare la asignare');
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
    const sessionKey = day.session?.monthYear || 'unknown';
    if (!acc[sessionKey]) acc[sessionKey] = [];
    acc[sessionKey].push(day);
    return acc;
  }, {} as Record<string, PvDisplayDay[]>);

  return (
    <Box>
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
          {Object.entries(daysBySession).map(([sessionMonth, sessionDays]) => (
            <Box key={sessionMonth}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: '#3b82f6',
                  mb: 1.5,
                  fontSize: { xs: '0.85rem', sm: '0.95rem' },
                }}
              >
                Sesiune: {sessionMonth}
              </Typography>
              <Stack spacing={1.5}>
                {sessionDays.map((day) => {
                  const assignedCount = (day.controlUser1Id ? 1 : 0) + (day.controlUser2Id ? 1 : 0);
                  const statusColor = PV_DAY_STATUS_COLORS[day.status];
                  const isFullyAssigned = assignedCount === 2;
                  const alreadyClaimed = day.controlUser1Id === user?.id || day.controlUser2Id === user?.id;

                  return (
                    <Card
                      key={day.id}
                      sx={{
                        borderRadius: 2.5,
                        border: `1px solid ${alpha(statusColor, 0.3)}`,
                        overflow: 'hidden',
                        transition: 'all 0.2s',
                        opacity: isFullyAssigned ? 0.7 : 1,
                        '&:hover': !isFullyAssigned ? { boxShadow: `0 4px 16px ${alpha(statusColor, 0.15)}` } : {},
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
                                {new Date(day.displayDate).toLocaleDateString('ro-RO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
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
                            </Typography>

                            {/* Assigned users */}
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              {/* Slot 1 */}
                              {day.controlUser1 ? (
                                <Chip
                                  avatar={<Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>{day.controlUser1.fullName[0]}</Avatar>}
                                  label={day.controlUser1.fullName}
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
                              {day.controlUser2 ? (
                                <Chip
                                  avatar={<Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>{day.controlUser2.fullName[0]}</Avatar>}
                                  label={day.controlUser2.fullName}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              ) : (
                                isAdmin && day.controlUser1Id && (
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
                            {canClaim && !isFullyAssigned && !alreadyClaimed && (
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<ClaimIcon />}
                                onClick={() => handleClaim(day.id)}
                                disabled={isClaiming}
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
                                label="Revendicat"
                                color="success"
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                            {isFullyAssigned && !alreadyClaimed && (
                              <Chip
                                icon={<AssignedIcon />}
                                label="Complet"
                                size="small"
                                sx={{
                                  bgcolor: alpha('#10b981', 0.1),
                                  color: '#10b981',
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
            <InputLabel>Utilizator Control</InputLabel>
            <Select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              label="Utilizator Control"
            >
              {controlUsers.map((u) => (
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

export default PvMarketplaceTab;
