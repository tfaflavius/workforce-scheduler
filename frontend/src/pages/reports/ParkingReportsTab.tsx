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
  Fade,
  Grow,
  SwipeableDrawer,
  Fab,
  Zoom,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Warning as IssueIcon,
  ReportProblem as DamageIcon,
  Payments as PaymentIcon,
  FilterList as FilterIcon,
  CheckCircle as ResolvedIcon,
  Error as ActiveIcon,
  TrendingUp as TrendingIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import DatePickerField from '../../components/common/DatePickerField';
import {
  useGetParkingIssuesQuery,
  useGetParkingDamagesQuery,
  useGetCashCollectionsQuery,
  useGetCashCollectionTotalsQuery,
  useGetParkingLotsQuery,
} from '../../store/api/parking.api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ParkingReportsTabProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

type ReportType = 'issues' | 'damages' | 'collections';

const ParkingReportsTab: React.FC<ParkingReportsTabProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedReport, setSelectedReport] = useState<ReportType>('issues');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportDrawerOpen, setExportDrawerOpen] = useState(false);

  // Status filters
  const [issueStatus, setIssueStatus] = useState<string>('ALL');
  const [damageStatus, setDamageStatus] = useState<string>('ALL');
  const [selectedParkingLot, setSelectedParkingLot] = useState<string>('ALL');

  // Fetch data
  const { data: parkingLots = [] } = useGetParkingLotsQuery();
  const { data: allIssues = [], isLoading: issuesLoading, refetch: refetchIssues } = useGetParkingIssuesQuery(
    issueStatus !== 'ALL' ? (issueStatus as 'ACTIVE' | 'FINALIZAT') : undefined
  );
  const { data: allDamages = [], isLoading: damagesLoading, refetch: refetchDamages } = useGetParkingDamagesQuery(
    damageStatus !== 'ALL' ? (damageStatus as 'ACTIVE' | 'FINALIZAT') : undefined
  );
  const { data: allCollections = [], isLoading: collectionsLoading, refetch: refetchCollections } = useGetCashCollectionsQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    parkingLotIds: selectedParkingLot !== 'ALL' ? [selectedParkingLot] : undefined,
  });
  const { data: collectionTotals } = useGetCashCollectionTotalsQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    parkingLotIds: selectedParkingLot !== 'ALL' ? [selectedParkingLot] : undefined,
  });

  const isLoading = issuesLoading || damagesLoading || collectionsLoading;

  // Filter data by date range and parking lot
  const filteredIssues = useMemo(() => {
    return allIssues.filter(issue => {
      const issueDate = new Date(issue.createdAt);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && issueDate < start) return false;
      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (issueDate > endOfDay) return false;
      }
      if (selectedParkingLot !== 'ALL' && issue.parkingLotId !== selectedParkingLot) return false;

      return true;
    });
  }, [allIssues, startDate, endDate, selectedParkingLot]);

  const filteredDamages = useMemo(() => {
    return allDamages.filter(damage => {
      const damageDate = new Date(damage.createdAt);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && damageDate < start) return false;
      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (damageDate > endOfDay) return false;
      }
      if (selectedParkingLot !== 'ALL' && damage.parkingLotId !== selectedParkingLot) return false;

      return true;
    });
  }, [allDamages, startDate, endDate, selectedParkingLot]);

  // Statistics
  const issueStats = useMemo(() => {
    const active = filteredIssues.filter(i => i.status === 'ACTIVE').length;
    const resolved = filteredIssues.filter(i => i.status === 'FINALIZAT').length;
    const urgent = filteredIssues.filter(i => i.isUrgent).length;
    return { total: filteredIssues.length, active, resolved, urgent };
  }, [filteredIssues]);

  const damageStats = useMemo(() => {
    const active = filteredDamages.filter(d => d.status === 'ACTIVE').length;
    const resolved = filteredDamages.filter(d => d.status === 'FINALIZAT').length;
    const recuperat = filteredDamages.filter(d => d.resolutionType === 'RECUPERAT').length;
    const juridic = filteredDamages.filter(d => d.resolutionType === 'TRIMIS_JURIDIC').length;
    return { total: filteredDamages.length, active, resolved, recuperat, juridic };
  }, [filteredDamages]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedParkingLot !== 'ALL') count++;
    if (startDate) count++;
    if (endDate) count++;
    if (selectedReport === 'issues' && issueStatus !== 'ALL') count++;
    if (selectedReport === 'damages' && damageStatus !== 'ALL') count++;
    return count;
  }, [selectedParkingLot, startDate, endDate, selectedReport, issueStatus, damageStatus]);

  // Format helpers
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
    }).format(amount);
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: 'short',
    });
  };

  // Refresh data
  const handleRefresh = () => {
    refetchIssues();
    refetchDamages();
    refetchCollections();
  };

  // Clear filters
  const clearFilters = () => {
    setSelectedParkingLot('ALL');
    setIssueStatus('ALL');
    setDamageStatus('ALL');
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    onStartDateChange(date.toISOString().split('T')[0]);
    onEndDateChange(new Date().toISOString().split('T')[0]);
  };

  // Export functions
  const handleExportIssuesPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setTextColor(239, 68, 68);
    doc.text('Raport Probleme Parcări', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Perioada: ${formatDate(startDate)} - ${formatDate(endDate)}`, pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Total: ${issueStats.total} | Active: ${issueStats.active} | Finalizate: ${issueStats.resolved} | Urgente: ${issueStats.urgent}`, pageWidth / 2, 36, { align: 'center' });

    const tableData = filteredIssues.map(issue => [
      issue.parkingLot?.name || '-',
      issue.equipment || '-',
      issue.description?.substring(0, 50) + (issue.description?.length > 50 ? '...' : '') || '-',
      issue.contactedCompany || '-',
      issue.status === 'ACTIVE' ? 'Activ' : 'Finalizat',
      issue.isUrgent ? 'Da' : 'Nu',
      issue.creator?.fullName || '-',
      formatDate(issue.createdAt),
      issue.resolvedAt ? formatDate(issue.resolvedAt) : '-',
    ]);

    autoTable(doc, {
      head: [['Parcare', 'Echipament', 'Descriere', 'Companie', 'Status', 'Urgent', 'Creat de', 'Data Creare', 'Data Rezolvare']],
      body: tableData,
      startY: 42,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [239, 68, 68], textColor: 255 },
      alternateRowStyles: { fillColor: [254, 242, 242] },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Generat la ${new Date().toLocaleString('ro-RO')} | Pagina ${i} din ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`raport-probleme-parcari_${startDate}_${endDate}.pdf`);
    setExportDrawerOpen(false);
  };

  const handleExportIssuesExcel = () => {
    const data = filteredIssues.map(issue => ({
      'Parcare': issue.parkingLot?.name || '-',
      'Echipament': issue.equipment || '-',
      'Descriere': issue.description || '-',
      'Companie Contactată': issue.contactedCompany || '-',
      'Status': issue.status === 'ACTIVE' ? 'Activ' : 'Finalizat',
      'Urgent': issue.isUrgent ? 'Da' : 'Nu',
      'Creat de': issue.creator?.fullName || '-',
      'Atribuit la': issue.assignee?.fullName || '-',
      'Data Creare': formatDateTime(issue.createdAt),
      'Data Rezolvare': issue.resolvedAt ? formatDateTime(issue.resolvedAt) : '-',
      'Rezolvat de': issue.resolver?.fullName || '-',
      'Descriere Rezolvare': issue.resolutionDescription || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    ws['!cols'] = [
      { wch: 20 }, { wch: 25 }, { wch: 40 }, { wch: 20 },
      { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 20 },
      { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Probleme Parcări');
    XLSX.writeFile(wb, `raport-probleme-parcari_${startDate}_${endDate}.xlsx`);
    setExportDrawerOpen(false);
  };

  const handleExportDamagesPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setTextColor(249, 115, 22);
    doc.text('Raport Prejudicii Parcări', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Perioada: ${formatDate(startDate)} - ${formatDate(endDate)}`, pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Total: ${damageStats.total} | Active: ${damageStats.active} | Finalizate: ${damageStats.resolved} | Recuperate: ${damageStats.recuperat} | Juridic: ${damageStats.juridic}`, pageWidth / 2, 36, { align: 'center' });

    const tableData = filteredDamages.map(damage => [
      damage.parkingLot?.name || '-',
      damage.damagedEquipment || '-',
      damage.personName || '-',
      damage.carPlate || '-',
      damage.phone || '-',
      damage.status === 'ACTIVE' ? 'Activ' : 'Finalizat',
      damage.resolutionType === 'RECUPERAT' ? 'Recuperat' : damage.resolutionType === 'TRIMIS_JURIDIC' ? 'Juridic' : '-',
      formatDate(damage.createdAt),
    ]);

    autoTable(doc, {
      head: [['Parcare', 'Echipament Avariat', 'Persoană', 'Nr. Înmatriculare', 'Telefon', 'Status', 'Tip Rezoluție', 'Data']],
      body: tableData,
      startY: 42,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [249, 115, 22], textColor: 255 },
      alternateRowStyles: { fillColor: [255, 247, 237] },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Generat la ${new Date().toLocaleString('ro-RO')} | Pagina ${i} din ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`raport-prejudicii-parcari_${startDate}_${endDate}.pdf`);
    setExportDrawerOpen(false);
  };

  const handleExportDamagesExcel = () => {
    const data = filteredDamages.map(damage => ({
      'Parcare': damage.parkingLot?.name || '-',
      'Echipament Avariat': damage.damagedEquipment || '-',
      'Descriere': damage.description || '-',
      'Nume Persoană': damage.personName || '-',
      'Nr. Înmatriculare': damage.carPlate || '-',
      'Telefon': damage.phone || '-',
      'Status': damage.status === 'ACTIVE' ? 'Activ' : 'Finalizat',
      'Urgent': damage.isUrgent ? 'Da' : 'Nu',
      'Tip Rezoluție': damage.resolutionType === 'RECUPERAT' ? 'Recuperat' : damage.resolutionType === 'TRIMIS_JURIDIC' ? 'Trimis la Juridic' : '-',
      'Descriere Rezoluție': damage.resolutionDescription || '-',
      'Creat de': damage.creator?.fullName || '-',
      'Data Creare': formatDateTime(damage.createdAt),
      'Rezolvat de': damage.resolver?.fullName || '-',
      'Data Rezolvare': damage.resolvedAt ? formatDateTime(damage.resolvedAt) : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    ws['!cols'] = [
      { wch: 20 }, { wch: 25 }, { wch: 40 }, { wch: 20 },
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 8 },
      { wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 18 },
      { wch: 20 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Prejudicii Parcări');
    XLSX.writeFile(wb, `raport-prejudicii-parcari_${startDate}_${endDate}.xlsx`);
    setExportDrawerOpen(false);
  };

  const handleExportCollectionsPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129);
    doc.text('Raport Ridicări Numerar Automate', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Perioada: ${formatDate(startDate)} - ${formatDate(endDate)}`, pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129);
    doc.text(`TOTAL: ${formatCurrency(collectionTotals?.totalAmount || 0)} (${collectionTotals?.count || 0} ridicări)`, pageWidth / 2, 36, { align: 'center' });

    const tableData = allCollections.map(collection => [
      collection.parkingLot?.name || '-',
      collection.paymentMachine?.machineNumber || '-',
      formatCurrency(collection.amount),
      collection.collector?.fullName || '-',
      formatDateTime(collection.collectedAt),
      collection.notes || '-',
    ]);

    autoTable(doc, {
      head: [['Parcare', 'Automat', 'Sumă', 'Ridicat de', 'Data', 'Note']],
      body: tableData,
      startY: 44,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      alternateRowStyles: { fillColor: [236, 253, 245] },
      columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
    });

    if (collectionTotals?.byParkingLot && collectionTotals.byParkingLot.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('Totaluri per Parcare:', 14, finalY + 10);
      collectionTotals.byParkingLot.forEach((item, index) => {
        doc.setFontSize(10);
        doc.text(`${item.parkingLotName}: ${formatCurrency(item.totalAmount)} (${item.count} ridicări)`, 20, finalY + 18 + (index * 6));
      });
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Generat la ${new Date().toLocaleString('ro-RO')} | Pagina ${i} din ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`raport-ridicari-numerar_${startDate}_${endDate}.pdf`);
    setExportDrawerOpen(false);
  };

  const handleExportCollectionsExcel = () => {
    const data = allCollections.map(collection => ({
      'Parcare': collection.parkingLot?.name || '-',
      'Automat': collection.paymentMachine?.machineNumber || '-',
      'Sumă (RON)': collection.amount,
      'Ridicat de': collection.collector?.fullName || '-',
      'Data și Ora': formatDateTime(collection.collectedAt),
      'Note': collection.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.sheet_add_aoa(ws, [
      ['Raport Ridicări Numerar'],
      [`Perioada: ${formatDate(startDate)} - ${formatDate(endDate)}`],
      [`Total: ${formatCurrency(collectionTotals?.totalAmount || 0)} (${collectionTotals?.count || 0} ridicări)`],
      [],
    ], { origin: 'A1' });

    XLSX.utils.sheet_add_json(ws, data, { origin: 'A5' });
    ws['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 40 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Ridicări Numerar');
    XLSX.writeFile(wb, `raport-ridicari-numerar_${startDate}_${endDate}.xlsx`);
    setExportDrawerOpen(false);
  };

  // Report type cards
  const reportTypes = [
    {
      id: 'issues' as ReportType,
      title: 'Probleme',
      subtitle: `${issueStats.total} înregistrări`,
      icon: <IssueIcon />,
      color: '#ef4444',
      bgColor: alpha('#ef4444', 0.1),
      stats: [
        { label: 'Active', value: issueStats.active, color: '#f59e0b' },
        { label: 'Finalizate', value: issueStats.resolved, color: '#10b981' },
      ],
    },
    {
      id: 'damages' as ReportType,
      title: 'Prejudicii',
      subtitle: `${damageStats.total} înregistrări`,
      icon: <DamageIcon />,
      color: '#f97316',
      bgColor: alpha('#f97316', 0.1),
      stats: [
        { label: 'Active', value: damageStats.active, color: '#ef4444' },
        { label: 'Recuperate', value: damageStats.recuperat, color: '#22c55e' },
      ],
    },
    {
      id: 'collections' as ReportType,
      title: 'Numerar',
      subtitle: formatCurrency(collectionTotals?.totalAmount || 0),
      icon: <PaymentIcon />,
      color: '#10b981',
      bgColor: alpha('#10b981', 0.1),
      stats: [
        { label: 'Ridicări', value: collectionTotals?.count || 0, color: '#10b981' },
      ],
    },
  ];

  // Render mobile card for each item
  const renderIssueCard = (issue: typeof filteredIssues[0], index: number) => (
    <Grow in timeout={200 + index * 50} key={issue.id}>
      <Card
        sx={{
          mb: 1.5,
          borderRadius: 2,
          borderLeft: 4,
          borderLeftColor: issue.status === 'ACTIVE' ? '#ef4444' : '#10b981',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:active': { transform: 'scale(0.98)' },
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ flex: 1 }}>
                {issue.parkingLot?.name}
              </Typography>
              <Chip
                size="small"
                label={issue.status === 'ACTIVE' ? 'Activ' : 'Finalizat'}
                sx={{
                  bgcolor: issue.status === 'ACTIVE' ? alpha('#ef4444', 0.1) : alpha('#10b981', 0.1),
                  color: issue.status === 'ACTIVE' ? '#ef4444' : '#10b981',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              {issue.equipment}
            </Typography>
            <Typography variant="body2" sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              fontSize: '0.8rem',
            }}>
              {issue.description}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {formatShortDate(issue.createdAt)}
              </Typography>
              {issue.isUrgent && (
                <Chip size="small" label="URGENT" color="error" sx={{ height: 20, fontSize: '0.65rem' }} />
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grow>
  );

  const renderDamageCard = (damage: typeof filteredDamages[0], index: number) => (
    <Grow in timeout={200 + index * 50} key={damage.id}>
      <Card
        sx={{
          mb: 1.5,
          borderRadius: 2,
          borderLeft: 4,
          borderLeftColor: damage.status === 'ACTIVE' ? '#f97316' : '#10b981',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:active': { transform: 'scale(0.98)' },
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ flex: 1 }}>
                {damage.parkingLot?.name}
              </Typography>
              <Chip
                size="small"
                label={damage.resolutionType === 'RECUPERAT' ? 'Recuperat' : damage.resolutionType === 'TRIMIS_JURIDIC' ? 'Juridic' : damage.status === 'ACTIVE' ? 'Activ' : 'Finalizat'}
                sx={{
                  bgcolor: damage.status === 'ACTIVE' ? alpha('#f97316', 0.1) : alpha('#10b981', 0.1),
                  color: damage.status === 'ACTIVE' ? '#f97316' : '#10b981',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              {damage.damagedEquipment}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                <strong>Persoană:</strong> {damage.personName}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                <strong>Auto:</strong> {damage.carPlate}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {formatShortDate(damage.createdAt)}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Grow>
  );

  const renderCollectionCard = (collection: typeof allCollections[0], index: number) => (
    <Grow in timeout={200 + index * 50} key={collection.id}>
      <Card
        sx={{
          mb: 1.5,
          borderRadius: 2,
          borderLeft: 4,
          borderLeftColor: '#10b981',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:active': { transform: 'scale(0.98)' },
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {collection.parkingLot?.name}
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                {formatCurrency(collection.amount)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                Automat: {collection.paymentMachine?.machineNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                {collection.collector?.fullName}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(collection.collectedAt)}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Grow>
  );

  // Filter drawer content
  const renderFilters = () => (
    <Stack spacing={2.5} sx={{ p: isMobile ? 0 : 2 }}>
      <FormControl size="small" fullWidth>
        <InputLabel>Parcare</InputLabel>
        <Select
          value={selectedParkingLot}
          label="Parcare"
          onChange={(e) => setSelectedParkingLot(e.target.value)}
        >
          <MenuItem value="ALL">Toate Parcările</MenuItem>
          {parkingLots.map((lot) => (
            <MenuItem key={lot.id} value={lot.id}>{lot.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <DatePickerField
        label="De la"
        value={startDate || null}
        onChange={(value) => onStartDateChange(value || '')}
        size="small"
        fullWidth
      />

      <DatePickerField
        label="Până la"
        value={endDate || null}
        onChange={(value) => onEndDateChange(value || '')}
        size="small"
        minDate={startDate || undefined}
        fullWidth
      />

      {selectedReport === 'issues' && (
        <FormControl size="small" fullWidth>
          <InputLabel>Status Probleme</InputLabel>
          <Select
            value={issueStatus}
            label="Status Probleme"
            onChange={(e) => setIssueStatus(e.target.value)}
          >
            <MenuItem value="ALL">Toate</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="FINALIZAT">Finalizate</MenuItem>
          </Select>
        </FormControl>
      )}

      {selectedReport === 'damages' && (
        <FormControl size="small" fullWidth>
          <InputLabel>Status Prejudicii</InputLabel>
          <Select
            value={damageStatus}
            label="Status Prejudicii"
            onChange={(e) => setDamageStatus(e.target.value)}
          >
            <MenuItem value="ALL">Toate</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="FINALIZAT">Finalizate</MenuItem>
          </Select>
        </FormControl>
      )}

      <Button
        variant="outlined"
        size="small"
        onClick={clearFilters}
        startIcon={<CloseIcon />}
      >
        Resetează Filtre
      </Button>
    </Stack>
  );

  // Export drawer content
  const renderExportOptions = () => {
    const exportOptions = selectedReport === 'issues'
      ? [
          { label: 'Descarcă PDF', icon: <PdfIcon />, onClick: handleExportIssuesPDF, color: '#ef4444' },
          { label: 'Descarcă Excel', icon: <ExcelIcon />, onClick: handleExportIssuesExcel, color: '#10b981' },
        ]
      : selectedReport === 'damages'
      ? [
          { label: 'Descarcă PDF', icon: <PdfIcon />, onClick: handleExportDamagesPDF, color: '#f97316' },
          { label: 'Descarcă Excel', icon: <ExcelIcon />, onClick: handleExportDamagesExcel, color: '#10b981' },
        ]
      : [
          { label: 'Descarcă PDF', icon: <PdfIcon />, onClick: handleExportCollectionsPDF, color: '#ef4444' },
          { label: 'Descarcă Excel', icon: <ExcelIcon />, onClick: handleExportCollectionsExcel, color: '#10b981' },
        ];

    const count = selectedReport === 'issues'
      ? filteredIssues.length
      : selectedReport === 'damages'
      ? filteredDamages.length
      : allCollections.length;

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Exportă Raport
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {count} înregistrări vor fi exportate
        </Typography>
        <Stack spacing={2}>
          {exportOptions.map((option, index) => (
            <Button
              key={index}
              variant="contained"
              size="large"
              fullWidth
              startIcon={option.icon}
              onClick={option.onClick}
              disabled={count === 0}
              sx={{
                py: 1.5,
                bgcolor: option.color,
                '&:hover': { bgcolor: alpha(option.color, 0.85) },
              }}
            >
              {option.label}
            </Button>
          ))}
        </Stack>
      </Box>
    );
  };

  return (
    <Box sx={{ pb: isMobile ? 10 : 0 }}>
      {/* Header with period info */}
      <Fade in timeout={300}>
        <Paper
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon color="primary" fontSize="small" />
              <Typography variant="body2" fontWeight="medium">
                {formatDate(startDate)} - {formatDate(endDate)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Filtre">
                <IconButton
                  size="small"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  sx={{
                    bgcolor: filtersOpen ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                  }}
                >
                  <Badge badgeContent={activeFiltersCount} color="primary" max={9}>
                    <FilterIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="Reîmprospătează">
                <IconButton size="small" onClick={handleRefresh} disabled={isLoading}>
                  <RefreshIcon fontSize="small" sx={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Collapsible filters for desktop */}
          {!isMobile && (
            <Collapse in={filtersOpen}>
              <Divider sx={{ my: 2 }} />
              {renderFilters()}
            </Collapse>
          )}
        </Paper>
      </Fade>

      {/* Report Type Selection Cards */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {reportTypes.map((report, index) => (
          <Grid key={report.id} size={{ xs: 4 }}>
            <Grow in timeout={300 + index * 100}>
              <Card
                onClick={() => setSelectedReport(report.id)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 2,
                  border: 2,
                  borderColor: selectedReport === report.id ? report.color : 'transparent',
                  bgcolor: selectedReport === report.id ? report.bgColor : 'background.paper',
                  transition: 'all 0.2s ease',
                  '&:active': { transform: 'scale(0.95)' },
                }}
              >
                <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                  <Stack spacing={0.5} alignItems="center" textAlign="center">
                    <Box sx={{
                      color: report.color,
                      display: 'flex',
                      p: 0.5,
                      borderRadius: 1,
                      bgcolor: alpha(report.color, 0.1),
                    }}>
                      {React.cloneElement(report.icon, { sx: { fontSize: { xs: 20, sm: 24 } } })}
                    </Box>
                    <Typography
                      variant="subtitle2"
                      fontWeight="bold"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      {report.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                    >
                      {report.subtitle}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
        ))}
      </Grid>

      {/* Stats Row */}
      <Fade in timeout={500}>
        <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
            {selectedReport === 'issues' && (
              <>
                <Chip icon={<ActiveIcon sx={{ fontSize: 16 }} />} label={`${issueStats.active} active`} size="small" sx={{ bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b' }} />
                <Chip icon={<ResolvedIcon sx={{ fontSize: 16 }} />} label={`${issueStats.resolved} finalizate`} size="small" sx={{ bgcolor: alpha('#10b981', 0.1), color: '#10b981' }} />
                <Chip icon={<IssueIcon sx={{ fontSize: 16 }} />} label={`${issueStats.urgent} urgente`} size="small" sx={{ bgcolor: alpha('#ef4444', 0.1), color: '#ef4444' }} />
              </>
            )}
            {selectedReport === 'damages' && (
              <>
                <Chip icon={<ActiveIcon sx={{ fontSize: 16 }} />} label={`${damageStats.active} active`} size="small" sx={{ bgcolor: alpha('#ef4444', 0.1), color: '#ef4444' }} />
                <Chip icon={<TrendingIcon sx={{ fontSize: 16 }} />} label={`${damageStats.recuperat} recuperate`} size="small" sx={{ bgcolor: alpha('#22c55e', 0.1), color: '#22c55e' }} />
                <Chip icon={<DamageIcon sx={{ fontSize: 16 }} />} label={`${damageStats.juridic} juridic`} size="small" sx={{ bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6' }} />
              </>
            )}
            {selectedReport === 'collections' && (
              <>
                <Chip icon={<PaymentIcon sx={{ fontSize: 16 }} />} label={`${collectionTotals?.count || 0} ridicări`} size="small" sx={{ bgcolor: alpha('#10b981', 0.1), color: '#10b981' }} />
                <Chip label={formatCurrency(collectionTotals?.totalAmount || 0)} size="small" sx={{ bgcolor: alpha('#10b981', 0.15), color: '#059669', fontWeight: 'bold' }} />
              </>
            )}
          </Stack>
        </Paper>
      </Fade>

      {/* Loading */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Content Cards */}
      {!isLoading && (
        <Box sx={{ maxHeight: isMobile ? 'calc(100vh - 420px)' : 400, overflowY: 'auto', pr: 0.5 }}>
          {selectedReport === 'issues' && (
            filteredIssues.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>Nu există probleme în perioada selectată.</Alert>
            ) : (
              filteredIssues.slice(0, 20).map((issue, index) => renderIssueCard(issue, index))
            )
          )}
          {selectedReport === 'damages' && (
            filteredDamages.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>Nu există prejudicii în perioada selectată.</Alert>
            ) : (
              filteredDamages.slice(0, 20).map((damage, index) => renderDamageCard(damage, index))
            )
          )}
          {selectedReport === 'collections' && (
            allCollections.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>Nu există ridicări în perioada selectată.</Alert>
            ) : (
              allCollections.slice(0, 20).map((collection, index) => renderCollectionCard(collection, index))
            )
          )}
        </Box>
      )}

      {/* Show more info */}
      {!isLoading && (
        (selectedReport === 'issues' && filteredIssues.length > 20) ||
        (selectedReport === 'damages' && filteredDamages.length > 20) ||
        (selectedReport === 'collections' && allCollections.length > 20)
      ) && (
        <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
          Se afișează primele 20 de înregistrări. Exportați raportul pentru lista completă.
        </Alert>
      )}

      {/* Desktop Export Buttons */}
      {!isMobile && !isLoading && (
        <Fade in timeout={600}>
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
            <Button
              variant="contained"
              startIcon={<PdfIcon />}
              onClick={selectedReport === 'issues' ? handleExportIssuesPDF : selectedReport === 'damages' ? handleExportDamagesPDF : handleExportCollectionsPDF}
              disabled={(selectedReport === 'issues' && filteredIssues.length === 0) || (selectedReport === 'damages' && filteredDamages.length === 0) || (selectedReport === 'collections' && allCollections.length === 0)}
              sx={{
                bgcolor: selectedReport === 'issues' ? '#ef4444' : selectedReport === 'damages' ? '#f97316' : '#ef4444',
                '&:hover': { bgcolor: selectedReport === 'issues' ? '#dc2626' : selectedReport === 'damages' ? '#ea580c' : '#dc2626' },
              }}
            >
              Descarcă PDF
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<ExcelIcon />}
              onClick={selectedReport === 'issues' ? handleExportIssuesExcel : selectedReport === 'damages' ? handleExportDamagesExcel : handleExportCollectionsExcel}
              disabled={(selectedReport === 'issues' && filteredIssues.length === 0) || (selectedReport === 'damages' && filteredDamages.length === 0) || (selectedReport === 'collections' && allCollections.length === 0)}
            >
              Descarcă Excel
            </Button>
          </Stack>
        </Fade>
      )}

      {/* Mobile Filter Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={filtersOpen && isMobile}
        onClose={() => setFiltersOpen(false)}
        onOpen={() => setFiltersOpen(true)}
        sx={{
          '& .MuiDrawer-paper': {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '80vh',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">Filtre</Typography>
            <IconButton onClick={() => setFiltersOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          {renderFilters()}
          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            onClick={() => setFiltersOpen(false)}
          >
            Aplică Filtre
          </Button>
        </Box>
      </SwipeableDrawer>

      {/* Mobile Export Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={exportDrawerOpen}
        onClose={() => setExportDrawerOpen(false)}
        onOpen={() => setExportDrawerOpen(true)}
        sx={{
          '& .MuiDrawer-paper': {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          },
        }}
      >
        {renderExportOptions()}
      </SwipeableDrawer>

      {/* Mobile FAB for Export */}
      {isMobile && !isLoading && (
        <Zoom in>
          <Fab
            color="primary"
            onClick={() => setExportDrawerOpen(true)}
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              bgcolor: selectedReport === 'issues' ? '#ef4444' : selectedReport === 'damages' ? '#f97316' : '#10b981',
              '&:hover': {
                bgcolor: selectedReport === 'issues' ? '#dc2626' : selectedReport === 'damages' ? '#ea580c' : '#059669',
              },
            }}
          >
            <DownloadIcon />
          </Fab>
        </Zoom>
      )}

      {/* CSS for spinning animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default ParkingReportsTab;
