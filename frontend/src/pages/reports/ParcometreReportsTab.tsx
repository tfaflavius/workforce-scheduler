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
  LocalParking as ParcometruIcon,
  FilterList as FilterIcon,
  CheckCircle as ActiveMeterIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Place as ZoneIcon,
} from '@mui/icons-material';
import { useGetParkingMetersQuery } from '../../store/api/parking.api';
import type { ParkingMeter, ParkingZone, PowerSource, MeterCondition } from '../../types/parking.types';
import { loadPDFLibs, loadXLSXLib } from '../../utils/lazyExportLibs';
import { drawStatCards, drawHorizontalBarChart, type RGB } from '../../utils/pdfCharts';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface ParcometreReportsTabProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
}

const ZONE_LABELS: Record<ParkingZone, string> = {
  ROSU: 'Zona Rosu',
  GALBEN: 'Zona Galben',
  ALB: 'Zona Alb',
};

const POWER_LABELS: Record<PowerSource, string> = {
  CURENT: 'Curent electric',
  SOLAR: 'Solar',
};

const CONDITION_LABELS: Record<MeterCondition, string> = {
  NOU: 'Nou',
  VECHI: 'Vechi',
};

const ParcometreReportsTab: React.FC<ParcometreReportsTabProps> = (_props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [selectedZone, setSelectedZone] = useState<ParkingZone | 'ALL'>('ALL');
  const [selectedCondition, setSelectedCondition] = useState<MeterCondition | 'ALL'>('ALL');
  const [selectedPower, setSelectedPower] = useState<PowerSource | 'ALL'>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportDrawerOpen, setExportDrawerOpen] = useState(false);

  // Fetch data - inventory data, no date range filtering on data
  const { data: allMeters = [], isLoading, refetch } = useGetParkingMetersQuery();

  // Filter data by zone, condition and power source
  const filteredMeters = useMemo(() => {
    return allMeters.filter((meter: ParkingMeter) => {
      if (selectedZone !== 'ALL' && meter.zone !== selectedZone) return false;
      if (selectedCondition !== 'ALL' && meter.condition !== selectedCondition) return false;
      if (selectedPower !== 'ALL' && meter.powerSource !== selectedPower) return false;

      return true;
    });
  }, [allMeters, selectedZone, selectedCondition, selectedPower]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredMeters.length;
    const active = filteredMeters.filter((m: ParkingMeter) => m.isActive).length;
    const zoneRosu = filteredMeters.filter((m: ParkingMeter) => m.zone === 'ROSU').length;
    const zoneGalben = filteredMeters.filter((m: ParkingMeter) => m.zone === 'GALBEN').length;

    return { total, active, zoneRosu, zoneGalben };
  }, [filteredMeters]);

  // Export to PDF
  const exportToPDF = async () => {
    const { jsPDF, autoTable } = await loadPDFLibs();
    const doc = new jsPDF();
    const pageWidth = 210;
    const BLUE: RGB = [37, 99, 235];
    const GREEN: RGB = [76, 175, 80];
    const RED: RGB = [244, 67, 54];
    const ORANGE: RGB = [255, 152, 0];

    // Header band
    doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.roundedRect(14, 10, pageWidth - 28, 14, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('Raport Parcometre', pageWidth / 2, 19, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Generat la: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, pageWidth / 2, 30, { align: 'center' });

    let yPos = 36;

    // Stat cards
    yPos = drawStatCards(doc, [
      { label: 'Total Parcometre', value: stats.total, color: BLUE },
      { label: 'Active', value: stats.active, color: GREEN },
      { label: 'Zona Rosu', value: stats.zoneRosu, color: RED },
      { label: 'Zona Galben', value: stats.zoneGalben, color: ORANGE },
    ], 14, yPos, pageWidth);

    // Horizontal bar chart for zones
    yPos = drawHorizontalBarChart(doc, [
      { label: 'Zona Rosu', value: stats.zoneRosu, color: RED },
      { label: 'Zona Galben', value: stats.zoneGalben, color: ORANGE },
    ], 14, yPos, pageWidth - 28, { title: 'Distributie pe zone' });

    // Table
    const tableData = filteredMeters.map((m: ParkingMeter) => [
      m.name,
      ZONE_LABELS[m.zone],
      POWER_LABELS[m.powerSource],
      CONDITION_LABELS[m.condition],
      m.address || '-',
      m.isActive ? 'Da' : 'Nu',
      format(new Date(m.createdAt), 'dd.MM.yyyy'),
    ]);

    autoTable(doc, {
      startY: yPos + 2,
      margin: { left: 14, right: 14, top: 20, bottom: 20 },
      tableWidth: pageWidth - 28,
      head: [['Nume', 'Zona', 'Sursa Energie', 'Stare', 'Adresa', 'Activ', 'Data adaugare']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    });

    doc.save(`raport-parcometre-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setExportDrawerOpen(false);
  };

  // Export to Excel
  const exportToExcel = async () => {
    const XLSX = await loadXLSXLib();
    const excelData = filteredMeters.map((m: ParkingMeter) => ({
      'Nume': m.name,
      'Zona': ZONE_LABELS[m.zone],
      'Sursa Energie': POWER_LABELS[m.powerSource],
      'Stare': CONDITION_LABELS[m.condition],
      'Adresa': m.address || '',
      'Latitudine': m.latitude,
      'Longitudine': m.longitude,
      'Activ': m.isActive ? 'Da' : 'Nu',
      'Data Adaugare': format(new Date(m.createdAt), 'dd.MM.yyyy HH:mm'),
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Parcometre');

    // Auto-width columns
    const maxWidth = 50;
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, ...excelData.map(row => String(row[key as keyof typeof row] || '').length)))
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `raport-parcometre-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
        <FormControl fullWidth size="small">
          <InputLabel>Zona</InputLabel>
          <Select
            value={selectedZone}
            label="Zona"
            onChange={(e) => setSelectedZone(e.target.value as ParkingZone | 'ALL')}
          >
            <MenuItem value="ALL">Toate zonele</MenuItem>
            <MenuItem value="ROSU">Zona Rosu</MenuItem>
            <MenuItem value="GALBEN">Zona Galben</MenuItem>
            <MenuItem value="ALB">Zona Alb</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Stare</InputLabel>
          <Select
            value={selectedCondition}
            label="Stare"
            onChange={(e) => setSelectedCondition(e.target.value as MeterCondition | 'ALL')}
          >
            <MenuItem value="ALL">Toate starile</MenuItem>
            <MenuItem value="NOU">Nou</MenuItem>
            <MenuItem value="VECHI">Vechi</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Sursa energie</InputLabel>
          <Select
            value={selectedPower}
            label="Sursa energie"
            onChange={(e) => setSelectedPower(e.target.value as PowerSource | 'ALL')}
          >
            <MenuItem value="ALL">Toate sursele</MenuItem>
            <MenuItem value="CURENT">Curent electric</MenuItem>
            <MenuItem value="SOLAR">Solar</MenuItem>
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
          disabled={filteredMeters.length === 0}
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
          disabled={filteredMeters.length === 0}
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
        {filteredMeters.length} inregistrari vor fi exportate
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
            background: `linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)`,
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
            <ParcometruIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Rapoarte Parcometre
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Inventar parcometre pe zone si surse de energie
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
            icon={<ParcometruIcon />}
            color="#2563eb"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Active"
            value={stats.active}
            icon={<ActiveMeterIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Zona Rosu"
            value={stats.zoneRosu}
            icon={<ZoneIcon />}
            color="#ef4444"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Zona Galben"
            value={stats.zoneGalben}
            icon={<ZoneIcon />}
            color="#f59e0b"
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
            {(selectedZone !== 'ALL' || selectedCondition !== 'ALL' || selectedPower !== 'ALL') && (
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
      ) : filteredMeters.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Nu exista parcometre pentru filtrele selectate.
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto' }}>
          <Table size={isMobile ? 'small' : 'medium'} stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#2563eb', 0.08) }}>
                <TableCell sx={{ fontWeight: 600 }}>Nume</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Zona</TableCell>
                {!isMobile && <TableCell sx={{ fontWeight: 600 }}>Sursa Energie</TableCell>}
                <TableCell sx={{ fontWeight: 600 }}>Stare</TableCell>
                {!isMobile && <TableCell sx={{ fontWeight: 600 }}>Adresa</TableCell>}
                <TableCell sx={{ fontWeight: 600 }}>Activ</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Data adaugare</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMeters.slice(0, 50).map((meter: ParkingMeter) => (
                <TableRow key={meter.id} hover>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 80, sm: 150 } }}>
                      {meter.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={isMobile ? meter.zone : ZONE_LABELS[meter.zone]}
                      size="small"
                      sx={{
                        bgcolor: meter.zone === 'ROSU' ? '#ef444420' : meter.zone === 'GALBEN' ? '#f59e0b20' : '#64748b20',
                        color: meter.zone === 'ROSU' ? '#ef4444' : meter.zone === 'GALBEN' ? '#f59e0b' : '#64748b',
                      }}
                    />
                  </TableCell>
                  {!isMobile && (
                    <TableCell>
                      <Typography variant="body2">{POWER_LABELS[meter.powerSource]}</Typography>
                    </TableCell>
                  )}
                  <TableCell>
                    <Chip
                      label={CONDITION_LABELS[meter.condition]}
                      size="small"
                      sx={{
                        bgcolor: meter.condition === 'NOU' ? '#10b98120' : '#f59e0b20',
                        color: meter.condition === 'NOU' ? '#10b981' : '#f59e0b',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  {!isMobile && (
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {meter.address || '-'}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell>
                    <Chip
                      label={meter.isActive ? 'Da' : 'Nu'}
                      size="small"
                      sx={{
                        bgcolor: meter.isActive ? '#10b98120' : '#ef444420',
                        color: meter.isActive ? '#10b981' : '#ef4444',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(meter.createdAt), isMobile ? 'dd.MM' : 'dd MMM yyyy', { locale: ro })}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredMeters.length > 50 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Afisate primele 50 din {filteredMeters.length} inregistrari. Exporta pentru lista completa.
              </Typography>
            </Box>
          )}
        </TableContainer>
      )}

      {/* Export FAB (Mobile) */}
      {isMobile && (
        <Zoom in={filteredMeters.length > 0}>
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
              right: 16,
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            }}
            onClick={() => setExportDrawerOpen(true)}
          >
            <DownloadIcon />
          </Fab>
        </Zoom>
      )}

      {/* Export Buttons (Desktop) */}
      {!isMobile && filteredMeters.length > 0 && (
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

export default ParcometreReportsTab;
