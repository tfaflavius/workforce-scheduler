import { useMemo, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Grid,
} from '@mui/material';
import {
  People as PeopleIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as ManagerIcon,
} from '@mui/icons-material';
import { useGetUsersQuery } from '../../../store/api/users.api';
import { useGetDepartmentsQuery } from '../../../store/api/departmentsApi';
import { useGetSummaryQuery, useGetTaskFlowsQuery } from '../../../store/api/permissions.api';
import DepartmentFlowOverview from './DepartmentFlowOverview';
import { getRoleLabel } from '../../../utils/roleHelpers';
import { removeDiacritics } from '../../../utils/removeDiacritics';

const getRoleColor = (role: string) => {
  switch (role) {
    case 'MASTER_ADMIN': return 'secondary';
    case 'ADMIN': return 'error';
    case 'MANAGER': return 'warning';
    case 'USER': return 'info';
    default: return 'default';
  }
};

const UsersDepartmentsTab = () => {
  const { data: users, isLoading: usersLoading } = useGetUsersQuery();
  const { data: departments, isLoading: deptsLoading } = useGetDepartmentsQuery();
  const { data: summary } = useGetSummaryQuery();
  const { data: taskFlows } = useGetTaskFlowsQuery();

  const activeUsers = useMemo(() => users?.filter((u) => u.isActive) || [], [users]);

  const stats = useMemo(() => {
    const admins = activeUsers.filter((u) => u.role === 'ADMIN').length;
    const managers = activeUsers.filter((u) => u.role === 'MANAGER').length;
    const regularUsers = activeUsers.filter((u) => u.role === 'USER').length;
    return { total: activeUsers.length, admins, managers, users: regularUsers };
  }, [activeUsers]);

  const deptData = useMemo(() => {
    if (!departments) return [];
    return departments.map((dept) => {
      const deptUsers = activeUsers.filter((u) => u.departmentId === dept.id);
      const manager = deptUsers.find((u) => u.role === 'MANAGER');
      return {
        ...dept,
        name: removeDiacritics(dept.name),
        users: deptUsers,
        manager,
        adminCount: deptUsers.filter((u) => u.role === 'ADMIN').length,
        managerCount: deptUsers.filter((u) => u.role === 'MANAGER').length,
        userCount: deptUsers.filter((u) => u.role === 'USER').length,
      };
    });
  }, [departments, activeUsers]);

  // Users without department
  const noDeptUsers = useMemo(
    () => activeUsers.filter((u) => !u.departmentId),
    [activeUsers],
  );

  if (usersLoading || deptsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
              <PeopleIcon sx={{ fontSize: 32, color: 'primary.main', mb: 0.5 }} />
              <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
              <Typography variant="body2" color="text.secondary">Total Activi</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ borderColor: 'error.light' }}>
            <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
              <AdminIcon sx={{ fontSize: 32, color: 'error.main', mb: 0.5 }} />
              <Typography variant="h4" fontWeight="bold" color="error.main">{stats.admins}</Typography>
              <Typography variant="body2" color="text.secondary">Administratori</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ borderColor: 'warning.light' }}>
            <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
              <ManagerIcon sx={{ fontSize: 32, color: 'warning.main', mb: 0.5 }} />
              <Typography variant="h4" fontWeight="bold" color="warning.main">{stats.managers}</Typography>
              <Typography variant="body2" color="text.secondary">Manageri</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ borderColor: 'info.light' }}>
            <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
              <PersonIcon sx={{ fontSize: 32, color: 'info.main', mb: 0.5 }} />
              <Typography variant="h4" fontWeight="bold" color="info.main">{stats.users}</Typography>
              <Typography variant="body2" color="text.secondary">Utilizatori</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Permission Summary */}
      {summary && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
            Rezumat Permisiuni per Rol
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(summary).map(([role, data]) => (
              <Grid size={{ xs: 12, sm: 4 }} key={role}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={getRoleLabel(role)} size="small" color={getRoleColor(role) as any} />
                  <Typography variant="body2">
                    <strong>{data.allowed}</strong> permise / <strong>{data.denied}</strong> interzise din {data.total}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Department Cards */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        Departamente
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {deptData.map((dept) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={dept.id}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ pb: 1, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <BusinessIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold" noWrap>
                    {dept.name}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                  {dept.managerCount > 0 && (
                    <Chip label={`${dept.managerCount} Mgr`} size="small" color="warning" variant="outlined" />
                  )}
                  <Chip label={`${dept.userCount} Util.`} size="small" color="info" variant="outlined" />
                  <Chip label={`Total: ${dept.users.length}`} size="small" variant="outlined" />
                </Box>
                {dept.manager && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Manager: <strong>{removeDiacritics(dept.manager.fullName)}</strong>
                  </Typography>
                )}
                <Divider sx={{ my: 1 }} />
                <List dense disablePadding sx={{ maxHeight: 200, overflowY: 'auto' }}>
                  {dept.users.map((user) => (
                    <ListItem key={user.id} disablePadding sx={{ py: 0.25 }}>
                      <ListItemAvatar sx={{ minWidth: 32 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                          {removeDiacritics(user.fullName).charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                              {removeDiacritics(user.fullName)}
                            </Typography>
                            <Chip
                              label={getRoleLabel(user.role)}
                              size="small"
                              color={getRoleColor(user.role) as any}
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Department Flows */}
      {departments && taskFlows && taskFlows.length > 0 && (
        <DepartmentFlowOverview departments={departments} flows={taskFlows} />
      )}

      {/* Users without department */}
      {noDeptUsers.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
            Utilizatori fara departament ({noDeptUsers.length})
          </Typography>
          <List dense disablePadding>
            {noDeptUsers.map((user) => (
              <ListItem key={user.id} disablePadding sx={{ py: 0.25 }}>
                <ListItemAvatar sx={{ minWidth: 32 }}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                    {removeDiacritics(user.fullName).charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2">{removeDiacritics(user.fullName)}</Typography>
                      <Chip
                        label={getRoleLabel(user.role)}
                        size="small"
                        color={getRoleColor(user.role) as any}
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Summary Table: Department x Role */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        Distributie Utilizatori
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Departament</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Admin</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Manager</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Utilizator</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deptData.map((dept) => (
              <TableRow key={dept.id} hover>
                <TableCell>{dept.name}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  {dept.adminCount > 0 ? (
                    <Chip label={dept.adminCount} size="small" color="error" />
                  ) : (
                    <Typography variant="body2" color="text.disabled">0</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  {dept.managerCount > 0 ? (
                    <Chip label={dept.managerCount} size="small" color="warning" />
                  ) : (
                    <Typography variant="body2" color="text.disabled">0</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  {dept.userCount > 0 ? (
                    <Chip label={dept.userCount} size="small" color="info" />
                  ) : (
                    <Typography variant="body2" color="text.disabled">0</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                  {dept.users.length}
                </TableCell>
              </TableRow>
            ))}
            {noDeptUsers.length > 0 && (
              <TableRow hover>
                <TableCell sx={{ fontStyle: 'italic' }}>Fara departament</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  {noDeptUsers.filter((u) => u.role === 'ADMIN').length || <Typography variant="body2" color="text.disabled" component="span">0</Typography>}
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  {noDeptUsers.filter((u) => u.role === 'MANAGER').length || <Typography variant="body2" color="text.disabled" component="span">0</Typography>}
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  {noDeptUsers.filter((u) => u.role === 'USER').length || <Typography variant="body2" color="text.disabled" component="span">0</Typography>}
                </TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>{noDeptUsers.length}</TableCell>
              </TableRow>
            )}
            {/* Total row */}
            <TableRow sx={{ backgroundColor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>TOTAL</TableCell>
              <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>{stats.admins}</TableCell>
              <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>{stats.managers}</TableCell>
              <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>{stats.users}</TableCell>
              <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>{stats.total}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default memo(UsersDepartmentsTab);
