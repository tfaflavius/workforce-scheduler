import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Tooltip,
  Grow,
  useTheme,
} from '@mui/material';
import {
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';
import type { User } from '../../../store/api/users.api';
import type {
  AssignmentInfo,
  CalendarDay,
} from './scheduleHelpers';
import { getExistingShiftInfo } from './scheduleHelpers';

export interface ScheduleMobileCardProps {
  targetUser: User;
  index: number;
  userAssignments: Record<string, AssignmentInfo[]>;
  scheduleStatus?: string;
  canEdit: boolean;
  calendarDays: CalendarDay[];
  isMobile: boolean;
  isLandscape: boolean;
  onEditClick: (user: User) => void;
}

const renderStatusChip = (status?: string) => {
  if (!status) return null;

  switch (status) {
    case 'PENDING_APPROVAL':
      return (
        <Chip
          icon={<PendingIcon />}
          label="Asteapta aprobare"
          size="small"
          color="warning"
          sx={{ height: 20, fontSize: '0.6rem' }}
        />
      );
    case 'APPROVED':
      return (
        <Chip
          icon={<CheckIcon />}
          label="Aprobat"
          size="small"
          color="success"
          sx={{ height: 20, fontSize: '0.6rem' }}
        />
      );
    case 'REJECTED':
      return (
        <Chip
          icon={<CloseIcon />}
          label="Respins"
          size="small"
          color="error"
          sx={{ height: 20, fontSize: '0.6rem' }}
        />
      );
    case 'DRAFT':
      return (
        <Chip
          label="Draft"
          size="small"
          color="default"
          sx={{ height: 20, fontSize: '0.6rem' }}
        />
      );
    default:
      return null;
  }
};

const ScheduleMobileCard: React.FC<ScheduleMobileCardProps> = ({
  targetUser,
  index,
  userAssignments,
  scheduleStatus,
  canEdit,
  calendarDays,
  isMobile,
  isLandscape,
  onEditClick,
}) => {
  const theme = useTheme();

  // Calculate summary for mobile
  const assignmentsList = Object.entries(userAssignments);
  const totalShifts = assignmentsList.length;
  const shiftTypes: Record<string, number> = {};
  assignmentsList.forEach(([, assignments]) => {
    assignments.forEach(assignment => {
      const info = getExistingShiftInfo(assignment.notes);
      shiftTypes[info.label] = (shiftTypes[info.label] || 0) + 1;
    });
  });

  return (
    <Grow in={true} timeout={400} style={{ transitionDelay: `${index * 50}ms` }}>
      <Card
        variant="outlined"
        sx={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: theme.shadows[4],
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'scale(0.99)',
          },
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          {/* User Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: '0.875rem',
                  bgcolor: targetUser.role === 'MANAGER' ? 'primary.main' : 'grey.500'
                }}
              >
                {targetUser.fullName.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  {targetUser.fullName}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                  <Chip
                    label={targetUser.role === 'MANAGER' ? 'Manager' : 'User'}
                    size="small"
                    color={targetUser.role === 'MANAGER' ? 'primary' : 'default'}
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                  {renderStatusChip(scheduleStatus)}
                </Stack>
              </Box>
            </Stack>
            {canEdit && (
              <Tooltip title="Editeaza programul" arrow>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => onEditClick(targetUser)}
                  aria-label="Editeaza programul"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          {/* Shift Summary */}
          {totalShifts > 0 ? (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                {totalShifts} ture programate:
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: !isMobile ? 1 : 0 }}>
                {Object.entries(shiftTypes).map(([label, count]) => {
                  const colorMap: Record<string, string> = {
                    'Z': '#4CAF50',
                    'N': '#3F51B5',
                    'Z1': '#00BCD4',
                    'Z2': '#9C27B0',
                    'Z3': '#795548',
                    'N8': '#E91E63',
                    'CO': '#FF9800',
                  };
                  return (
                    <Chip
                      key={label}
                      label={`${label}: ${count}`}
                      size="small"
                      sx={{
                        bgcolor: colorMap[label] || '#9E9E9E',
                        color: 'white',
                        fontSize: '0.7rem',
                        height: 22,
                      }}
                    />
                  );
                })}
              </Stack>

              {/* Mini calendar for tablet/mobile - all days with horizontal scroll */}
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Calendar (luna completa):
                </Typography>
                <Box sx={{
                  overflowX: 'auto',
                  pb: 1,
                  '&::-webkit-scrollbar': { height: 6 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.400', borderRadius: 3 },
                }}>
                  <Stack direction="row" spacing={0.25} sx={{ minWidth: 'max-content' }}>
                    {calendarDays.map(({ date, day, isWeekend }) => {
                      const assignments = userAssignments[date];
                      const firstAssignment = assignments?.[0];
                      const shiftInfo = firstAssignment ? getExistingShiftInfo(firstAssignment.notes) : null;
                      const workPos = firstAssignment?.workPosition;
                      const hasMultiple = assignments && assignments.length > 1;
                      return (
                        <Box
                          key={date}
                          sx={{
                            minWidth: isLandscape ? 32 : 28,
                            width: isLandscape ? 32 : 28,
                            height: isLandscape ? (hasMultiple ? 48 : 36) : (hasMultiple ? 44 : 32),
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 0.5,
                            bgcolor: shiftInfo ? shiftInfo.color : (isWeekend ? 'grey.200' : 'grey.100'),
                            color: shiftInfo ? 'white' : 'text.secondary',
                            fontSize: isLandscape ? '0.6rem' : '0.55rem',
                            fontWeight: 'bold',
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ fontSize: isLandscape ? '0.5rem' : '0.45rem', opacity: 0.8 }}>{day}</span>
                          <span style={{ fontSize: isLandscape ? '0.6rem' : '0.55rem' }}>{shiftInfo?.label || '-'}</span>
                          {workPos && (
                            <span style={{ fontSize: isLandscape ? '0.4rem' : '0.35rem', opacity: 0.9 }}>
                              {workPos.shortName || workPos.name?.substring(0, 3)}
                            </span>
                          )}
                          {hasMultiple && assignments.slice(1).map((a, i) => {
                            const si = getExistingShiftInfo(a.notes);
                            return (
                              <span key={i} style={{ fontSize: isLandscape ? '0.4rem' : '0.35rem', opacity: 0.85 }}>
                                {si.label} {a.workPosition?.shortName || ''}
                              </span>
                            );
                          })}
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              </Box>
            </Box>
          ) : (
            <Typography variant="caption" color="text.disabled">
              Niciun program setat
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grow>
  );
};

export default ScheduleMobileCard;
