import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  alpha,
  Grid,
  Collapse,
  IconButton,
  Divider,
  Grow,
  SwipeableDrawer,
  Fab,
  Zoom,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Home as HomeIcon,
  FilterList as FilterIcon,
  CheckCircle as ResolvedIcon,
  Error as ActiveIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  AddLocation as ApproveLocationIcon,
  RemoveCircle as RevokeIcon,
  Edit as ModifyIcon,
} from '@mui/icons-material';
import DatePickerField from '../../components/common/DatePickerField';
import { useGetDomiciliuRequestsQuery } from '../../store/api/domiciliu.api';
import { DOMICILIU_REQUEST_TYPE_LABELS, DOMICILIU_REQUEST_STATUS_LABELS } from '../../types/domiciliu.types';
import type { DomiciliuRequestType, DomiciliuRequestStatus } from '../../types/domiciliu.types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface DomiciliuReportsTabProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
}

const REQUEST_TYPE_COLORS: Record<DomiciliuRequestType, string> = {
  APROBARE_LOC: '#059669',
  REVOCARE_LOC: '#dc2626',
  MODIFICARE_DATE: '#0284c7',
};

const REQUEST_TYPE_ICONS: Record<DomiciliuRequestType, React.ReactNode> = {
  APROBARE_LOC: <ApproveLocationIcon />,
  REVOCARE_LOC: <RevokeIcon />,
  MODIFICARE_DATE: <ModifyIcon />,
};

