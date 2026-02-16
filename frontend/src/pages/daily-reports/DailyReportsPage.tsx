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
  FilterList as FilterIcon,
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
import type { DailyReport } from '../../types/daily-report.types';

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

// Get current week range (Monday to Sunday)
const getCurrentWeekRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0],
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
  const [filterDateRange, setFilterDateRange] = useState(getCurrentWeekRange());
  const [filterUserId, setFilterUserId] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('');

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
    canViewAll
      ? {
          startDate: filterDateRange.startDate,
          endDate: filterDateRange.endDate,
          ...(filterUserId && { userId: filterUserId }),
          ...(isAdmin && filterDepartmentId && { departmentId: filterDepartmentId }),
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

  // Group all reports by date
  const groupedReports = useMemo(() => {
    if (!allReports) return [];
    const groups: { date: string; reports: DailyReport[] }[] = [];
    const dateMap = new Map<string, DailyReport[]>();

    for (const report of allReports) {
      const date = report.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, []);
      }
      dateMap.get(date)!.push(report);
    }

    for (const [date, reports] of dateMap) {
      groups.push({ date, reports });
    }

    return groups.sort((a, b) => b.date.localeCompare(a.date));
  }, [allReports]);

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
              p: 3,
              borderRadius: '12px 12px 0 0',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CalendarIcon sx={{ color: 'white' }} />
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                Raport Zilnic — {formatDate(getTodayDateString())}
              </Typography>
            </Box>
          </Box>

          <CardContent sx={{ p: 3 }}>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CheckCircleIcon sx={{ color: 'success.main' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'success.main' }}>
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

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveDraft}
                    disabled={creating || updating}
                  >
                    Salveaza Ciorna
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    onClick={handleSubmitReport}
                    disabled={creating || updating || !reportContent.trim()}
                    sx={{
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
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
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

  const renderAllReports = () => (
    <Fade in>
      <Box>
        {/* Filters */}
        <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FilterIcon sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Filtre
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                gap: 2,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <TextField
                label="Data inceput"
                type="date"
                size="small"
                value={filterDateRange.startDate}
                onChange={(e) => setFilterDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 160 }}
              />
              <TextField
                label="Data sfarsit"
                type="date"
                size="small"
                value={filterDateRange.endDate}
                onChange={(e) => setFilterDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 160 }}
              />

              {isAdmin && departments && (
                <FormControl size="small" sx={{ minWidth: 180 }}>
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
                <FormControl size="small" sx={{ minWidth: 180 }}>
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

        {/* Reports list */}
        {loadingAllReports ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !allReports || allReports.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <ReportIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography color="text.secondary">Nu exista rapoarte pentru perioada selectata.</Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {groupedReports.map((group) => (
              <Box key={group.date}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1.5,
                    pb: 1,
                    borderBottom: '2px solid',
                    borderColor: 'primary.main',
                  }}
                >
                  <CalendarIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {formatDate(group.date)}
                  </Typography>
                  <Chip
                    label={`${group.reports.length} raport${group.reports.length > 1 ? 'e' : ''}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ ml: 'auto' }}
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {group.reports.map((report) => (
                    <Card
                      key={report.id}
                      sx={{
                        borderRadius: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
                        transition: 'box-shadow 0.2s',
                      }}
                    >
                      <CardContent sx={{ p: 2.5 }}>
                        {/* User info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: 'primary.main',
                              fontSize: 14,
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
                              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  placeholder="Scrie un comentariu..."
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  multiline
                                  maxRows={3}
                                  sx={{
                                    '& .MuiOutlinedInput-root': { borderRadius: 2 },
                                  }}
                                />
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() => handleAddComment(report.id)}
                                  disabled={commenting || !commentText.trim()}
                                  sx={{
                                    minWidth: 'auto',
                                    px: 2,
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                  }}
                                >
                                  {commenting ? <CircularProgress size={16} /> : <SendIcon fontSize="small" />}
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => {
                                    setCommentingReportId(null);
                                    setCommentText('');
                                  }}
                                  sx={{ minWidth: 'auto', px: 2 }}
                                >
                                  Anuleaza
                                </Button>
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
              </Box>
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
      <Box sx={{ maxWidth: 900, mx: 'auto', px: isMobile ? 2 : 3, py: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ReportIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Rapoarte Zilnice
          </Typography>
        </Box>
        {renderAllReports()}
      </Box>
    );
  }

  // USER / MANAGER: taburi normali
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: isMobile ? 2 : 3, py: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <ReportIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Raport Zilnic
        </Typography>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{
          mb: 3,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
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
