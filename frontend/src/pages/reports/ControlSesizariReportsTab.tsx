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
  ReportProblem as SesizareIcon,
  FilterList as FilterIcon,
  CheckCircle as ResolvedIcon,
  Error as ActiveIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  FormatPaint as MarcajIcon,
} from '@mui/icons-material';
import DatePickerField from '../../components/common/DatePickerField';
import { useGetControlSesizariQuery } from '../../store/api/control.api';
import type { ControlSesizare, ControlSesizareType, ControlSesizareStatus, ControlSesizareZone } from '../../types/control.types';
import { loadPDFLibs, loadXLSXLib } from '../../utils/lazyExportLibs';
import { drawStatCards, drawStatusDistributionBar, type RGB } from '../../utils/pdfCharts';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface ControlSesizariReportsTabProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
}

const TYPE_LABELS: Record<ControlSesizareType, string> = {
  MARCAJ: 'Marcaj',
  PANOU: 'Panou',
};

const STATUS_LABELS: Record<ControlSesizareStatus, string> = {
  ACTIVE: 'Activ',
  FINALIZAT: 'Finalizat',
};

const ZONE_LABELS: Record<ControlSesizareZone, string> = {
  ROSU: 'Zona Rosu',
  GALBEN: 'Zona Galben',
  ALB: 'Zona Alb',
};

