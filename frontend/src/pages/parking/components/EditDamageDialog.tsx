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
  useGetDamageEquipmentListQuery,
  useCreateEditRequestMutation,
} from '../../../store/api/parking.api';
import type { ParkingDamage } from '../../../types/parking.types';

interface EditDamageDialogProps {
  open: boolean;
  onClose: () => void;
  damage: ParkingDamage;
}

const EditDamageDialog: React.FC<EditDamageDialogProps> = ({
  open,
  onClose,
  damage,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAppSelector((state) => state.auth);

  const isAdmin = user?.role === 'ADMIN';

  const [formData, setFormData] = useState({
    parkingLotId: damage.parkingLotId,
    damagedEquipment: damage.damagedEquipment,
    personName: damage.personName,
    phone: damage.phone,
    carPlate: damage.carPlate,
    description: damage.description,
  });
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const { data: parkingLots = [] } = useGetParkingLotsQuery();
  const { data: damageEquipmentList = [] } = useGetDamageEquipmentListQuery();
  const [createEditRequest, { isLoading }] = useCreateEditRequestMutation();

  useEffect(() => {
    if (open) {
      setFormData({
        parkingLotId: damage.parkingLotId,
        damagedEquipment: damage.damagedEquipment,
        personName: damage.personName,
        phone: damage.phone,
        carPlate: damage.carPlate,
        description: damage.description,
      });
      setReason('');
      setError('');
    }
  }, [open, damage]);

  const hasChanges = () => {
    return (
      formData.parkingLotId !== damage.parkingLotId ||
      formData.damagedEquipment !== damage.damagedEquipment ||
      formData.personName !== damage.personName ||
      formData.phone !== damage.phone ||
      formData.carPlate !== damage.carPlate ||
      formData.description !== damage.description
    );
  };

  const getChanges = () => {
    const changes: Record<string, any> = {};
    if (formData.parkingLotId !== damage.parkingLotId) {
      changes.parkingLotId = formData.parkingLotId;
    }
    if (formData.damagedEquipment !== damage.damagedEquipment) {
      changes.damagedEquipment = formData.damagedEquipment;
    }
    if (formData.personName !== damage.personName) {
      changes.personName = formData.personName;
    }
    if (formData.phone !== damage.phone) {
      changes.phone = formData.phone;
    }
    if (formData.carPlate !== damage.carPlate) {
      changes.carPlate = formData.carPlate;
    }
    if (formData.description !== damage.description) {
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
        requestType: 'PARKING_DAMAGE',
        entityId: damage.id,
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
        <span>Editează Prejudiciu</span>
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
            <InputLabel>Echipament avariat</InputLabel>
            <Select
              value={formData.damagedEquipment}
              label="Echipament avariat"
              onChange={(e) => setFormData({ ...formData, damagedEquipment: e.target.value })}
            >
              {damageEquipmentList.map((eq) => (
                <MenuItem key={eq} value={eq}>
                  {eq}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Nume persoană responsabilă"
            value={formData.personName}
            onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
          />

          <TextField
            fullWidth
            label="Telefon"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <TextField
            fullWidth
            label="Număr mașină"
            value={formData.carPlate}
            onChange={(e) => setFormData({ ...formData, carPlate: e.target.value.toUpperCase() })}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Descriere prejudiciu"
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
              {formData.parkingLotId !== damage.parkingLotId && (
                <Typography variant="body2">
                  • Parcare: {damage.parkingLot?.name} → {parkingLots.find(l => l.id === formData.parkingLotId)?.name}
                </Typography>
              )}
              {formData.damagedEquipment !== damage.damagedEquipment && (
                <Typography variant="body2">
                  • Echipament: {damage.damagedEquipment} → {formData.damagedEquipment}
                </Typography>
              )}
              {formData.personName !== damage.personName && (
                <Typography variant="body2">
                  • Persoană: {damage.personName} → {formData.personName}
                </Typography>
              )}
              {formData.phone !== damage.phone && (
                <Typography variant="body2">
                  • Telefon: {damage.phone} → {formData.phone}
                </Typography>
              )}
              {formData.carPlate !== damage.carPlate && (
                <Typography variant="body2">
                  • Nr. mașină: {damage.carPlate} → {formData.carPlate}
                </Typography>
              )}
              {formData.description !== damage.description && (
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

export default EditDamageDialog;
