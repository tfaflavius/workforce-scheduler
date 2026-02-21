import React, { useState, useRef } from 'react';
import {
  Stack,
  Typography,
  Box,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Gesture as SignatureIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  FriendlyDialog,
  FriendlyAlert,
  FriendlyButton,
} from '../../../components/common';
import { useAddDamageSignatureMutation } from '../../../store/api/parking.api';
import type { ParkingDamage } from '../../../types/parking.types';
import SignatureCanvas from './SignatureCanvas';
import type { SignatureCanvasRef } from './SignatureCanvas';

interface SignDamageDialogProps {
  open: boolean;
  onClose: () => void;
  damage: ParkingDamage;
}

const SignDamageDialog: React.FC<SignDamageDialogProps> = ({ open, onClose, damage }) => {
  const theme = useTheme();

  const [addSignature, { isLoading: saving }] = useAddDamageSignatureMutation();
  const [error, setError] = useState<string | null>(null);
  const signatureRef = useRef<SignatureCanvasRef>(null);

  const handleSubmit = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setError('Te rog deseneaza semnatura inainte de a salva');
      return;
    }

    const signatureData = signatureRef.current.toDataURL();

    try {
      await addSignature({ id: damage.id, signatureData }).unwrap();
      handleClose();
    } catch (err: any) {
      setError(err.data?.message || 'A aparut o eroare la salvarea semnaturii');
    }
  };

  const handleClose = () => {
    setError(null);
    signatureRef.current?.clear();
    onClose();
  };

  return (
    <FriendlyDialog
      open={open}
      onClose={handleClose}
      title="Adauga Semnatura"
      subtitle={`${damage.personName} - ${damage.parkingLot?.name || 'Parcare'}`}
      icon={<SignatureIcon />}
      variant="warning"
      maxWidth="sm"
      actions={
        <Stack direction="row" spacing={1.5} sx={{ width: '100%', justifyContent: 'flex-end' }}>
          <FriendlyButton
            colorVariant="ghost"
            onClick={handleClose}
            disabled={saving}
          >
            Anuleaza
          </FriendlyButton>
          <FriendlyButton
            colorVariant="warning"
            onClick={handleSubmit}
            loading={saving}
            loadingText="Se salveaza..."
            icon={<SaveIcon />}
          >
            Salveaza Semnatura
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

        <Box sx={{ bgcolor: alpha(theme.palette.info.main, 0.04), p: 2, borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Echipament avariat:</strong> {damage.damagedEquipment}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            <strong>Nr. Masina:</strong> {damage.carPlate}
          </Typography>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 3,
            borderColor: alpha(theme.palette.divider, 0.5),
            bgcolor: alpha(theme.palette.background.default, 0.3),
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: theme.palette.warning.main,
              boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.1)}`,
            },
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  color: 'warning.main',
                  display: 'flex',
                }}
              >
                <SignatureIcon />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  Semnatura contravenientului
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Deseneaza semnatura in spatiul de mai jos
                </Typography>
              </Box>
            </Stack>
            <FriendlyButton
              colorVariant="error"
              variant="outlined"
              size="small"
              onClick={() => signatureRef.current?.clear()}
              icon={<DeleteIcon />}
            >
              Sterge
            </FriendlyButton>
          </Stack>
          <Box
            sx={{
              border: `2px dashed ${alpha(theme.palette.divider, 0.5)}`,
              borderRadius: 2.5,
              overflow: 'hidden',
              bgcolor: theme.palette.background.paper,
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: theme.palette.warning.main,
              },
            }}
          >
            <SignatureCanvas ref={signatureRef} />
          </Box>
        </Paper>
      </Stack>
    </FriendlyDialog>
  );
};

export default SignDamageDialog;
