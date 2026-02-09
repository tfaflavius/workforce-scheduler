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
  Fade,
  Grow,
  alpha,
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
  People as PeopleIcon,
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
      case 'USER':
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
      case 'USER':
        return 'User';
      default:
        return role;
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  const paginatedUsers = users
    ? users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : [];

  return (
    <Box sx={{ width: '100%', overflow: 'hidden', p: { xs: 0, sm: 1 } }}>
      {/* Header */}
      <Fade in={true} timeout={600}>
        <Box
          sx={{
            mb: { xs: 2, sm: 3 },
            p: { xs: 2.5, sm: 3, md: 4 },
            borderRadius: { xs: 2, sm: 3 },
            background: theme.palette.mode === 'light'
              ? 'linear-gradient(135deg, #0891b2 0%, #2563eb 100%)'
              : 'linear-gradient(135deg, #0e7490 0%, #1e40af 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(8, 145, 178, 0.3)',
          }}
        >
          {/* Background decorations */}
          <Box
            sx={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -40,
              left: -40,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
            }}
          />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={2}
            sx={{ position: 'relative' }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  display: { xs: 'none', sm: 'flex' },
                }}
              >
                <PeopleIcon sx={{ fontSize: { sm: 32, md: 40 } }} />
              </Box>
              <Box>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{
                    fontSize: { xs: '1.35rem', sm: '1.5rem', md: '1.85rem' },
                    mb: 0.5,
                  }}
                >
                  Utilizatori
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.9,
                    fontSize: { xs: '0.8rem', sm: '0.875rem' }
                  }}
                >
                  Gestionează utilizatorii și permisiunile
                </Typography>
              </Box>
            </Stack>

            {isAdmin && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                fullWidth={isMobile}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  fontWeight: 600,
                  py: { xs: 1.25, sm: 1.5 },
                  px: { xs: 3, sm: 4 },
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.3)',
                  },
                }}
              >
                Adaugă Utilizator
              </Button>
            )}
          </Stack>
        </Box>
      </Fade>

      {/* Filters */}
      <Grow in={true} timeout={700}>
        <Box sx={{ mb: { xs: 2, sm: 3 }, width: '100%' }}>
          {isMobile ? (
            <Card
              sx={{
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: 0 }}>
                {/* Search always visible */}
                <Box sx={{ p: 2, pb: 1.5 }}>
                  <TextField
                    placeholder="Caută utilizator..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="small"
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" color="action" />
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
                    py: 1.25,
                    color: 'text.secondary',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    fontWeight: 500,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <FilterIcon fontSize="small" />
                    <span>Filtre avansate</span>
                  </Stack>
                </Button>

                {/* Collapsible filters */}
                <Collapse in={filtersExpanded}>
                  <Stack spacing={2} sx={{ p: 2, pt: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
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
                        <MenuItem value="USER">User</MenuItem>
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
            <Paper
              sx={{
                p: { sm: 2.5, md: 3 },
                width: '100%',
                borderRadius: 2,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <FilterIcon color="action" fontSize="small" />
                <Typography variant="subtitle1" fontWeight="600">Filtre</Typography>
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

                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Rol</InputLabel>
                    <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} label="Rol">
                      <MenuItem value="">Toate</MenuItem>
                      <MenuItem value="ADMIN">Admin</MenuItem>
                      <MenuItem value="MANAGER">Manager</MenuItem>
                      <MenuItem value="USER">User</MenuItem>
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
      </Grow>

      {/* Alerts */}
      <Fade in={true} timeout={800}>
        <Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              Eroare la încărcarea utilizatorilor
            </Alert>
          )}

          {pendingUsersCount > 0 && statusFilter !== 'pending' && (
            <Alert
              severity="info"
              sx={{ mb: 2, borderRadius: 2 }}
              icon={<PendingIcon />}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setStatusFilter('pending')}
                  sx={{ fontWeight: 600 }}
                >
                  Vezi
                </Button>
              }
            >
              <Typography variant="body2" fontWeight="medium">
                <strong>{pendingUsersCount}</strong> {pendingUsersCount === 1 ? 'cont așteaptă' : 'conturi așteaptă'} aprobare
              </Typography>
            </Alert>
          )}
        </Box>
      </Fade>

      {/* Users List */}
      <Grow in={true} timeout={900}>
        {isMobile ? (
          // Mobile Card View
          <Box>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={48} />
              </Box>
            ) : paginatedUsers.length === 0 ? (
              <Card sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Nu s-au găsit utilizatori
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Stack spacing={1.5} sx={{ width: '100%' }}>
                {paginatedUsers.map((user, index) => (
                  <Grow in={true} timeout={300 + index * 50} key={user.id}>
                    <Card
                      sx={{
                        width: '100%',
                        borderRadius: 2,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          boxShadow: theme.palette.mode === 'light'
                            ? '0 4px 20px rgba(0,0,0,0.1)'
                            : '0 4px 20px rgba(0,0,0,0.3)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                            <Avatar
                              src={user.avatarUrl || undefined}
                              sx={{
                                width: 52,
                                height: 52,
                                bgcolor: 'primary.main',
                                fontSize: '1.25rem',
                                fontWeight: 600,
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
                                  mb: 0.25,
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
                                  mb: 1,
                                }}
                              >
                                {user.email}
                              </Typography>
                              <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.5}>
                                <Chip
                                  label={getRoleLabel(user.role)}
                                  color={getRoleBadgeColor(user.role) as any}
                                  size="small"
                                  sx={{ fontWeight: 600, fontSize: '0.75rem' }}
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

                        {user.department && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              mt: 1.5,
                              pl: 9,
                              fontWeight: 500,
                            }}
                          >
                            📍 {user.department.name}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grow>
                ))}
              </Stack>
            )}

            {/* Mobile Pagination */}
            {users && users.length > 0 && (
              <Card sx={{ mt: 2, width: '100%', borderRadius: 2 }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  py: 1,
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
                      '.MuiTablePagination-selectLabel, .MuiTablePagination-select, .MuiTablePagination-selectIcon': {
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
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={48} />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Utilizator</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Rol</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Departament</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Ultima Autentificare</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Acțiuni</TableCell>
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
                          <TableRow
                            key={user.id}
                            hover
                            sx={{
                              transition: 'background-color 0.2s ease',
                            }}
                          >
                            <TableCell>
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar
                                  src={user.avatarUrl || undefined}
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    fontWeight: 600,
                                  }}
                                >
                                  {user.fullName.charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography variant="body2" fontWeight="medium">
                                  {user.fullName}
                                </Typography>
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
                                sx={{ fontWeight: 600 }}
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
      </Grow>

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItemComponent onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1.5 }} />
          Editează
        </MenuItemComponent>
        <MenuItemComponent onClick={handleChangePassword}>
          <LockIcon fontSize="small" sx={{ mr: 1.5 }} />
          Schimbă Parola
        </MenuItemComponent>
        <MenuItemComponent onClick={handleToggleStatus}>
          {selectedUser?.isActive ? (
            <>
              <InactiveIcon fontSize="small" sx={{ mr: 1.5 }} />
              Dezactivează
            </>
          ) : (
            <>
              <ActiveIcon fontSize="small" sx={{ mr: 1.5 }} />
              Activează
            </>
          )}
        </MenuItemComponent>
        <MenuItemComponent onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
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
        PaperProps={{
          sx: { borderRadius: isMobile ? 0 : 3 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Adaugă Utilizator Nou</DialogTitle>
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
        PaperProps={{
          sx: { borderRadius: isMobile ? 0 : 3 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Editează Utilizator</DialogTitle>
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