const ControlSesizariReportsTab: React.FC<ControlSesizariReportsTabProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [selectedType, setSelectedType] = useState<ControlSesizareType | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<ControlSesizareStatus | 'ALL'>('ALL');
  const [selectedZone, setSelectedZone] = useState<ControlSesizareZone | 'ALL'>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportDrawerOpen, setExportDrawerOpen] = useState(false);

  // Fetch data
  const { data: allSesizari = [], isLoading, refetch } = useGetControlSesizariQuery(
    selectedStatus !== 'ALL' ? { status: selectedStatus } : undefined
  );

  // Filter data by date range, type and zone
  const filteredSesizari = useMemo(() => {
    return allSesizari.filter((sesizare: ControlSesizare) => {
      const sesizareDate = new Date(sesizare.createdAt);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && sesizareDate < start) return false;
      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (sesizareDate > endOfDay) return false;
      }
      if (selectedType !== 'ALL' && sesizare.type !== selectedType) return false;
      if (selectedZone !== 'ALL' && sesizare.zone !== selectedZone) return false;

      return true;
    });
  }, [allSesizari, startDate, endDate, selectedType, selectedZone]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredSesizari.length;
    const active = filteredSesizari.filter((s: ControlSesizare) => s.status === 'ACTIVE').length;
    const finalizate = filteredSesizari.filter((s: ControlSesizare) => s.status === 'FINALIZAT').length;
    const marcaje = filteredSesizari.filter((s: ControlSesizare) => s.type === 'MARCAJ').length;

    return { total, active, finalizate, marcaje };
  }, [filteredSesizari]);

  // Export to PDF
  const exportToPDF = async () => {
    const { jsPDF, autoTable } = await loadPDFLibs();
    const doc = new jsPDF();
    const pageWidth = 210;
    const INDIGO: RGB = [99, 102, 241];
    const ORANGE: RGB = [255, 152, 0];
    const GREEN: RGB = [76, 175, 80];
    const BLUE: RGB = [25, 118, 210];

    // Header band
    doc.setFillColor(INDIGO[0], INDIGO[1], INDIGO[2]);
    doc.roundedRect(14, 10, pageWidth - 28, 14, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('Raport Control Sesizari', pageWidth / 2, 19, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const periodText = startDate && endDate
      ? `Perioada: ${format(new Date(startDate), 'dd.MM.yyyy')} - ${format(new Date(endDate), 'dd.MM.yyyy')}`
      : 'Toate inregistrarile';
    doc.text(`${periodText}  |  Generat la: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, pageWidth / 2, 30, { align: 'center' });

    let yPos = 36;

    // Stat cards
    yPos = drawStatCards(doc, [
      { label: 'Total Sesizari', value: stats.total, color: INDIGO },
      { label: 'Active', value: stats.active, color: ORANGE },
      { label: 'Finalizate', value: stats.finalizate, color: GREEN },
      { label: 'Marcaje', value: stats.marcaje, color: BLUE },
    ], 14, yPos, pageWidth);

    // Distribution bar
    yPos = drawStatusDistributionBar(doc, [
      { label: 'Active', value: stats.active, color: ORANGE },
      { label: 'Finalizate', value: stats.finalizate, color: GREEN },
    ], 14, yPos, pageWidth - 28, { title: 'Status sesizari' });

    // Table
    const tableData = filteredSesizari.map((s: ControlSesizare) => [
      TYPE_LABELS[s.type],
      ZONE_LABELS[s.zone],
      s.location,
      STATUS_LABELS[s.status],
      s.creator?.fullName || '-',
      format(new Date(s.createdAt), 'dd.MM.yyyy'),
      s.resolver?.fullName || '-',
    ]);

    autoTable(doc, {
      startY: yPos + 2,
      margin: { left: 14, right: 14, top: 20, bottom: 20 },
      tableWidth: pageWidth - 28,
      head: [['Tip', 'Zona', 'Locatie', 'Status', 'Creat de', 'Data', 'Rezolvat de']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    });

    doc.save(`raport-control-sesizari-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setExportDrawerOpen(false);
  };

  // Export to Excel
  const exportToExcel = async () => {
    const XLSX = await loadXLSXLib();
    const excelData = filteredSesizari.map((s: ControlSesizare) => ({
      'Tip': TYPE_LABELS[s.type],
      'Zona': ZONE_LABELS[s.zone],
      'Orientare': s.orientation || '',
      'Locatie': s.location,
      'Descriere': s.description,
      'Status': STATUS_LABELS[s.status],
      'Creat de': s.creator?.fullName || '',
      'Data Creare': format(new Date(s.createdAt), 'dd.MM.yyyy HH:mm'),
      'Rezolvat de': s.resolver?.fullName || '',
      'Data Rezolvare': s.resolvedAt ? format(new Date(s.resolvedAt), 'dd.MM.yyyy HH:mm') : '',
      'Descriere Rezolutie': s.resolutionDescription || '',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Control Sesizari');

    // Auto-width columns
    const maxWidth = 50;
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, ...excelData.map(row => String(row[key as keyof typeof row] || '').length)))
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `raport-control-sesizari-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
          label="Pana la"
          value={endDate}
          onChange={onEndDateChange}
          minDate={startDate || undefined}
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControl fullWidth size="small">
          <InputLabel>Tip sesizare</InputLabel>
          <Select
            value={selectedType}
            label="Tip sesizare"
            onChange={(e) => setSelectedType(e.target.value as ControlSesizareType | 'ALL')}
          >
            <MenuItem value="ALL">Toate tipurile</MenuItem>
            <MenuItem value="MARCAJ">Marcaj</MenuItem>
            <MenuItem value="PANOU">Panou</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Status</InputLabel>
          <Select
            value={selectedStatus}
            label="Status"
            onChange={(e) => setSelectedStatus(e.target.value as ControlSesizareStatus | 'ALL')}
          >
            <MenuItem value="ALL">Toate statusurile</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="FINALIZAT">Finalizate</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Zona</InputLabel>
          <Select
            value={selectedZone}
            label="Zona"
            onChange={(e) => setSelectedZone(e.target.value as ControlSesizareZone | 'ALL')}
          >
            <MenuItem value="ALL">Toate zonele</MenuItem>
            <MenuItem value="ROSU">Zona Rosu</MenuItem>
            <MenuItem value="GALBEN">Zona Galben</MenuItem>
            <MenuItem value="ALB">Zona Alb</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={() => refetch()}
        fullWidth
      >
        Actualizeaza date
      </Button>
    </Stack>
  );

  // Export Drawer Content
  const ExportDrawerContent = (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">Exporta Raport</Typography>
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
          disabled={filteredSesizari.length === 0}
          sx={{
            bgcolor: '#ef4444',
            '&:hover': { bgcolor: '#dc2626' },
            py: 1.5,
          }}
        >
          Exporta PDF
        </Button>

        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={<ExcelIcon />}
          onClick={exportToExcel}
          disabled={filteredSesizari.length === 0}
          sx={{
            bgcolor: '#10b981',
            '&:hover': { bgcolor: '#059669' },
            py: 1.5,
          }}
        >
          Exporta Excel
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
        {filteredSesizari.length} inregistrari vor fi exportate
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
            background: `linear-gradient(135deg, #6366f1 0%, #818cf8 100%)`,
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
            <SesizareIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Rapoarte Control Sesizari
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Sesizari marcaje si panouri din teren
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Grow>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Total"
            value={stats.total}
            icon={<SesizareIcon />}
            color="#6366f1"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Active"
            value={stats.active}
            icon={<ActiveIcon />}
            color="#ef4444"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Finalizate"
            value={stats.finalizate}
            icon={<ResolvedIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Marcaje"
            value={stats.marcaje}
            icon={<MarcajIcon />}
            color="#2563eb"
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
            {(selectedType !== 'ALL' || selectedStatus !== 'ALL' || selectedZone !== 'ALL' || startDate || endDate) && (
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
      ) : filteredSesizari.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Nu exista sesizari pentru filtrele selectate.
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto' }}>
          <Table size={isMobile ? 'small' : 'medium'} stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#6366f1', 0.08) }}>
                <TableCell sx={{ fontWeight: 600 }}>Tip</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Zona</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Locatie</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                {!isMobile && <TableCell sx={{ fontWeight: 600 }}>Creat de</TableCell>}
                <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                {!isMobile && <TableCell sx={{ fontWeight: 600 }}>Rezolvat de</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSesizari.slice(0, 50).map((sesizare: ControlSesizare) => (
                <TableRow key={sesizare.id} hover>
                  <TableCell>
                    <Chip
                      label={TYPE_LABELS[sesizare.type]}
                      size="small"
                      sx={{
                        bgcolor: sesizare.type === 'MARCAJ' ? alpha('#8b5cf6', 0.1) : alpha('#2563eb', 0.1),
                        color: sesizare.type === 'MARCAJ' ? '#8b5cf6' : '#2563eb',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={isMobile ? sesizare.zone : ZONE_LABELS[sesizare.zone]}
                      size="small"
                      sx={{
                        bgcolor: sesizare.zone === 'ROSU' ? '#ef444420' : sesizare.zone === 'GALBEN' ? '#f59e0b20' : '#64748b20',
                        color: sesizare.zone === 'ROSU' ? '#ef4444' : sesizare.zone === 'GALBEN' ? '#f59e0b' : '#64748b',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 100, sm: 200 } }}>
                      {sesizare.location}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[sesizare.status]}
                      size="small"
                      sx={{
                        bgcolor: sesizare.status === 'ACTIVE' ? '#ef444420' : '#10b98120',
                        color: sesizare.status === 'ACTIVE' ? '#ef4444' : '#10b981',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  {!isMobile && <TableCell>{sesizare.creator?.fullName || '-'}</TableCell>}
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(sesizare.createdAt), isMobile ? 'dd.MM' : 'dd MMM yyyy', { locale: ro })}
                    </Typography>
                  </TableCell>
                  {!isMobile && <TableCell>{sesizare.resolver?.fullName || '-'}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredSesizari.length > 50 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Afisate primele 50 din {filteredSesizari.length} inregistrari. Exporta pentru lista completa.
              </Typography>
            </Box>
          )}
        </TableContainer>
      )}

      {/* Export FAB (Mobile) */}
      {isMobile && (
        <Zoom in={filteredSesizari.length > 0}>
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
              right: 16,
              background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
            }}
            onClick={() => setExportDrawerOpen(true)}
          >
            <DownloadIcon />
          </Fab>
        </Zoom>
      )}

      {/* Export Buttons (Desktop) */}
      {!isMobile && filteredSesizari.length > 0 && (
        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<PdfIcon />}
            onClick={exportToPDF}
            sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}
          >
            Exporta PDF
          </Button>
          <Button
            variant="contained"
            startIcon={<ExcelIcon />}
            onClick={exportToExcel}
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
          >
            Exporta Excel
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

export default React.memo(ControlSesizariReportsTab);
