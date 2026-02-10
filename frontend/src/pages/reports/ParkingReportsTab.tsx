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
  Tabs,
  Tab,
  alpha,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Warning as IssueIcon,
  ReportProblem as DamageIcon,
  Payments as PaymentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FilterList as FilterIcon,
  CheckCircle as ResolvedIcon,
  Error as ActiveIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { StatCard } from '../../components/common';
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

const ParkingReportsTab: React.FC<ParkingReportsTabProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [subTabValue, setSubTabValue] = useState(0);
  const [filtersExpanded, setFiltersExpanded] = useState(!isMobile);

  // Status filters
  const [issueStatus, setIssueStatus] = useState<string>('ALL');
  const [damageStatus, setDamageStatus] = useState<string>('ALL');
  const [selectedParkingLot, setSelectedParkingLot] = useState<string>('ALL');

  // Fetch data
  const { data: parkingLots = [] } = useGetParkingLotsQuery();
  const { data: allIssues = [], isLoading: issuesLoading } = useGetParkingIssuesQuery(
    issueStatus !== 'ALL' ? (issueStatus as 'ACTIVE' | 'FINALIZAT') : undefined
  );
  const { data: allDamages = [], isLoading: damagesLoading } = useGetParkingDamagesQuery(
    damageStatus !== 'ALL' ? (damageStatus as 'ACTIVE' | 'FINALIZAT') : undefined
  );
  const { data: allCollections = [], isLoading: collectionsLoading } = useGetCashCollectionsQuery({
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

  // Export Issues PDF
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
  };

  // Export Issues Excel
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
  };

  // Export Damages PDF
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
  };

  // Export Damages Excel
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
  };

  // Export Collections PDF
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
  };

  // Export Collections Excel
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
  };

  // Render Issues Content
  const renderIssuesContent = () => (
    <Stack spacing={3}>
      <FormControl size="small" sx={{ maxWidth: 200 }}>
        <InputLabel>Status</InputLabel>
        <Select value={issueStatus} label="Status" onChange={(e) => setIssueStatus(e.target.value)}>
          <MenuItem value="ALL">Toate</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="FINALIZAT">Finalizate</MenuItem>
        </Select>
      </FormControl>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard title="Total Probleme" value={issueStats.total} icon={<IssueIcon sx={{ fontSize: 24, color: '#ef4444' }} />} color="#ef4444" bgColor={alpha('#ef4444', 0.12)} delay={0} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard title="Active" value={issueStats.active} icon={<ActiveIcon sx={{ fontSize: 24, color: '#f59e0b' }} />} color="#f59e0b" bgColor={alpha('#f59e0b', 0.12)} delay={100} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard title="Finalizate" value={issueStats.resolved} icon={<ResolvedIcon sx={{ fontSize: 24, color: '#10b981' }} />} color="#10b981" bgColor={alpha('#10b981', 0.12)} delay={200} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard title="Urgente" value={issueStats.urgent} icon={<IssueIcon sx={{ fontSize: 24, color: '#dc2626' }} />} color="#dc2626" bgColor={alpha('#dc2626', 0.12)} delay={300} />
        </Grid>
      </Grid>

      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#ef4444', 0.1) }}>Parcare</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#ef4444', 0.1) }}>Echipament</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#ef4444', 0.1) }}>Descriere</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#ef4444', 0.1) }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#ef4444', 0.1) }}>Data</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredIssues.slice(0, 15).map((issue) => (
              <TableRow key={issue.id} hover>
                <TableCell>{issue.parkingLot?.name}</TableCell>
                <TableCell>{issue.equipment}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.description}</TableCell>
                <TableCell><Chip size="small" label={issue.status === 'ACTIVE' ? 'Activ' : 'Finalizat'} color={issue.status === 'ACTIVE' ? 'error' : 'success'} /></TableCell>
                <TableCell>{formatDate(issue.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {filteredIssues.length > 15 && (
        <Alert severity="info">Se afișează primele 15 înregistrări. Exportați raportul pentru toate cele {filteredIssues.length}.</Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
        <Button variant="contained" color="error" startIcon={<PdfIcon />} onClick={handleExportIssuesPDF} disabled={isLoading || filteredIssues.length === 0}>Descarcă PDF</Button>
        <Button variant="contained" color="success" startIcon={<ExcelIcon />} onClick={handleExportIssuesExcel} disabled={isLoading || filteredIssues.length === 0}>Descarcă Excel</Button>
      </Stack>
    </Stack>
  );

  // Render Damages Content
  const renderDamagesContent = () => (
    <Stack spacing={3}>
      <FormControl size="small" sx={{ maxWidth: 200 }}>
        <InputLabel>Status</InputLabel>
        <Select value={damageStatus} label="Status" onChange={(e) => setDamageStatus(e.target.value)}>
          <MenuItem value="ALL">Toate</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="FINALIZAT">Finalizate</MenuItem>
        </Select>
      </FormControl>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 2.4 }}>
          <StatCard title="Total" value={damageStats.total} icon={<DamageIcon sx={{ fontSize: 24, color: '#f97316' }} />} color="#f97316" bgColor={alpha('#f97316', 0.12)} delay={0} />
        </Grid>
        <Grid size={{ xs: 6, sm: 2.4 }}>
          <StatCard title="Active" value={damageStats.active} icon={<ActiveIcon sx={{ fontSize: 24, color: '#ef4444' }} />} color="#ef4444" bgColor={alpha('#ef4444', 0.12)} delay={100} />
        </Grid>
        <Grid size={{ xs: 6, sm: 2.4 }}>
          <StatCard title="Finalizate" value={damageStats.resolved} icon={<ResolvedIcon sx={{ fontSize: 24, color: '#10b981' }} />} color="#10b981" bgColor={alpha('#10b981', 0.12)} delay={200} />
        </Grid>
        <Grid size={{ xs: 6, sm: 2.4 }}>
          <StatCard title="Recuperate" value={damageStats.recuperat} icon={<TrendingIcon sx={{ fontSize: 24, color: '#22c55e' }} />} color="#22c55e" bgColor={alpha('#22c55e', 0.12)} delay={300} />
        </Grid>
        <Grid size={{ xs: 12, sm: 2.4 }}>
          <StatCard title="Juridic" value={damageStats.juridic} icon={<DamageIcon sx={{ fontSize: 24, color: '#8b5cf6' }} />} color="#8b5cf6" bgColor={alpha('#8b5cf6', 0.12)} delay={400} />
        </Grid>
      </Grid>

      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#f97316', 0.1) }}>Parcare</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#f97316', 0.1) }}>Echipament</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#f97316', 0.1) }}>Persoană</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#f97316', 0.1) }}>Nr. Auto</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#f97316', 0.1) }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#f97316', 0.1) }}>Data</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDamages.slice(0, 15).map((damage) => (
              <TableRow key={damage.id} hover>
                <TableCell>{damage.parkingLot?.name}</TableCell>
                <TableCell>{damage.damagedEquipment}</TableCell>
                <TableCell>{damage.personName}</TableCell>
                <TableCell>{damage.carPlate}</TableCell>
                <TableCell><Chip size="small" label={damage.status === 'ACTIVE' ? 'Activ' : 'Finalizat'} color={damage.status === 'ACTIVE' ? 'warning' : 'success'} /></TableCell>
                <TableCell>{formatDate(damage.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {filteredDamages.length > 15 && (
        <Alert severity="info">Se afișează primele 15 înregistrări. Exportați raportul pentru toate cele {filteredDamages.length}.</Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
        <Button variant="contained" sx={{ bgcolor: '#f97316', '&:hover': { bgcolor: '#ea580c' } }} startIcon={<PdfIcon />} onClick={handleExportDamagesPDF} disabled={isLoading || filteredDamages.length === 0}>Descarcă PDF</Button>
        <Button variant="contained" color="success" startIcon={<ExcelIcon />} onClick={handleExportDamagesExcel} disabled={isLoading || filteredDamages.length === 0}>Descarcă Excel</Button>
      </Stack>
    </Stack>
  );

  // Render Collections Content
  const renderCollectionsContent = () => (
    <Stack spacing={3}>
      <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="center" spacing={2}>
          <PaymentIcon sx={{ fontSize: 40 }} />
          <Box textAlign="center">
            <Typography variant="h4" fontWeight="bold">{formatCurrency(collectionTotals?.totalAmount || 0)}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Total din {collectionTotals?.count || 0} ridicări</Typography>
          </Box>
        </Stack>
      </Paper>

      {collectionTotals?.byParkingLot && collectionTotals.byParkingLot.length > 0 && (
        <Grid container spacing={2}>
          {collectionTotals.byParkingLot.map((item) => (
            <Grid key={item.parkingLotId} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ bgcolor: alpha('#10b981', 0.05) }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>{item.parkingLotName}</Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">{formatCurrency(item.totalAmount)}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.count} ridicări</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#10b981', 0.1) }}>Parcare</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#10b981', 0.1) }}>Automat</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#10b981', 0.1) }} align="right">Sumă</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#10b981', 0.1) }}>Ridicat de</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha('#10b981', 0.1) }}>Data</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allCollections.slice(0, 15).map((collection) => (
              <TableRow key={collection.id} hover>
                <TableCell>{collection.parkingLot?.name}</TableCell>
                <TableCell>{collection.paymentMachine?.machineNumber}</TableCell>
                <TableCell align="right"><Typography fontWeight="bold" color="success.main">{formatCurrency(collection.amount)}</Typography></TableCell>
                <TableCell>{collection.collector?.fullName}</TableCell>
                <TableCell>{formatDateTime(collection.collectedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {allCollections.length > 15 && (
        <Alert severity="info">Se afișează primele 15 înregistrări. Exportați raportul pentru toate cele {allCollections.length}.</Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
        <Button variant="contained" color="error" startIcon={<PdfIcon />} onClick={handleExportCollectionsPDF} disabled={isLoading || allCollections.length === 0}>Descarcă PDF</Button>
        <Button variant="contained" color="success" startIcon={<ExcelIcon />} onClick={handleExportCollectionsExcel} disabled={isLoading || allCollections.length === 0}>Descarcă Excel</Button>
      </Stack>
    </Stack>
  );

  return (
    <Stack spacing={3}>
      {/* Parking Lot Filter */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <Button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          startIcon={<FilterIcon />}
          endIcon={filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ color: 'text.secondary' }}
        >
          Filtre Parcări
        </Button>
      </Stack>

      <Collapse in={filtersExpanded}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Parcare</InputLabel>
            <Select value={selectedParkingLot} label="Parcare" onChange={(e) => setSelectedParkingLot(e.target.value)}>
              <MenuItem value="ALL">Toate Parcările</MenuItem>
              {parkingLots.map((lot) => (
                <MenuItem key={lot.id} value={lot.id}>{lot.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ minWidth: 160 }}>
            <DatePickerField label="De la" value={startDate || null} onChange={(value) => onStartDateChange(value || '')} size="small" />
          </Box>
          <Box sx={{ minWidth: 160 }}>
            <DatePickerField label="Până la" value={endDate || null} onChange={(value) => onEndDateChange(value || '')} size="small" minDate={startDate || undefined} />
          </Box>
        </Stack>
      </Collapse>

      {/* Sub-tabs for parking reports */}
      <Tabs
        value={subTabValue}
        onChange={(_, newValue) => setSubTabValue(newValue)}
        variant={isMobile ? 'scrollable' : 'standard'}
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<IssueIcon />} iconPosition="start" label="Probleme" sx={{ minHeight: 48, color: subTabValue === 0 ? '#ef4444' : 'inherit' }} />
        <Tab icon={<DamageIcon />} iconPosition="start" label="Prejudicii" sx={{ minHeight: 48, color: subTabValue === 1 ? '#f97316' : 'inherit' }} />
        <Tab icon={<PaymentIcon />} iconPosition="start" label="Numerar" sx={{ minHeight: 48, color: subTabValue === 2 ? '#10b981' : 'inherit' }} />
      </Tabs>

      {/* Loading state */}
      {isLoading && (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Content */}
      {!isLoading && subTabValue === 0 && renderIssuesContent()}
      {!isLoading && subTabValue === 1 && renderDamagesContent()}
      {!isLoading && subTabValue === 2 && renderCollectionsContent()}
    </Stack>
  );
};

export default ParkingReportsTab;
