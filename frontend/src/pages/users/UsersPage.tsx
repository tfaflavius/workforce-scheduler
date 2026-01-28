import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  Stack,
  Avatar,
  Menu,
  MenuItem as MenuItemComponent,
  Dialog,
  DialogTitle,
  DialogContent,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  CheckCircle as ActiveIcon,
  Block as InactiveIcon,
  Home as HomeIcon,
  FilterList as FilterIcon,
  HourglassEmpty as PendingIcon,
  VerifiedUser as VerifiedIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useToggleUserStatusMutation,
} from '../../store/api/users.api';
import { useGetDepartmentsQuery } from '../../store/api/departmentsApi';
import { useAppSelector } from '../../store/hooks';
import { UserForm } from '../../components/users/UserForm';
import { ChangePasswordDialog } from '../../components/users/ChangePasswordDialog';
import { DeleteUserDialog } from '../../components/users/DeleteUserDialog';
import { UserStatusChip } from '../../components/users/UserStatusChip';
import type { User } from '../../store/api/users.api';

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filters: any = {
    search: search || undefined,
    role: roleFilter || undefined,
    departmentId: departmentFilter || undefined,
  };

  if (statusFilter === 'active') {
    filters.isActive = true;
  } else if (statusFilter === 'inactive') {
    filters.isActive = false;
  }

  const { data: allUsers, isLoading, error } = useGetUsersQuery(filters);

  // Filter for pending users (not active and email verified or waiting for email)
  const users = statusFilter === 'pending'
    ? allUsers?.filter(u => !u.isActive)
    : allUsers;

  // Count pending users for badge
  const pendingUsersCount = allUsers?.filter(u => !u.isActive).length || 0;
  const { data: departments } = useGetDepartmentsQuery();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [toggleStatus] = useToggleUserStatusMutation();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleEdit = () => {
    if (selectedUser) {
      setEditUser(selectedUser);
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedUser) {
      setUserToDelete(selectedUser);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleChangePassword = () => {
    if (selectedUser) {
      setPasswordUser(selectedUser);
      setPasswordDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleToggleStatus = async () => {
    if (selectedUser) {
      try {
        await toggleStatus({
          id: selectedUser.id,
          isActive: !selectedUser.isActive,
        }).unwrap();
      } catch (err) {
        console.error('Failed to toggle user status:', err);
      }
    }
    handleMenuClose();
  };

  const handleCreateSubmit = async (data: any) => {
    try {
      await createUser(data).unwrap();
      setCreateDialogOpen(false);
    } catch (err) {
      console.error('Failed to create user:', err);
    }
  };

  const handleEditSubmit = async (data: any) => {
    if (!editUser) return;
    try {
      await updateUser({ id: editUser.id, data }).unwrap();
      setEditDialogOpen(false);
      setEditUser(null);
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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

  const isAdmin = currentUser?.role === 'ADMIN';

  const paginatedUsers = users
    ? users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : [];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            <HomeIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Gestionare Utilizatori
          </Typography>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Adaugă Utilizator
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <FilterIcon color="action" />
            <Typography variant="h6">Filtre</Typography>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              placeholder="Caută după nume sau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1 }}
            />

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Rol</InputLabel>
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} label="Rol">
                <MenuItem value="">Toate</MenuItem>
                <MenuItem value="ADMIN">Administrator</MenuItem>
                <MenuItem value="MANAGER">Manager</MenuItem>
                <MenuItem value="ANGAJAT">Angajat</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Departament</InputLabel>
              <Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                label="Departament"
              >
                <MenuItem value="">Toate</MenuItem>
                {departments?.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="">Toate</MenuItem>
                <MenuItem value="pending">În așteptare aprobare</MenuItem>
                <MenuItem value="active">Activ</MenuItem>
                <MenuItem value="inactive">Inactiv</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            A apărut o eroare la încărcarea utilizatorilor
          </Alert>
        )}

        {pendingUsersCount > 0 && statusFilter !== 'pending' && (
          <Alert
            severity="info"
            sx={{ mb: 3 }}
            icon={<PendingIcon />}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setStatusFilter('pending')}
              >
                Vezi
              </Button>
            }
          >
            <strong>{pendingUsersCount}</strong> {pendingUsersCount === 1 ? 'cont așteaptă' : 'conturi așteaptă'} aprobare
          </Alert>
        )}

        <Paper>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Utilizator</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Rol</TableCell>
                      <TableCell>Departament</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Ultima Autentificare</TableCell>
                      <TableCell align="right">Acțiuni</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                            Nu s-au găsit utilizatori
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUsers.map((user) => (
                        <TableRow key={user.id} hover>
                          <TableCell>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Avatar src={user.avatarUrl || undefined}>
                                {user.fullName.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography variant="body2">{user.fullName}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={getRoleLabel(user.role)}
                              color={getRoleBadgeColor(user.role) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {user.department ? user.department.name : '-'}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <UserStatusChip isActive={user.isActive} />
                              {!user.isActive && (
                                <Chip
                                  icon={user.emailVerified ? <VerifiedIcon /> : <PendingIcon />}
                                  label={user.emailVerified ? 'Email verificat' : 'Așteaptă email'}
                                  size="small"
                                  color={user.emailVerified ? 'success' : 'warning'}
                                  variant="outlined"
                                />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            {user.lastLogin
                              ? new Date(user.lastLogin).toLocaleDateString('ro-RO')
                              : 'Niciodată'}
                          </TableCell>
                          <TableCell align="right">
                            {isAdmin && (
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, user)}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={users?.length || 0}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Rânduri per pagină:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} din ${count}`}
              />
            </>
          )}
        </Paper>
      </Container>

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItemComponent onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Editează
        </MenuItemComponent>
        <MenuItemComponent onClick={handleChangePassword}>
          <LockIcon fontSize="small" sx={{ mr: 1 }} />
          Schimbă Parola
        </MenuItemComponent>
        <MenuItemComponent onClick={handleToggleStatus}>
          {selectedUser?.isActive ? (
            <>
              <InactiveIcon fontSize="small" sx={{ mr: 1 }} />
              Dezactivează
            </>
          ) : (
            <>
              <ActiveIcon fontSize="small" sx={{ mr: 1 }} />
              Activează
            </>
          )}
        </MenuItemComponent>
        <MenuItemComponent onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Șterge
        </MenuItemComponent>
      </Menu>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adaugă Utilizator Nou</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <UserForm
              isCreate
              onSubmit={handleCreateSubmit}
              onCancel={() => setCreateDialogOpen(false)}
              isLoading={isCreating}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editează Utilizator</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <UserForm
              initialData={editUser ? {
                email: editUser.email,
                fullName: editUser.fullName,
                phone: editUser.phone || '',
                role: editUser.role,
                departmentId: editUser.departmentId || '',
              } : undefined}
              onSubmit={handleEditSubmit}
              onCancel={() => {
                setEditDialogOpen(false);
                setEditUser(null);
              }}
              isLoading={isUpdating}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => {
          setPasswordDialogOpen(false);
          setPasswordUser(null);
        }}
        userId={passwordUser?.id || ''}
        isAdmin={isAdmin}
      />

      {/* Delete User Dialog */}
      <DeleteUserDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setUserToDelete(null);
        }}
        user={userToDelete}
      />
    </Box>
  );
};

export default UsersPage;
