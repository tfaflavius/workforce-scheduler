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
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as ResolveIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Warning as UrgentIcon,
  Info as InfoIcon,
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: ParkingIssueStatus) => {
    return status === 'ACTIVE' ? 'warning' : 'success';
  };

  const urgentCount = issues.filter(i => i.isUrgent && i.status === 'ACTIVE').length;

  const renderIssueCard = (issue: ParkingIssue) => (
    <Card
      key={issue.id}
      sx={{
        mb: 2,
        borderLeft: issue.isUrgent ? '4px solid' : 'none',
        borderColor: 'error.main',
      }}
    >
      <CardContent>
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {issue.isUrgent && (
                <Tooltip title="Urgent - nerezolvat de peste 48h">
                  <UrgentIcon color="error" />
                </Tooltip>
              )}
              <Typography variant="subtitle1" fontWeight="bold">
                {issue.parkingLot?.name}
              </Typography>
            </Box>
            <Chip
              label={ISSUE_STATUS_LABELS[issue.status]}
              color={getStatusColor(issue.status)}
              size="small"
            />
          </Box>

          <Typography variant="body2" color="text.secondary">
            <strong>Echipament:</strong> {issue.equipment}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Firmă contactată:</strong> {issue.contactedCompany}
          </Typography>
          <Typography variant="body2">
            {issue.description}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Creat: {formatDate(issue.createdAt)} de <strong>{issue.creator?.fullName}</strong>
          </Typography>
          {issue.lastModifier && issue.lastModifiedBy !== issue.createdBy && (
            <Typography variant="caption" color="text.secondary">
              Ultima modificare: de <strong>{issue.lastModifier?.fullName}</strong>
            </Typography>
          )}

          {issue.status === 'FINALIZAT' && (
            <Alert severity="success" sx={{ mt: 1 }}>
              <Typography variant="caption">
                <strong>Rezolvat de {issue.resolver?.fullName}:</strong> {issue.resolutionDescription}
              </Typography>
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<InfoIcon />}
              onClick={() => handleShowDetails(issue)}
            >
              Detalii
            </Button>
            {issue.status === 'ACTIVE' && (
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<ResolveIcon />}
                onClick={() => handleResolve(issue)}
              >
                Finalizează
              </Button>
            )}
            {isAdmin && (
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(issue.id)}
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  const renderIssueTable = () => (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell></TableCell>
            <TableCell>Parcare</TableCell>
            <TableCell>Echipament</TableCell>
            <TableCell>Firmă</TableCell>
            <TableCell>Descriere</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Data</TableCell>
            <TableCell>Creat de</TableCell>
            <TableCell align="right">Acțiuni</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {issues.map((issue) => (
            <TableRow
              key={issue.id}
              sx={{
                bgcolor: issue.isUrgent ? 'error.50' : 'inherit',
              }}
            >
              <TableCell>
                {issue.isUrgent && (
                  <Tooltip title="Urgent - nerezolvat de peste 48h">
                    <UrgentIcon color="error" fontSize="small" />
                  </Tooltip>
                )}
              </TableCell>
              <TableCell>{issue.parkingLot?.name}</TableCell>
              <TableCell>{issue.equipment}</TableCell>
              <TableCell>{issue.contactedCompany}</TableCell>
              <TableCell sx={{ maxWidth: 200 }}>
                <Tooltip title={issue.description}>
                  <Typography variant="body2" noWrap>
                    {issue.description}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Chip
                  label={ISSUE_STATUS_LABELS[issue.status]}
                  color={getStatusColor(issue.status)}
                  size="small"
                />
              </TableCell>
              <TableCell>{formatDate(issue.createdAt)}</TableCell>
              <TableCell>
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
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <IconButton
                    size="small"
                    color="info"
                    onClick={() => handleShowDetails(issue)}
                  >
                    <InfoIcon />
                  </IconButton>
                  {issue.status === 'ACTIVE' && (
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => handleResolve(issue)}
                    >
                      <ResolveIcon />
                    </IconButton>
                  )}
                  {isAdmin && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(issue.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      {/* Urgent Alert */}
      {urgentCount > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} icon={<UrgentIcon />}>
          <strong>{urgentCount}</strong> probleme urgente nerezolvate de peste 48 de ore!
        </Alert>
      )}

      {/* Stats */}
      {myAssignedIssues.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Ai <strong>{myAssignedIssues.length}</strong> probleme alocate pentru rezolvare
        </Alert>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Tabs
          value={statusFilter}
          onChange={(_, v) => setStatusFilter(v)}
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{ minWidth: isMobile ? '100%' : 'auto' }}
        >
          <Tab label="Active" value="ACTIVE" />
          <Tab label="Finalizate" value="FINALIZAT" />
          <Tab label="Toate" value="ALL" />
        </Tabs>

        <Stack direction="row" spacing={1}>
          <IconButton onClick={() => refetch()}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            size={isMobile ? 'small' : 'medium'}
          >
            {isMobile ? 'Adaugă' : 'Adaugă Problemă'}
          </Button>
        </Stack>
      </Box>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : issues.length === 0 ? (
        <Alert severity="info">Nu există probleme în această categorie.</Alert>
      ) : isMobile ? (
        issues.map(renderIssueCard)
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
