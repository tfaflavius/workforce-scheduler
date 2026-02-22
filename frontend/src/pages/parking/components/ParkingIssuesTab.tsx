import React, { useState, useEffect, useMemo } from 'react';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  CalendarMonth as CalendarIcon,
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
import EditIssueDialog from './EditIssueDialog';
import { DISPECERAT_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME, CONTROL_DEPARTMENT_NAME } from '../../../constants/departments';

interface ParkingIssuesTabProps {
  initialOpenId?: string | null;
  onOpenIdHandled?: () => void;
}

const ParkingIssuesTab: React.FC<ParkingIssuesTabProps> = ({ initialOpenId, onOpenIdHandled }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // < 430px
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg')); // 430px - 1024px
  const { user } = useAppSelector((state) => state.auth);

  // When opening from notification, show ALL issues so we can find the specific one
  const [statusFilter, setStatusFilter] = useState<'ALL' | ParkingIssueStatus>(initialOpenId ? 'ALL' : 'ACTIVE');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<ParkingIssue | null>(null);

  const { data: issues = [], isLoading, refetch } = useGetParkingIssuesQuery(
    statusFilter === 'ALL' ? undefined : statusFilter
  );
  const { data: myAssignedIssues = [] } = useGetMyAssignedIssuesQuery();
  const [deleteIssue] = useDeleteParkingIssueMutation();

  // Handle opening specific issue from notification
  useEffect(() => {
    if (initialOpenId && issues.length > 0) {
      const issue = issues.find(i => i.id === initialOpenId);
      if (issue) {
        setSelectedIssue(issue);
        setDetailsDialogOpen(true);
        onOpenIdHandled?.();
      }
    }
  }, [initialOpenId, issues, onOpenIdHandled]);

  const isAdmin = user?.role === 'ADMIN';
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const deptName = user?.department?.name || '';
  const canComment = isAdminOrManager || [DISPECERAT_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME, CONTROL_DEPARTMENT_NAME].includes(deptName);

  const handleResolve = (issue: ParkingIssue) => {
    setSelectedIssue(issue);
    setResolveDialogOpen(true);
  };

  const handleShowDetails = (issue: ParkingIssue) => {
    setSelectedIssue(issue);
    setDetailsDialogOpen(true);
  };

  const handleEdit = (issue: ParkingIssue) => {
    setSelectedIssue(issue);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Esti sigur ca vrei sa stergi aceasta problema?')) {
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

  // Group issues by month
  const MONTH_NAMES = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
  const issuesByMonth = useMemo(() => {
    const groups: Record<string, { label: string; items: ParkingIssue[]; urgentCount: number }> = {};
    issues.forEach((issue) => {
      const date = new Date(issue.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = { label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`, items: [], urgentCount: 0 };
      }
      groups[key].items.push(issue);
      if (issue.isUrgent && issue.status === 'ACTIVE') groups[key].urgentCount++;
    });
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, group]) => ({ key, ...group }));
  }, [issues]);

  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth()).padStart(2, '0')}`;

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
                  Finalizeaza
                </Button>
              )}
              {isAdminOrManager && issue.status === 'ACTIVE' && (
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleEdit(issue)}
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                    },
                  }}
                >
                  <EditIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                </IconButton>
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

  const renderIssueTable = (items?: ParkingIssue[]) => (
    <Paper
      sx={{
        borderRadius: { xs: 2, sm: 3 },
        overflow: 'hidden',
        boxShadow: theme.palette.mode === 'light'
          ? '0 2px 12px rgba(0, 0, 0, 0.08)'
          : '0 2px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40, p: { xs: 1, sm: 1.5 } }}></TableCell>
              <TableCell sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 120 }}>Parcare</TableCell>
              <TableCell sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 100 }}>Echipament</TableCell>
              <TableCell sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 120 }}>Firma</TableCell>
              <TableCell sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 150 }}>Descriere</TableCell>
              <TableCell sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 80 }}>Status</TableCell>
              <TableCell sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 100 }}>Data</TableCell>
              <TableCell sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 100 }}>Creat de</TableCell>
              <TableCell align="right" sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 120 }}>Actiuni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(items || issues).map((issue, index) => (
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
                      {isAdminOrManager && issue.status === 'ACTIVE' && (
                        <Tooltip title="Editeaza">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEdit(issue)}
                            sx={{ p: { xs: 0.5, sm: 0.75 } }}
                          >
                            <EditIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                          </IconButton>
                        </Tooltip>
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
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          gap: { xs: 1, md: 2 },
        }}
      >
        <Tabs
          value={statusFilter}
          onChange={(_, v) => setStatusFilter(v)}
          variant="fullWidth"
          sx={{
            minHeight: 40,
            width: '100%',
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
            '& .MuiTab-root': {
              minHeight: 40,
              fontSize: '0.8rem',
              fontWeight: 600,
              px: 1,
              minWidth: 0,
              textTransform: 'none',
            },
          }}
        >
          <Tab label="Active" value="ACTIVE" />
          <Tab label="Finalizate" value="FINALIZAT" />
          <Tab label="Toate" value="ALL" />
        </Tabs>

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ flexShrink: 0 }}>
          <IconButton
            onClick={() => refetch()}
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.15),
              },
            }}
          >
            <RefreshIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={() => setCreateDialogOpen(true)}
            size="small"
            sx={{
              py: 0.75,
              px: 2,
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: 2,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(37, 99, 235, 0.35)',
              },
            }}
          >
            Adauga
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
          Nu exista probleme in aceasta categorie.
        </Alert>
      ) : (
        issuesByMonth.map((group) => (
          <Accordion
            key={group.key}
            defaultExpanded={group.key === currentMonthKey}
            sx={{
              mb: 1,
              borderRadius: '12px !important',
              overflow: 'hidden',
              '&:before': { display: 'none' },
              boxShadow: theme.palette.mode === 'light'
                ? '0 1px 4px rgba(0,0,0,0.06)'
                : '0 1px 4px rgba(0,0,0,0.2)',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                bgcolor: alpha(theme.palette.error.main, 0.04),
                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) },
                minHeight: { xs: 48, sm: 56 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 1 }}>
                <CalendarIcon sx={{ color: 'error.main', fontSize: { xs: 20, sm: 22 } }} />
                <Typography fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, flex: 1 }}>
                  {group.label}
                </Typography>
                <Chip
                  label={`${group.items.length} probleme`}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    color: 'error.dark',
                  }}
                />
                {group.urgentCount > 0 && (
                  <Chip
                    label={`${group.urgentCount} urgente`}
                    size="small"
                    color="error"
                    sx={{ fontWeight: 700, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
              {isMobile || isTablet ? (
                group.items.map((issue, index) => renderIssueCard(issue, index))
              ) : (
                renderIssueTable(group.items)
              )}
            </AccordionDetails>
          </Accordion>
        ))
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
            canComment={canComment}
          />
          <EditIssueDialog
            open={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setSelectedIssue(null);
            }}
            issue={selectedIssue}
          />
        </>
      )}
    </Box>
  );
};

export default ParkingIssuesTab;
