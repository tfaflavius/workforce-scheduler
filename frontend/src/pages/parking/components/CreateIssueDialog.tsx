import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Stack,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  useGetParkingLotsQuery,
  useGetEquipmentListQuery,
  useGetCompanyListQuery,
  useCreateParkingIssueMutation,
} from '../../../store/api/parking.api';
import type { CreateParkingIssueDto } from '../../../types/parking.types';

interface CreateIssueDialogProps {
  open: boolean;
  onClose: () => void;
}

const CreateIssueDialog: React.FC<CreateIssueDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { data: parkingLots = [], isLoading: lotsLoading } = useGetParkingLotsQuery();
  const { data: equipmentList = [], isLoading: equipmentLoading } = useGetEquipmentListQuery();
  const { data: companyList = [], isLoading: companiesLoading } = useGetCompanyListQuery();

  const [createIssue, { isLoading: creating }] = useCreateParkingIssueMutation();

  const [formData, setFormData] = useState<CreateParkingIssueDto>({
    parkingLotId: '',
    equipment: '',
    contactedCompany: '',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!formData.parkingLotId || !formData.equipment || !formData.contactedCompany || !formData.description) {
      setError('Toate câmpurile sunt obligatorii');
      return;
    }

    try {
      await createIssue(formData).unwrap();
      handleClose();
    } catch (err: any) {
      setError(err.data?.message || 'A apărut o eroare');
    }
  };

  const handleClose = () => {
    setFormData({
      parkingLotId: '',
      equipment: '',
      contactedCompany: '',
      description: '',
    });
    setError(null);
    onClose();
  };

  const isLoading = lotsLoading || equipmentLoading || companiesLoading;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>Adaugă Problemă Nouă</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress />
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <FormControl fullWidth required>
              <InputLabel>Parcarea</InputLabel>
              <Select
                value={formData.parkingLotId}
                label="Parcarea"
                onChange={(e) => setFormData({ ...formData, parkingLotId: e.target.value })}
              >
                {parkingLots.map((lot) => (
                  <MenuItem key={lot.id} value={lot.id}>
                    {lot.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              options={equipmentList}
              value={formData.equipment || null}
              onChange={(_, value) => setFormData({ ...formData, equipment: value || '' })}
              renderInput={(params) => (
                <TextField {...params} label="Echipament" required />
              )}
              freeSolo
            />

            <Autocomplete
              options={companyList}
              value={formData.contactedCompany || null}
              onChange={(_, value) => setFormData({ ...formData, contactedCompany: value || '' })}
              renderInput={(params) => (
                <TextField {...params} label="Firma / Compartiment contactat" required />
              )}
              freeSolo
            />

            <TextField
              label="Descrierea problemei"
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              fullWidth
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={creating}>
          Anulează
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={creating || isLoading}
        >
          {creating ? <CircularProgress size={24} /> : 'Salvează'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateIssueDialog;
