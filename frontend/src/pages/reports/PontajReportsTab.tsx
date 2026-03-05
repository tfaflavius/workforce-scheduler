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
  AccessTime as PontajIcon,
  FilterList as FilterIcon,
  People as PeopleIcon,
  Timer as TimerIcon,
  GpsFixed as GpsIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import DatePickerField from '../../components/common/DatePickerField';
import { useGetAdminTimeEntriesQuery } from '../../store/api/time-tracking.api';
import type { AdminTimeEntry } from '../../types/time-tracking.types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface PontajReportsTabProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
}

const GPS_STATUS_LABELS: Record<string, string> = {
  active: 'Activ',
  denied: 'Refuzat',
  error: 'Eroare',
  unavailable: 'Indisponibil',
};

const GPS_STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  denied: '#ef4444',
  error: '#f59e0b',
  unavailable: '#6b7280',
};

const PontajReportsTab: React.FC<PontajReportsTabProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedGpsStatus, setSelectedGpsStatus] = useState<string>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportDrawerOpen, setExportDrawerOpen] = useState(false);

  // Fetch data
  const { data: allEntries = [], isLoading, refetch } = useGetAdminTimeEntriesQuery(
    startDate || endDate
      ? { startDate: startDate || undefined, endDate: endDate || undefined }
      : undefined
  );

  // Filter data by date range and GPS status
  const filteredEntries = useMemo(() => {
    return allEntries.filter((entry: AdminTimeEntry) => {
      const entryDate = new Date(entry.startTime);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && entryDate < start) return false;
      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (entryDate > endOfDay) return false;
      }
      if (selectedGpsStatus !== 'ALL' && entry.gpsStatus !== selectedGpsStatus) return false;

      return true;
    });
  }, [allEntries, startDate, endDate, selectedGpsStatus]);

  // Statistics
  const stats = useMemo(() => {
    const totalEntries = filteredEntries.length;
    const totalHours = filteredEntries.reduce((sum: number, e: AdminTimeEntry) => sum + (e.durationMinutes || 0), 0) / 60;
    const uniqueUsers = new Set(filteredEntries.map((e: AdminTimeEntry) => e.userId)).size;
    const gpsActiveCount = filteredEntries.filter((e: AdminTimeEntry) => e.gpsStatus === 'active').length;

    return { totalEntries, totalHours, uniqueUsers, gpsActiveCount };
  }, [filteredEntries]);

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(8, 145, 178);
    doc.text('Raport Monitorizare Pontaj', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const periodText = startDate && endDate
      ? `Perioada: ${format(new Date(startDate), 'dd.MM.yyyy')} - ${format(new Date(endDate), 'dd.MM.yyyy')}`
      : 'Toate inregistrarile';
    doc.text(periodText, 14, 30);
    doc.text(`Generat la: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 14, 36);

    // Statistics
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Statistici:', 14, 48);
    doc.setFontSize(10);
    doc.text(`Total inregistrari: ${stats.totalEntries}`, 14, 56);
    doc.text(`Total ore: ${stats.totalHours.toFixed(1)}`, 14, 62);
    doc.text(`Angajati unici: ${stats.uniqueUsers}`, 14, 68);
    doc.text(`GPS activ: ${stats.gpsActiveCount}`, 14, 74);

    // Table
    const tableData = filteredEntries.map((e: AdminTimeEntry) => [
      e.user ? `${e.user.lastName} ${e.user.firstName}` : '-',
      e.user?.department?.name || '-',
      format(new Date(e.startTime), 'dd.MM.yyyy'),
      format(new Date(e.startTime), 'HH:mm'),
      e.endTime ? format(new Date(e.endTime), 'HH:mm') : 'In curs',
      e.durationMinutes ? (e.durationMinutes / 60).toFixed(1) : '-',
      e.gpsStatus ? GPS_STATUS_LABELS[e.gpsStatus] || e.gpsStatus : '-',
      e.notes || '-',
    ]);

    autoTable(doc, {
      startY: 84,
      head: [['Angajat', 'Departament', 'Data', 'Ora Start', 'Ora Sfarsit', 'Durata (ore)', 'GPS', 'Observatii']],
      body: tableData,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [8, 145, 178] },
    });

    doc.save(`raport-pontaj-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setExportDrawerOpen(false);
  };

  // Export to Excel
  const exportToExcel = () => {
    const excelData = filteredEntries.map((e: AdminTimeEntry) => ({
      'Angajat': e.user ? `${e.user.lastName} ${e.user.firstName}` : '-',
      'Departament': e.user?.department?.name || '',
      'Data': format(new Date(e.startTime), 'dd.MM.yyyy'),
      'Ora Start': format(new Date(e.startTime), 'HH:mm'),
      'Ora Sfarsit': e.endTime ? format(new Date(e.endTime), 'HH:mm') : 'In curs',
      'Durata (min)': e.durationMinutes || 0,
      'Durata (ore)': e.durationMinutes ? Number((e.durationMinutes / 60).toFixed(2)) : 0,
      'GPS Status': e.gpsStatus ? GPS_STATUS_LABELS[e.gpsStatus] || e.gpsStatus : '',
      'Observatii': e.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pontaj');

    // Auto-width columns
    const maxWidth = 50;
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, ...excelData.map(row => String(row[key as keyof typeof row] || '').length)))
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `raport-pontaj-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    setExportDrawerOpen(false);
  };

  // Stat Card Component
  const StatCard: React.FC<{
    title: string;
    value: number | string;
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
          <InputLabel>Status GPS</InputLabel>
          <Select
            value={selectedGpsStatus}
            label="Status GPS"
            onChange={(e) => setSelectedGpsStatus(e.target.value)}
          >
            <MenuItem value="ALL">Toate statusurile</MenuItem>
            <MenuItem value="active">GPS Activ</MenuItem>
            <MenuItem value="denied">GPS Refuzat</MenuItem>
            <MenuItem value="error">GPS Eroare</MenuItem>
            <MenuItem value="unavailable">GPS Indisponibil</MenuItem>
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
          disabled={filteredEntries.length === 0}
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
          disabled={filteredEntries.length === 0}
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
        {filteredEntries.length} inregistrari vor fi exportate
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
            background: `linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)`,
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
            <PontajIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Monitorizare Pontaj
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Inregistrari pontaj angajati cu status GPS si durate
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Grow>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Total Inregistrari"
            value={stats.totalEntries}
            icon={<ScheduleIcon />}
            color="#0891b2"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Total Ore"
            value={stats.totalHours.toFixed(1)}
            icon={<TimerIcon />}
            color="#8b5cf6"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Angajati Unici"
            value={stats.uniqueUsers}
            icon={<PeopleIcon />}
            color="#2563eb"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="GPS Activ"
            value={stats.gpsActiveCount}
            icon={<GpsIcon />}
            color="#10b981"
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
            {(selectedGpsStatus !== 'ALL' || startDate || endDate) && (
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
      ) : filteredEntries.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Nu exista inregistrari de pontaj pentru filtrele selectate.
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#0891b2', 0.08) }}>
                <TableCell sx={{ fontWeight: 600 }}>Angajat</TableCell>
                {!isMobile && <TableCell sx={{ fontWeight: 600 }}>Departament</TableCell>}
                <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Ora Start</TableCell>
                {!isMobile && <TableCell sx={{ fontWeight: 600 }}>Ora Sfarsit</TableCell>}
                <TableCell sx={{ fontWeight: 600 }}>Durata</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>GPS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEntries.slice(0, 50).map((entry: AdminTimeEntry) => (
                <TableRow key={entry.id} hover>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 100, sm: 200 } }}>
                      {entry.user ? `${entry.user.lastName} ${entry.user.firstName}` : '-'}
                    </Typography>
                  </TableCell>
                  {!isMobile && <TableCell>{entry.user?.department?.name || '-'}</TableCell>}
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(entry.startTime), isMobile ? 'dd.MM' : 'dd MMM yyyy', { locale: ro })}
                    </Typography>
                  </TableCell>
                  <TableCell>{format(new Date(entry.startTime), 'HH:mm')}</TableCell>
                  {!isMobile && (
                    <TableCell>{entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : 'In curs'}</TableCell>
                  )}
                  <TableCell>
                    {entry.durationMinutes ? `${(entry.durationMinutes / 60).toFixed(1)}h` : '-'}
                  </TableCell>
                  <TableCell>
                    {entry.gpsStatus ? (
                      <Chip
                        label={isMobile ? (entry.gpsStatus === 'active' ? 'On' : 'Off') : GPS_STATUS_LABELS[entry.gpsStatus] || entry.gpsStatus}
                        size="small"
                        sx={{
                          bgcolor: alpha(GPS_STATUS_COLORS[entry.gpsStatus] || '#6b7280', 0.1),
                          color: GPS_STATUS_COLORS[entry.gpsStatus] || '#6b7280',
                          fontWeight: 600,
                        }}
                      />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredEntries.length > 50 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Afisate primele 50 din {filteredEntries.length} inregistrari. Exporta pentru lista completa.
              </Typography>
            </Box>
          )}
        </TableContainer>
      )}

      {/* Export FAB (Mobile) */}
      {isMobile && (
        <Zoom in={filteredEntries.length > 0}>
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 80,
              right: 16,
              background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
            }}
            onClick={() => setExportDrawerOpen(true)}
          >
            <DownloadIcon />
          </Fab>
        </Zoom>
      )}

      {/* Export Buttons (Desktop) */}
      {!isMobile && filteredEntries.length > 0 && (
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

export default PontajReportsTab;
