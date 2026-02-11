import React, { useState } from 'react';
import {
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ReportProblem as IssueIcon,
  LocalParking as ParkingIcon,
  Build as EquipmentIcon,
  Business as CompanyIcon,
  Description as DescriptionIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  FriendlyDialog,
  FriendlySelect,
  FriendlyAutocomplete,
  FriendlyTextField,
  FriendlyAlert,
  FriendlyButton,
} from '../../../components/common';
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

  // Convert parking lots to select options
  const parkingOptions = parkingLots.map((lot) => ({
    value: lot.id,
    label: lot.name,
    icon: <ParkingIcon />,
  }));

  return (
    <FriendlyDialog
      open={open}
      onClose={handleClose}
      title="Adaugă Problemă Nouă"
      subtitle="Raportează o problemă la echipamentul parcării"
      icon={<IssueIcon />}
      variant="error"
      maxWidth="sm"
      loading={isLoading}
      loadingText="Se încarcă datele..."
      actions={
        <Stack direction="row" spacing={1.5} sx={{ width: '100%', justifyContent: 'flex-end' }}>
          <FriendlyButton
            colorVariant="ghost"
            onClick={handleClose}
            disabled={creating}
          >
            Anulează
          </FriendlyButton>
          <FriendlyButton
            colorVariant="error"
            onClick={handleSubmit}
            loading={creating}
            loadingText="Se salvează..."
            icon={<SaveIcon />}
            disabled={isLoading}
          >
            Salvează
          </FriendlyButton>
        </Stack>
      }
    >
      <Stack spacing={2.5}>
        {error && (
          <FriendlyAlert
            severity="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        <FriendlySelect
          label="Parcarea"
          value={formData.parkingLotId}
          onChange={(e) => setFormData({ ...formData, parkingLotId: e.target.value as string })}
          options={parkingOptions}
          startIcon={<ParkingIcon />}
          required
        />

        <FriendlyAutocomplete
          label="Echipament"
          options={equipmentList}
          value={formData.equipment || null}
          onChange={(value) => setFormData({ ...formData, equipment: value || '' })}
          startIcon={<EquipmentIcon />}
          freeSolo
          required
          placeholder="Selectează sau scrie echipamentul"
        />

        <FriendlyAutocomplete
          label="Firma / Compartiment contactat"
          options={companyList}
          value={formData.contactedCompany || null}
          onChange={(value) => setFormData({ ...formData, contactedCompany: value || '' })}
          startIcon={<CompanyIcon />}
          freeSolo
          required
          placeholder="Selectează sau scrie firma"
        />

        <FriendlyTextField
          label="Descrierea problemei"
          multiline
          rows={isMobile ? 3 : 4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          fullWidth
          placeholder="Descrie problema în detaliu..."
          startIcon={<DescriptionIcon />}
          characterLimit={1000}
        />
      </Stack>
    </FriendlyDialog>
  );
};

export default CreateIssueDialog;
