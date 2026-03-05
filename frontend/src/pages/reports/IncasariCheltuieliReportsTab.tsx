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
  AccountBalanceWallet as IncasariIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CompareArrows as DiffIcon,
  Category as CategoryIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useGetRevenueSummaryQuery } from '../../store/api/acquisitions.api';
import type { RevenueSummary, RevenueSummaryCategory } from '../../types/acquisitions.types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface IncasariCheltuieliReportsTabProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
}

const MONTH_LABELS = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatCurrency = (value: number): string => {
  return value.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' lei';
};

const formatCurrencyShort = (value: number): string => {
  if (value === 0) return '-';
  return value.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const IncasariCheltuieliReportsTab: React.FC<IncasariCheltuieliReportsTabProps> = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportDrawerOpen, setExportDrawerOpen] = useState(false);

  // Fetch data
  const { data: revenueSummary, isLoading, refetch } = useGetRevenueSummaryQuery({ year: selectedYear });

  // Flatten categories for display
  const flatCategories = useMemo(() => {
    if (!revenueSummary) return [];
    const result: RevenueSummaryCategory[] = [];

    const flatten = (categories: RevenueSummaryCategory[]) => {
      categories.forEach(cat => {
        result.push(cat);
        if (cat.children && cat.children.length > 0) {
          flatten(cat.children);
        }
      });
    };

    flatten(revenueSummary.categories);
    return result;
  }, [revenueSummary]);

  // Statistics
  const stats = useMemo(() => {
    if (!revenueSummary) {
      return { totalIncasari: 0, totalCheltuieli: 0, diferenta: 0, nrCategorii: 0 };
    }

    return {
      totalIncasari: revenueSummary.grandTotalIncasari,
      totalCheltuieli: revenueSummary.grandTotalCheltuieli,
      diferenta: revenueSummary.grandTotalIncasari - revenueSummary.grandTotalCheltuieli,
      nrCategorii: flatCategories.length,
    };
  }, [revenueSummary, flatCategories]);

  // Get month value for a category
  const getMonthIncasari = (cat: RevenueSummaryCategory, month: number): number => {
    return cat.months[month]?.incasari || 0;
  };

  // Export to PDF - LANDSCAPE due to 12 month columns
  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    // Header
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105);
    doc.text('Raport Incasari si Cheltuieli', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Anul: ${selectedYear}`, 14, 30);
    doc.text(`Generat la: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 14, 36);

    // Statistics
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Statistici:', 14, 48);
    doc.setFontSize(10);
    doc.text(`Total incasari: ${formatCurrency(stats.totalIncasari)}`, 14, 56);
    doc.text(`Total cheltuieli: ${formatCurrency(stats.totalCheltuieli)}`, 14, 62);
    doc.text(`Diferenta: ${formatCurrency(stats.diferenta)}`, 14, 68);
    doc.text(`Nr. categorii: ${stats.nrCategorii}`, 14, 74);

    // Table
    const tableData = flatCategories.map((cat: RevenueSummaryCategory) => {
      const row: string[] = [cat.categoryName];
      for (let m = 1; m <= 12; m++) {
        const val = getMonthIncasari(cat, m);
        row.push(val > 0 ? formatCurrencyShort(val) : '-');
      }
      row.push(formatCurrencyShort(cat.totalIncasari));
      return row;
    });

    // Add totals row
    if (revenueSummary) {
      const totalsRow: string[] = ['TOTAL'];
      for (let m = 1; m <= 12; m++) {
        const val = revenueSummary.monthTotals[m]?.incasari || 0;
        totalsRow.push(val > 0 ? formatCurrencyShort(val) : '-');
      }
      totalsRow.push(formatCurrencyShort(revenueSummary.grandTotalIncasari));
      tableData.push(totalsRow);
    }

    autoTable(doc, {
      startY: 84,
      head: [['Categorie', ...MONTH_LABELS, 'Total']],
      body: tableData,
      styles: { fontSize: 6, cellPadding: 2 },
      headStyles: { fillColor: [5, 150, 105] },
      columnStyles: {
        0: { cellWidth: 50 },
      },
    });

    doc.save(`raport-incasari-cheltuieli-${selectedYear}.pdf`);
    setExportDrawerOpen(false);
  };

  // Export to Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Build Excel data with Incasari and Cheltuieli per month
    const excelData = flatCategories.map((cat: RevenueSummaryCategory) => {
      const row: Record<string, string | number> = {
        'Categorie': cat.categoryName,
      };
      for (let m = 1; m <= 12; m++) {
        const monthData = cat.months[m];
        row[`${MONTH_LABELS[m - 1]} Incasari`] = monthData?.incasari || 0;
        row[`${MONTH_LABELS[m - 1]} Cheltuieli`] = monthData?.cheltuieli || 0;
      }
      row['Total Incasari'] = cat.totalIncasari;
      row['Total Cheltuieli'] = cat.totalCheltuieli;
      return row;
    });

    // Add totals row
    if (revenueSummary) {
      const totalsRow: Record<string, string | number> = {
        'Categorie': 'TOTAL',
      };
      for (let m = 1; m <= 12; m++) {
        totalsRow[`${MONTH_LABELS[m - 1]} Incasari`] = revenueSummary.monthTotals[m]?.incasari || 0;
        totalsRow[`${MONTH_LABELS[m - 1]} Cheltuieli`] = revenueSummary.monthTotals[m]?.cheltuieli || 0;
      }
      totalsRow['Total Incasari'] = revenueSummary.grandTotalIncasari;
      totalsRow['Total Cheltuieli'] = revenueSummary.grandTotalCheltuieli;
      excelData.push(totalsRow);
    }

    const ws = XLSX.utils.json_to_sheet(excelData);

    // Auto-width columns
    const maxWidth = 20;
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, ...excelData.map(row => String(row[key as keyof typeof row] || '').length)))
    }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Incasari Cheltuieli');

    XLSX.writeFile(wb, `raport-incasari-cheltuieli-${selectedYear}.xlsx`);
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
            <Typography variant="h5" fontWeight={700} color={color} sx={{ fontSize: { xs: '0.85rem', sm: '1.5rem' } }}>
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
          disabled={flatCategories.length === 0}
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
          disabled={flatCategories.length === 0}
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
        {flatCategories.length} categorii vor fi exportate
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
            <IncasariIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Incasari si Cheltuieli
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Situatia lunara a incasarilor si cheltuielilor - anul {selectedYear}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Grow>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Total Incasari"
            value={formatCurrency(stats.totalIncasari)}
            icon={<TrendingUpIcon />}
            color="#059669"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Total Cheltuieli"
            value={formatCurrency(stats.totalCheltuieli)}
            icon={<TrendingDownIcon />}
            color="#ef4444"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Diferenta"
            value={formatCurrency(stats.diferenta)}
            icon={<DiffIcon />}
            color={stats.diferenta >= 0 ? '#2563eb' : '#ef4444'}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Nr. Categorii"
            value={stats.nrCategorii}
            icon={<CategoryIcon />}
            color="#8b5cf6"
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
      ) : flatCategories.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Nu exista date de incasari/cheltuieli pentru anul selectat.
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#059669', 0.08) }}>
                <TableCell sx={{ fontWeight: 600, minWidth: 150, position: 'sticky', left: 0, bgcolor: alpha('#059669', 0.08), zIndex: 1 }}>
                  Categorie
                </TableCell>
                {MONTH_LABELS.map((label) => (
                  <TableCell key={label} sx={{ fontWeight: 600, minWidth: 70 }} align="right">
                    {label}
                  </TableCell>
                ))}
                <TableCell sx={{ fontWeight: 600, minWidth: 90 }} align="right">
                  Total
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flatCategories.slice(0, 50).map((cat: RevenueSummaryCategory) => (
                <TableRow key={cat.categoryId} hover>
                  <TableCell
                    sx={{
                      position: 'sticky',
                      left: 0,
                      bgcolor: 'background.paper',
                      zIndex: 1,
                      fontWeight: cat.isGroup ? 700 : 400,
                      pl: cat.parentId ? 4 : 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        maxWidth: { xs: 120, sm: 200 },
                        fontWeight: cat.isGroup ? 700 : 400,
                      }}
                    >
                      {cat.categoryName}
                    </Typography>
                  </TableCell>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const val = getMonthIncasari(cat, month);
                    return (
                      <TableCell key={month} align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            color: val > 0 ? 'text.primary' : 'text.disabled',
                            fontWeight: cat.isGroup ? 600 : 400,
                            fontSize: '0.75rem',
                          }}
                        >
                          {val > 0 ? formatCurrencyShort(val) : '-'}
                        </Typography>
                      </TableCell>
                    );
                  })}
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color={cat.totalIncasari > 0 ? 'success.main' : 'text.disabled'}
                    >
                      {cat.totalIncasari > 0 ? formatCurrencyShort(cat.totalIncasari) : '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals Row */}
              {revenueSummary && (
                <TableRow sx={{ bgcolor: alpha('#059669', 0.05) }}>
                  <TableCell
                    sx={{
                      position: 'sticky',
                      left: 0,
                      bgcolor: alpha('#059669', 0.05),
                      zIndex: 1,
                      fontWeight: 700,
                    }}
                  >
                    TOTAL
                  </TableCell>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const val = revenueSummary.monthTotals[month]?.incasari || 0;
                    return (
                      <TableCell key={month} align="right">
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.75rem' }}>
                          {val > 0 ? formatCurrencyShort(val) : '-'}
                        </Typography>
                      </TableCell>
                    );
                  })}
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700} color="success.main">
                      {formatCurrencyShort(revenueSummary.grandTotalIncasari)}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {flatCategories.length > 50 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Afisate primele 50 din {flatCategories.length} categorii. Exporta pentru lista completa.
              </Typography>
            </Box>
          )}
        </TableContainer>
      )}

      {/* Export FAB (Mobile) */}
      {isMobile && (
        <Zoom in={flatCategories.length > 0}>
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
      {!isMobile && flatCategories.length > 0 && (
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

export default IncasariCheltuieliReportsTab;
