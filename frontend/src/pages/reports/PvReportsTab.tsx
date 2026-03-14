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
  Description as PvIcon,
  FilterList as FilterIcon,
  CheckCircle as CompletedIcon,
  HourglassEmpty as InProgressIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  CalendarMonth as DaysIcon,
} from '@mui/icons-material';
import DatePickerField from '../../components/common/DatePickerField';
import { useGetPvSessionsQuery } from '../../store/api/pvDisplay.api';
import type { PvDisplaySession, PvSessionStatus } from '../../types/pv-display.types';
import { loadPDFLibs, loadXLSXLib } from '../../utils/lazyExportLibs';
import { drawStatCards, drawProgressBar, type RGB } from '../../utils/pdfCharts';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface PvReportsTabProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
}

const SESSION_STATUS_LABELS: Record<PvSessionStatus, string> = {
  DRAFT: 'Ciorna',
  READY: 'Pregatit',
  IN_PROGRESS: 'In desfasurare',
  COMPLETED: 'Finalizat',
};

const SESSION_STATUS_COLORS: Record<PvSessionStatus, string> = {
  DRAFT: '#f59e0b',
  READY: '#3b82f6',
  IN_PROGRESS: '#8b5cf6',
  COMPLETED: '#10b981',
};

const PvReportsTab: React.FC<PvReportsTabProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [selectedStatus, setSelectedStatus] = useState<PvSessionStatus | 'ALL'>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportDrawerOpen, setExportDrawerOpen] = useState(false);

  // Fetch data
  const { data: allSessions = [], isLoading, refetch } = useGetPvSessionsQuery(
    selectedStatus !== 'ALL' ? { status: selectedStatus } : undefined
  );

  // Filter data by date range
  const filteredSessions = useMemo(() => {
    return allSessions.filter((session: PvDisplaySession) => {
      const sessionDate = new Date(session.createdAt);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && sessionDate < start) return false;
      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (sessionDate > endOfDay) return false;
      }

      return true;
    });
  }, [allSessions, startDate, endDate]);

  // Compute day stats for a session
  const getSessionDayStats = (session: PvDisplaySession) => {
    const days = session.days || [];
    const totalDays = days.length;
    const completedDays = days.filter(d => d.status === 'COMPLETED').length;
    const openDays = totalDays - completedDays;
    return { totalDays, completedDays, openDays };
  };

  // Statistics
  const stats = useMemo(() => {
    const total = filteredSessions.length;
    const completed = filteredSessions.filter((s: PvDisplaySession) => s.status === 'COMPLETED').length;
    const inProgress = filteredSessions.filter((s: PvDisplaySession) => s.status === 'IN_PROGRESS').length;
    const totalDays = filteredSessions.reduce((sum: number, s: PvDisplaySession) => sum + (s.days?.length || 0), 0);

    return { total, completed, inProgress, totalDays };
  }, [filteredSessions]);

  // Export to PDF
  const exportToPDF = async () => {
    const { jsPDF, autoTable } = await loadPDFLibs();
    const doc = new jsPDF();
    const pageWidth = 210;
    const VIOLET: RGB = [139, 92, 246];
    const GREEN: RGB = [76, 175, 80];
    const ORANGE: RGB = [255, 152, 0];
    const BLUE: RGB = [25, 118, 210];

    // Header band
    doc.setFillColor(VIOLET[0], VIOLET[1], VIOLET[2]);
    doc.roundedRect(14, 10, pageWidth - 28, 14, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('Raport Procese Verbale', pageWidth / 2, 19, { align: 'center' });
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
      { label: 'Total Sesiuni', value: stats.total, color: VIOLET },
      { label: 'Finalizate', value: stats.completed, color: GREEN },
      { label: 'In Desfasurare', value: stats.inProgress, color: ORANGE },
      { label: 'Total Zile', value: stats.totalDays, color: BLUE },
    ], 14, yPos, pageWidth);

    // Progress bar
    if (stats.total > 0) {
      yPos = drawProgressBar(doc, 'Progres finalizare sesiuni', stats.completed, stats.total, 14, yPos, pageWidth - 28, VIOLET);
    }

    // Table
    const tableData = filteredSessions.map((s: PvDisplaySession) => {
      const dayStats = getSessionDayStats(s);
      return [
        s.monthYear,
        SESSION_STATUS_LABELS[s.status],
        String(dayStats.totalDays),
        String(dayStats.completedDays),
        String(dayStats.openDays),
        s.creator?.fullName || '-',
        format(new Date(s.createdAt), 'dd.MM.yyyy'),
      ];
    });

    autoTable(doc, {
      startY: yPos + 2,
      margin: { left: 14, right: 14, top: 20, bottom: 20 },
      tableWidth: pageWidth - 28,
      head: [['Luna/An', 'Status', 'Nr Zile', 'Zile Finalizate', 'Zile Deschise', 'Creator', 'Data Creare']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
    });

    doc.save(`raport-procese-verbale-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setExportDrawerOpen(false);
  };

  // Export to Excel
  const exportToExcel = async () => {
    const XLSX = await loadXLSXLib();
    const excelData = filteredSessions.map((s: PvDisplaySession) => {
      const dayStats = getSessionDayStats(s);
      return {
        'Luna': s.monthYear,
        'Status': SESSION_STATUS_LABELS[s.status],
        'Total Zile': dayStats.totalDays,
        'Zile Finalizate': dayStats.completedDays,
        'Zile Deschise': dayStats.openDays,
        'Descriere': s.description || '',
        'Creator': s.creator?.fullName || '',
        'Data Creare': format(new Date(s.createdAt), 'dd.MM.yyyy HH:mm'),
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Procese Verbale');

    // Auto-width columns
    const maxWidth = 50;
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, ...excelData.map(row => String(row[key as keyof typeof row] || '').length)))
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `raport-procese-verbale-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
          <InputLabel>Status sesiune</InputLabel>
          <Select
            value={selectedStatus}
            label="Status sesiune"
            onChange={(e) => setSelectedStatus(e.target.value as PvSessionStatus | 'ALL')}
          >
            <MenuItem value="ALL">Toate statusurile</MenuItem>
            <MenuItem value="DRAFT">Ciorna</MenuItem>
            <MenuItem value="READY">Pregatit</MenuItem>
            <MenuItem value="IN_PROGRESS">In desfasurare</MenuItem>
            <MenuItem value="COMPLETED">Finalizat</MenuItem>
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
          disabled={filteredSessions.length === 0}
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
          disabled={filteredSessions.length === 0}
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
        {filteredSessions.length} inregistrari vor fi exportate
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
            background: `linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)`,
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
            <PvIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Rapoarte Procese Verbale
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Sesiuni de afisare procese verbale si stadiul zilelor
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Grow>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Total Sesiuni"
            value={stats.total}
            icon={<PvIcon />}
            color="#8b5cf6"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Finalizate"
            value={stats.completed}
            icon={<CompletedIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="In Desfasurare"
            value={stats.inProgress}
            icon={<InProgressIcon />}
            color="#8b5cf6"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Total Zile"
            value={stats.totalDays}
            icon={<DaysIcon />}
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
            {(selectedStatus !== 'ALL' || startDate || endDate) && (
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
      ) : filteredSessions.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Nu exista sesiuni pentru filtrele selectate.
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto' }}>
          <Table size={isMobile ? 'small' : 'medium'} stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#8b5cf6', 0.08) }}>
                <TableCell sx={{ fontWeight: 600 }}>Luna/An</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Nr Zile</TableCell>
                {!isMobile && <TableCell sx={{ fontWeight: 600 }}>Zile Finalizate</TableCell>}
                {!isMobile && <TableCell sx={{ fontWeight: 600 }}>Zile Deschise</TableCell>}
                {!isMobile && <TableCell sx={{ fontWeight: 600 }}>Creator</TableCell>}
                <TableCell sx={{ fontWeight: 600 }}>Data Creare</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSessions.slice(0, 50).map((session: PvDisplaySession) => {
                const dayStats = getSessionDayStats(session);
                return (
                  <TableRow key={session.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {session.monthYear}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={SESSION_STATUS_LABELS[session.status]}
                        size="small"
                        sx={{
                          bgcolor: alpha(SESSION_STATUS_COLORS[session.status], 0.15),
                          color: SESSION_STATUS_COLORS[session.status],
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{dayStats.totalDays}</Typography>
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <Typography variant="body2" color="#10b981" fontWeight={600}>
                          {dayStats.completedDays}
                        </Typography>
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell>
                        <Typography variant="body2" color={dayStats.openDays > 0 ? '#f59e0b' : 'text.secondary'} fontWeight={600}>
                          {dayStats.openDays}
                        </Typography>
                      </TableCell>
                    )}
                    {!isMobile && <TableCell>{session.creator?.fullName || '-'}</TableCell>}
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(session.createdAt), isMobile ? 'dd.MM' : 'dd MMM yyyy', { locale: ro })}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredSessions.length > 50 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Afisate primele 50 din {filteredSessions.length} inregistrari. Exporta pentru lista completa.
              </Typography>
            </Box>
          )}
        </TableContainer>
      )}

      {/* Export FAB (Mobile) */}
      {isMobile && (
        <Zoom in={filteredSessions.length > 0}>
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
              right: 16,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
            }}
            onClick={() => setExportDrawerOpen(true)}
          >
            <DownloadIcon />
          </Fab>
        </Zoom>
      )}

      {/* Export Buttons (Desktop) */}
      {!isMobile && filteredSessions.length > 0 && (
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

export default PvReportsTab;
