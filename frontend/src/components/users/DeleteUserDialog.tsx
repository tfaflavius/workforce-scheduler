import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useDeleteUserMutation } from '../../store/api/users.api';
import type { User } from '../../store/api/users.api';

interface DeleteUserDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

export const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({ open, onClose, user }) => {
  const [deleteUser, { isLoading, error }] = useDeleteUserMutation();

  const handleDelete = async () => {
    if (!user) return;

    try {
      await deleteUser(user.id).unwrap();
      onClose();
    } catch (err) {
      // Error handled by RTK Query
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Sterge Utilizator</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(error as any)?.data?.message || 'A aparut o eroare la stergerea utilizatorului'}
          </Alert>
        )}

        <DialogContentText>
          Esti sigur ca vrei sa stergi utilizatorul{' '}
          <strong>{user?.fullName}</strong> ({user?.email})?
        </DialogContentText>
        <DialogContentText sx={{ mt: 2, color: 'error.main' }}>
          Aceasta actiune este permanenta si nu poate fi anulata.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Anuleaza
        </Button>
        <Button onClick={handleDelete} color="error" variant="contained" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : 'Sterge'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
