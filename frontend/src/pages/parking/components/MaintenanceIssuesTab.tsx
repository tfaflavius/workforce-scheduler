import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Tooltip,
  alpha,
  Fade,
  Grow,
  Chip,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as ResolveIcon,
  Refresh as RefreshIcon,
  Warning as UrgentIcon,
  AccessTime as TimeIcon,
  Build as EquipmentIcon,
  Business as CompanyIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import {
  useGetMyAssignedIssuesQuery,
} from '../../../store/api/parking.api';
import type { ParkingIssue, ParkingIssueStatus } from '../../../types/parking.types';
import { ISSUE_STATUS_LABELS } from '../../../types/parking.types';
import ResolveIssueDialog from './ResolveIssueDialog';
import IssueDetailsDialog from './IssueDetailsDialog';

const MaintenanceIssuesTab: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<ParkingIssue | null>(null);

  const { data: myAssignedIssues = [], isLoading, refetch } = useGetMyAssignedIssuesQuery();

  // Separate active and resolved issues
  const activeIssues = myAssignedIssues.filter(i => i.status === 'ACTIVE');
  const resolvedIssues = myAssignedIssues.filter(i => i.status === 'FINALIZAT');

  const handleResolve = (issue: ParkingIssue) => {
    setSelectedIssue(issue);
    setResolveDialogOpen(true);
  };

  const handleShowDetails = (issue: ParkingIssue) => {
    setSelectedIssue(issue);
    setDetailsDialogOpen(true);
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: ParkingIssueStatus) => {
    return status === 'ACTIVE' ? 'warning' : 'success';
  };

  const urgentCount = activeIssues.filter(i => i.isUrgent).length;

  const renderIssueCard = (issue: ParkingIssue, index: number) => (
    <Grow in={true} key={issue.id} style={{ transformOrigin: '0 0 0', transitionDelay: `${index * 50}ms` }}>
      <Card
        sx={{
          mb: { xs: 1.5, sm: 2 },
          borderRadius: { xs: 2, sm: 3 },
          borderLeft: issue.isUrgent ? '4px solid' : '3px solid',
          borderColor: issue.isUrgent ? 'error.main' : 'primary.main',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.palette.mode === 'light'
              ? '0 8px 24px rgba(0, 0, 0, 0.12)'
              : '0 8px 24px rgba(0, 0, 0, 0.4)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        }}
        onClick={() => handleShowDetails(issue)}
      >
        <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
          <Stack spacing={{ xs: 1, sm: 1.5 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}>
                {issue.isUrgent && (
                  <Tooltip title="Urgent - nerezolvat de peste 48h">
                    <Box
                      sx={{
                        p: 0.5,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                          '0%, 100%': { opacity: 1 },
                          '50%': { opacity: 0.5 },
                        },
                      }}
                    >
                      <UrgentIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: 'error.main' }} />
                    </Box>
                  </Tooltip>
                )}
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {issue.parkingLot?.name}
                </Typography>
              </Box>
              <Chip
                label={ISSUE_STATUS_LABELS[issue.status]}
                color={getStatusColor(issue.status)}
                size="small"
                sx={{
                  height: { xs: 22, sm: 24 },
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                  fontWeight: 600,
                }}
              />
            </Box>

            {/* Info Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
                gap: { xs: 0.75, sm: 1 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EquipmentIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, color: 'text.secondary' }} noWrap>
                  {issue.equipment}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CompanyIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, color: 'text.secondary' }} noWrap>
                  {issue.contactedCompany}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, gridColumn: { xs: 'span 2', sm: 'auto' } }}>
                <TimeIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, color: 'text.secondary' }}>
                  {formatDateShort(issue.createdAt)}
                </Typography>
              </Box>
            </Box>

            {/* Description */}
            <Typography
              variant="body2"
              sx={{
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                color: 'text.primary',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.5,
              }}
            >
              {issue.description}
            </Typography>

            {/* Creator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PersonIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' }, color: 'text.secondary' }}>
                Raportat de: {issue.creator?.fullName}
              </Typography>
            </Box>

            {/* Resolution Info */}
            {issue.status === 'FINALIZAT' && (
              <Alert
                severity="success"
                sx={{
                  py: 0.5,
                  px: 1,
                  '& .MuiAlert-message': {
                    p: 0,
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  },
                  '& .MuiAlert-icon': {
                    py: 0,
                    mr: 0.5,
                    '& .MuiSvgIcon-root': {
                      fontSize: { xs: 16, sm: 18 },
                    },
                  },
                }}
              >
                <strong>{issue.resolver?.fullName}:</strong> {issue.resolutionDescription}
              </Alert>
            )}

            {/* Actions */}
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                pt: 0.5,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="small"
                variant="outlined"
                startIcon={<CommentIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />}
                onClick={() => handleShowDetails(issue)}
                sx={{
                  flex: 1,
                  py: { xs: 0.5, sm: 0.75 },
                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                  borderRadius: 1.5,
                }}
              >
                Detalii & Comentarii
              </Button>
              {issue.status === 'ACTIVE' && (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<ResolveIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />}
                  onClick={() => handleResolve(issue)}
                  sx={{
                    flex: 1,
                    py: { xs: 0.5, sm: 0.75 },
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    borderRadius: 1.5,
                  }}
                >
                  Finalizează
                </Button>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grow>
  );

  return (
    <Box>
      {/* Urgent Alert */}
      {urgentCount > 0 && (
        <Fade in={true}>
          <Alert
            severity="error"
            sx={{
              mb: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              '& .MuiAlert-icon': {
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              },
            }}
            icon={<UrgentIcon />}
          >
            <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              <strong>{urgentCount}</strong> probleme urgente de rezolvat (peste 48h)!
            </Typography>
          </Alert>
        </Fade>
      )}

      {/* Stats Card */}
      <Paper
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 1, sm: 2 },
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.15),
              display: 'flex',
            }}
          >
            <AssignmentIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="primary.main">
              {activeIssues.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Probleme active alocate ție
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-end', sm: 'flex-start' }}>
          <IconButton
            onClick={() => refetch()}
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.15),
              },
            }}
          >
            <RefreshIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
        </Stack>
      </Paper>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 4, sm: 6 } }}>
          <CircularProgress size={isMobile ? 32 : 40} />
        </Box>
      ) : activeIssues.length === 0 && resolvedIssues.length === 0 ? (
        <Alert
          severity="success"
          sx={{
            borderRadius: 2,
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
          }}
          icon={<ResolveIcon />}
        >
          Nu ai probleme alocate în acest moment. Bună treabă! 🎉
        </Alert>
      ) : (
        <>
          {/* Active Issues */}
          {activeIssues.length > 0 && (
            <>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  mb: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: 'warning.main',
                }}
              >
                <UrgentIcon sx={{ fontSize: 20 }} />
                De rezolvat ({activeIssues.length})
              </Typography>
              <Box sx={{ mb: 3 }}>
                {activeIssues.map((issue, index) => renderIssueCard(issue, index))}
              </Box>
            </>
          )}

          {/* Resolved Issues */}
          {resolvedIssues.length > 0 && (
            <>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  mb: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: 'success.main',
                }}
              >
                <ResolveIcon sx={{ fontSize: 20 }} />
                Finalizate recent ({resolvedIssues.length})
              </Typography>
              <Box>
                {resolvedIssues.map((issue, index) => renderIssueCard(issue, index))}
              </Box>
            </>
          )}
        </>
      )}

      {/* Dialogs */}
      {selectedIssue && (
        <>
          <ResolveIssueDialog
            open={resolveDialogOpen}
            onClose={() => {
              setResolveDialogOpen(false);
              setSelectedIssue(null);
            }}
            issue={selectedIssue}
          />
          <IssueDetailsDialog
            open={detailsDialogOpen}
            onClose={() => {
              setDetailsDialogOpen(false);
              setSelectedIssue(null);
            }}
            issue={selectedIssue}
            canComment={true}
          />
        </>
      )}
    </Box>
  );
};

export default MaintenanceIssuesTab;
