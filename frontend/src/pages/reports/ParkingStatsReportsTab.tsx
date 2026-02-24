import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButtonGroup,
  ToggleButton,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  ConfirmationNumber as TicketIcon,
  CardMembership as SubscriptionIcon,
  TrendingUp as OccupancyIcon,
} from '@mui/icons-material';
import { PARKING_STAT_LOCATIONS, getLocationName } from '../../constants/parkingStats';
import {
  useGetMonthlyTicketsSummaryQuery,
  useGetWeeklyTicketsSummaryQuery,
  useGetMonthlySubscriptionsQuery,
  useGetMonthlyOccupancySummaryQuery,
  useGetWeeklyOccupancyQuery,
} from '../../store/api/parkingStats.api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type ReportType = 'tickets' | 'subscriptions' | 'occupancy';

// ==================== HELPERS ====================

const generateMonthOptions = () => {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  // Generate from Jan 2026 to current month
  for (let year = 2026; year <= now.getFullYear(); year++) {
    const maxMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;
    for (let month = 1; month <= maxMonth; month++) {
      const value = `${year}-${String(month).padStart(2, '0')}`;
      const date = new Date(year, month - 1, 1);
      const label = date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
  }
  return options.reverse(); // Most recent first
};

const getWeekOptions = () => {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  // Generate last 12 weeks
  const current = new Date(now);
  // Go to the Monday of current week
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  current.setDate(diff);
  current.setHours(0, 0, 0, 0);

  for (let i = 0; i < 12; i++) {
    const weekStart = new Date(current);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const value = weekStart.toISOString().split('T')[0];
    const label = `${weekStart.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })} - ${weekEnd.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    options.push({ value, label });
  }
  return options;
};

const ParkingStatsReportsTab: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [reportType, setReportType] = useState<ReportType>('tickets');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    return monday.toISOString().split('T')[0];
  });
  const [periodType, setPeriodType] = useState<'monthly' | 'weekly'>('monthly');

  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const weekOptions = useMemo(() => getWeekOptions(), []);

  // ===== QUERIES =====

  // Tickets - monthly
  const { data: monthlyTickets = [], isLoading: loadingMonthlyTickets } =
    useGetMonthlyTicketsSummaryQuery(selectedMonth, {
      skip: reportType !== 'tickets' || periodType !== 'monthly',
    });

  // Tickets - weekly
  const { data: weeklyTickets = [], isLoading: loadingWeeklyTickets } =
    useGetWeeklyTicketsSummaryQuery(selectedWeek, {
      skip: reportType !== 'tickets' || periodType !== 'weekly',
    });

  // Subscriptions - monthly
  const { data: monthlySubscriptions = [], isLoading: loadingSubscriptions } =
    useGetMonthlySubscriptionsQuery(selectedMonth, {
      skip: reportType !== 'subscriptions',
    });

  // Occupancy - monthly
  const { data: monthlyOccupancy = [], isLoading: loadingMonthlyOccupancy } =
    useGetMonthlyOccupancySummaryQuery(selectedMonth, {
      skip: reportType !== 'occupancy' || periodType !== 'monthly',
    });

  // Occupancy - weekly
  const { data: weeklyOccupancy = [], isLoading: loadingWeeklyOccupancy } =
    useGetWeeklyOccupancyQuery(selectedWeek, {
      skip: reportType !== 'occupancy' || periodType !== 'weekly',
    });

  const isLoading =
    loadingMonthlyTickets || loadingWeeklyTickets || loadingSubscriptions ||
    loadingMonthlyOccupancy || loadingWeeklyOccupancy;

  // ===== COMPUTED DATA =====

  const ticketsData = useMemo(() => {
    const source = periodType === 'monthly' ? monthlyTickets : weeklyTickets;
    const dataMap = new Map(source.map(s => [s.locationKey, s.totalTickets]));
    return PARKING_STAT_LOCATIONS.map(loc => ({
      locationKey: loc.key,
      name: loc.name,
      value: dataMap.get(loc.key) || 0,
    }));
  }, [periodType, monthlyTickets, weeklyTickets]);

  const subscriptionsData = useMemo(() => {
    const dataMap = new Map(monthlySubscriptions.map(s => [s.locationKey, s.subscriptionCount]));
    return PARKING_STAT_LOCATIONS.map(loc => ({
      locationKey: loc.key,
      name: loc.name,
      value: dataMap.get(loc.key) || 0,
    }));
  }, [monthlySubscriptions]);

  const occupancyData = useMemo(() => {
    if (periodType === 'monthly') {
      const dataMap = new Map(monthlyOccupancy.map(s => [s.locationKey, s]));
      return PARKING_STAT_LOCATIONS.map(loc => {
        const d = dataMap.get(loc.key);
        return {
          locationKey: loc.key,
          name: loc.name,
          min: d ? Number(d.avgMin) : 0,
          max: d ? Number(d.avgMax) : 0,
          avg: d ? Number(d.avgAvg) : 0,
          hourlyRate: d ? Number(d.avgHourlyRate) : 0,
        };
      });
    } else {
      const dataMap = new Map(weeklyOccupancy.map(s => [s.locationKey, s]));
      return PARKING_STAT_LOCATIONS.map(loc => {
        const d = dataMap.get(loc.key);
        return {
          locationKey: loc.key,
          name: loc.name,
          min: d ? Number(d.minOccupancy) : 0,
          max: d ? Number(d.maxOccupancy) : 0,
          avg: d ? Number(d.avgOccupancy) : 0,
          hourlyRate: d ? Number(d.hourlyRate) : 0,
        };
      });
    }
  }, [periodType, monthlyOccupancy, weeklyOccupancy]);

  // ===== PERIOD LABEL =====

  const getPeriodLabel = () => {
    if (reportType === 'subscriptions') {
      return monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
    }
    if (periodType === 'monthly') {
      return monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
    }
    return weekOptions.find(w => w.value === selectedWeek)?.label || selectedWeek;
  };

  // ===== EXPORT PDF =====

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const periodLabel = getPeriodLabel();
    let title = '';

    if (reportType === 'tickets') {
      title = `Raport Tichete Zilnice - ${periodLabel}`;
    } else if (reportType === 'subscriptions') {
      title = `Raport Abonamente Lunare - ${periodLabel}`;
    } else {
      title = `Raport Grad de Ocupare - ${periodLabel}`;
    }

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 15);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`,
      14, 22
    );

    if (reportType === 'tickets') {
      const total = ticketsData.reduce((sum, d) => sum + d.value, 0);
      doc.text(`Total tichete: ${total}`, 14, 27);

      const headers = ['Parcare', 'Numar Tichete'];
      const rows = ticketsData.map(d => [d.name, d.value.toString()]);
      rows.push(['TOTAL', total.toString()]);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 33,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 100 }, 1: { halign: 'right', cellWidth: 40 } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.index === rows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [245, 243, 255];
          }
        },
      });
    } else if (reportType === 'subscriptions') {
      const total = subscriptionsData.reduce((sum, d) => sum + d.value, 0);
      doc.text(`Total abonamente: ${total}`, 14, 27);

      const headers = ['Parcare', 'Numar Abonamente'];
      const rows = subscriptionsData.map(d => [d.name, d.value.toString()]);
      rows.push(['TOTAL', total.toString()]);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 33,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 100 }, 1: { halign: 'right', cellWidth: 40 } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.index === rows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [245, 243, 255];
          }
        },
      });
    } else {
      const avgTotal = occupancyData.reduce((sum, d) => sum + d.avg, 0);
      const avgHourly = occupancyData.reduce((sum, d) => sum + d.hourlyRate, 0);
      doc.text(`Medie ocupare totala: ${avgTotal.toFixed(0)} | Grad mediu/ora: ${avgHourly.toFixed(4)}`, 14, 27);

      const headers = ['Parcare', 'Minim', 'Maxim', 'Medie', 'Grad/Ora'];
      const rows = occupancyData.map(d => [
        d.name,
        d.min.toFixed(0),
        d.max.toFixed(0),
        d.avg.toFixed(2),
        d.hourlyRate.toFixed(4),
      ]);
      rows.push([
        'TOTAL / MEDIE',
        occupancyData.reduce((s, d) => s + d.min, 0).toFixed(0),
        occupancyData.reduce((s, d) => s + d.max, 0).toFixed(0),
        avgTotal.toFixed(2),
        avgHourly.toFixed(4),
      ]);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 33,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { halign: 'right', cellWidth: 25 },
          2: { halign: 'right', cellWidth: 25 },
          3: { halign: 'right', cellWidth: 25 },
          4: { halign: 'right', cellWidth: 30 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.index === rows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [245, 243, 255];
          }
        },
      });
    }

    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || 200;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Raport generat automat - Sistem Administrare Parcari Etajate', 14, finalY + 10);

    const typeLabel = reportType === 'tickets' ? 'tichete' : reportType === 'subscriptions' ? 'abonamente' : 'ocupare';
    const periodSuffix = reportType === 'subscriptions' ? selectedMonth : (periodType === 'monthly' ? selectedMonth : selectedWeek);
    doc.save(`raport-${typeLabel}-${periodSuffix}.pdf`);
  };

  // ===== EXPORT EXCEL =====

  const handleExportExcel = () => {
    const periodLabel = getPeriodLabel();
    const wb = XLSX.utils.book_new();

    if (reportType === 'tickets') {
      const total = ticketsData.reduce((sum, d) => sum + d.value, 0);
      const wsData = [
        [`Raport Tichete Zilnice - ${periodLabel}`],
        [`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`],
        [],
        ['Parcare', 'Numar Tichete'],
        ...ticketsData.map(d => [d.name, d.value]),
        [],
        ['TOTAL', total],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 35 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Tichete');
    } else if (reportType === 'subscriptions') {
      const total = subscriptionsData.reduce((sum, d) => sum + d.value, 0);
      const wsData = [
        [`Raport Abonamente Lunare - ${periodLabel}`],
        [`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`],
        [],
        ['Parcare', 'Numar Abonamente'],
        ...subscriptionsData.map(d => [d.name, d.value]),
        [],
        ['TOTAL', total],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 35 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Abonamente');
    } else {
      const wsData = [
        [`Raport Grad de Ocupare - ${periodLabel}`],
        [`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`],
        [],
        ['Parcare', 'Minim', 'Maxim', 'Medie', 'Grad/Ora'],
        ...occupancyData.map(d => [d.name, d.min, d.max, Number(d.avg.toFixed(2)), Number(d.hourlyRate.toFixed(4))]),
        [],
        [
          'TOTAL / MEDIE',
          occupancyData.reduce((s, d) => s + d.min, 0),
          occupancyData.reduce((s, d) => s + d.max, 0),
          Number(occupancyData.reduce((s, d) => s + d.avg, 0).toFixed(2)),
          Number(occupancyData.reduce((s, d) => s + d.hourlyRate, 0).toFixed(4)),
        ],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Ocupare');
    }

    const typeLabel = reportType === 'tickets' ? 'tichete' : reportType === 'subscriptions' ? 'abonamente' : 'ocupare';
    const periodSuffix = reportType === 'subscriptions' ? selectedMonth : (periodType === 'monthly' ? selectedMonth : selectedWeek);
    XLSX.writeFile(wb, `raport-${typeLabel}-${periodSuffix}.xlsx`);
  };

  // ===== RENDER PREVIEW TABLE =====

  const renderPreviewTable = () => {
    if (isLoading) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress size={28} />
        </Box>
      );
    }

    if (reportType === 'tickets') {
      const total = ticketsData.reduce((sum, d) => sum + d.value, 0);
      return (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1) }}>Parcare</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1) }}>Numar Tichete</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ticketsData.map(d => (
                <TableRow key={d.locationKey} hover>
                  <TableCell>{d.name}</TableCell>
                  <TableCell align="right">{d.value}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: alpha('#8b5cf6', 0.08) }}>
                <TableCell sx={{ fontWeight: 700 }}>TOTAL</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{total}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (reportType === 'subscriptions') {
      const total = subscriptionsData.reduce((sum, d) => sum + d.value, 0);
      return (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1) }}>Parcare</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1) }}>Numar Abonamente</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subscriptionsData.map(d => (
                <TableRow key={d.locationKey} hover>
                  <TableCell>{d.name}</TableCell>
                  <TableCell align="right">{d.value}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: alpha('#8b5cf6', 0.08) }}>
                <TableCell sx={{ fontWeight: 700 }}>TOTAL</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{total}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    // Occupancy
    const totalAvg = occupancyData.reduce((s, d) => s + d.avg, 0);
    const totalHourly = occupancyData.reduce((s, d) => s + d.hourlyRate, 0);
    return (
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500, overflowX: 'auto' }}>
        <Table size="small" stickyHeader sx={{ minWidth: 500 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1) }}>Parcare</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1) }}>Minim</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1) }}>Maxim</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1) }}>Medie</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1) }}>Grad/Ora</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {occupancyData.map(d => (
              <TableRow key={d.locationKey} hover>
                <TableCell>{d.name}</TableCell>
                <TableCell align="right">{d.min.toFixed(0)}</TableCell>
                <TableCell align="right">{d.max.toFixed(0)}</TableCell>
                <TableCell align="right">{d.avg.toFixed(2)}</TableCell>
                <TableCell align="right">{d.hourlyRate.toFixed(4)}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: alpha('#8b5cf6', 0.08) }}>
              <TableCell sx={{ fontWeight: 700 }}>TOTAL / MEDIE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {occupancyData.reduce((s, d) => s + d.min, 0).toFixed(0)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {occupancyData.reduce((s, d) => s + d.max, 0).toFixed(0)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{totalAvg.toFixed(2)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{totalHourly.toFixed(4)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Stack spacing={3}>
      {/* Report Type Selector */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <Typography variant="subtitle2" fontWeight="medium">Tip raport:</Typography>
        <ToggleButtonGroup
          value={reportType}
          exclusive
          onChange={(_, v) => v && setReportType(v as ReportType)}
          size="small"
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton value="tickets" sx={{ textTransform: 'none', gap: 0.5 }}>
            <TicketIcon fontSize="small" />
            {isMobile ? 'Tichete' : 'Tichete Zilnice'}
          </ToggleButton>
          <ToggleButton value="subscriptions" sx={{ textTransform: 'none', gap: 0.5 }}>
            <SubscriptionIcon fontSize="small" />
            Abonamente
          </ToggleButton>
          <ToggleButton value="occupancy" sx={{ textTransform: 'none', gap: 0.5 }}>
            <OccupancyIcon fontSize="small" />
            {isMobile ? 'Ocupare' : 'Grad Ocupare'}
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Period Selector */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
        {/* Period type toggle for tickets and occupancy */}
        {reportType !== 'subscriptions' && (
          <ToggleButtonGroup
            value={periodType}
            exclusive
            onChange={(_, v) => v && setPeriodType(v as 'monthly' | 'weekly')}
            size="small"
          >
            <ToggleButton value="monthly" sx={{ textTransform: 'none' }}>Lunar</ToggleButton>
            <ToggleButton value="weekly" sx={{ textTransform: 'none' }}>Saptamanal</ToggleButton>
          </ToggleButtonGroup>
        )}

        {/* Month or Week select */}
        {(reportType === 'subscriptions' || periodType === 'monthly') ? (
          <FormControl sx={{ minWidth: { xs: '100%', sm: 220 } }} size="small">
            <InputLabel>Luna</InputLabel>
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              label="Luna"
            >
              {monthOptions.map(({ value, label }) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <FormControl sx={{ minWidth: { xs: '100%', sm: 280 } }} size="small">
            <InputLabel>Saptamana</InputLabel>
            <Select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              label="Saptamana"
            >
              {weekOptions.map(({ value, label }) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>

      {/* Info */}
      <Alert severity="info" icon={false}>
        <Typography variant="body2">
          {reportType === 'tickets' && (
            <>
              <strong>Tichete zilnice</strong> — {periodType === 'monthly' ? `suma pe luna ${getPeriodLabel()}` : `suma pe saptamana ${getPeriodLabel()}`}
              {' '} pentru cele 12 parcari etajate.
            </>
          )}
          {reportType === 'subscriptions' && (
            <>
              <strong>Abonamente lunare</strong> — {getPeriodLabel()} pentru cele 12 parcari etajate.
            </>
          )}
          {reportType === 'occupancy' && (
            <>
              <strong>Grad de ocupare</strong> — {periodType === 'monthly' ? `medie pe luna ${getPeriodLabel()}` : `saptamana ${getPeriodLabel()}`}
              {' '} (Grad/Ora = Medie / 168 ore).
            </>
          )}
        </Typography>
      </Alert>

      {/* Preview Table */}
      {renderPreviewTable()}

      {/* Export Buttons */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
        <Button
          variant="contained"
          color="error"
          size="large"
          startIcon={<PdfIcon />}
          onClick={handleExportPDF}
          fullWidth={isMobile}
          disabled={isLoading}
          sx={{ minWidth: 200 }}
        >
          Descarca PDF
        </Button>
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<ExcelIcon />}
          onClick={handleExportExcel}
          fullWidth={isMobile}
          disabled={isLoading}
          sx={{ minWidth: 200 }}
        >
          Descarca Excel
        </Button>
      </Stack>
    </Stack>
  );
};

export default ParkingStatsReportsTab;
