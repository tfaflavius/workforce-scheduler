import React, { useState } from 'react';
import {
  Box,
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
  Stack,
  Avatar,
  Menu,
  MenuItem as MenuItemComponent,
  Dialog,
  DialogTitle,
  DialogContent,
  InputAdornment,
  Chip,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Collapse,
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
  FilterList as FilterIcon,
  HourglassEmpty as PendingIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const currentUser = useAppSelector((state) => state.auth.user);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

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

  const users = statusFilter === 'pending'
    ? allUsers?.filter(u => !u.isActive)
    : allUsers;

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
        return 'Admin';
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
    <Box sx={{
      width: '100%',
      maxWidth: 1400,
      mx: 'auto',
      px: { xs: 0, sm: 0 },
      overflow: 'hidden'
    }}>
      {/* Header */}
      <Box sx={{
        mb: 3,
        px: { xs: 2, sm: 0 }
      }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            mb: 2
          }}
        >
          Utilizatori
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            fullWidth={isMobile}
            size={isMobile ? "large" : "medium"}
            sx={{ py: isMobile ? 1.5 : 1 }}
          >
            Adaugă Utilizator
          </Button>
        )}
      </Box>

      {/* Filters - Collapsible on mobile */}
      <Box sx={{ px: { xs: 2, sm: 0 }, mb: 2 }}>
        {isMobile ? (
          <Card>
            <CardContent sx={{ p: 0 }}>
              {/* Search always visible */}
              <Box sx={{ p: 2, pb: 1 }}>
                <TextField
                  placeholder="Caută utilizator..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  size="small"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {/* Toggle filters button */}
              <Button
                fullWidth
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                endIcon={filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1,
                  color: 'text.secondary',
                  borderTop: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <FilterIcon fontSize="small" />
                  <span>Filtre</span>
                </Stack>
              </Button>

              {/* Collapsible filters */}
              <Collapse in={filtersExpanded}>
                <Stack spacing={2} sx={{ p: 2, pt: 1 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Rol</InputLabel>
                    <Select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      label="Rol"
                    >
                      <MenuItem value="">Toate</MenuItem>
                      <MenuItem value="ADMIN">Admin</MenuItem>
                      <MenuItem value="MANAGER">Manager</MenuItem>
                      <MenuItem value="ANGAJAT">Angajat</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" fullWidth>
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

                  <FormControl size="small" fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="">Toate</MenuItem>
                      <MenuItem value="pending">În așteptare</MenuItem>
                      <MenuItem value="active">Activ</MenuItem>
                      <MenuItem value="inactive">Inactiv</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Collapse>
            </CardContent>
          </Card>
        ) : (
          // Desktop filters
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <FilterIcon color="action" fontSize="small" />
              <Typography variant="subtitle1" fontWeight="medium">Filtre</Typography>
            </Stack>

            <Stack direction="column" spacing={2}>
              <TextField
                placeholder="Caută după nume sau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <Stack direction="row" spacing={2}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Rol</InputLabel>
                  <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} label="Rol">
                    <MenuItem value="">Toate</MenuItem>
                    <MenuItem value="ADMIN">Admin</MenuItem>
                    <MenuItem value="MANAGER">Manager</MenuItem>
                    <MenuItem value="ANGAJAT">Angajat</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 160 }}>
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

                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="">Toate</MenuItem>
                    <MenuItem value="pending">În așteptare</MenuItem>
                    <MenuItem value="active">Activ</MenuItem>
                    <MenuItem value="inactive">Inactiv</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
          </Paper>
        )}
      </Box>

      {/* Alerts */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Eroare la încărcarea utilizatorilor
          </Alert>
        )}

        {pendingUsersCount > 0 && statusFilter !== 'pending' && (
          <Alert
            severity="info"
            sx={{ mb: 2 }}
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
      </Box>

      {/* Users List */}
      {isMobile ? (
        // Mobile Card View
        <Box sx={{ px: 2 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : paginatedUsers.length === 0 ? (
            <Card>
              <CardContent sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Nu s-au găsit utilizatori
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Stack spacing={2}>
              {paginatedUsers.map((user) => (
                <Card key={user.id}>
                  <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                        <Avatar
                          src={user.avatarUrl || undefined}
                          sx={{
                            width: 50,
                            height: 50,
                            bgcolor: 'primary.main',
                            fontSize: '1.25rem'
                          }}
                        >
                          {user.fullName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            variant="subtitle1"
                            fontWeight="bold"
                            sx={{
                              fontSize: '1rem',
                              lineHeight: 1.3,
                              mb: 0.25
                            }}
                          >
                            {user.fullName}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontSize: '0.85rem',
                              wordBreak: 'break-all',
                              mb: 1
                            }}
                          >
                            {user.email}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                            <Chip
                              label={getRoleLabel(user.role)}
                              color={getRoleBadgeColor(user.role) as any}
                              size="small"
                              sx={{ fontWeight: 500 }}
                            />
                            <UserStatusChip isActive={user.isActive} />
                          </Stack>
                        </Box>
                      </Stack>
                      {isAdmin && (
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, user)}
                          sx={{ ml: 1 }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      )}
                    </Stack>

                    {/* Additional info */}
                    {user.department && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          mt: 1.5,
                          pl: 8.5
                        }}
                      >
                        Departament: {user.department.name}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          {/* Mobile Pagination */}
          {users && users.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 1
              }}>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={users?.length || 0}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  labelRowsPerPage=""
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                  sx={{
                    '.MuiTablePagination-toolbar': {
                      pl: 1,
                      pr: 1,
                    },
                    '.MuiTablePagination-selectLabel': {
                      display: 'none',
                    },
                    '.MuiTablePagination-select': {
                      display: 'none',
                    },
                    '.MuiTablePagination-selectIcon': {
                      display: 'none',
                    },
                  }}
                />
              </Box>
            </Card>
          )}
        </Box>
      ) : (
        // Desktop Table View
        <Paper>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
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
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar src={user.avatarUrl || undefined} sx={{ width: 36, height: 36 }}>
                                {user.fullName.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography variant="body2">{user.fullName}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                              {user.email}
                            </Typography>
                          </TableCell>
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
                            <UserStatusChip isActive={user.isActive} />
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
      )}

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
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
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
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
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
