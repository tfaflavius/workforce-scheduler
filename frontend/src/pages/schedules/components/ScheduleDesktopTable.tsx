import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Tooltip,
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
  UserAssignmentsData,
} from './scheduleHelpers';
import { getExistingShiftInfo } from './scheduleHelpers';

export interface ScheduleDesktopTableProps {
  filteredUsers: User[];
  allUsersAssignments: Record<string, UserAssignmentsData>;
  calendarDays: CalendarDay[];
  isAdmin: boolean;
  onEditClick: (user: User) => void;
  canEditSchedule: (user: User) => boolean;
  getScheduleStatus: (userId: string) => string | undefined;
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

const renderDayCellContent = (existingAssignments: AssignmentInfo[] | undefined, isWeekend: boolean) => {
  let cellContent: React.ReactNode = '-';
  let cellBgColor = isWeekend ? 'grey.100' : 'transparent';

  if (existingAssignments && existingAssignments.length > 0) {
    if (existingAssignments.length === 1) {
      const firstAssignment = existingAssignments[0];
      const shiftInfo = getExistingShiftInfo(firstAssignment.notes);
      const workPos = firstAssignment.workPosition;
      cellBgColor = shiftInfo.color;

      cellContent = (
        <Box>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 'bold', lineHeight: 1.2 }}>
            {shiftInfo.label}
          </Typography>
          {workPos && (
            <Typography
              sx={{
                fontSize: '0.45rem',
                fontWeight: 'bold',
                lineHeight: 1,
                opacity: 0.9,
                mt: 0.1,
              }}
            >
              {workPos.shortName || workPos.name?.substring(0, 4)}
            </Typography>
          )}
        </Box>
      );
    } else {
      // Multiple assignments on same day - split cell in half vertically
      cellBgColor = 'transparent';
      cellContent = (
        <Box sx={{ display: 'flex', flexDirection: 'column', mx: -0.2, my: -0.2 }}>
          {existingAssignments.map((a, i) => {
            const si = getExistingShiftInfo(a.notes);
            return (
              <Box
                key={i}
                sx={{
                  bgcolor: si.color,
                  color: 'white',
                  py: 0.15,
                  px: 0.2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,0.5)' : 'none',
                  flex: 1,
                  minHeight: 16,
                }}
              >
                <Typography sx={{ fontSize: '0.55rem', fontWeight: 'bold', lineHeight: 1, color: 'white' }}>
                  {si.label}
                </Typography>
                {a.workPosition && (
                  <Typography sx={{ fontSize: '0.4rem', fontWeight: 'bold', lineHeight: 1, opacity: 0.9, color: 'white' }}>
                    {a.workPosition.shortName || a.workPosition.name?.substring(0, 4)}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      );
    }
  }

  return { cellContent, cellBgColor };
};

const ScheduleDesktopTable: React.FC<ScheduleDesktopTableProps> = ({
  filteredUsers,
  allUsersAssignments,
  calendarDays,
  isAdmin,
  onEditClick,
  canEditSchedule,
  getScheduleStatus,
}) => {
  return (
    <TableContainer sx={{
      maxHeight: { xs: 'calc(100dvh - 200px)', sm: 'calc(100dvh - 200px)', md: 'calc(100dvh - 220px)', lg: 'calc(100dvh - 200px)' },
      minHeight: { xs: 300, sm: 400 },
      overflowX: 'auto',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                position: 'sticky',
                left: 0,
                bgcolor: 'background.paper',
                zIndex: 3,
                minWidth: 150,
                fontWeight: 'bold',
                fontSize: '0.75rem',
              }}
            >
              User
            </TableCell>
            {calendarDays.map(({ day, dayOfWeek, isWeekend }) => (
              <TableCell
                key={day}
                align="center"
                sx={{
                  p: 0.3,
                  minWidth: 32,
                  maxWidth: 38,
                  bgcolor: isWeekend ? 'grey.200' : 'background.paper',
                  fontWeight: 'bold',
                  fontSize: '0.65rem',
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: '0.55rem', color: isWeekend ? 'error.main' : 'text.secondary' }}>
                    {dayOfWeek}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                    {day}
                  </Typography>
                </Box>
              </TableCell>
            ))}
            <TableCell
              align="center"
              sx={{
                position: 'sticky',
                right: 0,
                bgcolor: 'background.paper',
                zIndex: 3,
                minWidth: 60,
                fontWeight: 'bold',
                fontSize: '0.75rem',
              }}
            >
              Actiuni
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredUsers.map((targetUser) => {
            const userAssignments = allUsersAssignments[targetUser.id]?.assignments || {};
            const scheduleStatus = getScheduleStatus(targetUser.id);
            const canEdit = canEditSchedule(targetUser);

            return (
              <TableRow
                key={targetUser.id}
                sx={{
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 0,
                    bgcolor: 'background.paper',
                    zIndex: 1,
                    p: 0.5,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: targetUser.role === 'MANAGER' ? 'primary.main' : 'grey.500' }}>
                      {targetUser.fullName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.7rem', display: 'block' }}>
                        {targetUser.fullName}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip
                          label={targetUser.role === 'MANAGER' ? 'Manager' : 'User'}
                          size="small"
                          color={targetUser.role === 'MANAGER' ? 'primary' : 'default'}
                          sx={{ height: 14, fontSize: '0.55rem', '& .MuiChip-label': { px: 0.5 } }}
                        />
                        {renderStatusChip(scheduleStatus)}
                      </Stack>
                    </Box>
                  </Stack>
                </TableCell>
                {calendarDays.map(({ date, isWeekend }) => {
                  const existingAssignments = userAssignments[date];
                  const { cellContent, cellBgColor } = renderDayCellContent(existingAssignments, isWeekend);
                  const isMultipleAssignments = existingAssignments && existingAssignments.length > 1;

                  return (
                    <TableCell
                      key={date}
                      align="center"
                      sx={{
                        p: isMultipleAssignments ? 0 : 0.2,
                        bgcolor: cellBgColor,
                        color: existingAssignments ? 'white' : 'text.secondary',
                        fontWeight: 'bold',
                        fontSize: '0.65rem',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {cellContent}
                    </TableCell>
                  );
                })}
                <TableCell
                  align="center"
                  sx={{
                    position: 'sticky',
                    right: 0,
                    bgcolor: 'background.paper',
                    zIndex: 1,
                    p: 0.5,
                  }}
                >
                  {canEdit && (
                    <Tooltip title={
                      isAdmin
                        ? 'Editeaza programul (Admin)'
                        : 'Editeaza programul (va necesita aprobare)'
                    }>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => onEditClick(targetUser)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default React.memo(ScheduleDesktopTable);