const DomiciliuReportsTab: React.FC<DomiciliuReportsTabProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedType, setSelectedType] = useState<DomiciliuRequestType | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<DomiciliuRequestStatus | 'ALL'>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportDrawerOpen, setExportDrawerOpen] = useState(false);

  // Fetch data
  const { data: allRequests = [], isLoading, refetch } = useGetDomiciliuRequestsQuery(
    selectedStatus !== 'ALL' ? { status: selectedStatus } : undefined
  );

  // Filter data by date range and type
  const filteredRequests = useMemo(() => {
    return allRequests.filter(request => {
      const requestDate = new Date(request.createdAt);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && requestDate < start) return false;
      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (requestDate > endOfDay) return false;
      }
      if (selectedType !== 'ALL' && request.requestType !== selectedType) return false;

      return true;
    });
  }, [allRequests, startDate, endDate, selectedType]);

  // Statistics
  const stats = useMemo(() => {
    const byType: Record<DomiciliuRequestType, { active: number; resolved: number }> = {
      APROBARE_LOC: { active: 0, resolved: 0 },
      REVOCARE_LOC: { active: 0, resolved: 0 },
      MODIFICARE_DATE: { active: 0, resolved: 0 },
    };

    filteredRequests.forEach(r => {
      if (r.status === 'ACTIVE') {
        byType[r.requestType].active++;
      } else {
        byType[r.requestType].resolved++;
      }
    });

    const total = filteredRequests.length;
    const active = filteredRequests.filter(r => r.status === 'ACTIVE').length;
    const resolved = filteredRequests.filter(r => r.status === 'FINALIZAT').length;

    return { total, active, resolved, byType };
  }, [filteredRequests]);

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105);
    doc.text('Raport Solicitări Parcări Domiciliu', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const periodText = startDate && endDate
      ? `Perioada: ${format(new Date(startDate), 'dd.MM.yyyy')} - ${format(new Date(endDate), 'dd.MM.yyyy')}`
      : 'Toate înregistrările';
    doc.text(periodText, 14, 30);
    doc.text(`Generat la: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 14, 36);

    // Statistics
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Statistici:', 14, 48);
    doc.setFontSize(10);
    doc.text(`Total solicitări: ${stats.total}`, 14, 56);
    doc.text(`Active: ${stats.active}`, 14, 62);
    doc.text(`Finalizate: ${stats.resolved}`, 14, 68);

    // Table
    const tableData = filteredRequests.map(r => [
      DOMICILIU_REQUEST_TYPE_LABELS[r.requestType],
      r.location,
      r.personName,
      r.carPlate,
      r.address?.substring(0, 30) + (r.address?.length > 30 ? '...' : '') || '-',
      DOMICILIU_REQUEST_STATUS_LABELS[r.status],
      format(new Date(r.createdAt), 'dd.MM.yyyy'),
    ]);

    autoTable(doc, {
      startY: 78,
      head: [['Tip', 'Locație', 'Persoană', 'Nr. Auto', 'Adresa', 'Status', 'Data']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [5, 150, 105] },
    });

    doc.save(`raport-parcari-domiciliu-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setExportDrawerOpen(false);
  };

  // Export to Excel
  const exportToExcel = () => {
    const excelData = filteredRequests.map(r => ({
      'Tip Solicitare': DOMICILIU_REQUEST_TYPE_LABELS[r.requestType],
      'Locație Parcare': r.location,
      'Link Google Maps': r.googleMapsLink || '',
      'Nume Persoană': r.personName,
      'CNP': r.cnp || '',
      'Adresa Domiciliu': r.address,
      'Nr. Auto': r.carPlate,
      'Marcă Auto': r.carBrand || '',
      'Telefon': r.phone || '',
      'Email': r.email || '',
      'Nr. Contract': r.contractNumber || '',
      'Descriere': r.description,
      'Status': DOMICILIU_REQUEST_STATUS_LABELS[r.status],
      'Data Creare': format(new Date(r.createdAt), 'dd.MM.yyyy HH:mm'),
      'Creat de': r.creator?.fullName || '',
      'Rezolvat de': r.resolver?.fullName || '',
      'Data Rezolvare': r.resolvedAt ? format(new Date(r.resolvedAt), 'dd.MM.yyyy HH:mm') : '',
      'Descriere Rezoluție': r.resolutionDescription || '',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitări Domiciliu');

    // Auto-width columns
    const maxWidth = 50;
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, ...excelData.map(row => String(row[key as keyof typeof row] || '').length)))
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `raport-parcari-domiciliu-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    setExportDrawerOpen(false);
  };

  // Stat Card Component
  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, icon, color }) => (
    <Card
      sx={{
        borderRadius: 2,
        bgcolor: alpha(color, 0.08),
        border: `1px solid ${alpha(color, 0.2)}`,
      }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1.5,
              bgcolor: alpha(color, 0.15),
              color: color,
              display: 'flex',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color={color}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  // Filters Panel
  const FiltersPanel = (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight={600}>
        Filtre Raport
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <DatePickerField
          label="De la"
          value={startDate}
          onChange={onStartDateChange}
          maxDate={endDate || undefined}
        />
        <DatePickerField
          label="Până la"
          value={endDate}
          onChange={onEndDateChange}
          minDate={startDate || undefined}
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControl fullWidth size="small">
          <InputLabel>Tip solicitare</InputLabel>
          <Select
            value={selectedType}
            label="Tip solicitare"
            onChange={(e) => setSelectedType(e.target.value as DomiciliuRequestType | 'ALL')}
          >
            <MenuItem value="ALL">Toate tipurile</MenuItem>
            <MenuItem value="APROBARE_LOC">Aprobare locuri</MenuItem>
            <MenuItem value="REVOCARE_LOC">Revocare locuri</MenuItem>
            <MenuItem value="MODIFICARE_DATE">Modificare date</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Status</InputLabel>
          <Select
            value={selectedStatus}
            label="Status"
            onChange={(e) => setSelectedStatus(e.target.value as DomiciliuRequestStatus | 'ALL')}
          >
            <MenuItem value="ALL">Toate statusurile</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="FINALIZAT">Finalizate</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={() => refetch()}
        fullWidth
      >
        Actualizează date
      </Button>
    </Stack>
  );

  // Export Drawer Content
  const ExportDrawerContent = (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">Exportă Raport</Typography>
        <IconButton onClick={() => setExportDrawerOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Stack spacing={2}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={<PdfIcon />}
          onClick={exportToPDF}
          disabled={filteredRequests.length === 0}
          sx={{
            bgcolor: '#ef4444',
            '&:hover': { bgcolor: '#dc2626' },
            py: 1.5,
          }}
        >
          Exportă PDF
        </Button>

        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={<ExcelIcon />}
          onClick={exportToExcel}
          disabled={filteredRequests.length === 0}
          sx={{
            bgcolor: '#10b981',
            '&:hover': { bgcolor: '#059669' },
            py: 1.5,
          }}
        >
          Exportă Excel
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
        {filteredRequests.length} înregistrări vor fi exportate
      </Typography>
    </Box>
  );

  return (
    <Box>
      {/* Header with gradient */}
      <Grow in={true} timeout={500}>
        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            background: `linear-gradient(135deg, #059669 0%, #10b981 100%)`,
            color: 'white',
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />
          <Stack direction="row" alignItems="center" spacing={2}>
            <HomeIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Rapoarte Parcări Domiciliu
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Solicitări de aprobare/revocare locuri și modificare date
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Grow>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            title="Total"
            value={stats.total}
            icon={<HomeIcon />}
            color="#059669"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            title="Active"
            value={stats.active}
            icon={<ActiveIcon />}
            color="#ef4444"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            title="Finalizate"
            value={stats.resolved}
            icon={<ResolvedIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            title="Aprobări"
            value={stats.byType.APROBARE_LOC.active + stats.byType.APROBARE_LOC.resolved}
            icon={<ApproveLocationIcon />}
            color="#059669"
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <FilterIcon color="primary" />
            <Typography fontWeight={500}>Filtre</Typography>
            {(selectedType !== 'ALL' || selectedStatus !== 'ALL' || startDate || endDate) && (
              <Chip label="Active" size="small" color="primary" />
            )}
          </Stack>
          <IconButton size="small">
            {filtersOpen ? <CloseIcon /> : <FilterIcon />}
          </IconButton>
        </Box>
        <Collapse in={filtersOpen}>
          <Divider />
          {FiltersPanel}
        </Collapse>
      </Paper>

      {/* Data Table */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredRequests.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Nu există solicitări pentru filtrele selectate.
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#059669', 0.08) }}>
                <TableCell sx={{ fontWeight: 600 }}>Tip</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Locație</TableCell>
                {!isMobile && <TableCell sx={{ fontWeight: 600 }}>Persoană</TableCell>}
                {!isMobile && <TableCell sx={{ fontWeight: 600 }}>Nr. Auto</TableCell>}
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.slice(0, 50).map((request) => (
                <TableRow key={request.id} hover>
                  <TableCell>
                    <Chip
                      icon={REQUEST_TYPE_ICONS[request.requestType] as React.ReactElement}
                      label={isMobile ? DOMICILIU_REQUEST_TYPE_LABELS[request.requestType].split(' ')[0] : DOMICILIU_REQUEST_TYPE_LABELS[request.requestType]}
                      size="small"
                      sx={{
                        bgcolor: alpha(REQUEST_TYPE_COLORS[request.requestType], 0.1),
                        color: REQUEST_TYPE_COLORS[request.requestType],
                        '& .MuiChip-icon': { color: REQUEST_TYPE_COLORS[request.requestType] },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 100, sm: 200 } }}>
                      {request.location}
                    </Typography>
                  </TableCell>
                  {!isMobile && <TableCell>{request.personName}</TableCell>}
                  {!isMobile && <TableCell>{request.carPlate}</TableCell>}
                  <TableCell>
                    <Chip
                      label={DOMICILIU_REQUEST_STATUS_LABELS[request.status]}
                      size="small"
                      sx={{
                        bgcolor: request.status === 'ACTIVE' ? '#ef444420' : '#10b98120',
                        color: request.status === 'ACTIVE' ? '#ef4444' : '#10b981',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(request.createdAt), isMobile ? 'dd.MM' : 'dd MMM yyyy', { locale: ro })}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredRequests.length > 50 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Afișate primele 50 din {filteredRequests.length} înregistrări. Exportă pentru lista completă.
              </Typography>
            </Box>
          )}
        </TableContainer>
      )}

      {/* Export FAB (Mobile) */}
      {isMobile && (
        <Zoom in={filteredRequests.length > 0}>
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 80,
              right: 16,
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            }}
            onClick={() => setExportDrawerOpen(true)}
          >
            <DownloadIcon />
          </Fab>
        </Zoom>
      )}

      {/* Export Buttons (Desktop) */}
      {!isMobile && filteredRequests.length > 0 && (
        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<PdfIcon />}
            onClick={exportToPDF}
            sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}
          >
            Exportă PDF
          </Button>
          <Button
            variant="contained"
            startIcon={<ExcelIcon />}
            onClick={exportToExcel}
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
          >
            Exportă Excel
          </Button>
        </Stack>
      )}

      {/* Export Drawer (Mobile) */}
      <SwipeableDrawer
        anchor="bottom"
        open={exportDrawerOpen}
        onClose={() => setExportDrawerOpen(false)}
        onOpen={() => setExportDrawerOpen(true)}
        PaperProps={{
          sx: { borderRadius: '16px 16px 0 0' },
        }}
      >
        {ExportDrawerContent}
      </SwipeableDrawer>
    </Box>
  );
};

export default DomiciliuReportsTab;
