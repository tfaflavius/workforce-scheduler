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
  TextField,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  FilterList as FilterIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Assessment as ReportIcon,
} from '@mui/icons-material';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Generează lista de luni pentru anul 2026 (toate cele 12 luni)
const generateMonthOptions = () => {
  const options = [];
  const year = 2026;

  for (let month = 0; month < 12; month++) {
    const date = new Date(year, month, 1);
    const value = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
    });
    options.push({ value, label });
  }

  return options;
};

const ReportsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filtering state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');

  // Lista de luni (generată o singură dată)
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const { data: schedules = [], isLoading, error } = useGetSchedulesQuery({
    monthYear: selectedMonth,
  });
  const { data: users = [] } = useGetUsersQuery({ isActive: true });

  // Filtrăm doar angajații și managerii
  const eligibleUsers = useMemo(() => {
    return users.filter(u => u.role === 'USER' || u.role === 'MANAGER');
  }, [users]);

  // Lista departamentelor unice
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    users.forEach(u => {
      if (u.departmentId) {
        deptSet.add(u.departmentId);
      }
    });
    return Array.from(deptSet);
  }, [users]);

  // Generează zilele lunii
  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 0);
    return date.getDate();
  }, [selectedMonth]);

  const calendarDays = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      days.push({
        day,
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        dayOfWeek: date.toLocaleDateString('ro-RO', { weekday: 'short' }),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      });
    }
    return days;
  }, [selectedMonth, daysInMonth]);

  // Creează un map cu toate asignările existente pentru toți angajații
  const allUsersAssignments = useMemo(() => {
    const userAssignmentsMap: Record<string, {
      assignments: Record<string, { shiftId: string; notes: string }>;
      scheduleId?: string;
      status?: string;
    }> = {};

    schedules.forEach(schedule => {
      if (schedule.assignments) {
        schedule.assignments.forEach(assignment => {
          if (!userAssignmentsMap[assignment.userId]) {
            userAssignmentsMap[assignment.userId] = {
              assignments: {},
              scheduleId: schedule.id,
              status: schedule.status,
            };
          }
          // Normalizează data pentru a evita probleme cu timezone
          const normalizedDate = assignment.shiftDate.split('T')[0];
          userAssignmentsMap[assignment.userId].assignments[normalizedDate] = {
            shiftId: assignment.shiftTypeId,
            notes: assignment.notes || '',
          };
          userAssignmentsMap[assignment.userId].scheduleId = schedule.id;
          userAssignmentsMap[assignment.userId].status = schedule.status;
        });
      }
    });

    return userAssignmentsMap;
  }, [schedules]);

  // Obține info pentru o asignare existentă
  const getExistingShiftInfo = (notes: string) => {
    if (notes === 'Concediu') {
      return { label: 'CO', color: '#FF9800', type: 'VACATION' as const };
    }
    if (notes.includes('07:00-19:00')) {
      return { label: 'Z', color: '#4CAF50', type: '12H' as const };
    }
    if (notes.includes('19:00-07:00')) {
      return { label: 'N', color: '#3F51B5', type: '12H' as const };
    }
    if (notes.includes('07:30-15:30')) {
      return { label: 'Z3', color: '#795548', type: '8H' as const };
    }
    if (notes.includes('06:00-14:00')) {
      return { label: 'Z1', color: '#00BCD4', type: '8H' as const };
    }
    if (notes.includes('14:00-22:00')) {
      return { label: 'Z2', color: '#9C27B0', type: '8H' as const };
    }
    if (notes.includes('22:00-06:00')) {
      return { label: 'N8', color: '#E91E63', type: '8H' as const };
    }
    return { label: '-', color: '#9E9E9E', type: 'FREE' as const };
  };

  // Filtrare utilizatori
  const filteredUsers = useMemo(() => {
    let filtered = [...eligibleUsers];

    // Filtru după nume
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.fullName.toLowerCase().includes(query)
      );
    }

    // Filtru după departament
    if (selectedDepartment !== 'ALL') {
      filtered = filtered.filter(user => user.departmentId === selectedDepartment);
    }

    return filtered;
  }, [eligibleUsers, searchQuery, selectedDepartment]);

  // Calculează totaluri pentru fiecare angajat
  const getUserStats = (userId: string) => {
    const userAssignments = allUsersAssignments[userId]?.assignments || {};
    const stats = {
      totalDays: 0,
      dayShifts: 0,
      nightShifts: 0,
      vacationDays: 0,
      freeDays: 0,
      totalHours: 0,
    };

    Object.values(userAssignments).forEach(assignment => {
      const shiftInfo = getExistingShiftInfo(assignment.notes);
      stats.totalDays++;

      if (shiftInfo.type === 'VACATION') {
        stats.vacationDays++;
      } else if (shiftInfo.type === '12H') {
        if (shiftInfo.label === 'Z') {
          stats.dayShifts++;
          stats.totalHours += 12;
        } else {
          stats.nightShifts++;
          stats.totalHours += 12;
        }
      } else if (shiftInfo.type === '8H') {
        if (shiftInfo.label === 'N8') {
          stats.nightShifts++;
          stats.totalHours += 8;
        } else {
          stats.dayShifts++;
          stats.totalHours += 8;
        }
      } else {
        stats.freeDays++;
      }
    });

    return stats;
  };

  // Mapare culori pentru ture (hex to RGB pentru PDF)
  const shiftColorMap: Record<string, [number, number, number]> = {
    'Z': [76, 175, 80],      // #4CAF50 - verde
    'N': [63, 81, 181],      // #3F51B5 - albastru
    'Z1': [0, 188, 212],     // #00BCD4 - cyan
    'Z2': [156, 39, 176],    // #9C27B0 - violet
    'Z3': [121, 85, 72],     // #795548 - maro
    'N8': [233, 30, 99],     // #E91E63 - roz
    'CO': [255, 152, 0],     // #FF9800 - portocaliu
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3',
    });

    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    // Title
    doc.setFontSize(18);
    doc.text(`Raport Program de Lucru - ${monthLabel}`, 14, 15);

    doc.setFontSize(10);
    doc.text(`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`, 14, 22);
    doc.text(`Total angajati: ${filteredUsers.length}`, 14, 27);

    // Prepare table data
    const headers = ['Angajat', ...calendarDays.map(d => `${d.day}`), 'Total Ore', 'Ture Zi', 'Ture Noapte', 'CO'];
    const rows = filteredUsers.map(targetUser => {
      const userAssignments = allUsersAssignments[targetUser.id]?.assignments || {};
      const stats = getUserStats(targetUser.id);

      const row = [
        targetUser.fullName,
        ...calendarDays.map(d => {
          const assignment = userAssignments[d.date];
          if (assignment) {
            return getExistingShiftInfo(assignment.notes).label;
          }
          return '-';
        }),
        stats.totalHours.toString(),
        stats.dayShifts.toString(),
        stats.nightShifts.toString(),
        stats.vacationDays.toString(),
      ];

      return row;
    });

    // Pregătim datele pentru colorare
    const cellColors: Record<string, { row: number; col: number; color: [number, number, number] }[]> = {};
    filteredUsers.forEach((targetUser, rowIndex) => {
      const userAssignments = allUsersAssignments[targetUser.id]?.assignments || {};
      calendarDays.forEach((d, colIndex) => {
        const assignment = userAssignments[d.date];
        if (assignment) {
          const shiftInfo = getExistingShiftInfo(assignment.notes);
          const color = shiftColorMap[shiftInfo.label];
          if (color) {
            if (!cellColors[rowIndex]) {
              cellColors[rowIndex] = [];
            }
            cellColors[rowIndex].push({ row: rowIndex, col: colIndex + 1, color });
          }
        }
      });
    });

    // Add table with colored cells
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 32,
      styles: {
        fontSize: 6,
        cellPadding: 1,
        halign: 'center',
      },
      headStyles: {
        fillColor: [25, 118, 210],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 6,
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 35 },
      },
      didParseCell: function(data) {
        // Colorăm celulele cu ture
        if (data.section === 'body' && data.column.index > 0 && data.column.index <= calendarDays.length) {
          const cellValue = data.cell.text[0];
          const color = shiftColorMap[cellValue];
          if (color) {
            data.cell.styles.fillColor = color;
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // Colorăm header-urile de weekend
        if (data.section === 'head' && data.column.index > 0 && data.column.index <= calendarDays.length) {
          const dayIndex = data.column.index - 1;
          if (calendarDays[dayIndex]?.isWeekend) {
            data.cell.styles.fillColor = [244, 67, 54]; // Roșu pentru weekend
          }
        }
      },
    });

    // Add legend with colored boxes
    const finalY = (doc as any).lastAutoTable.finalY || 200;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Legenda:', 14, finalY + 8);
    doc.setFont('helvetica', 'normal');

    const legendItems = [
      { label: 'Z', text: 'Zi 12h (07:00-19:00)', color: shiftColorMap['Z'] },
      { label: 'N', text: 'Noapte 12h (19:00-07:00)', color: shiftColorMap['N'] },
      { label: 'Z1', text: 'Zi 8h (06:00-14:00)', color: shiftColorMap['Z1'] },
      { label: 'Z2', text: 'Zi 8h (14:00-22:00)', color: shiftColorMap['Z2'] },
      { label: 'Z3', text: 'Zi 8h (07:30-15:30)', color: shiftColorMap['Z3'] },
      { label: 'N8', text: 'Noapte 8h (22:00-06:00)', color: shiftColorMap['N8'] },
      { label: 'CO', text: 'Concediu', color: shiftColorMap['CO'] },
    ];

    let xPos = 14;
    const yPos = finalY + 14;
    const boxWidth = 8;
    const boxHeight = 5;

    legendItems.forEach((item) => {
      // Draw colored box
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.rect(xPos, yPos - 3.5, boxWidth, boxHeight, 'F');

      // Draw label inside box
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(item.label, xPos + boxWidth / 2, yPos, { align: 'center' });

      // Draw description text
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(` = ${item.text}`, xPos + boxWidth + 1, yPos);

      xPos += boxWidth + doc.getTextWidth(` = ${item.text}`) + 6;
    });

    // Download
    doc.save(`raport-program-${selectedMonth}.pdf`);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    // Prepare data
    const headers = ['Angajat', 'Rol', ...calendarDays.map(d => `${d.day} ${d.dayOfWeek}`), 'Total Ore', 'Ture Zi', 'Ture Noapte', 'Concediu', 'Liber'];

    const rows = filteredUsers.map(targetUser => {
      const userAssignments = allUsersAssignments[targetUser.id]?.assignments || {};
      const stats = getUserStats(targetUser.id);

      return [
        targetUser.fullName,
        targetUser.role === 'MANAGER' ? 'Manager' : 'Angajat',
        ...calendarDays.map(d => {
          const assignment = userAssignments[d.date];
          if (assignment) {
            return getExistingShiftInfo(assignment.notes).label;
          }
          return '-';
        }),
        stats.totalHours,
        stats.dayShifts,
        stats.nightShifts,
        stats.vacationDays,
        stats.freeDays,
      ];
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create worksheet data
    const wsData = [
      [`Raport Program de Lucru - ${monthLabel}`],
      [`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`],
      [`Total angajati: ${filteredUsers.length}`],
      [], // Empty row
      headers,
      ...rows,
      [], // Empty row
      ['Legenda:'],
      ['Z = Zi 12 ore (07:00-19:00)'],
      ['N = Noapte 12 ore (19:00-07:00)'],
      ['Z1 = Zi 8 ore (06:00-14:00)'],
      ['Z2 = Zi 8 ore (14:00-22:00)'],
      ['Z3 = Zi 8 ore (07:30-15:30)'],
      ['N8 = Noapte 8 ore (22:00-06:00)'],
      ['CO = Concediu'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = [{ wch: 25 }, { wch: 10 }, ...calendarDays.map(() => ({ wch: 5 })), { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 8 }];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Program');

    // Download
    XLSX.writeFile(wb, `raport-program-${selectedMonth}.xlsx`);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2
        }}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <ReportIcon color="primary" />
              <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                Rapoarte
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Generează rapoarte PDF sau Excel pentru programul de lucru
            </Typography>
          </Box>
        </Box>

        {/* Card cu filtre și export */}
        <Card>
          <CardContent>
            <Stack spacing={3}>
              {/* Selector Lună */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CalendarIcon color="action" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight="medium">Luna:</Typography>
                </Stack>
                <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }} size="small">
                  <Select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    {monthOptions.map(({ value, label }) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {/* Alte Filtre */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FilterIcon color="action" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight="medium">Filtre:</Typography>
                </Stack>

                <TextField
                  placeholder="Caută după nume..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  sx={{ minWidth: { xs: '100%', sm: 200 } }}
                />

                <FormControl sx={{ minWidth: { xs: '100%', sm: 180 } }} size="small">
                  <InputLabel>Departament</InputLabel>
                  <Select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    label="Departament"
                  >
                    <MenuItem value="ALL">Toate departamentele</MenuItem>
                    {departments.map((deptId) => (
                      <MenuItem key={deptId} value={deptId}>
                        {users.find(u => u.departmentId === deptId)?.department?.name || deptId}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {/* Legendă */}
              <Paper sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                  <Typography variant="caption" fontWeight="bold" sx={{ mr: 1 }}>
                    Legendă:
                  </Typography>
                  <Chip label="Z - Zi 12h" size="small" sx={{ bgcolor: '#4CAF50', color: 'white', fontSize: '0.7rem', height: 24 }} />
                  <Chip label="N - Noapte 12h" size="small" sx={{ bgcolor: '#3F51B5', color: 'white', fontSize: '0.7rem', height: 24 }} />
                  <Chip label="Z1 - 06-14" size="small" sx={{ bgcolor: '#00BCD4', color: 'white', fontSize: '0.7rem', height: 24 }} />
                  <Chip label="Z2 - 14-22" size="small" sx={{ bgcolor: '#9C27B0', color: 'white', fontSize: '0.7rem', height: 24 }} />
                  <Chip label="Z3 - 07:30-15:30" size="small" sx={{ bgcolor: '#795548', color: 'white', fontSize: '0.7rem', height: 24 }} />
                  <Chip label="N8 - 22-06" size="small" sx={{ bgcolor: '#E91E63', color: 'white', fontSize: '0.7rem', height: 24 }} />
                  <Chip label="CO - Concediu" size="small" sx={{ bgcolor: '#FF9800', color: 'white', fontSize: '0.7rem', height: 24 }} />
                </Stack>
              </Paper>

              {/* Loading state */}
              {isLoading && (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={24} />
                </Box>
              )}

              {/* Error state */}
              {error && (
                <Alert severity="error">
                  Eroare la încărcarea datelor.
                </Alert>
              )}

              {/* Info despre selecție */}
              {!isLoading && !error && (
                <Alert severity="info" icon={false}>
                  <Typography variant="body2">
                    <strong>{filteredUsers.length}</strong> angajați selectați pentru luna <strong>{monthOptions.find(m => m.value === selectedMonth)?.label}</strong>
                  </Typography>
                </Alert>
              )}

              {/* Butoane Export */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  startIcon={<PdfIcon />}
                  onClick={handleExportPDF}
                  fullWidth={isMobile}
                  disabled={filteredUsers.length === 0 || isLoading}
                  sx={{ minWidth: 200 }}
                >
                  Descarcă PDF
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  startIcon={<ExcelIcon />}
                  onClick={handleExportExcel}
                  fullWidth={isMobile}
                  disabled={filteredUsers.length === 0 || isLoading}
                  sx={{ minWidth: 200 }}
                >
                  Descarcă Excel
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default ReportsPage;
