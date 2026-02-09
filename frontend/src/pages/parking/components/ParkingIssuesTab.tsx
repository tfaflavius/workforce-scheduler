import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
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
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as ResolveIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Warning as UrgentIcon,
  Info as InfoIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Build as EquipmentIcon,
  Business as CompanyIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import {
  useGetParkingIssuesQuery,
  useGetMyAssignedIssuesQuery,
  useDeleteParkingIssueMutation,
} from '../../../store/api/parking.api';
import type { ParkingIssue, ParkingIssueStatus } from '../../../types/parking.types';
import { ISSUE_STATUS_LABELS } from '../../../types/parking.types';
import CreateIssueDialog from './CreateIssueDialog';
import ResolveIssueDialog from './ResolveIssueDialog';
import IssueDetailsDialog from './IssueDetailsDialog';

const ParkingIssuesTab: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // < 430px
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg')); // 430px - 1024px
  const { user } = useAppSelector((state) => state.auth);

  const [statusFilter, setStatusFilter] = useState<'ALL' | ParkingIssueStatus>('ACTIVE');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<ParkingIssue | null>(null);

  const { data: issues = [], isLoading, refetch } = useGetParkingIssuesQuery(
    statusFilter === 'ALL' ? undefined : statusFilter
  );
  const { data: myAssignedIssues = [] } = useGetMyAssignedIssuesQuery();
  const [deleteIssue] = useDeleteParkingIssueMutation();

  const isAdmin = user?.role === 'ADMIN';
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleResolve = (issue: ParkingIssue) => {
    setSelectedIssue(issue);
    setResolveDialogOpen(true);
  };

  const handleShowDetails = (issue: ParkingIssue) => {
    setSelectedIssue(issue);
    setDetailsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Ești sigur că vrei să ștergi această problemă?')) {
      try {
        await deleteIssue(id).unwrap();
      } catch (error) {
        console.error('Error deleting issue:', error);
      }
    }
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

  const urgentCount = issues.filter(i => i.isUrgent && i.status === 'ACTIVE').length;

  const renderIssueCard = (issue: ParkingIssue, index: number) => (
    <Grow in={true} key={issue.id} style={{ transformOrigin: '0 0 0', transitionDelay: `${index * 50}ms` }}>
      <Card
        sx={{
          mb: { xs: 1.5, sm: 2 },
          borderRadius: { xs: 2, sm: 3 },
          borderLeft: issue.isUrgent ? '4px solid' : 'none',
          borderColor: 'error.main',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.palette.mode === 'light'
              ? '0 8px 24px rgba(0, 0, 0, 0.12)'
              : '0 8px 24px rgba(0, 0, 0, 0.4)',
          },
          '&:active': {
            transform: 'translateY(0)',
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
                {issue.creator?.fullName}
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
                startIcon={<InfoIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />}
                onClick={() => handleShowDetails(issue)}
                sx={{
                  flex: 1,
                  py: { xs: 0.5, sm: 0.75 },
                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                  borderRadius: 1.5,
                }}
              >
                Detalii
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
              {isAdmin && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(issue.id)}
                  sx={{
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.error.main, 0.2),
                    },
                  }}
                >
                  <DeleteIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                </IconButton>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grow>
  );

  const renderIssueTable = () => (
    <Paper
      sx={{
        borderRadius: { xs: 2, sm: 3 },
        overflow: 'hidden',
        boxShadow: theme.palette.mode === 'light'
          ? '0 2px 12px rgba(0, 0, 0, 0.08)'
          : '0 2px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)', overflowX: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40, p: { xs: 1, sm: 1.5 } }}></TableCell>
              <TableCell sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 120 }}>Parcare</TableCell>
              <TableCell sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 100 }}>Echipament</TableCell>
              <TableCell sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 120 }}>Firmă</TableCell>
              <TableCell sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 150 }}>Descriere</TableCell>
              <TableCell sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 80 }}>Status</TableCell>
              <TableCell sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 100 }}>Data</TableCell>
              <TableCell sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 100 }}>Creat de</TableCell>
              <TableCell align="right" sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 120 }}>Acțiuni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {issues.map((issue, index) => (
              <Fade in={true} key={issue.id} style={{ transitionDelay: `${index * 30}ms` }}>
                <TableRow
                  sx={{
                    bgcolor: issue.isUrgent ? alpha(theme.palette.error.main, 0.05) : 'inherit',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      bgcolor: issue.isUrgent
                        ? alpha(theme.palette.error.main, 0.1)
                        : alpha(theme.palette.primary.main, 0.04),
                    },
                  }}
                  onClick={() => handleShowDetails(issue)}
                >
                  <TableCell sx={{ p: { xs: 1, sm: 1.5 } }}>
                    {issue.isUrgent && (
                      <Tooltip title="Urgent - nerezolvat de peste 48h">
                        <UrgentIcon
                          color="error"
                          sx={{
                            fontSize: { xs: 16, sm: 18 },
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0.5 },
                            },
                          }}
                        />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell sx={{ p: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    {issue.parkingLot?.name}
                  </TableCell>
                  <TableCell sx={{ p: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    {issue.equipment}
                  </TableCell>
                  <TableCell sx={{ p: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    {issue.contactedCompany}
                  </TableCell>
                  <TableCell sx={{ p: { xs: 1, sm: 1.5 }, maxWidth: { xs: 150, lg: 250 } }}>
                    <Tooltip title={issue.description}>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        {issue.description}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ p: { xs: 1, sm: 1.5 } }}>
                    <Chip
                      label={ISSUE_STATUS_LABELS[issue.status]}
                      color={getStatusColor(issue.status)}
                      size="small"
                      sx={{
                        height: { xs: 20, sm: 24 },
                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ p: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                    {formatDateShort(issue.createdAt)}
                  </TableCell>
                  <TableCell sx={{ p: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    <Tooltip title={
                      issue.status === 'FINALIZAT' && issue.resolver
                        ? `Finalizat de: ${issue.resolver.fullName}`
                        : issue.lastModifier && issue.lastModifiedBy !== issue.createdBy
                          ? `Modificat de: ${issue.lastModifier.fullName}`
                          : ''
                    }>
                      <span>{issue.creator?.fullName}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right" sx={{ p: { xs: 1, sm: 1.5 } }} onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => handleShowDetails(issue)}
                        sx={{ p: { xs: 0.5, sm: 0.75 } }}
                      >
                        <InfoIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                      </IconButton>
                      {issue.status === 'ACTIVE' && (
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleResolve(issue)}
                          sx={{ p: { xs: 0.5, sm: 0.75 } }}
                        >
                          <ResolveIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                        </IconButton>
                      )}
                      {isAdmin && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(issue.id)}
                          sx={{ p: { xs: 0.5, sm: 0.75 } }}
                        >
                          <DeleteIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                        </IconButton>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              </Fade>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
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
              <strong>{urgentCount}</strong> probleme urgente nerezolvate de peste 48 de ore!
            </Typography>
          </Alert>
        </Fade>
      )}

      {/* Stats */}
      {myAssignedIssues.length > 0 && (
        <Fade in={true}>
          <Alert
            severity="info"
            sx={{
              mb: { xs: 1.5, sm: 2 },
              borderRadius: 2,
            }}
          >
            <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Ai <strong>{myAssignedIssues.length}</strong> probleme alocate pentru rezolvare
            </Typography>
          </Alert>
        </Fade>
      )}

      {/* Actions */}
      <Paper
        sx={{
          p: { xs: 1, sm: 1.5 },
          mb: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 1, sm: 2 },
        }}
      >
        <Tabs
          value={statusFilter}
          onChange={(_, v) => setStatusFilter(v)}
          variant="fullWidth"
          sx={{
            minHeight: { xs: 40, sm: 48 },
            flex: { xs: '1', sm: 'initial' },
            '& .MuiTab-root': {
              minHeight: { xs: 40, sm: 48 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              fontWeight: 500,
              px: { xs: 1, sm: 2 },
            },
          }}
        >
          <Tab label="Active" value="ACTIVE" />
          <Tab label="Finalizate" value="FINALIZAT" />
          <Tab label="Toate" value="ALL" />
        </Tabs>

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
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              py: { xs: 1, sm: 1.25 },
              px: { xs: 2, sm: 3 },
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(37, 99, 235, 0.35)',
              },
            }}
          >
            {isMobile ? 'Adaugă' : 'Adaugă Problemă'}
          </Button>
        </Stack>
      </Paper>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 4, sm: 6 } }}>
          <CircularProgress size={isMobile ? 32 : 40} />
        </Box>
      ) : issues.length === 0 ? (
        <Alert
          severity="info"
          sx={{
            borderRadius: 2,
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
          }}
        >
          Nu există probleme în această categorie.
        </Alert>
      ) : isMobile || isTablet ? (
        <Box>
          {issues.map((issue, index) => renderIssueCard(issue, index))}
        </Box>
      ) : (
        renderIssueTable()
      )}

      {/* Dialogs */}
      <CreateIssueDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />

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
            canComment={isAdminOrManager}
          />
        </>
      )}
    </Box>
  );
};

export default ParkingIssuesTab;
