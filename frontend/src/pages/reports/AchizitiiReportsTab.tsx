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
  ShoppingCart as AchizitiiIcon,
  FilterList as FilterIcon,
  AccountBalance as BudgetIcon,
  TrendingDown as SpentIcon,
  Savings as RemainingIcon,
  FormatListNumbered as PositionsIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useGetBudgetPositionsQuery } from '../../store/api/acquisitions.api';
import { BUDGET_CATEGORY_LABELS } from '../../types/acquisitions.types';
import type { BudgetCategory, BudgetPosition } from '../../types/acquisitions.types';
import jsPDF from 'jspdf';
import { drawStatCards, drawProgressBar, type RGB } from '../../utils/pdfCharts';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface AchizitiiReportsTabProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' lei';
};

const AchizitiiReportsTab: React.FC<AchizitiiReportsTabProps> = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | 'ALL'>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportDrawerOpen, setExportDrawerOpen] = useState(false);

  // Fetch data
  const { data: allPositions = [], isLoading, refetch } = useGetBudgetPositionsQuery(
    selectedCategory !== 'ALL'
      ? { year: selectedYear, category: selectedCategory }
      : { year: selectedYear }
  );

  // Filter data by category
  const filteredPositions = useMemo(() => {
    return allPositions.filter((pos: BudgetPosition) => {
      if (selectedCategory !== 'ALL' && pos.category !== selectedCategory) return false;
      return true;
    });
  }, [allPositions, selectedCategory]);

  // Statistics
  const stats = useMemo(() => {
    const totalBudget = filteredPositions.reduce((sum: number, p: BudgetPosition) => sum + p.totalAmount, 0);
    const totalSpent = filteredPositions.reduce((sum: number, p: BudgetPosition) => sum + p.spentAmount, 0);
    const totalRemaining = filteredPositions.reduce((sum: number, p: BudgetPosition) => sum + p.remainingAmount, 0);
    const numberOfPositions = filteredPositions.length;

    return { totalBudget, totalSpent, totalRemaining, numberOfPositions };
  }, [filteredPositions]);

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = 210;
    const ORANGE: RGB = [234, 88, 12];
    const GREEN: RGB = [76, 175, 80];
    const RED: RGB = [244, 67, 54];
    const BLUE: RGB = [25, 118, 210];

    // Header band
    doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.roundedRect(14, 10, pageWidth - 28, 14, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('Raport Achizitii', pageWidth / 2, 19, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Anul: ${selectedYear}  |  Generat la: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, pageWidth / 2, 30, { align: 'center' });

    let yPos = 36;

    // Stat cards
    yPos = drawStatCards(doc, [
      { label: 'Pozitii Bugetare', value: stats.numberOfPositions, color: BLUE },
      { label: 'Buget Total', value: formatCurrency(stats.totalBudget), color: ORANGE },
      { label: 'Cheltuit', value: formatCurrency(stats.totalSpent), color: RED },
      { label: 'Ramas', value: formatCurrency(stats.totalRemaining), color: GREEN },
    ], 14, yPos, pageWidth);

    // Progress bar
    if (stats.totalBudget > 0) {
      yPos = drawProgressBar(doc, 'Executie bugetara', stats.totalSpent, stats.totalBudget, 14, yPos, pageWidth - 28, ORANGE);
    }

    // Table
    const tableData = filteredPositions.map((p: BudgetPosition) => [
      p.name,
      BUDGET_CATEGORY_LABELS[p.category],
      formatCurrency(p.totalAmount),
      formatCurrency(p.spentAmount),
      formatCurrency(p.remainingAmount),
      p.acquisitions.length.toString(),
    ]);

    autoTable(doc, {
      startY: yPos + 2,
      margin: { left: 14, right: 14, top: 20, bottom: 20 },
      tableWidth: pageWidth - 28,
      head: [['Pozitie Bugetara', 'Categorie', 'Buget Total', 'Cheltuit', 'Ramas', 'Nr Achizitii']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: 'bold' },
    });

    doc.save(`raport-achizitii-${selectedYear}.pdf`);
    setExportDrawerOpen(false);
  };

  // Export to Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Pozitii Bugetare
    const sheet1Data = filteredPositions.map((p: BudgetPosition) => ({
      'Pozitie Bugetara': p.name,
      'Categorie': BUDGET_CATEGORY_LABELS[p.category],
      'Buget Total': p.totalAmount,
      'Cheltuit': p.spentAmount,
      'Ramas': p.remainingAmount,
      'Nr Achizitii': p.acquisitions.length,
    }));

    const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
    const maxWidth = 50;
    const colWidths1 = Object.keys(sheet1Data[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, ...sheet1Data.map(row => String(row[key as keyof typeof row] || '').length)))
    }));
    ws1['!cols'] = colWidths1;
    XLSX.utils.book_append_sheet(wb, ws1, 'Pozitii Bugetare');

    // Sheet 2: Detalii Achizitii
    const sheet2Data: Array<Record<string, string | number>> = [];
    filteredPositions.forEach((p: BudgetPosition) => {
      p.acquisitions.forEach(acq => {
        sheet2Data.push({
          'Pozitie': p.name,
          'Achizitie': acq.name,
          'Valoare': acq.value,
          'Facturat': acq.invoicedAmount,
          'Ramas': acq.remainingAmount,
          'Nr Contract': acq.contractNumber || '',
          'Data Contract': acq.contractDate ? format(new Date(acq.contractDate), 'dd.MM.yyyy') : '',
        });
      });
    });

    if (sheet2Data.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
      const colWidths2 = Object.keys(sheet2Data[0] || {}).map(key => ({
        wch: Math.min(maxWidth, Math.max(key.length, ...sheet2Data.map(row => String(row[key as keyof typeof row] || '').length)))
      }));
      ws2['!cols'] = colWidths2;
      XLSX.utils.book_append_sheet(wb, ws2, 'Detalii Achizitii');
    }

    XLSX.writeFile(wb, `raport-achizitii-${selectedYear}.xlsx`);
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
            <Typography variant="h5" fontWeight={700} color={color} sx={{ fontSize: { xs: '1rem', sm: '1.5rem' } }}>
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
          <InputLabel>An</InputLabel>
          <Select
            value={selectedYear}
            label="An"
            onChange={(e) => setSelectedYear(e.target.value as number)}
          >
            <MenuItem value={2025}>2025</MenuItem>
            <MenuItem value={2026}>2026</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Categorie</InputLabel>
          <Select
            value={selectedCategory}
            label="Categorie"
            onChange={(e) => setSelectedCategory(e.target.value as BudgetCategory | 'ALL')}
          >
            <MenuItem value="ALL">Toate categoriile</MenuItem>
            <MenuItem value="INVESTMENTS">Investitii</MenuItem>
            <MenuItem value="CURRENT_EXPENSES">Cheltuieli Curente</MenuItem>
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
          disabled={filteredPositions.length === 0}
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
          disabled={filteredPositions.length === 0}
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
        {filteredPositions.length} pozitii bugetare vor fi exportate
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
            background: `linear-gradient(135deg, #ea580c 0%, #f97316 100%)`,
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
            <AchizitiiIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Raport Achizitii
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Pozitii bugetare, achizitii si facturi - anul {selectedYear}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Grow>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Buget Total"
            value={formatCurrency(stats.totalBudget)}
            icon={<BudgetIcon />}
            color="#ea580c"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Total Cheltuit"
            value={formatCurrency(stats.totalSpent)}
            icon={<SpentIcon />}
            color="#ef4444"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Total Ramas"
            value={formatCurrency(stats.totalRemaining)}
            icon={<RemainingIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Nr. Pozitii"
            value={stats.numberOfPositions}
            icon={<PositionsIcon />}
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
            {(selectedCategory !== 'ALL') && (
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
      ) : filteredPositions.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Nu exista pozitii bugetare pentru filtrele selectate.
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#ea580c', 0.08) }}>
                <TableCell sx={{ fontWeight: 600 }}>Pozitie Bugetara</TableCell>
                {!isMobile && <TableCell sx={{ fontWeight: 600 }}>Categorie</TableCell>}
                <TableCell sx={{ fontWeight: 600 }} align="right">Buget Total</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Cheltuit</TableCell>
                {!isMobile && <TableCell sx={{ fontWeight: 600 }} align="right">Ramas</TableCell>}
                <TableCell sx={{ fontWeight: 600 }} align="center">Nr Achizitii</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPositions.slice(0, 50).map((position: BudgetPosition) => (
                <TableRow key={position.id} hover>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 120, sm: 250 } }}>
                      {position.name}
                    </Typography>
                  </TableCell>
                  {!isMobile && (
                    <TableCell>
                      <Chip
                        label={BUDGET_CATEGORY_LABELS[position.category]}
                        size="small"
                        sx={{
                          bgcolor: position.category === 'INVESTMENTS' ? alpha('#2563eb', 0.1) : alpha('#8b5cf6', 0.1),
                          color: position.category === 'INVESTMENTS' ? '#2563eb' : '#8b5cf6',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                  )}
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500}>
                      {formatCurrency(position.totalAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color={position.spentAmount > 0 ? 'error.main' : 'text.secondary'}>
                      {formatCurrency(position.spentAmount)}
                    </Typography>
                  </TableCell>
                  {!isMobile && (
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main">
                        {formatCurrency(position.remainingAmount)}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell align="center">
                    <Chip
                      label={position.acquisitions.length}
                      size="small"
                      sx={{
                        bgcolor: alpha('#ea580c', 0.1),
                        color: '#ea580c',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredPositions.length > 50 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Afisate primele 50 din {filteredPositions.length} pozitii. Exporta pentru lista completa.
              </Typography>
            </Box>
          )}
        </TableContainer>
      )}

      {/* Export FAB (Mobile) */}
      {isMobile && (
        <Zoom in={filteredPositions.length > 0}>
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 80,
              right: 16,
              background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
            }}
            onClick={() => setExportDrawerOpen(true)}
          >
            <DownloadIcon />
          </Fab>
        </Zoom>
      )}

      {/* Export Buttons (Desktop) */}
      {!isMobile && filteredPositions.length > 0 && (
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

export default AchizitiiReportsTab;
