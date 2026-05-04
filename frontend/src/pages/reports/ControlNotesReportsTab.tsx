import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Chip,
  Fab,
  Zoom,
  SwipeableDrawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  alpha,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import {
  AssignmentTurnedIn as NotesIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Download as DownloadIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { useGetControlNotesMatrixQuery } from '../../store/api/controlNotes.api';
import { loadPDFLibs, loadXLSXLib } from '../../utils/lazyExportLibs';
import { format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
);

const ControlNotesReportsTab: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [exportDrawerOpen, setExportDrawerOpen] = useState(false);

  const { data: matrix, isLoading } = useGetControlNotesMatrixQuery(year);

  const yearOptions = useMemo(() => {
    const out: number[] = [];
    for (let y = currentYear + 1; y >= currentYear - 4; y--) out.push(y);
    return out;
  }, [currentYear]);

  // ===== EXPORT TO PDF =====
  const exportToPDF = async () => {
    if (!matrix) return;
    const { jsPDF, autoTable } = await loadPDFLibs();
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = 297;
    const BLUE: [number, number, number] = [25, 118, 210];
    const GREEN: [number, number, number] = [16, 185, 129];

    // Header band
    doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.roundedRect(10, 10, pageWidth - 20, 14, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('Raport Control Parcari — Note de constatare', pageWidth / 2, 19, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Anul: ${year}  |  Generat la: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`,
      pageWidth / 2,
      30,
      { align: 'center' },
    );

    // Summary stats
    let yPos = 36;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(10, yPos, pageWidth - 20, 14, 2, 2, 'F');
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9);
    const summaryText = `Total an: ${matrix.totals.grandTotal.toLocaleString('ro-RO')}    |    Zile lucratoare: ${matrix.totals.totalWorkingDays}    |    Media/zi lucratoare: ${matrix.totals.averagePerWorkingDay.toFixed(2)}`;
    doc.text(summaryText, pageWidth / 2, yPos + 9, { align: 'center' });
    yPos += 18;

    // Build table
    const head = [
      [
        'Cod',
        'Agent',
        ...matrix.months.map((m) => `${m.label} (${m.workingDays}z)`),
        'Total',
        'Media/zi',
      ],
    ];

    const body = matrix.users.map((u) => [
      u.agentCode || '',
      u.fullName,
      ...u.monthlyCounts.map((c, i) => {
        const marker = u.monthlyMarkers[i];
        if (marker) return marker;
        if (c === null) return '—';
        return String(c);
      }),
      u.total.toLocaleString('ro-RO'),
      u.averagePerWorkingDay.toFixed(2),
    ]);

    // Footer monthly totals
    body.push([
      '',
      'TOTAL LUNAR',
      ...matrix.months.map((m) => (m.totalCount > 0 ? m.totalCount.toLocaleString('ro-RO') : '—')),
      matrix.totals.grandTotal.toLocaleString('ro-RO'),
      matrix.totals.averagePerWorkingDay.toFixed(2),
    ]);

    autoTable(doc, {
      startY: yPos,
      margin: { left: 10, right: 10, top: 20, bottom: 15 },
      tableWidth: pageWidth - 20,
      head,
      body,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 50 },
        14: { fillColor: [220, 252, 231], fontStyle: 'bold' },
        15: { fillColor: [220, 252, 231], fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        // Bold the totals row (last)
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [219, 234, 254];
        }
      },
    });

    // Holidays summary
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 100;
    if (finalY < 180) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
      doc.text('Sarbatori legale (in zilele lucratoare)', 10, finalY + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      let hy = finalY + 13;
      matrix.months.forEach((m) => {
        if (m.holidayDates.length > 0) {
          doc.text(`${m.label}: ${m.holidayDates.join(', ')}`, 10, hy);
          hy += 4;
        }
      });
    }

    doc.save(`raport-control-parcari-${year}.pdf`);
    setExportDrawerOpen(false);
  };

  // ===== EXPORT TO EXCEL =====
  const exportToExcel = async () => {
    if (!matrix) return;
    const XLSX = await loadXLSXLib();
    const wb = XLSX.utils.book_new();

    // Sheet 1: Matricea principala
    const headers = [
      'Cod Agent',
      'Nume si prenume',
      ...matrix.months.map((m) => m.label),
      'Total',
      'Media/zi lucratoare',
    ];

    const rows = matrix.users.map((u) => {
      const row: Record<string, string | number> = {
        'Cod Agent': u.agentCode || '',
        'Nume si prenume': u.fullName,
      };
      matrix.months.forEach((m, i) => {
        const marker = u.monthlyMarkers[i];
        const count = u.monthlyCounts[i];
        row[m.label] = marker ?? (count ?? '');
      });
      row['Total'] = u.total;
      row['Media/zi lucratoare'] = u.averagePerWorkingDay;
      return row;
    });

    // Footer rows
    const totalRow: Record<string, string | number> = {
      'Cod Agent': '',
      'Nume si prenume': 'TOTAL LUNAR',
    };
    matrix.months.forEach((m) => {
      totalRow[m.label] = m.totalCount;
    });
    totalRow['Total'] = matrix.totals.grandTotal;
    totalRow['Media/zi lucratoare'] = matrix.totals.averagePerWorkingDay;
    rows.push(totalRow);

    const workingDaysRow: Record<string, string | number> = {
      'Cod Agent': '',
      'Nume si prenume': 'Zile lucratoare in luna',
    };
    matrix.months.forEach((m) => {
      workingDaysRow[m.label] = m.workingDays;
    });
    workingDaysRow['Total'] = matrix.totals.totalWorkingDays;
    workingDaysRow['Media/zi lucratoare'] = '';
    rows.push(workingDaysRow);

    const ws1 = XLSX.utils.json_to_sheet(rows, { header: headers });
    // Column widths
    ws1['!cols'] = [
      { wch: 10 },  // Cod
      { wch: 32 },  // Nume
      ...matrix.months.map(() => ({ wch: 7 })),
      { wch: 10 },  // Total
      { wch: 14 },  // Media
    ];
    XLSX.utils.book_append_sheet(wb, ws1, `Control ${year}`);

    // Sheet 2: Detalii zile lucratoare + sarbatori
    const detailRows = matrix.months.map((m) => ({
      'Luna': m.label,
      'Zile in luna': m.totalDays,
      'Zile weekend': m.weekendDays,
      'Sarbatori (in zile lucr.)': m.holidayDays,
      'Zile lucratoare': m.workingDays,
      'Datele sarbatorilor': m.holidayDates.join(', '),
      'Total note': m.totalCount,
    }));
    const ws2 = XLSX.utils.json_to_sheet(detailRows);
    ws2['!cols'] = [
      { wch: 8 },
      { wch: 12 },
      { wch: 14 },
      { wch: 22 },
      { wch: 14 },
      { wch: 30 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Zile lucratoare');

    XLSX.writeFile(wb, `raport-control-parcari-${year}.xlsx`);
    setExportDrawerOpen(false);
  };

  // Chart data — top 5 agents by total for trend chart
  const top5 = useMemo(() => {
    if (!matrix) return [];
    return [...matrix.users]
      .filter((u) => u.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [matrix]);

  const palette = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
  ];

  return (
    <Box sx={{ pb: { xs: 10, sm: 0 } }}>
      {/* Header */}
      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 1.75, sm: 2.25 }, '&:last-child': { pb: { xs: 1.75, sm: 2.25 } } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              flexWrap: 'wrap',
            }}
          >
            <NotesIcon sx={{ fontSize: { xs: 26, sm: 32 }, color: 'primary.main', flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: { xs: '0.65rem', sm: '0.72rem' },
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                Raport Control Parcari — Note de constatare
              </Typography>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Anul {year}
              </Typography>
            </Box>
            <TextField
              select
              size="small"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              label="An"
              sx={{ minWidth: 100, flexShrink: 0 }}
            >
              {yearOptions.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && matrix && matrix.users.length === 0 && (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <NotesIcon sx={{ fontSize: 64, color: alpha(theme.palette.primary.main, 0.3), mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Nu exista date pentru anul {year}
          </Typography>
        </Card>
      )}

      {!isLoading && matrix && matrix.users.length > 0 && (
        <>
          {/* Summary stats */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
              gap: { xs: 1, sm: 2 },
              mb: 2,
            }}
          >
            <Card sx={{ borderRadius: 2, borderLeft: `4px solid ${theme.palette.primary.main}` }}>
              <CardContent sx={{ p: { xs: 1.25, sm: 1.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.65rem', sm: '0.72rem' } }}>
                  Total note an
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={800}
                  color="primary.main"
                  sx={{ fontSize: { xs: '1rem', sm: '1.4rem' }, wordBreak: 'break-word' }}
                >
                  {matrix.totals.grandTotal.toLocaleString('ro-RO')}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ borderRadius: 2, borderLeft: `4px solid ${theme.palette.warning.main}` }}>
              <CardContent sx={{ p: { xs: 1.25, sm: 1.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.65rem', sm: '0.72rem' } }}>
                  Zile lucratoare cu date
                </Typography>
                <Typography variant="h5" fontWeight={800} color="warning.dark" sx={{ fontSize: { xs: '1rem', sm: '1.4rem' } }}>
                  {matrix.totals.totalWorkingDays}
                </Typography>
              </CardContent>
            </Card>
            <Card
              sx={{
                borderRadius: 2,
                borderLeft: `4px solid ${theme.palette.success.main}`,
                gridColumn: { xs: '1 / -1', sm: 'auto' },
              }}
            >
              <CardContent sx={{ p: { xs: 1.25, sm: 1.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.65rem', sm: '0.72rem' } }}>
                  Media / zi lucratoare
                </Typography>
                <Typography variant="h5" fontWeight={800} color="success.main" sx={{ fontSize: { xs: '1rem', sm: '1.4rem' } }}>
                  {matrix.totals.averagePerWorkingDay.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Bar chart: Total per month */}
          <Card sx={{ mb: 2, borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <ChartIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={700}>
                  Total note pe luna vs zile lucratoare
                </Typography>
              </Stack>
              <Box sx={{ position: 'relative', height: { xs: 240, sm: 320 } }}>
                <Bar
                  data={{
                    labels: matrix.months.map((m) => m.label),
                    datasets: [
                      {
                        label: 'Note de constatare',
                        data: matrix.months.map((m) => m.totalCount),
                        backgroundColor: alpha(theme.palette.primary.main, 0.7),
                        borderColor: theme.palette.primary.main,
                        borderWidth: 1,
                        borderRadius: 6,
                      },
                      {
                        label: 'Zile lucratoare',
                        data: matrix.months.map((m) => m.workingDays),
                        backgroundColor: alpha(theme.palette.warning.main, 0.5),
                        borderColor: theme.palette.warning.main,
                        borderWidth: 1,
                        borderRadius: 6,
                        yAxisID: 'y1',
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index' as const, intersect: false },
                    scales: {
                      y: {
                        beginAtZero: true,
                        position: 'left' as const,
                        title: { display: true, text: 'Note de constatare' },
                      },
                      y1: {
                        beginAtZero: true,
                        position: 'right' as const,
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Zile lucratoare' },
                      },
                    },
                    plugins: { legend: { position: 'top' as const } },
                  }}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Trend chart: top 5 agents */}
          {top5.length > 0 && (
            <Card sx={{ mb: 2, borderRadius: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <ChartIcon color="success" />
                  <Typography variant="subtitle1" fontWeight={700}>
                    Trend lunar — top 5 agenti
                  </Typography>
                </Stack>
                <Box sx={{ position: 'relative', height: { xs: 240, sm: 340 } }}>
                  <Line
                    data={{
                      labels: matrix.months.map((m) => m.label),
                      datasets: top5.map((u, idx) => ({
                        label: u.fullName,
                        data: u.monthlyCounts.map((c) => c ?? 0),
                        borderColor: palette[idx],
                        backgroundColor: alpha(palette[idx], 0.1),
                        tension: 0.3,
                        fill: false,
                      })),
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: { mode: 'index' as const, intersect: false },
                      scales: { y: { beginAtZero: true } },
                      plugins: {
                        legend: { position: 'top' as const, labels: { boxWidth: 12 } },
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Mini-table for visual reference */}
          <TableContainer component={Paper} sx={{ borderRadius: 2, maxHeight: 400, overflowX: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 3 }}>
                    Agent
                  </TableCell>
                  {matrix.months.map((m) => (
                    <Tooltip
                      key={m.month}
                      title={`${m.workingDays} zile lucratoare (${m.weekendDays} weekend, ${m.holidayDays} sarbatori)`}
                      arrow
                    >
                      <TableCell align="center" sx={{ fontWeight: 700, px: 0.5, fontSize: '0.75rem' }}>
                        {m.label}
                      </TableCell>
                    </Tooltip>
                  ))}
                  <TableCell align="center" sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                    Total
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                    Media
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {matrix.users.map((u) => (
                  <TableRow key={u.userId} hover>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1, fontSize: '0.8rem' }}>
                      {u.fullName}
                    </TableCell>
                    {u.monthlyCounts.map((c, i) => {
                      const marker = u.monthlyMarkers[i];
                      return (
                        <TableCell key={i} align="center" sx={{ fontSize: '0.75rem', px: 0.5 }}>
                          {marker ? (
                            <Chip
                              label={marker}
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: '0.6rem',
                                bgcolor: alpha(theme.palette.warning.main, 0.18),
                              }}
                            />
                          ) : c !== null ? (
                            c
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.success.main, 0.06) }}>
                      {u.total.toLocaleString('ro-RO')}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.success.main, 0.06) }}>
                      {u.averagePerWorkingDay.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                  <TableCell sx={{ position: 'sticky', left: 0, bgcolor: alpha(theme.palette.primary.main, 0.12), zIndex: 1, fontWeight: 800 }}>
                    TOTAL LUNAR
                  </TableCell>
                  {matrix.months.map((m) => (
                    <TableCell key={m.month} align="center" sx={{ fontWeight: 700 }}>
                      {m.totalCount > 0 ? m.totalCount.toLocaleString('ro-RO') : '—'}
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ fontWeight: 800, bgcolor: alpha(theme.palette.success.main, 0.15) }}>
                    {matrix.totals.grandTotal.toLocaleString('ro-RO')}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, bgcolor: alpha(theme.palette.success.main, 0.15) }}>
                    {matrix.totals.averagePerWorkingDay.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Desktop export buttons */}
          {!isMobile && (
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

          {/* Mobile FAB */}
          {isMobile && (
            <Zoom in>
              <Fab
                color="primary"
                sx={{
                  position: 'fixed',
                  bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
                  right: 16,
                  background: 'linear-gradient(135deg, #1976d2 0%, #2196f3 100%)',
                }}
                onClick={() => setExportDrawerOpen(true)}
              >
                <DownloadIcon />
              </Fab>
            </Zoom>
          )}

          {/* Mobile export drawer */}
          <SwipeableDrawer
            anchor="bottom"
            open={exportDrawerOpen}
            onClose={() => setExportDrawerOpen(false)}
            onOpen={() => setExportDrawerOpen(true)}
            PaperProps={{ sx: { borderRadius: '16px 16px 0 0' } }}
          >
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Exporta raport
              </Typography>
              <List>
                <ListItem disablePadding>
                  <ListItemButton onClick={exportToPDF}>
                    <ListItemIcon>
                      <PdfIcon sx={{ color: '#ef4444' }} />
                    </ListItemIcon>
                    <ListItemText primary="Exporta PDF" secondary="Fisier .pdf — cu sumar si tabel complet" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton onClick={exportToExcel}>
                    <ListItemIcon>
                      <ExcelIcon sx={{ color: '#10b981' }} />
                    </ListItemIcon>
                    <ListItemText primary="Exporta Excel" secondary="Fisier .xlsx — 2 sheet-uri (matrice + zile lucr.)" />
                  </ListItemButton>
                </ListItem>
              </List>
            </Box>
          </SwipeableDrawer>
        </>
      )}
    </Box>
  );
};

export default React.memo(ControlNotesReportsTab);
