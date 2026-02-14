import React from 'react';
import { Stack } from '@mui/material';
import {
  Lock as LockIcon,
  VpnKey as KeyIcon,
  LockReset as ResetIcon,
} from '@mui/icons-material';
import {
  FriendlyDialog,
  FriendlyTextField,
  FriendlyAlert,
  FriendlyButton,
} from '../common';
import { useChangePasswordMutation } from '../../store/api/users.api';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  isAdmin?: boolean;
}

export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  open,
  onClose,
  userId,
  isAdmin = false,
}) => {
  const [changePassword, { isLoading, error, isSuccess }] = useChangePasswordMutation();
  const [formData, setFormData] = React.useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!isAdmin && !formData.oldPassword) {
      errors.oldPassword = 'Parola veche este obligatorie';
    }

    if (!formData.newPassword) {
      errors.newPassword = 'Parola noua este obligatorie';
    } else if (formData.newPassword.length < 6) {
      errors.newPassword = 'Minim 6 caractere';
    } else if (!/^(?=.*[A-Z])(?=.*[0-9])/.test(formData.newPassword)) {
      errors.newPassword = 'Parola trebuie sa contina cel putin o majuscula si o cifra';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirmarea parolei este obligatorie';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Parolele nu se potrivesc';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await changePassword({ id: userId, data: formData }).unwrap();
      setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setFormErrors({});
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      // Error handled by RTK Query
    }
  };

  const handleClose = () => {
    setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setFormErrors({});
    onClose();
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: '' });
    }
  };

  return (
    <FriendlyDialog
      open={open}
      onClose={handleClose}
      title="Schimba Parola"
      subtitle={isAdmin ? 'Reseteaza parola utilizatorului' : 'Actualizeaza-ti parola de acces'}
      icon={<LockIcon />}
      variant="primary"
      maxWidth="sm"
      actions={
        <Stack direction="row" spacing={1.5} sx={{ width: '100%', justifyContent: 'flex-end' }}>
          <FriendlyButton
            colorVariant="ghost"
            onClick={handleClose}
            disabled={isLoading}
          >
            Anuleaza
          </FriendlyButton>
          <FriendlyButton
            colorVariant="primary"
            onClick={handleSubmit}
            loading={isLoading}
            loadingText="Se salveaza..."
            icon={<ResetIcon />}
            disabled={isSuccess}
          >
            Schimba Parola
          </FriendlyButton>
        </Stack>
      }
    >
      <Stack spacing={2.5}>
        {isSuccess && (
          <FriendlyAlert
            severity="success"
            title="Succes!"
            message="Parola a fost schimbata cu succes!"
          />
        )}

        {error && (
          <FriendlyAlert
            severity="error"
            message={(error as any)?.data?.message || 'A aparut o eroare la schimbarea parolei'}
          />
        )}

        {!isAdmin && (
          <FriendlyTextField
            label="Parola Veche"
            type="password"
            value={formData.oldPassword}
            onChange={handleChange('oldPassword')}
            error={!!formErrors.oldPassword}
            helperText={formErrors.oldPassword}
            fullWidth
            required
            autoFocus
            startIcon={<KeyIcon />}
          />
        )}

        <FriendlyTextField
          label="Parola Noua"
          type="password"
          value={formData.newPassword}
          onChange={handleChange('newPassword')}
          error={!!formErrors.newPassword}
          helperText={formErrors.newPassword}
          fullWidth
          required
          autoFocus={isAdmin}
          startIcon={<LockIcon />}
          hint="Minim 6 caractere, o majuscula si o cifra"
        />

        <FriendlyTextField
          label="Confirma Parola Noua"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange('confirmPassword')}
          error={!!formErrors.confirmPassword}
          helperText={formErrors.confirmPassword}
          fullWidth
          required
          startIcon={<LockIcon />}
          showSuccessState={!!(formData.confirmPassword && formData.newPassword === formData.confirmPassword)}
          successMessage="Parolele se potrivesc"
        />
      </Stack>
    </FriendlyDialog>
  );
};
