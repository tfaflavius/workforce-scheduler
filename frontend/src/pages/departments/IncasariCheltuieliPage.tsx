import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  IconButton,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Snackbar,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  BarChart as RevenueIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { GradientHeader } from '../../components/common';
import {
  useGetRevenueSummaryQuery,
  useCreateRevenueCategoryMutation,
  useUpdateRevenueCategoryMutation,
  useDeleteRevenueCategoryMutation,
  useUpsertMonthlyRevenueMutation,
} from '../../store/api/acquisitions.api';
import type { RevenueCategory, RevenueSummaryCategory } from '../../types/acquisitions.types';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' lei';
};

const MONTH_LABELS = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const IncasariCheltuieliPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Revenue section states
  const [revCatDialogOpen, setRevCatDialogOpen] = useState(false);
  const [editingRevCat, setEditingRevCat] = useState<RevenueCategory | null>(null);
  const [revCatForm, setRevCatForm] = useState({ name: '', description: '', parentId: '' });
  const [editingCell, setEditingCell] = useState<{
    categoryId: string;
    month: number;
    incasari: string;
    cheltuieli: string;
    notes: string;
  } | null>(null);
  const [cellDialogOpen, setCellDialogOpen] = useState(false);

  // Delete
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; isGroup?: boolean } | null>(null);

  // Messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Year options
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  }, []);

  // API hooks
  const { data: revenueSummary, isLoading: loadingRevenue } = useGetRevenueSummaryQuery({ year: selectedYear });
  const [createRevCat] = useCreateRevenueCategoryMutation();
  const [updateRevCat] = useUpdateRevenueCategoryMutation();
  const [deleteRevCat] = useDeleteRevenueCategoryMutation();
  const [upsertMonthlyRevenue] = useUpsertMonthlyRevenueMutation();

  // Get list of groups (categories with children) for the parent dropdown
  const groupCategories = useMemo(() => {
    if (!revenueSummary) return [];
    return revenueSummary.categories.filter((c) => c.isGroup);
  }, [revenueSummary]);

  // Handlers
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const showError = (error: unknown) => {
    const msg = error && typeof error === 'object' && 'data' in error
      ? ((error as any).data as any)?.message || 'A aparut o eroare'
      : 'A aparut o eroare';
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const handleOpenRevCatDialog = (cat?: RevenueCategory, parentId?: string) => {
    if (cat) {
      setEditingRevCat(cat);
      setRevCatForm({ name: cat.name, description: cat.description || '', parentId: cat.parentId || '' });
    } else {
      setEditingRevCat(null);
      setRevCatForm({ name: '', description: '', parentId: parentId || '' });
    }
    setRevCatDialogOpen(true);
  };

  const handleSaveRevCat = async () => {
    try {
      if (editingRevCat) {
        await updateRevCat({
          id: editingRevCat.id,
          data: { name: revCatForm.name, description: revCatForm.description || undefined },
        }).unwrap();
        showSuccess('Categoria a fost actualizata');
      } else {
        await createRevCat({
          name: revCatForm.name,
          description: revCatForm.description || undefined,
          parentId: revCatForm.parentId || undefined,
        }).unwrap();
        showSuccess('Categoria a fost creata');
      }
      setRevCatDialogOpen(false);
    } catch (error) {
      showError(error);
    }
  };

  // Find cell data - search in children too for groups
  const findCellData = (categoryId: string, month: number) => {
    if (!revenueSummary) return undefined;
    for (const cat of revenueSummary.categories) {
      if (cat.categoryId === categoryId) return cat.months[month];
      if (cat.children) {
        for (const child of cat.children) {
          if (child.categoryId === categoryId) return child.months[month];
        }
      }
    }
    return undefined;
  };

  // Find category name - search in children too
  const findCategoryName = (categoryId: string) => {
    if (!revenueSummary) return '';
    for (const cat of revenueSummary.categories) {
      if (cat.categoryId === categoryId) return cat.categoryName;
      if (cat.children) {
        for (const child of cat.children) {
          if (child.categoryId === categoryId) return child.categoryName;
        }
      }
    }
    return '';
  };

  const handleOpenCellDialog = (categoryId: string, month: number) => {
    const existing = findCellData(categoryId, month);
    setEditingCell({
      categoryId,
      month,
      incasari: existing ? String(existing.incasari) : '0',
      cheltuieli: existing ? String(existing.cheltuieli) : '0',
      notes: existing?.notes || '',
    });
    setCellDialogOpen(true);
  };

  const handleSaveCell = async () => {
    if (!editingCell) return;
    try {
      await upsertMonthlyRevenue({
        revenueCategoryId: editingCell.categoryId,
        year: selectedYear,
        month: editingCell.month,
        incasari: Number(editingCell.incasari) || 0,
        cheltuieli: Number(editingCell.cheltuieli) || 0,
        notes: editingCell.notes || undefined,
      }).unwrap();
      showSuccess('Datele au fost salvate');
      setCellDialogOpen(false);
    } catch (error) {
      showError(error);
    }
  };

  const confirmDelete = (id: string, name: string, isGroup?: boolean) => {
    setDeleteTarget({ id, name, isGroup });
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRevCat(deleteTarget.id).unwrap();
      showSuccess('Categoria a fost stearsa');
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      showError(error);
    }
  };

  // ===================== RENDER HELPERS =====================

  // Render 2 rows (incasari + cheltuieli) for a simple/child category
  const renderCategoryRows = (cat: RevenueSummaryCategory, isChild = false) => (
    <React.Fragment key={cat.categoryId}>
      {/* Incasari row */}
      <TableRow hover>
        <TableCell
          rowSpan={2}
          sx={{
            fontWeight: 700,
            borderBottom: '2px solid',
            borderColor: 'divider',
            position: 'sticky',
            left: 0,
            bgcolor: 'background.paper',
            zIndex: 2,
            pl: isChild ? 3 : undefined,
            borderRight: '1px solid',
            borderRightColor: 'divider',
            minWidth: { xs: 120, sm: 180 },
            maxWidth: { xs: 120, sm: 180 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: isChild ? 600 : 700, fontSize: isChild ? '0.8rem' : undefined }}>
              {cat.categoryName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.25 }}>
              <IconButton
                size="small"
                onClick={() => handleOpenRevCatDialog({
                  id: cat.categoryId, name: cat.categoryName, description: null,
                  parentId: cat.parentId, sortOrder: cat.sortOrder, isActive: true, createdAt: '', updatedAt: '',
                })}
              >
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => confirmDelete(cat.categoryId, cat.categoryName)}>
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        </TableCell>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const data = cat.months[month];
          return (
            <TableCell
              key={month}
              align="center"
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: alpha('#10b981', 0.08) },
                borderBottom: 'none',
                py: 0.5,
                px: 0.5,
              }}
              onClick={() => handleOpenCellDialog(cat.categoryId, month)}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#10b981', fontSize: '0.7rem' }}>
                {data && data.incasari > 0 ? formatCurrency(data.incasari) : '-'}
              </Typography>
            </TableCell>
          );
        })}
        <TableCell align="center" sx={{ borderBottom: 'none', py: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#10b981' }}>
            {formatCurrency(cat.totalIncasari)}
          </Typography>
        </TableCell>
      </TableRow>
      {/* Cheltuieli row */}
      <TableRow>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const data = cat.months[month];
          return (
            <TableCell
              key={month}
              align="center"
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: alpha('#ef4444', 0.08) },
                borderBottom: '2px solid',
                borderColor: 'divider',
                py: 0.5,
                px: 0.5,
              }}
              onClick={() => handleOpenCellDialog(cat.categoryId, month)}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#ef4444', fontSize: '0.7rem' }}>
                {data && data.cheltuieli > 0 ? formatCurrency(data.cheltuieli) : '-'}
              </Typography>
            </TableCell>
          );
        })}
        <TableCell align="center" sx={{ borderBottom: '2px solid', borderColor: 'divider', py: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#ef4444' }}>
            {formatCurrency(cat.totalCheltuieli)}
          </Typography>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );

  // Render a GROUP (header + children + subtotal)
  const renderGroupRows = (cat: RevenueSummaryCategory) => (
    <React.Fragment key={cat.categoryId}>
      {/* Group Header Row */}
      <TableRow sx={{ bgcolor: alpha('#8b5cf6', 0.08) }}>
        <TableCell
          colSpan={14}
          sx={{
            fontWeight: 800,
            position: 'sticky',
            left: 0,
            bgcolor: alpha('#8b5cf6', 0.08),
            zIndex: 2,
            py: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#7c3aed' }}>
              {cat.categoryName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                sx={{ color: '#8b5cf6' }}
                onClick={() => handleOpenRevCatDialog(undefined, cat.categoryId)}
              >
                <AddIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleOpenRevCatDialog({
                  id: cat.categoryId, name: cat.categoryName, description: null,
                  parentId: null, sortOrder: cat.sortOrder, isActive: true, createdAt: '', updatedAt: '',
                })}
              >
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => confirmDelete(cat.categoryId, cat.categoryName, true)}>
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        </TableCell>
      </TableRow>

      {/* Children rows */}
      {(cat.children || []).map((child) => renderCategoryRows(child, true))}

      {/* Children empty state */}
      {(!cat.children || cat.children.length === 0) && (
        <TableRow>
          <TableCell colSpan={14} sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Nicio sub-categorie. Click + pentru a adauga.
            </Typography>
          </TableCell>
        </TableRow>
      )}

      {/* Subtotal rows for group */}
      {cat.children && cat.children.length > 0 && (
        <>
          <TableRow sx={{ bgcolor: alpha('#8b5cf6', 0.04) }}>
            <TableCell
              rowSpan={2}
              sx={{
                fontWeight: 700,
                position: 'sticky',
                left: 0,
                bgcolor: alpha('#8b5cf6', 0.04),
                zIndex: 2,
                borderBottom: '3px solid',
                borderColor: '#8b5cf6',
                fontSize: '0.8rem',
                borderRight: '1px solid',
                borderRightColor: 'divider',
                minWidth: { xs: 120, sm: 180 },
                maxWidth: { xs: 120, sm: 180 },
              }}
            >
              Subtotal {cat.categoryName}
            </TableCell>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <TableCell key={month} align="center" sx={{ borderBottom: 'none', py: 0.5, px: 0.5, bgcolor: alpha('#8b5cf6', 0.04) }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#10b981', fontSize: '0.7rem' }}>
                  {cat.months[month]?.incasari ? formatCurrency(cat.months[month].incasari) : '0,00 lei'}
                </Typography>
              </TableCell>
            ))}
            <TableCell align="center" sx={{ borderBottom: 'none', py: 0.5, bgcolor: alpha('#8b5cf6', 0.04) }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#10b981' }}>
                {formatCurrency(cat.totalIncasari)}
              </Typography>
            </TableCell>
          </TableRow>
          <TableRow sx={{ bgcolor: alpha('#8b5cf6', 0.04) }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <TableCell key={month} align="center" sx={{ py: 0.5, px: 0.5, borderBottom: '3px solid', borderColor: '#8b5cf6', bgcolor: alpha('#8b5cf6', 0.04) }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#ef4444', fontSize: '0.7rem' }}>
                  {cat.months[month]?.cheltuieli ? formatCurrency(cat.months[month].cheltuieli) : '0,00 lei'}
                </Typography>
              </TableCell>
            ))}
            <TableCell align="center" sx={{ py: 0.5, borderBottom: '3px solid', borderColor: '#8b5cf6', bgcolor: alpha('#8b5cf6', 0.04) }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#ef4444' }}>
                {formatCurrency(cat.totalCheltuieli)}
              </Typography>
            </TableCell>
          </TableRow>
        </>
      )}
    </React.Fragment>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header */}
      <GradientHeader
        title="Incasari / Cheltuieli"
        subtitle="Gestionare incasari si cheltuieli pe categorii"
        icon={<RevenueIcon />}
        gradient="#8b5cf6 0%, #7c3aed 100%"
      />

      {/* Year selector + Add button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1 }} />

        <TextField
          select
          size="small"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          sx={{ minWidth: 100 }}
          label="An"
        >
          {yearOptions.map((y) => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </TextField>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenRevCatDialog()}
          sx={{
            bgcolor: '#8b5cf6',
            '&:hover': { bgcolor: '#7c3aed' },
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {isMobile ? 'Categorie' : 'Adauga Categorie'}
        </Button>
      </Box>

      {/* Loading */}
      {loadingRevenue && <LinearProgress sx={{ mb: 2 }} color="secondary" />}

      {/* Revenue Table */}
      {revenueSummary && revenueSummary.categories.length > 0 ? (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#8b5cf6', 0.06) }}>
                <TableCell sx={{ fontWeight: 700, minWidth: { xs: 120, sm: 180 }, maxWidth: { xs: 120, sm: 180 }, position: 'sticky', left: 0, bgcolor: alpha('#8b5cf6', 0.06), zIndex: 2, borderRight: '1px solid', borderColor: 'divider' }}>
                  Categorie
                </TableCell>
                {MONTH_LABELS.map((label, idx) => (
                  <TableCell key={idx} align="center" sx={{ fontWeight: 700, minWidth: 80, px: 0.5 }}>
                    {label}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ fontWeight: 700, minWidth: 100 }}>
                  Total
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {revenueSummary.categories
                .filter((cat) => !cat.parentId)
                .map((cat) =>
                  cat.isGroup ? renderGroupRows(cat) : renderCategoryRows(cat)
                )}

              {/* TOTAL row */}
              <TableRow sx={{ bgcolor: alpha('#8b5cf6', 0.06) }}>
                <TableCell
                  rowSpan={2}
                  sx={{ fontWeight: 800, position: 'sticky', left: 0, bgcolor: alpha('#8b5cf6', 0.06), zIndex: 2, borderRight: '1px solid', borderColor: 'divider' }}
                >
                  TOTAL GENERAL
                </TableCell>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <TableCell key={month} align="center" sx={{ borderBottom: 'none', py: 0.5, px: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#10b981', fontSize: '0.7rem' }}>
                      {formatCurrency(revenueSummary.monthTotals[month]?.incasari || 0)}
                    </Typography>
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ borderBottom: 'none', py: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#10b981' }}>
                    {formatCurrency(revenueSummary.grandTotalIncasari)}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: alpha('#8b5cf6', 0.06) }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <TableCell key={month} align="center" sx={{ py: 0.5, px: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#ef4444', fontSize: '0.7rem' }}>
                      {formatCurrency(revenueSummary.monthTotals[month]?.cheltuieli || 0)}
                    </Typography>
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ py: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#ef4444' }}>
                    {formatCurrency(revenueSummary.grandTotalCheltuieli)}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      ) : !loadingRevenue ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <CategoryIcon sx={{ fontSize: 64, color: alpha('#8b5cf6', 0.3), mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Nicio categorie de incasari/cheltuieli
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Adauga prima categorie pentru a incepe urmarirea incasarilor si cheltuielilor
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleOpenRevCatDialog()}
            sx={{ color: '#8b5cf6', borderColor: '#8b5cf6' }}
          >
            Adauga Categorie
          </Button>
        </Card>
      ) : null}

      {/* ===================== DIALOGS ===================== */}

      {/* Revenue Category Dialog */}
      <Dialog
        open={revCatDialogOpen}
        onClose={() => setRevCatDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingRevCat ? 'Editare Categorie' : 'Categorie Noua'}
          <IconButton onClick={() => setRevCatDialogOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Denumire categorie"
              value={revCatForm.name}
              onChange={(e) => setRevCatForm({ ...revCatForm, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Descriere (optional)"
              multiline
              rows={2}
              value={revCatForm.description}
              onChange={(e) => setRevCatForm({ ...revCatForm, description: e.target.value })}
            />
            {!editingRevCat && (
              <TextField
                select
                fullWidth
                label="Grup parinte (optional)"
                value={revCatForm.parentId}
                onChange={(e) => setRevCatForm({ ...revCatForm, parentId: e.target.value })}
                helperText="Selecteaza un grup daca vrei sa creezi o sub-categorie"
              >
                <MenuItem value="">
                  <em>Fara grup (categorie independenta)</em>
                </MenuItem>
                {groupCategories.map((g) => (
                  <MenuItem key={g.categoryId} value={g.categoryId}>
                    {g.categoryName}
                  </MenuItem>
                ))}
                {/* Also show categories that could become groups */}
                {revenueSummary?.categories
                  .filter((c) => !c.isGroup && !c.parentId)
                  .map((c) => (
                    <MenuItem key={c.categoryId} value={c.categoryId}>
                      {c.categoryName} (va deveni grup)
                    </MenuItem>
                  ))}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setRevCatDialogOpen(false)}>Anuleaza</Button>
          <Button
            variant="contained"
            onClick={handleSaveRevCat}
            disabled={!revCatForm.name}
            sx={{ bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' } }}
          >
            {editingRevCat ? 'Salveaza' : 'Creeaza'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Monthly Revenue Cell Edit Dialog */}
      <Dialog
        open={cellDialogOpen}
        onClose={() => setCellDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingCell
            ? `${findCategoryName(editingCell.categoryId)} - ${MONTH_LABELS[editingCell.month - 1]} ${selectedYear}`
            : 'Editare'}
          <IconButton onClick={() => setCellDialogOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Incasari (lei)"
              type="number"
              value={editingCell?.incasari || '0'}
              onChange={(e) => setEditingCell(editingCell ? { ...editingCell, incasari: e.target.value } : null)}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#10b981' } } }}
            />
            <TextField
              fullWidth
              label="Cheltuieli (lei)"
              type="number"
              value={editingCell?.cheltuieli || '0'}
              onChange={(e) => setEditingCell(editingCell ? { ...editingCell, cheltuieli: e.target.value } : null)}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#ef4444' } } }}
            />
            <TextField
              fullWidth
              label="Note (optional)"
              multiline
              rows={2}
              value={editingCell?.notes || ''}
              onChange={(e) => setEditingCell(editingCell ? { ...editingCell, notes: e.target.value } : null)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setCellDialogOpen(false)}>Anuleaza</Button>
          <Button
            variant="contained"
            onClick={handleSaveCell}
            sx={{ bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' } }}
          >
            Salveaza
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirmare Stergere</DialogTitle>
        <DialogContent>
          <Typography>
            Esti sigur ca vrei sa stergi categoria{' '}
            <strong>{deleteTarget?.name}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mt: 1 }}>
            {deleteTarget?.isGroup
              ? 'Toate sub-categoriile si datele lunare asociate vor fi sterse!'
              : 'Toate datele lunare asociate vor fi sterse!'}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Anuleaza</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Sterge
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error messages */}
      <Snackbar open={!!successMessage} autoHideDuration={4000} onClose={() => setSuccessMessage(null)}>
        <Alert onClose={() => setSuccessMessage(null)} severity="success" variant="filled" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
      <Snackbar open={!!errorMessage} autoHideDuration={5000} onClose={() => setErrorMessage(null)}>
        <Alert onClose={() => setErrorMessage(null)} severity="error" variant="filled" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default IncasariCheltuieliPage;
