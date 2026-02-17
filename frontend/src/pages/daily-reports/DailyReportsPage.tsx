import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Chip,
  Avatar,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Fade,
  Paper,
  useTheme,
  useMediaQuery,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Description as ReportIcon,
  Send as SendIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Comment as CommentIcon,
  CalendarToday as CalendarIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import {
  useCreateDailyReportMutation,
  useGetTodayReportQuery,
  useGetMyDailyReportsQuery,
  useGetAllDailyReportsQuery,
  useUpdateDailyReportMutation,
  useAddAdminCommentMutation,
} from '../../store/api/dailyReports.api';
import { useGetUsersQuery } from '../../store/api/users.api';
import { useGetDepartmentsQuery } from '../../store/api/departmentsApi';

// ============== HELPERS ==============

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const getStatusColor = (status: string): 'success' | 'warning' | 'default' => {
  switch (status) {
    case 'SUBMITTED':
      return 'success';
    case 'DRAFT':
      return 'warning';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'SUBMITTED':
      return 'Trimis';
    case 'DRAFT':
      return 'Ciorna';
    default:
      return status;
  }
};

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Get last 30 days range
const getLast30DaysRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

// ============== COMPONENT ==============

const DailyReportsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const canViewAll = isAdmin || isManager;

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // My report state
  const [reportContent, setReportContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Admin comment state
  const [commentingReportId, setCommentingReportId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Filter state for "Toate Rapoartele"
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<number | ''>(new Date().getDate());
  const [filterUserId, setFilterUserId] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('');

  // Generate last 12 months for dropdown
  const monthOptions = useMemo(() => {
    const options: { year: number; month: number; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
      options.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: label.charAt(0).toUpperCase() + label.slice(1),
      });
    }
    return options;
  }, []);

  // Derive filterDateRange from selectedMonth + selectedDay
  const filterDateRange = useMemo(() => {
    const { year, month } = selectedMonth;
    const mm = String(month + 1).padStart(2, '0');
    if (selectedDay === '') {
      // Entire month
      const lastDay = new Date(year, month + 1, 0).getDate();
      return {
        startDate: `${year}-${mm}-01`,
        endDate: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
      };
    } else {
      // Specific day
      const dd = String(selectedDay).padStart(2, '0');
      return { startDate: `${year}-${mm}-${dd}`, endDate: `${year}-${mm}-${dd}` };
    }
  }, [selectedMonth, selectedDay]);

  // When month changes, reset day
  const handleMonthChange = (value: string) => {
    const [year, month] = value.split('-').map(Number);
    setSelectedMonth({ year, month });
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    setSelectedDay(isCurrentMonth ? now.getDate() : '');
  };

  // API hooks
  const { data: todayReport, isLoading: loadingToday, refetch: refetchToday } = useGetTodayReportQuery(
    undefined,
    { skip: isAdmin },
  );
  const { data: myReports, isLoading: loadingMyReports } = useGetMyDailyReportsQuery(
    getLast30DaysRange(),
    { skip: isAdmin },
  );
  const { data: allReports, isLoading: loadingAllReports } = useGetAllDailyReportsQuery(
    canViewAll && selectedDay !== ''
      ? {
          startDate: filterDateRange.startDate,
          endDate: filterDateRange.endDate,
          ...(filterUserId && { userId: filterUserId }),
          ...(isAdmin && filterDepartmentId && { departmentId: filterDepartmentId }),
        }
      : undefined,
    { skip: !canViewAll || selectedDay === '' },
  );

  // Fetch full month reports (lightweight) for calendar dots
  const { data: monthReports } = useGetAllDailyReportsQuery(
    canViewAll
      ? {
          startDate: filterDateRange.startDate.replace(/-\d{2}$/, '-01'),
          endDate: (() => {
            const { year, month } = selectedMonth;
            const lastDay = new Date(year, month + 1, 0).getDate();
            return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
          })(),
        }
      : undefined,
    { skip: !canViewAll },
  );
  const { data: allUsers } = useGetUsersQuery(undefined, { skip: !canViewAll });
  const { data: departments } = useGetDepartmentsQuery(undefined, { skip: !isAdmin });

  const [createReport, { isLoading: creating }] = useCreateDailyReportMutation();
  const [updateReport, { isLoading: updating }] = useUpdateDailyReportMutation();
  const [addComment, { isLoading: commenting }] = useAddAdminCommentMutation();

  // Initialize report content from today's report
  useEffect(() => {
    if (todayReport && todayReport.status === 'DRAFT') {
      setReportContent(todayReport.content || '');
    }
  }, [todayReport]);

  const todayIsSubmitted = todayReport?.status === 'SUBMITTED';

  // Sort users for filter
  const sortedUsers = useMemo(() => {
    if (!allUsers) return [];
    return [...allUsers]
      .filter((u) => u.isActive)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [allUsers]);


  // Handlers
  const handleSaveDraft = async () => {
    if (!reportContent.trim()) {
      setErrorMessage('Scrie continutul raportului inainte de a salva.');
      return;
    }
    try {
      setErrorMessage('');
      if (todayReport && todayReport.status === 'DRAFT') {
        await updateReport({
          id: todayReport.id,
          data: { content: reportContent, status: 'DRAFT' },
        }).unwrap();
      } else {
        await createReport({
          date: getTodayDateString(),
          content: reportContent,
          status: 'DRAFT',
        }).unwrap();
      }
      setSuccessMessage('Ciorna salvata cu succes!');
      setTimeout(() => setSuccessMessage(''), 3000);
      refetchToday();
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Eroare la salvarea ciornei.');
    }
  };

  const handleSubmitReport = async () => {
    if (!reportContent.trim()) {
      setErrorMessage('Scrie continutul raportului inainte de a-l trimite.');
      return;
    }
    try {
      setErrorMessage('');
      if (todayReport && todayReport.status === 'DRAFT') {
        await updateReport({
          id: todayReport.id,
          data: { content: reportContent, status: 'SUBMITTED' },
        }).unwrap();
      } else {
        await createReport({
          date: getTodayDateString(),
          content: reportContent,
          status: 'SUBMITTED',
        }).unwrap();
      }
      setSuccessMessage('Raportul a fost trimis cu succes!');
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(''), 3000);
      refetchToday();
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Eroare la trimiterea raportului.');
    }
  };

  const handleAddComment = async (reportId: string) => {
    if (!commentText.trim()) return;
    try {
      await addComment({ id: reportId, data: { comment: commentText } }).unwrap();
      setCommentingReportId(null);
      setCommentText('');
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Eroare la adaugarea comentariului.');
    }
  };

  // ============== RENDER: Raportul Meu ==============

  const renderMyReport = () => (
    <Fade in>
      <Box>
        {/* Today's report card */}
        <Card
          sx={{
            mb: 3,
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            overflow: 'visible',
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              p: { xs: 2, sm: 3 },
              borderRadius: '12px 12px 0 0',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <CalendarIcon sx={{ color: 'white', fontSize: { xs: 20, sm: 24 } }} />
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  fontSize: { xs: '0.85rem', sm: '1rem', md: '1.25rem' },
                  wordBreak: 'break-word',
                }}
              >
                Raport Zilnic — {formatDate(getTodayDateString())}
              </Typography>
            </Box>
          </Box>

          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            {successMessage && (
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMessage('')}>
                {successMessage}
              </Alert>
            )}
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setErrorMessage('')}>
                {errorMessage}
              </Alert>
            )}

            {loadingToday ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : todayIsSubmitted && !isEditing ? (
              /* Report already submitted — show content */
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: { xs: 20, sm: 24 } }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'success.main', fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                    Raportul a fost trimis
                  </Typography>
                  <Chip label="Trimis" color="success" size="small" sx={{ ml: 'auto' }} />
                </Box>

                <Paper
                  sx={{
                    p: 2.5,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    whiteSpace: 'pre-line',
                    mb: 2,
                  }}
                >
                  <Typography variant="body1">{todayReport?.content}</Typography>
                </Paper>

                {todayReport?.adminComment && (
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: '#fef3c7',
                      borderLeft: '4px solid #f59e0b',
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#92400e' }}>
                      Comentariu Admin
                      {todayReport?.adminCommentedBy ? ` (${todayReport.adminCommentedBy.fullName})` : ''}:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#78350f', mt: 0.5 }}>
                      {todayReport.adminComment}
                    </Typography>
                  </Paper>
                )}
              </Box>
            ) : (
              /* Report form */
              <Box>
                <TextField
                  fullWidth
                  multiline
                  minRows={6}
                  maxRows={15}
                  placeholder="Descrie activitatile realizate astazi..."
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />

                <Box
                  sx={{
                    display: 'flex',
                    gap: { xs: 1, sm: 2 },
                    justifyContent: 'flex-end',
                    flexWrap: 'wrap',
                  }}
                >
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveDraft}
                    disabled={creating || updating}
                    size={isMobile ? 'small' : 'medium'}
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    Salveaza Ciorna
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    onClick={handleSubmitReport}
                    disabled={creating || updating || !reportContent.trim()}
                    size={isMobile ? 'small' : 'medium'}
                    sx={{
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                      },
                    }}
                  >
                    {creating || updating ? <CircularProgress size={20} /> : 'Trimite Raport'}
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Previous reports */}
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Rapoartele Anterioare
        </Typography>

        {loadingMyReports ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !myReports || myReports.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <ReportIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography color="text.secondary">Nu exista rapoarte anterioare.</Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {myReports
              .filter((r) => r.date !== getTodayDateString())
              .map((report) => (
                <Card
                  key={report.id}
                  sx={{
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>
                        {formatDate(report.date)}
                      </Typography>
                      <Chip
                        label={getStatusLabel(report.status)}
                        color={getStatusColor(report.status)}
                        size="small"
                      />
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-line',
                        color: 'text.secondary',
                        maxHeight: 100,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {report.content}
                    </Typography>

                    {report.adminComment && (
                      <Paper
                        sx={{
                          mt: 1.5,
                          p: 1.5,
                          bgcolor: '#fef3c7',
                          borderLeft: '3px solid #f59e0b',
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#92400e' }}>
                          Comentariu Admin
                          {report.adminCommentedBy ? ` (${report.adminCommentedBy.fullName})` : ''}:
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#78350f', mt: 0.3 }}>
                          {report.adminComment}
                        </Typography>
                      </Paper>
                    )}
                  </CardContent>
                </Card>
              ))}
          </Box>
        )}
      </Box>
    </Fade>
  );

  // ============== RENDER: Toate Rapoartele ==============

  // Day names for calendar header
  const dayNames = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa', 'Du'];

  // Build calendar grid for selected month
  const calendarGrid = useMemo(() => {
    const { year, month } = selectedMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

    // Count reports per day from monthReports (full month data for dots)
    const reportCountByDay = new Map<number, number>();
    if (monthReports) {
      for (const report of monthReports) {
        const day = parseInt(report.date.split('-')[2], 10);
        reportCountByDay.set(day, (reportCountByDay.get(day) || 0) + 1);
      }
    }

    const cells: { day: number | null; isToday: boolean; isFuture: boolean; reportCount: number }[] = [];
    // Empty cells before first day
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null, isToday: false, isFuture: false, reportCount: 0 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isFuture = isCurrentMonth && d > today.getDate();
      const isToday = isCurrentMonth && d === today.getDate();
      cells.push({ day: d, isToday, isFuture, reportCount: reportCountByDay.get(d) || 0 });
    }
    return cells;
  }, [selectedMonth, monthReports]);

  const renderAllReports = () => (
    <Fade in>
      <Box>
        {/* Month selector + filters row */}
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Month navigation */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Button
                size="small"
                onClick={() => {
                  const prev = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
                  setSelectedMonth({ year: prev.getFullYear(), month: prev.getMonth() });
                  setSelectedDay('');
                }}
                disabled={(() => {
                  const lastOpt = monthOptions[monthOptions.length - 1];
                  return selectedMonth.year === lastOpt.year && selectedMonth.month === lastOpt.month;
                })()}
                sx={{ minWidth: 36, color: 'text.secondary' }}
              >
                <ChevronLeftIcon />
              </Button>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <Select
                  value={`${selectedMonth.year}-${selectedMonth.month}`}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '0.95rem', sm: '1.1rem' },
                    textAlign: 'center',
                    '& .MuiSelect-select': { textAlign: 'center' },
                  }}
                >
                  {monthOptions.map((opt) => (
                    <MenuItem key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                size="small"
                onClick={() => {
                  const now = new Date();
                  const next = new Date(selectedMonth.year, selectedMonth.month + 1, 1);
                  // Don't go past current month
                  if (next.getFullYear() < now.getFullYear() || (next.getFullYear() === now.getFullYear() && next.getMonth() <= now.getMonth())) {
                    setSelectedMonth({ year: next.getFullYear(), month: next.getMonth() });
                    setSelectedDay('');
                  }
                }}
                disabled={
                  selectedMonth.year === new Date().getFullYear() && selectedMonth.month === new Date().getMonth()
                }
                sx={{ minWidth: 36, color: 'text.secondary' }}
              >
                <ChevronRightIcon />
              </Button>
            </Box>

            {/* Calendar grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.5,
                mb: 2,
              }}
            >
              {/* Day name headers */}
              {dayNames.map((name) => (
                <Box
                  key={name}
                  sx={{
                    textAlign: 'center',
                    py: 0.5,
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    fontWeight: 700,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                  }}
                >
                  {name}
                </Box>
              ))}

              {/* Day cells */}
              {calendarGrid.map((cell, idx) => (
                <Box
                  key={idx}
                  onClick={() => {
                    if (cell.day && !cell.isFuture) {
                      setSelectedDay(selectedDay !== '' && cell.day === selectedDay ? '' : cell.day);
                    }
                  }}
                  sx={{
                    position: 'relative',
                    textAlign: 'center',
                    py: { xs: 0.8, sm: 1 },
                    borderRadius: 2,
                    cursor: cell.day && !cell.isFuture ? 'pointer' : 'default',
                    userSelect: 'none',
                    transition: 'all 0.15s',
                    bgcolor:
                      selectedDay !== '' && cell.day === selectedDay
                        ? 'primary.main'
                        : cell.isToday
                          ? 'primary.50'
                          : 'transparent',
                    color:
                      selectedDay !== '' && cell.day === selectedDay
                        ? 'white'
                        : cell.isFuture
                          ? 'text.disabled'
                          : cell.day
                            ? 'text.primary'
                            : 'transparent',
                    border: cell.isToday ? '2px solid' : '2px solid transparent',
                    borderColor: cell.isToday ? 'primary.main' : 'transparent',
                    fontWeight: cell.isToday || (selectedDay !== '' && cell.day === selectedDay) ? 700 : 400,
                    fontSize: { xs: '0.8rem', sm: '0.9rem' },
                    '&:hover': cell.day && !cell.isFuture
                      ? {
                          bgcolor:
                            selectedDay !== '' && cell.day === selectedDay
                              ? 'primary.dark'
                              : 'action.hover',
                        }
                      : {},
                  }}
                >
                  {cell.day || ''}
                  {/* Report count indicator */}
                  {cell.day && cell.reportCount > 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 2,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor:
                          selectedDay !== '' && cell.day === selectedDay
                            ? 'rgba(255,255,255,0.8)'
                            : 'primary.main',
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>

            {/* Department + User filters */}
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 1.5, sm: 2 },
                flexWrap: 'wrap',
              }}
            >
              {isAdmin && departments && (
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Departament</InputLabel>
                  <Select
                    value={filterDepartmentId}
                    label="Departament"
                    onChange={(e) => setFilterDepartmentId(e.target.value)}
                  >
                    <MenuItem value="">Toate</MenuItem>
                    {departments.map((dept: any) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {canViewAll && sortedUsers.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Utilizator</InputLabel>
                  <Select value={filterUserId} label="Utilizator" onChange={(e) => setFilterUserId(e.target.value)}>
                    <MenuItem value="">Toti</MenuItem>
                    {sortedUsers.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.fullName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Selected day header */}
        {selectedDay !== '' && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 2,
              pb: 1,
              borderBottom: '2px solid',
              borderColor: 'primary.main',
              flexWrap: 'wrap',
            }}
          >
            <CalendarIcon sx={{ color: 'primary.main', fontSize: { xs: 18, sm: 20 } }} />
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                fontSize: { xs: '0.85rem', sm: '1rem' },
                flex: 1,
                minWidth: 0,
              }}
            >
              {formatDate(filterDateRange.startDate)}
            </Typography>
            {allReports && (
              <Chip
                label={`${allReports.length} raport${allReports.length !== 1 ? 'e' : ''}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        )}

        {/* Prompt to select a day when none selected */}
        {selectedDay === '' ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <CalendarIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
              Selecteaza o zi din calendar pentru a vedea rapoartele.
            </Typography>
          </Paper>
        ) : loadingAllReports ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !allReports || allReports.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <ReportIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography color="text.secondary">Nu exista rapoarte pentru aceasta zi.</Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {allReports.map((report) => (
              <Card
                key={report.id}
                sx={{
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
                  transition: 'box-shadow 0.2s',
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                  {/* User info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, mb: 1.5 }}>
                    <Avatar
                      sx={{
                        width: { xs: 32, sm: 36 },
                        height: { xs: 32, sm: 36 },
                        bgcolor: 'primary.main',
                        fontSize: { xs: 12, sm: 14 },
                      }}
                    >
                      {report.user?.fullName
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase() || '?'}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {report.user?.fullName || 'Necunoscut'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {report.user?.department?.name || ''}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Content */}
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-line',
                      color: 'text.primary',
                      mb: 1.5,
                    }}
                  >
                    {report.content}
                  </Typography>

                  {/* Existing admin comment */}
                  {report.adminComment && (
                    <Paper
                      sx={{
                        p: 1.5,
                        mb: 1.5,
                        bgcolor: '#fef3c7',
                        borderLeft: '3px solid #f59e0b',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#92400e' }}>
                        Comentariu Admin
                        {report.adminCommentedBy ? ` (${report.adminCommentedBy.fullName})` : ''}:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#78350f', mt: 0.3 }}>
                        {report.adminComment}
                      </Typography>
                    </Paper>
                  )}

                  {/* Admin comment input */}
                  {isAdmin && (
                    <Box>
                      {commentingReportId === report.id ? (
                        <Box sx={{ mt: 1 }}>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Scrie un comentariu..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            multiline
                            maxRows={3}
                            sx={{
                              mb: 1,
                              '& .MuiOutlinedInput-root': { borderRadius: 2 },
                            }}
                          />
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => {
                                setCommentingReportId(null);
                                setCommentText('');
                              }}
                              sx={{ minWidth: 'auto', px: 2, fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
                            >
                              Anuleaza
                            </Button>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => handleAddComment(report.id)}
                              disabled={commenting || !commentText.trim()}
                              sx={{
                                minWidth: 'auto',
                                px: 2,
                                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                              }}
                            >
                              {commenting ? <CircularProgress size={16} /> : <SendIcon fontSize="small" />}
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Button
                          size="small"
                          startIcon={<CommentIcon />}
                          onClick={() => {
                            setCommentingReportId(report.id);
                            setCommentText(report.adminComment || '');
                          }}
                          sx={{ mt: 0.5, color: 'text.secondary' }}
                        >
                          {report.adminComment ? 'Modifica Comentariu' : 'Adauga Comentariu'}
                        </Button>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    </Fade>
  );

  // ============== MAIN RENDER ==============

  // Admin: vede direct "Toate Rapoartele" fara tab-uri
  if (isAdmin) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: { xs: 2, sm: 3 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ReportIcon sx={{ fontSize: { xs: 26, sm: 32 }, color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.15rem', sm: '1.4rem' } }}>
            Rapoarte Zilnice
          </Typography>
        </Box>
        {renderAllReports()}
      </Box>
    );
  }

  // USER / MANAGER: taburi normali
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: { xs: 2, sm: 3 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <ReportIcon sx={{ fontSize: { xs: 26, sm: 32 }, color: 'primary.main' }} />
        <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.15rem', sm: '1.4rem' } }}>
          Raport Zilnic
        </Typography>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        variant={isMobile ? 'fullWidth' : 'standard'}
        sx={{
          mb: { xs: 2, sm: 3 },
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: { xs: '0.85rem', sm: '0.95rem' },
          },
        }}
      >
        <Tab label="Raportul Meu" />
        {canViewAll && <Tab label="Toate Rapoartele" />}
      </Tabs>

      {activeTab === 0 && renderMyReport()}
      {activeTab === 1 && canViewAll && renderAllReports()}
    </Box>
  );
};

export default DailyReportsPage;
