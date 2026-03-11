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
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { PARKING_STAT_LOCATIONS, PARKING_SUBSCRIPTION_LOCATIONS, getLocationFullName, isFirstInGroup, getGroupTotalSpots, TOTAL_PARKING_SPOTS } from '../../constants/parkingStats';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
import {
  useGetMonthlyTicketsSummaryQuery,
  useGetWeeklyTicketsSummaryQuery,
  useGetMonthlySubscriptionsQuery,
  useGetMonthlyOccupancySummaryQuery,
  useGetWeeklyOccupancyQuery,
} from '../../store/api/parkingStats.api';
import { loadPDFLibs, loadXLSXLib } from '../../utils/lazyExportLibs';
import { drawStatCards, drawHorizontalBarChart, type RGB } from '../../utils/pdfCharts';

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
      fullName: getLocationFullName(loc.key),
      group: loc.group,
      value: dataMap.get(loc.key) || 0,
    }));
  }, [periodType, monthlyTickets, weeklyTickets]);

  const subscriptionsData = useMemo(() => {
    const dataMap = new Map(monthlySubscriptions.map(s => [s.locationKey, s.subscriptionCount]));
    return PARKING_SUBSCRIPTION_LOCATIONS.map(loc => ({
      locationKey: loc.key,
      name: loc.name,
      spots: loc.spots,
      value: dataMap.get(loc.key) || 0,
    }));
  }, [monthlySubscriptions]);

  const occupancyData = useMemo(() => {
    if (periodType === 'monthly') {
      const dataMap = new Map(monthlyOccupancy.map(s => [s.locationKey, s]));
      return PARKING_STAT_LOCATIONS.map(loc => {
        const d = dataMap.get(loc.key);
        const avg = d ? Number(d.avgAvg) : 0;
        // Coeficient grad ocupare/saptamana = (Medie / Nr. Locuri) * 100 (procent)
        const weeklyRate = loc.spots > 0 ? Number(((avg / loc.spots) * 100).toFixed(2)) : 0;
        return {
          locationKey: loc.key,
          name: loc.name,
          fullName: getLocationFullName(loc.key),
          group: loc.group,
          spots: loc.spots,
          min: d ? Number(d.avgMin) : 0,
          max: d ? Number(d.avgMax) : 0,
          avg,
          weeklyRate,
        };
      });
    } else {
      const dataMap = new Map(weeklyOccupancy.map(s => [s.locationKey, s]));
      return PARKING_STAT_LOCATIONS.map(loc => {
        const d = dataMap.get(loc.key);
        const avg = d ? Number(d.avgOccupancy) : 0;
        // Coeficient grad ocupare/saptamana = (Medie / Nr. Locuri) * 100 (procent)
        const weeklyRate = loc.spots > 0 ? Number(((avg / loc.spots) * 100).toFixed(2)) : 0;
        return {
          locationKey: loc.key,
          name: loc.name,
          fullName: getLocationFullName(loc.key),
          group: loc.group,
          spots: loc.spots,
          min: d ? Number(d.minOccupancy) : 0,
          max: d ? Number(d.maxOccupancy) : 0,
          avg,
          weeklyRate,
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

  const handleExportPDF = async () => {
    const { jsPDF, autoTable } = await loadPDFLibs();
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pageWidth = 210;
    const VIOLET: RGB = [139, 92, 246];
    const INDIGO: RGB = [99, 102, 241];
    const BLUE: RGB = [25, 118, 210];

    const periodLabel = getPeriodLabel();
    let title = '';

    if (reportType === 'tickets') {
      title = `Raport Tichete Zilnice - ${periodLabel}`;
    } else if (reportType === 'subscriptions') {
      title = `Raport Abonamente Lunare - ${periodLabel}`;
    } else {
      title = `Raport Grad de Ocupare - ${periodLabel}`;
    }

    // Header band
    doc.setFillColor(VIOLET[0], VIOLET[1], VIOLET[2]);
    doc.roundedRect(14, 10, pageWidth - 28, 14, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(title, pageWidth / 2, 19, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`,
      pageWidth / 2, 30, { align: 'center' }
    );

    let yPos = 36;

    if (reportType === 'tickets') {
      const total = ticketsData.reduce((sum, d) => sum + d.value, 0);

      // Stat cards
      yPos = drawStatCards(doc, [
        { label: 'Total Tichete', value: total, color: VIOLET },
        { label: 'Parcari Raportate', value: ticketsData.length, color: BLUE },
      ], 14, yPos, pageWidth);

      // Bar chart
      const barItems = ticketsData.filter(d => d.value > 0).map(d => ({
        label: d.fullName,
        value: d.value,
        color: VIOLET as RGB,
      }));
      if (barItems.length > 0) {
        yPos = drawHorizontalBarChart(doc, barItems, 14, yPos, pageWidth - 28, { title: 'Tichete per parcare' });
      }

      const headers = ['Parcare', 'Numar Tichete'];
      const rows = ticketsData.map(d => [d.fullName, d.value.toString()]);
      rows.push(['TOTAL', total.toString()]);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: yPos + 2,
        margin: { left: 14, right: 14, top: 20, bottom: 20 },
        tableWidth: pageWidth - 28,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 40 } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.index === rows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [245, 243, 255];
          }
        },
      });
    } else if (reportType === 'subscriptions') {
      const total = subscriptionsData.reduce((sum, d) => sum + d.value, 0);
      const totalSpots = subscriptionsData.reduce((sum, d) => sum + d.spots, 0);

      // Stat cards
      yPos = drawStatCards(doc, [
        { label: 'Total Abonamente', value: total, color: VIOLET },
        { label: 'Total Locuri', value: totalSpots, color: INDIGO },
      ], 14, yPos, pageWidth);

      const headers = ['Parcare', 'Nr. Locuri', 'Numar Abonamente'];
      const rows = subscriptionsData.map(d => [d.name, String(d.spots), d.value.toString()]);
      rows.push(['TOTAL', String(totalSpots), total.toString()]);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: yPos + 2,
        margin: { left: 14, right: 14, top: 20, bottom: 20 },
        tableWidth: pageWidth - 28,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 25 }, 2: { halign: 'right', cellWidth: 40 } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.index === rows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [245, 243, 255];
          }
        },
      });
    } else {
      const avgTotal = occupancyData.reduce((sum, d) => sum + d.avg, 0);
      const totalCoeff = TOTAL_PARKING_SPOTS > 0 ? ((avgTotal / TOTAL_PARKING_SPOTS) * 100).toFixed(2) : '0';

      // Stat cards
      yPos = drawStatCards(doc, [
        { label: 'Total Locuri', value: TOTAL_PARKING_SPOTS, color: VIOLET },
        { label: 'Medie Ocupare', value: avgTotal.toFixed(0), color: INDIGO },
        { label: 'Grad Mediu/Sapt', value: `${totalCoeff}%`, color: BLUE },
      ], 14, yPos, pageWidth);

      const headers = ['Parcare', 'Nr. Locuri', 'Minim', 'Maxim', 'Medie', 'Grad/Săpt. (%)'];
      const rows = occupancyData.map(d => [
        d.fullName,
        String(d.spots),
        d.min.toFixed(0),
        d.max.toFixed(0),
        d.avg.toFixed(2),
        d.weeklyRate.toFixed(2) + '%',
      ]);
      rows.push([
        'TOTAL / MEDIE',
        String(TOTAL_PARKING_SPOTS),
        occupancyData.reduce((s, d) => s + d.min, 0).toFixed(0),
        occupancyData.reduce((s, d) => s + d.max, 0).toFixed(0),
        avgTotal.toFixed(2),
        totalCoeff + '%',
      ]);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: yPos + 2,
        margin: { left: 14, right: 14, top: 20, bottom: 20 },
        tableWidth: pageWidth - 28,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { halign: 'right', cellWidth: 18 },
          2: { halign: 'right', cellWidth: 16 },
          3: { halign: 'right', cellWidth: 16 },
          4: { halign: 'right', cellWidth: 16 },
          5: { halign: 'right', cellWidth: 22 },
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

  const handleExportExcel = async () => {
    const XLSX = await loadXLSXLib();
    const periodLabel = getPeriodLabel();
    const wb = XLSX.utils.book_new();

    if (reportType === 'tickets') {
      const total = ticketsData.reduce((sum, d) => sum + d.value, 0);
      const wsData = [
        [`Raport Tichete Zilnice - ${periodLabel}`],
        [`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`],
        [],
        ['Parcare', 'Numar Tichete'],
        ...ticketsData.map(d => [d.fullName, d.value]),
        [],
        ['TOTAL', total],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 35 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Tichete');
    } else if (reportType === 'subscriptions') {
      const total = subscriptionsData.reduce((sum, d) => sum + d.value, 0);
      const totalSpots = subscriptionsData.reduce((sum, d) => sum + d.spots, 0);
      const wsData = [
        [`Raport Abonamente Lunare - ${periodLabel}`],
        [`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`],
        [],
        ['Parcare', 'Nr. Locuri', 'Numar Abonamente'],
        ...subscriptionsData.map(d => [d.name, d.spots, d.value]),
        [],
        ['TOTAL', totalSpots, total],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Abonamente');
    } else {
      const wsData = [
        [`Raport Grad de Ocupare - ${periodLabel}`],
        [`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`],
        [`(Grad/Săpt. = (Medie / Nr. Locuri) × 100%)`],
        [],
        ['Parcare', 'Nr. Locuri', 'Minim', 'Maxim', 'Medie', 'Grad/Săpt. (%)'],
        ...occupancyData.map(d => [d.fullName, d.spots, d.min, d.max, Number(d.avg.toFixed(2)), d.weeklyRate.toFixed(2) + '%']),
        [],
        [
          'TOTAL / MEDIE',
          TOTAL_PARKING_SPOTS,
          occupancyData.reduce((s, d) => s + d.min, 0),
          occupancyData.reduce((s, d) => s + d.max, 0),
          Number(occupancyData.reduce((s, d) => s + d.avg, 0).toFixed(2)),
          (TOTAL_PARKING_SPOTS > 0 ? ((occupancyData.reduce((s, d) => s + d.avg, 0) / TOTAL_PARKING_SPOTS) * 100).toFixed(2) : '0') + '%',
        ],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
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
        <>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500, overflowX: 'auto' }}>
          <Table size="small" stickyHeader sx={{ minWidth: { xs: 250, sm: 300 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1), fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Parcare</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1), fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Numar Tichete</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ticketsData.map((d, idx) => {
                const rows: React.ReactNode[] = [];
                if (isFirstInGroup(idx) && d.group) {
                  rows.push(
                    <TableRow key={`group-${d.group}`} sx={{ bgcolor: alpha('#8b5cf6', 0.06) }}>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{d.group}</TableCell>
                      <TableCell />
                    </TableRow>
                  );
                }
                rows.push(
                  <TableRow key={d.locationKey} hover>
                    <TableCell sx={{ ...(d.group ? { pl: { xs: 2, sm: 4 } } : {}), fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{d.group ? `└ ${d.name}` : d.name}</TableCell>
                    <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{d.value}</TableCell>
                  </TableRow>
                );
                return rows;
              })}
              <TableRow sx={{ bgcolor: alpha('#8b5cf6', 0.08) }}>
                <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>TOTAL</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{total}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        {/* Grafic Tichete per Parcare */}
        <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            Tichete {periodType === 'monthly' ? 'Lunare' : 'Saptamanale'} per Parcare
          </Typography>
          <Box sx={{ height: { xs: 250, sm: 300 }, width: '100%' }}>
            <Bar
              data={{
                labels: ticketsData.map(d => d.group ? `${d.group} - ${d.name}` : d.name.replace('Parcarea ', '')),
                datasets: [{
                  label: 'Tichete',
                  data: ticketsData.map(d => d.value),
                  backgroundColor: 'rgba(124, 58, 237, 0.7)',
                  borderColor: 'rgb(124, 58, 237)',
                  borderWidth: 1,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y ?? 0} tichete` } },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    title: { display: true, text: 'Numar Tichete' },
                  },
                  x: { ticks: { maxRotation: 45, minRotation: 30, font: { size: 10 } } },
                },
              }}
            />
          </Box>
        </Paper>
        </>
      );
    }

    if (reportType === 'subscriptions') {
      const total = subscriptionsData.reduce((sum, d) => sum + d.value, 0);
      const totalSpots = subscriptionsData.reduce((sum, d) => sum + d.spots, 0);
      return (
        <>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500, overflowX: 'auto' }}>
          <Table size="small" stickyHeader sx={{ minWidth: { xs: 320, sm: 400 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1), fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Parcare</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1), fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Nr. Locuri</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1), fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Numar Abonamente</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subscriptionsData.map((d) => (
                <TableRow key={d.locationKey} hover>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{d.name}</TableCell>
                  <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, color: 'text.secondary' }}>{d.spots}</TableCell>
                  <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{d.value}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: alpha('#8b5cf6', 0.08) }}>
                <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>TOTAL</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.85rem' }, color: 'text.secondary' }}>{totalSpots}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{total}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        {/* Grafic Abonamente per Parcare */}
        <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            Abonamente per Parcare
          </Typography>
          <Box sx={{ height: { xs: 250, sm: 300 }, width: '100%' }}>
            <Bar
              data={{
                labels: subscriptionsData.map(d => d.name.replace('Parcarea ', '')),
                datasets: [{
                  label: 'Abonamente',
                  data: subscriptionsData.map(d => d.value),
                  backgroundColor: 'rgba(13, 148, 136, 0.7)',
                  borderColor: 'rgb(13, 148, 136)',
                  borderWidth: 1,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y ?? 0} abonamente` } },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    title: { display: true, text: 'Numar Abonamente' },
                  },
                  x: { ticks: { maxRotation: 45, minRotation: 30, font: { size: 10 } } },
                },
              }}
            />
          </Box>
        </Paper>
        </>
      );
    }

    // Occupancy
    const totalAvg = occupancyData.reduce((s, d) => s + d.avg, 0);
    // Coeficient mediu total: (totalAvg / TOTAL_PARKING_SPOTS) * 100 (procent)
    const totalWeeklyCoeff = TOTAL_PARKING_SPOTS > 0 ? Number(((totalAvg / TOTAL_PARKING_SPOTS) * 100).toFixed(2)) : 0;
    return (
      <>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500, overflowX: 'auto' }}>
        <Table size="small" stickyHeader sx={{ minWidth: { xs: 450, sm: 560 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1), fontSize: { xs: '0.7rem', sm: '0.875rem' }, minWidth: { xs: 90, sm: 140 } }}>Parcare</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1), fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Nr. Locuri</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1), fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Minim</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1), fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Maxim</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1), fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Medie</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: alpha('#8b5cf6', 0.1), fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Grad/Săpt. (%)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {occupancyData.map((d, idx) => {
              const rows: React.ReactNode[] = [];
              if (isFirstInGroup(idx) && d.group) {
                const groupSpots = getGroupTotalSpots(d.group);
                rows.push(
                  <TableRow key={`group-${d.group}`} sx={{ bgcolor: alpha('#8b5cf6', 0.06) }}>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{d.group}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: { xs: '0.7rem', sm: '0.8rem' }, color: 'text.secondary' }}>{groupSpots}</TableCell>
                    <TableCell colSpan={4} />
                  </TableRow>
                );
              }
              rows.push(
                <TableRow key={d.locationKey} hover>
                  <TableCell sx={{ ...(d.group ? { pl: { xs: 2, sm: 4 } } : {}), fontSize: { xs: '0.7rem', sm: '0.875rem' }, whiteSpace: 'nowrap' }}>
                    {d.group ? `└ ${d.name}` : d.name}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, color: 'text.secondary' }}>{d.spots}</TableCell>
                  <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{d.min.toFixed(0)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{d.max.toFixed(0)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{d.avg.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 600 }}>{d.weeklyRate.toFixed(2)}%</TableCell>
                </TableRow>
              );
              return rows;
            })}
            <TableRow sx={{ bgcolor: alpha('#8b5cf6', 0.08) }}>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>TOTAL / MEDIE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>{TOTAL_PARKING_SPOTS}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                {occupancyData.reduce((s, d) => s + d.min, 0).toFixed(0)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                {occupancyData.reduce((s, d) => s + d.max, 0).toFixed(0)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{totalAvg.toFixed(2)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{totalWeeklyCoeff.toFixed(2)}%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      {/* Grafic Grad de Ocupare */}
      <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
          Grafic Grad de Ocupare (%)
        </Typography>
        <Box sx={{ height: { xs: 250, sm: 300 }, width: '100%' }}>
          <Bar
            data={{
              labels: occupancyData.map(d => d.group ? `${d.group} - ${d.name}` : d.fullName.replace('Parcarea ', '')),
              datasets: [{
                label: 'Grad Ocupare (%)',
                data: occupancyData.map(d => d.weeklyRate),
                backgroundColor: occupancyData.map(d =>
                  d.weeklyRate >= 80 ? 'rgba(239, 68, 68, 0.7)' : d.weeklyRate >= 50 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(34, 197, 94, 0.7)'
                ),
                borderColor: occupancyData.map(d =>
                  d.weeklyRate >= 80 ? 'rgb(239, 68, 68)' : d.weeklyRate >= 50 ? 'rgb(245, 158, 11)' : 'rgb(34, 197, 94)'
                ),
                borderWidth: 1,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => `${(ctx.parsed.y ?? 0).toFixed(2)}%` } },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                  ticks: { callback: (v) => `${v}%` },
                  title: { display: true, text: 'Grad Ocupare (%)' },
                },
                x: { ticks: { maxRotation: 45, minRotation: 30, font: { size: 10 } } },
              },
            }}
          />
        </Box>
      </Paper>
      </>
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
              <strong>Abonamente lunare</strong> — {getPeriodLabel()} pentru cele 9 parcari etajate.
            </>
          )}
          {reportType === 'occupancy' && (
            <>
              <strong>Grad de ocupare</strong> — {periodType === 'monthly' ? `medie pe luna ${getPeriodLabel()}` : `saptamana ${getPeriodLabel()}`}
              {' '} (Grad/Săpt. = (Medie / Nr. Locuri) × 100%).
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
