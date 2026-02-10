import React, { useState, useEffect } from 'react';
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
  Stack,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Typography,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import {
  useGetParkingLotsQuery,
  useGetEquipmentListQuery,
  useGetCompanyListQuery,
  useCreateEditRequestMutation,
} from '../../../store/api/parking.api';
import type { ParkingIssue } from '../../../types/parking.types';

interface EditIssueDialogProps {
  open: boolean;
  onClose: () => void;
  issue: ParkingIssue;
}

const EditIssueDialog: React.FC<EditIssueDialogProps> = ({
  open,
  onClose,
  issue,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAppSelector((state) => state.auth);

  const isAdmin = user?.role === 'ADMIN';

  const [formData, setFormData] = useState({
    parkingLotId: issue.parkingLotId,
    equipment: issue.equipment,
    contactedCompany: issue.contactedCompany,
    description: issue.description,
  });
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const { data: parkingLots = [] } = useGetParkingLotsQuery();
  const { data: equipmentList = [] } = useGetEquipmentListQuery();
  const { data: companyList = [] } = useGetCompanyListQuery();
  const [createEditRequest, { isLoading }] = useCreateEditRequestMutation();

  useEffect(() => {
    if (open) {
      setFormData({
        parkingLotId: issue.parkingLotId,
        equipment: issue.equipment,
        contactedCompany: issue.contactedCompany,
        description: issue.description,
      });
      setReason('');
      setError('');
    }
  }, [open, issue]);

  const hasChanges = () => {
    return (
      formData.parkingLotId !== issue.parkingLotId ||
      formData.equipment !== issue.equipment ||
      formData.contactedCompany !== issue.contactedCompany ||
      formData.description !== issue.description
    );
  };

  const getChanges = () => {
    const changes: Record<string, any> = {};
    if (formData.parkingLotId !== issue.parkingLotId) {
      changes.parkingLotId = formData.parkingLotId;
    }
    if (formData.equipment !== issue.equipment) {
      changes.equipment = formData.equipment;
    }
    if (formData.contactedCompany !== issue.contactedCompany) {
      changes.contactedCompany = formData.contactedCompany;
    }
    if (formData.description !== issue.description) {
      changes.description = formData.description;
    }
    return changes;
  };

  const handleSubmit = async () => {
    if (!hasChanges()) {
      setError('Nu ai făcut nicio modificare');
      return;
    }

    if (!isAdmin && !reason.trim()) {
      setError('Te rugăm să specifici motivul modificării');
      return;
    }

    try {
      await createEditRequest({
        requestType: 'PARKING_ISSUE',
        entityId: issue.id,
        proposedChanges: getChanges(),
        reason: reason.trim() || undefined,
      }).unwrap();

      onClose();
    } catch (err: any) {
      setError(err.data?.message || 'Eroare la trimiterea cererii de editare');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EditIcon color="primary" />
        <span>Editează Problemă</span>
        {!isAdmin && (
          <Chip
            label="Necesită aprobare"
            color="warning"
            size="small"
            sx={{ ml: 'auto' }}
          />
        )}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {!isAdmin && (
            <Alert severity="info">
              Ca manager, modificările propuse vor fi trimise pentru aprobare la un administrator.
            </Alert>
          )}

          <FormControl fullWidth>
            <InputLabel>Parcare</InputLabel>
            <Select
              value={formData.parkingLotId}
              label="Parcare"
              onChange={(e) => setFormData({ ...formData, parkingLotId: e.target.value })}
            >
              {parkingLots.map((lot) => (
                <MenuItem key={lot.id} value={lot.id}>
                  {lot.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Echipament</InputLabel>
            <Select
              value={formData.equipment}
              label="Echipament"
              onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
            >
              {equipmentList.map((eq) => (
                <MenuItem key={eq} value={eq}>
                  {eq}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Firmă contactată</InputLabel>
            <Select
              value={formData.contactedCompany}
              label="Firmă contactată"
              onChange={(e) => setFormData({ ...formData, contactedCompany: e.target.value })}
            >
              {companyList.map((company) => (
                <MenuItem key={company} value={company}>
                  {company}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Descriere problemă"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          {!isAdmin && (
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Motivul modificării *"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explică de ce este necesară această modificare..."
              helperText="Acest mesaj va fi trimis administratorului pentru aprobare"
            />
          )}

          {hasChanges() && (
            <Alert severity="warning" icon={false}>
              <Typography variant="subtitle2" gutterBottom>
                Modificări propuse:
              </Typography>
              {formData.parkingLotId !== issue.parkingLotId && (
                <Typography variant="body2">
                  • Parcare: {issue.parkingLot?.name} → {parkingLots.find(l => l.id === formData.parkingLotId)?.name}
                </Typography>
              )}
              {formData.equipment !== issue.equipment && (
                <Typography variant="body2">
                  • Echipament: {issue.equipment} → {formData.equipment}
                </Typography>
              )}
              {formData.contactedCompany !== issue.contactedCompany && (
                <Typography variant="body2">
                  • Firmă: {issue.contactedCompany} → {formData.contactedCompany}
                </Typography>
              )}
              {formData.description !== issue.description && (
                <Typography variant="body2">
                  • Descriere modificată
                </Typography>
              )}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Anulează
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isLoading || !hasChanges()}
          startIcon={isLoading ? <CircularProgress size={20} /> : <EditIcon />}
        >
          {isAdmin ? 'Salvează' : 'Trimite pentru aprobare'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditIssueDialog;
