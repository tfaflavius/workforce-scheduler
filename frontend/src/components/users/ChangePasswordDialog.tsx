import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
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
      errors.newPassword = 'Parola nouă este obligatorie';
    } else if (formData.newPassword.length < 6) {
      errors.newPassword = 'Minim 6 caractere';
    } else if (!/^(?=.*[A-Z])(?=.*[0-9])/.test(formData.newPassword)) {
      errors.newPassword = 'Parola trebuie să conțină cel puțin o majusculă și o cifră';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirmarea parolei este obligatorie';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Parolele nu se potrivesc';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Schimbă Parola</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {isSuccess && (
              <Alert severity="success">Parola a fost schimbată cu succes!</Alert>
            )}

            {error && (
              <Alert severity="error">
                {(error as any)?.data?.message || 'A apărut o eroare la schimbarea parolei'}
              </Alert>
            )}

            {!isAdmin && (
              <TextField
                label="Parola Veche"
                type="password"
                value={formData.oldPassword}
                onChange={handleChange('oldPassword')}
                error={!!formErrors.oldPassword}
                helperText={formErrors.oldPassword}
                fullWidth
                required
                autoFocus
              />
            )}

            <TextField
              label="Parola Nouă"
              type="password"
              value={formData.newPassword}
              onChange={handleChange('newPassword')}
              error={!!formErrors.newPassword}
              helperText={formErrors.newPassword}
              fullWidth
              required
              autoFocus={isAdmin}
            />

            <TextField
              label="Confirmă Parola Nouă"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              error={!!formErrors.confirmPassword}
              helperText={formErrors.confirmPassword}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>
            Anulează
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading || isSuccess}>
            {isLoading ? <CircularProgress size={24} /> : 'Schimbă Parola'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
