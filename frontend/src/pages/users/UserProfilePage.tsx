import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Avatar,
  Button,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Stack,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Lock as LockIcon,
  ArrowBack as BackIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useGetCurrentUserQuery, useUpdateUserMutation } from '../../store/api/users.api';
import { ChangePasswordDialog } from '../../components/users/ChangePasswordDialog';
import { UserForm } from '../../components/users/UserForm';
import { UserStatusChip } from '../../components/users/UserStatusChip';

const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { data: user, isLoading, error } = useGetCurrentUserQuery();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  const [editMode, setEditMode] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const handleEditSubmit = async (data: any) => {
    if (!user) return;
    try {
      await updateUser({ id: user.id, data }).unwrap();
      setEditMode(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      case 'MANAGER':
        return 'Manager';
      case 'ANGAJAT':
        return 'Angajat';
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'error';
      case 'MANAGER':
        return 'warning';
      case 'ANGAJAT':
        return 'info';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">A apărut o eroare la încărcarea profilului</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            <BackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Profilul Meu
          </Typography>
          {!editMode && (
            <>
              <Button
                variant="outlined"
                startIcon={<LockIcon />}
                onClick={() => setPasswordDialogOpen(true)}
                sx={{ mr: 1 }}
              >
                Schimbă Parola
              </Button>
              <Button variant="contained" startIcon={<EditIcon />} onClick={() => setEditMode(true)}>
                Editează Profil
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {editMode ? (
          <Paper sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>
              Editează Profil
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <UserForm
              initialData={{
                email: user.email,
                fullName: user.fullName,
                phone: user.phone || '',
                role: user.role,
                departmentId: user.departmentId || '',
              }}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditMode(false)}
              isLoading={isUpdating}
            />
          </Paper>
        ) : (
          <>
            <Paper sx={{ p: 4, mb: 3 }}>
              <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 3 }}>
                <Avatar
                  src={user.avatarUrl || undefined}
                  sx={{ width: 100, height: 100, fontSize: '2.5rem' }}
                >
                  {user.fullName.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" gutterBottom>
                    {user.fullName}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Chip
                      label={getRoleLabel(user.role)}
                      color={getRoleBadgeColor(user.role) as any}
                      size="small"
                    />
                    <UserStatusChip isActive={user.isActive} />
                  </Stack>
                </Box>
              </Stack>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <Stack spacing={3}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <EmailIcon color="action" fontSize="small" />
                      <Typography variant="overline" color="text.secondary">
                        Email
                      </Typography>
                    </Stack>
                    <Typography variant="body1">{user.email}</Typography>
                  </Box>

                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <PhoneIcon color="action" fontSize="small" />
                      <Typography variant="overline" color="text.secondary">
                        Telefon
                      </Typography>
                    </Stack>
                    <Typography variant="body1">{user.phone || 'Nu este setat'}</Typography>
                  </Box>
                </Stack>

                <Stack spacing={3}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <BusinessIcon color="action" fontSize="small" />
                      <Typography variant="overline" color="text.secondary">
                        Departament
                      </Typography>
                    </Stack>
                    <Typography variant="body1">
                      {user.department?.name || 'Fără departament'}
                    </Typography>
                  </Box>

                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <CalendarIcon color="action" fontSize="small" />
                      <Typography variant="overline" color="text.secondary">
                        Ultima Autentificare
                      </Typography>
                    </Stack>
                    <Typography variant="body1">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleString('ro-RO')
                        : 'Niciodată'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Paper>

            <Paper sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom>
                Informații Cont
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Data Creării
                  </Typography>
                  <Typography variant="body1">
                    {new Date(user.createdAt).toLocaleDateString('ro-RO')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Ultima Actualizare
                  </Typography>
                  <Typography variant="body1">
                    {new Date(user.updatedAt).toLocaleDateString('ro-RO')}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </>
        )}
      </Container>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        userId={user.id}
        isAdmin={false}
      />
    </Box>
  );
};

export default UserProfilePage;
