import React from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Edit as EditIcon,
} from '@mui/icons-material';
import type { User } from '../../../store/api/users.api';

export interface ScheduleEditDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedUser: User | null;
  selectedMonth: string;
  isAdmin: boolean;
  isMobile: boolean;
}

const ScheduleEditDialog: React.FC<ScheduleEditDialogProps> = ({
  open,
  onClose,
  onConfirm,
  selectedUser,
  selectedMonth,
  isAdmin,
  isMobile,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>
        Editare Program - {selectedUser?.fullName}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {isAdmin ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Ca <strong>Administrator</strong>, poti edita direct programul. Modificarile vor fi aplicate imediat.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Ca <strong>Manager</strong>, poti edita programul angajatilor, dar modificarile vor trebui <strong>aprobate de un administrator</strong> inainte de a fi active.
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            Vei fi redirectionat catre pagina de creare/editare program pentru <strong>{selectedUser?.fullName}</strong> pentru luna {new Date(`${selectedMonth}-01`).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Anuleaza
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          startIcon={<EditIcon />}
        >
          Continua la Editare
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default React.memo(ScheduleEditDialog);
