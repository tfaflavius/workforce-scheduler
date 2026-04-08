import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
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
  alpha,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Inventory2 as EmptyIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ro } from 'date-fns/locale';
import FriendlyDialog from '../../../components/common/FriendlyDialog';
import { useAppSelector } from '../../../store/hooks';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { isAdminOrAbove } from '../../../utils/roleHelpers';
import { formatDateShort } from '../../../utils/dateFormatters';
import {
  useGetEntriesQuery,
  useGetDefinitionsQuery,
  useCreateEntryMutation,
  useUpdateEntryMutation,
  useDeleteEntryMutation,
} from '../../../store/api/equipmentStock.api';
import type { StockEntryItem } from '../../../store/api/equipmentStock.api';
import type { StockCategory } from '../../../constants/equipmentStock';

interface StockCategoryTabProps {
  category: StockCategory;
  canEdit: boolean;
}

interface EntryFormData {
  definitionId: string;
  quantity: number;
  location: string;
  notes: string;
  dateAdded: Date | null;
}

const emptyForm: EntryFormData = {
  definitionId: '',
  quantity: 0,
  location: '',
  notes: '',
  dateAdded: new Date(),
};

const StockCategoryTab: React.FC<StockCategoryTabProps> = ({ category, canEdit }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAppSelector((state) => state.auth);
  const { notifySuccess, notifyError } = useSnackbar();
  const isAdmin = isAdminOrAbove(user?.role);

  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<StockEntryItem | null>(null);
  const [formData, setFormData] = useState<EntryFormData>(emptyForm);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const { data: entries = [], isLoading, error } = useGetEntriesQuery({ category, search: searchTerm || undefined });
  const { data: definitions = [] } = useGetDefinitionsQuery({ category });
  const [createEntry, { isLoading: isCreating }] = useCreateEntryMutation();
  const [updateEntry, { isLoading: isUpdating }] = useUpdateEntryMutation();
  const [deleteEntry, { isLoading: isDeleting }] = useDeleteEntryMutation();

  // Filter definitions for the dropdown: matching category or 'ALL'
  const availableDefinitions = useMemo(
    () => definitions.filter((d) => d.isActive && (d.category === category || d.category === 'ALL')),
    [definitions, category],
  );

  const handleOpenAdd = () => {
    setEditingEntry(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (entry: StockEntryItem) => {
    setEditingEntry(entry);
    setFormData({
      definitionId: entry.definitionId,
      quantity: entry.quantity,
      location: entry.location || '',
      notes: entry.notes || '',
      dateAdded: entry.dateAdded ? new Date(entry.dateAdded) : new Date(),
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEntry(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async () => {
    if (!formData.definitionId) {
      notifyError('Selecteaza un tip de echipament');
      return;
    }
    if (formData.quantity < 0) {
      notifyError('Cantitatea nu poate fi negativa');
      return;
    }

    try {
      const payload = {
        definitionId: formData.definitionId,
        quantity: formData.quantity,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
        dateAdded: formData.dateAdded ? formData.dateAdded.toISOString().split('T')[0] : undefined,
      };

      if (editingEntry) {
        await updateEntry({ id: editingEntry.id, ...payload }).unwrap();
        notifySuccess('Intrare actualizata cu succes');
      } else {
        await createEntry(payload).unwrap();
        notifySuccess('Intrare adaugata cu succes');
      }
      handleCloseDialog();
    } catch {
      notifyError(editingEntry ? 'Eroare la actualizare' : 'Eroare la adaugare');
    }
  };

  const handleDeleteClick = (entryId: string) => {
    setDeletingEntryId(entryId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEntryId) return;
    try {
      await deleteEntry(deletingEntryId).unwrap();
      notifySuccess('Intrare stearsa cu succes');
    } catch {
      notifyError('Eroare la stergere');
    }
    setDeleteConfirmOpen(false);
    setDeletingEntryId(null);
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
        Eroare la incarcarea datelor. Incearca din nou.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Search + Add bar */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          placeholder="Cauta echipament..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
          }}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              px: 3,
            }}
          >
            Adauga
          </Button>
        )}
      </Stack>

      {/* Empty state */}
      {entries.length === 0 && (
        <Card
          sx={{
            borderRadius: 3,
            textAlign: 'center',
            py: 6,
            px: 3,
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <EmptyIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Niciun echipament inregistrat
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {canEdit
              ? 'Apasa butonul "Adauga" pentru a inregistra primul echipament.'
              : 'Nu exista echipamente inregistrate in aceasta categorie.'}
          </Typography>
        </Card>
      )}

      {/* Desktop Table View */}
      {entries.length > 0 && !isMobile && (
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
              <TableRow
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                }}
              >
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Echipament</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }} align="center">Cantitate</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Locatie</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Note</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Data Adaugarii</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Adaugat de</TableCell>
                {(canEdit || isAdmin) && (
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }} align="center">Actiuni</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow
                  key={entry.id}
                  hover
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {entry.definition?.name || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={entry.quantity}
                      size="small"
                      color={entry.quantity > 0 ? 'primary' : 'default'}
                      sx={{ fontWeight: 700, minWidth: 40 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {entry.location || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.notes || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {entry.dateAdded ? formatDateShort(entry.dateAdded) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {entry.addedBy?.fullName || '-'}
                    </Typography>
                  </TableCell>
                  {(canEdit || isAdmin) && (
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        {canEdit && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenEdit(entry)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                        {isAdmin && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(entry.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Mobile Card View */}
      {entries.length > 0 && isMobile && (
        <Stack spacing={1.5}>
          {entries.map((entry) => (
            <Card
              key={entry.id}
              sx={{
                borderRadius: 2.5,
                boxShadow: theme.palette.mode === 'light'
                  ? '0 1px 8px rgba(0, 0, 0, 0.06)'
                  : '0 1px 8px rgba(0, 0, 0, 0.3)',
              }}
            >
              <CardContent sx={{ pb: '12px !important', px: 2, pt: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>
                      {entry.definition?.name || '-'}
                    </Typography>
                    {entry.location && (
                      <Typography variant="caption" color="text.secondary">
                        {entry.location}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={`x${entry.quantity}`}
                    size="small"
                    color={entry.quantity > 0 ? 'primary' : 'default'}
                    sx={{ fontWeight: 700, ml: 1 }}
                  />
                </Stack>

                {entry.notes && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 1,
                      fontSize: '0.75rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.notes}
                  </Typography>
                )}

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.disabled">
                    {entry.dateAdded ? formatDateShort(entry.dateAdded) : ''} {entry.addedBy?.fullName ? `- ${entry.addedBy.fullName}` : ''}
                  </Typography>
                  {(canEdit || isAdmin) && (
                    <Stack direction="row" spacing={0.5}>
                      {canEdit && (
                        <IconButton size="small" color="primary" onClick={() => handleOpenEdit(entry)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      {isAdmin && (
                        <IconButton size="small" color="error" onClick={() => handleDeleteClick(entry.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Add/Edit Dialog */}
      <FriendlyDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        title={editingEntry ? 'Editeaza Intrare' : 'Adauga Intrare'}
        subtitle={editingEntry ? 'Modifica datele intrarii din stoc' : 'Adauga un nou echipament in stoc'}
        variant="info"
        maxWidth="sm"
        confirmText={editingEntry ? 'Salveaza' : 'Adauga'}
        cancelText="Anuleaza"
        onConfirm={handleSubmit}
        confirmLoading={isCreating || isUpdating}
        confirmDisabled={!formData.definitionId}
      >
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            select
            label="Tip Echipament"
            value={formData.definitionId}
            onChange={(e) => setFormData((prev) => ({ ...prev, definitionId: e.target.value }))}
            fullWidth
            required
            size="small"
          >
            {availableDefinitions.length === 0 && (
              <MenuItem value="" disabled>
                Niciun tip de echipament disponibil
              </MenuItem>
            )}
            {availableDefinitions.map((def) => (
              <MenuItem key={def.id} value={def.id}>
                {def.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Cantitate"
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData((prev) => ({ ...prev, quantity: Math.max(0, parseInt(e.target.value) || 0) }))}
            fullWidth
            required
            size="small"
            inputProps={{ min: 0 }}
          />

          <TextField
            label="Locatie"
            value={formData.location}
            onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
            fullWidth
            size="small"
            placeholder="ex: Etaj 2, Zona A"
          />

          <TextField
            label="Note"
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            fullWidth
            size="small"
            multiline
            rows={3}
            placeholder="Note aditionale..."
          />

          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ro}>
            <DatePicker
              label="Data"
              value={formData.dateAdded}
              onChange={(date) => setFormData((prev) => ({ ...prev, dateAdded: date as Date | null }))}
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                },
              }}
            />
          </LocalizationProvider>
        </Stack>
      </FriendlyDialog>

      {/* Delete Confirmation Dialog */}
      <FriendlyDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Sterge Intrare"
        subtitle="Aceasta actiune este ireversibila"
        variant="error"
        maxWidth="xs"
        confirmText="Sterge"
        cancelText="Anuleaza"
        onConfirm={handleDeleteConfirm}
        confirmLoading={isDeleting}
      >
        <Typography variant="body2" color="text.secondary">
          Esti sigur ca vrei sa stergi aceasta intrare din stoc?
        </Typography>
      </FriendlyDialog>
    </Box>
  );
};

export default StockCategoryTab;
