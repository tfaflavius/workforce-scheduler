import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Button,
  Divider,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Edit as EditIcon,
  Lock as LockIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useGetCurrentUserQuery, useUpdateUserMutation } from '../../store/api/users.api';
import { ChangePasswordDialog } from '../../components/users/ChangePasswordDialog';
import { UserForm } from '../../components/users/UserForm';
import { UserStatusChip } from '../../components/users/UserStatusChip';

const UserProfilePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !user) {
    return (
      <Alert severity="error">A apărut o eroare la încărcarea profilului</Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          gutterBottom
          sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
        >
          Profilul Meu
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gestionează informațiile contului tău
        </Typography>
      </Box>

      {/* Action Buttons */}
      {!editMode && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => setEditMode(true)}
            fullWidth={isMobile}
            size={isMobile ? "large" : "medium"}
          >
            Editează Profil
          </Button>
          <Button
            variant="outlined"
            startIcon={<LockIcon />}
            onClick={() => setPasswordDialogOpen(true)}
            fullWidth={isMobile}
            size={isMobile ? "large" : "medium"}
          >
            Schimbă Parola
          </Button>
        </Stack>
      )}

      {editMode ? (
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
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
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={3}>
          {/* Profile Card */}
          <Card>
            <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
              {/* User Info Header */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
                alignItems={{ xs: 'center', sm: 'flex-start' }}
                sx={{ mb: 3 }}
              >
                <Avatar
                  src={user.avatarUrl || undefined}
                  sx={{
                    width: { xs: 80, sm: 100 },
                    height: { xs: 80, sm: 100 },
                    fontSize: { xs: '2rem', sm: '2.5rem' },
                    bgcolor: 'primary.main'
                  }}
                >
                  {user.fullName.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ textAlign: { xs: 'center', sm: 'left' }, flex: 1 }}>
                  <Typography
                    variant="h4"
                    gutterBottom
                    sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
                  >
                    {user.fullName}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent={{ xs: 'center', sm: 'flex-start' }}
                    flexWrap="wrap"
                    gap={1}
                  >
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

              {/* User Details Grid */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: { xs: 2.5, sm: 3 }
                }}
              >
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: '#e3f2fd',
                      display: 'flex'
                    }}
                  >
                    <EmailIcon sx={{ color: '#1976d2' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Email
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ wordBreak: 'break-all', fontSize: { xs: '0.9rem', sm: '1rem' } }}
                    >
                      {user.email}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: '#e8f5e9',
                      display: 'flex'
                    }}
                  >
                    <PhoneIcon sx={{ color: '#2e7d32' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Telefon
                    </Typography>
                    <Typography variant="body1" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                      {user.phone || 'Nu este setat'}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: '#fff3e0',
                      display: 'flex'
                    }}
                  >
                    <BusinessIcon sx={{ color: '#ed6c02' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Departament
                    </Typography>
                    <Typography variant="body1" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                      {user.department?.name || 'Fără departament'}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: '#e1f5fe',
                      display: 'flex'
                    }}
                  >
                    <CalendarIcon sx={{ color: '#0288d1' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Ultima Autentificare
                    </Typography>
                    <Typography variant="body1" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleString('ro-RO')
                        : 'Niciodată'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {/* Account Info Card */}
          <Card>
            <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Informații Cont
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Data Creării
                  </Typography>
                  <Typography variant="body1" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                    {new Date(user.createdAt).toLocaleDateString('ro-RO')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Ultima Actualizare
                  </Typography>
                  <Typography variant="body1" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                    {new Date(user.updatedAt).toLocaleDateString('ro-RO')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Stack>
      )}

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
