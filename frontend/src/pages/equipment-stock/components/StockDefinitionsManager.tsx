import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Switch,
  FormControlLabel,
  MenuItem,
  alpha,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import FriendlyDialog from '../../../components/common/FriendlyDialog';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import {
  useGetDefinitionsQuery,
  useCreateDefinitionMutation,
  useUpdateDefinitionMutation,
  useDeleteDefinitionMutation,
} from '../../../store/api/equipmentStock.api';
import type { StockDefinitionItem } from '../../../store/api/equipmentStock.api';

const CATEGORY_OPTIONS = [
  { value: 'PARCARI_ETAJATE', label: 'Parcari Etajate' },
  { value: 'PARCARI_STRADALE', label: 'Parcari Stradale' },
  { value: 'PARCOMETRE', label: 'Parcometre' },
  { value: 'ALL', label: 'Toate' },
];

interface DefinitionFormData {
  name: string;
  category: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

const emptyForm: DefinitionFormData = {
  name: '',
  category: 'PARCARI_ETAJATE',
  description: '',
  isActive: true,
  sortOrder: 0,
};

const StockDefinitionsManager: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { notifySuccess, notifyError } = useSnackbar();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<StockDefinitionItem | null>(null);
  const [formData, setFormData] = useState<DefinitionFormData>(emptyForm);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingDefId, setDeletingDefId] = useState<string | null>(null);

  const { data: definitions = [], isLoading, error } = useGetDefinitionsQuery();
  const [createDefinition, { isLoading: isCreating }] = useCreateDefinitionMutation();
  const [updateDefinition, { isLoading: isUpdating }] = useUpdateDefinitionMutation();
  const [deleteDefinition, { isLoading: isDeleting }] = useDeleteDefinitionMutation();

  const handleOpenAdd = () => {
    setEditingDef(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (def: StockDefinitionItem) => {
    setEditingDef(def);
    setFormData({
      name: def.name,
      category: def.category,
      description: def.description || '',
      isActive: def.isActive,
      sortOrder: def.sortOrder,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDef(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      notifyError('Numele este obligatoriu');
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
      };

      if (editingDef) {
        await updateDefinition({ id: editingDef.id, ...payload }).unwrap();
        notifySuccess('Definitie actualizata cu succes');
      } else {
        await createDefinition(payload).unwrap();
        notifySuccess('Definitie adaugata cu succes');
      }
      handleCloseDialog();
    } catch {
      notifyError(editingDef ? 'Eroare la actualizare' : 'Eroare la adaugare');
    }
  };

  const handleDeleteClick = (defId: string) => {
    setDeletingDefId(defId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDefId) return;
    try {
      await deleteDefinition(deletingDefId).unwrap();
      notifySuccess('Definitie stearsa cu succes');
    } catch {
      notifyError('Eroare la stergere');
    }
    setDeleteConfirmOpen(false);
    setDeletingDefId(null);
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORY_OPTIONS.find((c) => c.value === category)?.label || category;
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Eroare la incarcarea definitiilor. Incearca din nou.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header bar */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <SettingsIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
          <Typography variant="subtitle1" fontWeight={700}>
            Tipuri de Echipamente
          </Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
          }}
        >
          Adauga
        </Button>
      </Stack>

      {/* Empty state */}
      {definitions.length === 0 && (
        <Card
          sx={{
            borderRadius: 3,
            textAlign: 'center',
            py: 6,
            px: 3,
            bgcolor: alpha(theme.palette.secondary.main, 0.04),
            border: `1px dashed ${alpha(theme.palette.secondary.main, 0.2)}`,
          }}
        >
          <SettingsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nicio definitie creata
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Adauga tipuri de echipamente pentru a permite inregistrarea stocului.
          </Typography>
        </Card>
      )}

      {/* Desktop Table */}
      {definitions.length > 0 && !isMobile && (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 3,
            boxShadow: theme.palette.mode === 'light'
              ? '0 2px 12px rgba(0, 0, 0, 0.06)'
              : '0 2px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.06) }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Nume</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Categorie</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Descriere</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }} align="center">Activ</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }} align="center">Ordine</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }} align="center">Actiuni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {definitions.map((def) => (
                <TableRow
                  key={def.id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {def.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getCategoryLabel(def.category)}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        maxWidth: 250,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {def.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={def.isActive ? 'Da' : 'Nu'}
                      size="small"
                      color={def.isActive ? 'success' : 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary">
                      {def.sortOrder}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <IconButton size="small" color="primary" onClick={() => handleOpenEdit(def)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(def.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Mobile Card View */}
      {definitions.length > 0 && isMobile && (
        <Stack spacing={1.5}>
          {definitions.map((def) => (
            <Card
              key={def.id}
              sx={{
                borderRadius: 2.5,
                boxShadow: theme.palette.mode === 'light'
                  ? '0 1px 8px rgba(0, 0, 0, 0.06)'
                  : '0 1px 8px rgba(0, 0, 0, 0.3)',
              }}
            >
              <CardContent sx={{ pb: '12px !important', px: 2, pt: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>
                      {def.name}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                      <Chip
                        label={getCategoryLabel(def.category)}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                      <Chip
                        label={def.isActive ? 'Activ' : 'Inactiv'}
                        size="small"
                        color={def.isActive ? 'success' : 'default'}
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(def)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteClick(def.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
                {def.description && (
                  <Typography variant="caption" color="text.secondary">
                    {def.description}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Add/Edit Dialog */}
      <FriendlyDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        title={editingDef ? 'Editeaza Definitie' : 'Adauga Definitie'}
        subtitle={editingDef ? 'Modifica tipul de echipament' : 'Creeaza un nou tip de echipament'}
        variant="info"
        maxWidth="sm"
        confirmText={editingDef ? 'Salveaza' : 'Adauga'}
        cancelText="Anuleaza"
        onConfirm={handleSubmit}
        confirmLoading={isCreating || isUpdating}
        confirmDisabled={!formData.name.trim()}
      >
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Nume"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            fullWidth
            required
            size="small"
            placeholder="ex: Bariera automata"
          />

          <TextField
            select
            label="Categorie"
            value={formData.category}
            onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
            fullWidth
            required
            size="small"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Descriere"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            fullWidth
            size="small"
            multiline
            rows={2}
            placeholder="Descriere optionala..."
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                color="primary"
              />
            }
            label="Activ"
          />

          <TextField
            label="Ordine de sortare"
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
            fullWidth
            size="small"
            inputProps={{ min: 0 }}
          />
        </Stack>
      </FriendlyDialog>

      {/* Delete Confirmation Dialog */}
      <FriendlyDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Sterge Definitie"
        subtitle="Aceasta actiune este ireversibila"
        variant="error"
        maxWidth="xs"
        confirmText="Sterge"
        cancelText="Anuleaza"
        onConfirm={handleDeleteConfirm}
        confirmLoading={isDeleting}
      >
        <Typography variant="body2" color="text.secondary">
          Esti sigur ca vrei sa stergi aceasta definitie? Toate intrarile asociate vor fi de asemenea afectate.
        </Typography>
      </FriendlyDialog>
    </Box>
  );
};

export default StockDefinitionsManager;
