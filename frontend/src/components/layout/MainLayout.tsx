import { useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
  useMediaQuery,
  Chip,
  alpha,
  Fade,
  Slide,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  ExitToApp as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Assessment as ReportIcon,
  SwapHoriz as SwapIcon,
  BeachAccess as BeachIcon,
  LocalParking as ParkingIcon,
  Accessible as HandicapIcon,
  Home as HomeIcon,
  Description as DailyReportIcon,
  Receipt as ReceiptIcon,
  ConfirmationNumber as MeterIcon,
  ShoppingCart as ShoppingIcon,
  BarChart as RevenueIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import {
  Groups as GroupsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FiberManualRecord as DotIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutAsync } from '../../store/slices/auth.slice';
import type { UserRole } from '../../types/user.types';
import NotificationBell from '../notifications/NotificationBell';
import { useGetDepartmentsQuery } from '../../store/api/departmentsApi';
import { useGetUsersQuery } from '../../store/api/users.api';
import { useThemeMode } from '../../contexts/ThemeContext';
import {
  MAINTENANCE_DEPARTMENT_NAME,
  HANDICAP_DEPARTMENT_NAME,
  DOMICILIU_DEPARTMENT_NAME,
  PROCESE_VERBALE_DEPARTMENT_NAME,
  PARCOMETRE_DEPARTMENT_NAME,
  ACHIZITII_DEPARTMENT_NAME,
  DISPECERAT_DEPARTMENT_NAME,
  CONTROL_DEPARTMENT_NAME,
} from '../../constants/departments';

// Responsive drawer width based on screen size
const getDrawerWidth = (isTablet: boolean) => isTablet ? 220 : 260;

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  roles: UserRole[];
  requiresDepartment?: string;
  requiresDepartments?: string[];
  excludeDepartments?: string[];  // Departamente care NU vad acest meniu
}

export const MainLayout = () => {
  const theme = useTheme();
  // Updated breakpoints for modern devices
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg')); // 430px - 1024px
  const showPermanentDrawer = useMediaQuery(theme.breakpoints.up('lg'));

  const drawerWidth = getDrawerWidth(isTablet);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deptOpen, setDeptOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Principal: true,
    Operatiuni: true,
    Administrare: true,
    Parcari: true,
    Altele: true,
  });

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { mode, toggleTheme } = useThemeMode();

  // Departments data for sidebar (ADMIN only)
  const isAdmin = user?.role === 'ADMIN';
  const { data: departments } = useGetDepartmentsQuery(undefined, { skip: !isAdmin });
  const { data: allUsers } = useGetUsersQuery(undefined, { skip: !isAdmin });

  // Count users per department (memoized)
  const deptUserCounts = useMemo(() =>
    allUsers?.reduce((acc, u) => {
      if (u.departmentId && u.isActive) {
        acc[u.departmentId] = (acc[u.departmentId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {},
  [allUsers]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logoutAsync());
    navigate('/login');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (!showPermanentDrawer) {
      setMobileOpen(false);
    }
  };

  // Departamente care nu au acces la Schimburi Ture si Programul Meu
  const PARKING_ONLY_DEPARTMENTS = [MAINTENANCE_DEPARTMENT_NAME, HANDICAP_DEPARTMENT_NAME, DOMICILIU_DEPARTMENT_NAME];
  // Departamente care nu au acces la Schimburi Ture (dar vad Programul Meu)
  const NO_SHIFT_SWAP_DEPARTMENTS = [...PARKING_ONLY_DEPARTMENTS, PROCESE_VERBALE_DEPARTMENT_NAME, PARCOMETRE_DEPARTMENT_NAME, ACHIZITII_DEPARTMENT_NAME];

  const menuItems: MenuItem[] = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      roles: ['ADMIN', 'MANAGER', 'USER'],
    },
    {
      text: 'Programul Meu',
      icon: <ScheduleIcon />,
      path: '/my-schedule',
      roles: ['USER', 'MANAGER'],
      excludeDepartments: PARKING_ONLY_DEPARTMENTS,
    },
    {
      text: 'Schimburi Ture',
      icon: <SwapIcon />,
      path: '/shift-swaps',
      roles: ['USER', 'MANAGER'],
      excludeDepartments: NO_SHIFT_SWAP_DEPARTMENTS,
    },
    {
      text: 'Concedii',
      icon: <BeachIcon />,
      path: '/leave-requests',
      roles: ['USER', 'MANAGER'],
    },
    {
      text: 'Raport Zilnic',
      icon: <DailyReportIcon />,
      path: '/daily-reports',
      roles: ['ADMIN', 'MANAGER', 'USER'],
    },
    {
      text: 'Programe',
      icon: <CalendarIcon />,
      path: '/schedules',
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      text: 'Gestionare Schimburi',
      icon: <SwapIcon />,
      path: '/admin/shift-swaps',
      roles: ['ADMIN'],
    },
    {
      text: 'Gestionare Concedii',
      icon: <BeachIcon />,
      path: '/admin/leave-requests',
      roles: ['ADMIN'],
    },
    {
      text: 'Rapoarte',
      icon: <ReportIcon />,
      path: '/reports',
      roles: ['ADMIN'],
    },
    {
      text: 'Utilizatori',
      icon: <PeopleIcon />,
      path: '/users',
      roles: ['ADMIN'],
    },
    {
      text: 'Parcari Etajate',
      icon: <ParkingIcon />,
      path: '/parking',
      roles: ['ADMIN', 'MANAGER', 'USER'],
      requiresDepartments: [DISPECERAT_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME],
      excludeDepartments: [HANDICAP_DEPARTMENT_NAME, DOMICILIU_DEPARTMENT_NAME],
    },
    {
      text: 'Parcari Handicap',
      icon: <HandicapIcon />,
      path: '/parking/handicap',
      roles: ['ADMIN', 'USER'],
      requiresDepartments: [MAINTENANCE_DEPARTMENT_NAME, HANDICAP_DEPARTMENT_NAME, DOMICILIU_DEPARTMENT_NAME],
    },
    {
      text: 'Parcari Domiciliu',
      icon: <HomeIcon />,
      path: '/parking/domiciliu',
      roles: ['ADMIN', 'USER'],
      requiresDepartments: [MAINTENANCE_DEPARTMENT_NAME, HANDICAP_DEPARTMENT_NAME, DOMICILIU_DEPARTMENT_NAME],
    },
    {
      text: 'PV / Facturare',
      icon: <ReceiptIcon />,
      path: '/procese-verbale',
      roles: ['ADMIN', 'MANAGER', 'USER'],
      requiresDepartments: [PROCESE_VERBALE_DEPARTMENT_NAME, CONTROL_DEPARTMENT_NAME],
    },
    {
      text: 'Parcometre',
      icon: <MeterIcon />,
      path: '/parcometre',
      roles: ['ADMIN', 'MANAGER', 'USER'],
      requiresDepartments: [PARCOMETRE_DEPARTMENT_NAME],
    },
    {
      text: 'Achizitii',
      icon: <ShoppingIcon />,
      path: '/achizitii',
      roles: ['ADMIN', 'MANAGER', 'USER'],
      requiresDepartments: [ACHIZITII_DEPARTMENT_NAME],
    },
    {
      text: 'Incasari/Cheltuieli',
      icon: <RevenueIcon />,
      path: '/incasari-cheltuieli',
      roles: ['ADMIN', 'MANAGER', 'USER'],
      requiresDepartments: [ACHIZITII_DEPARTMENT_NAME],
    },
    {
      text: 'Monitorizare Pontaj',
      icon: <TimerIcon />,
      path: '/admin/pontaj',
      roles: ['ADMIN'],
    },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    if (!user) return false;
    if (!item.roles.includes(user.role)) return false;

    const userDepartment = user.department?.name || '';

    // Admin vede tot
    if (user.role === 'ADMIN') return true;

    // Manager vede tot EXCEPTAND daca exista excludeDepartments
    if (user.role === 'MANAGER') {
      if (item.excludeDepartments && item.excludeDepartments.includes(userDepartment)) {
        return false;
      }
      return true;
    }

    // USER - verificari multiple
    // 1. Verifica excludeDepartments - daca departamentul user-ului e exclus, nu vede
    if (item.excludeDepartments && item.excludeDepartments.includes(userDepartment)) {
      return false;
    }

    // 2. Check for multiple allowed departments
    if (item.requiresDepartments) {
      return item.requiresDepartments.includes(userDepartment);
    }

    // 3. Legacy single department check
    if (item.requiresDepartment) {
      return userDepartment === item.requiresDepartment;
    }

    return true;
  });

  const getRoleColor = (role: UserRole) => {
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

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      case 'MANAGER':
        return 'Manager';
      case 'USER':
        return 'User';
      default:
        return role;
    }
  };

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: theme.palette.mode === 'light'
          ? 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
          : 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: { xs: 56, sm: 64 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            '&:hover': {
              transform: 'scale(1.02)',
            },
          }}
          onClick={() => handleNavigate('/dashboard')}
        >
          <Box
            sx={{
              width: { xs: 36, sm: 40 },
              height: { xs: 36, sm: 40 },
              borderRadius: 2,
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            <CalendarIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: 'white' }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.1rem' },
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            WorkSchedule
          </Typography>
        </Box>
        {!showPermanentDrawer && (
          <IconButton
            onClick={handleDrawerToggle}
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.2),
              },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ opacity: 0.6 }} />

      {/* User Info */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          background: alpha(theme.palette.primary.main, 0.04),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: { xs: 40, sm: 48 },
              height: { xs: 40, sm: 48 },
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              fontSize: { xs: '1rem', sm: '1.2rem' },
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            }}
          >
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '0.85rem', sm: '0.95rem' },
                lineHeight: 1.3,
              }}
              noWrap
            >
              {user?.fullName || 'Utilizator'}
            </Typography>
            <Chip
              label={getRoleLabel(user?.role || 'USER')}
              color={getRoleColor(user?.role || 'USER')}
              size="small"
              sx={{
                mt: 0.5,
                height: { xs: 20, sm: 22 },
                fontSize: { xs: '0.7rem', sm: '0.7rem' },
                fontWeight: 600,
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          </Box>
        </Box>
      </Box>

      <Divider sx={{ opacity: 0.6 }} />

      {/* Navigation */}
      <List
        sx={{
          flex: 1,
          py: 1,
          px: { xs: 0.5, sm: 1 },
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': {
            width: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.2),
          },
        }}
      >
        {(() => {
          // Define sections with labels and accent colors
          const sections: { label: string; paths: string[]; color: string }[] = [
            { label: 'Principal', paths: ['/dashboard', '/my-schedule', '/daily-reports'], color: '#2563eb' },
            { label: 'Operatiuni', paths: ['/shift-swaps', '/leave-requests', '/schedules'], color: '#06b6d4' },
            { label: 'Administrare', paths: ['/admin/shift-swaps', '/admin/leave-requests', '/admin/pontaj', '/reports', '/users', '/incasari-cheltuieli'], color: '#7c3aed' },
            { label: 'Parcari', paths: ['/parking', '/parking/handicap', '/parking/domiciliu', '/procese-verbale', '/parcometre', '/achizitii'], color: '#10b981' },
          ];

          // Group filtered menu items into sections
          const groupedItems: { label: string; color: string; items: typeof filteredMenuItems }[] = [];
          const usedPaths = new Set<string>();

          sections.forEach((section) => {
            const sectionItems = filteredMenuItems.filter(
              (item) => section.paths.includes(item.path) && !usedPaths.has(item.path)
            );
            if (sectionItems.length > 0) {
              sectionItems.forEach((item) => usedPaths.add(item.path));
              groupedItems.push({ label: section.label, color: section.color, items: sectionItems });
            }
          });

          // Any remaining items not in a section
          const remaining = filteredMenuItems.filter((item) => !usedPaths.has(item.path));
          if (remaining.length > 0) {
            groupedItems.push({ label: 'Altele', color: '#64748b', items: remaining });
          }

          let globalIndex = 0;

          return groupedItems.map((group, groupIdx) => {
            const isSectionOpen = openSections[group.label] !== false;
            // Check if any item in this group is active
            const hasActiveItem = group.items.some((item) => location.pathname === item.path);

            return (
              <Box key={group.label}>
                {groupIdx > 0 && <Divider sx={{ my: 1, mx: 1, opacity: 0.4 }} />}
                {/* Collapsible section header */}
                <ListItem disablePadding sx={{ py: 0.25 }}>
                  <ListItemButton
                    onClick={() => toggleSection(group.label)}
                    sx={{
                      borderRadius: 2,
                      mx: 0.5,
                      py: { xs: 0.75, sm: 1 },
                      px: { xs: 1.5, sm: 2 },
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        bgcolor: alpha(group.color, 0.06),
                      },
                    }}
                  >
                    <ListItemText
                      primary={group.label}
                      primaryTypographyProps={{
                        fontWeight: 700,
                        color: alpha(group.color, 0.8),
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontSize: '0.65rem',
                      }}
                    />
                    {hasActiveItem && !isSectionOpen && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: group.color,
                          mr: 1,
                        }}
                      />
                    )}
                    {isSectionOpen ? (
                      <ExpandLessIcon sx={{ fontSize: '1.2rem', color: alpha(group.color, 0.6) }} />
                    ) : (
                      <ExpandMoreIcon sx={{ fontSize: '1.2rem', color: alpha(group.color, 0.6) }} />
                    )}
                  </ListItemButton>
                </ListItem>
                {/* Collapsible items */}
                {isSectionOpen && (
                  <Fade in={isSectionOpen}>
                    <Box>
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.path;
                        const idx = globalIndex++;
                        return (
                          <Fade in={true} key={item.path} style={{ transitionDelay: `${idx * 30}ms` }}>
                            <ListItem disablePadding sx={{ py: 0.25 }}>
                              <ListItemButton
                                onClick={() => handleNavigate(item.path)}
                                sx={{
                                  borderRadius: 2,
                                  mx: 0.5,
                                  py: { xs: 1, sm: 1.25 },
                                  px: { xs: 1.5, sm: 2 },
                                  bgcolor: isActive
                                    ? alpha(group.color, 0.1)
                                    : 'transparent',
                                  color: isActive ? 'text.primary' : 'text.primary',
                                  borderLeft: isActive ? `3px solid ${group.color}` : '3px solid transparent',
                                  transition: 'all 0.2s ease-in-out',
                                  '&:hover': {
                                    bgcolor: isActive
                                      ? alpha(group.color, 0.15)
                                      : alpha(theme.palette.primary.main, 0.06),
                                    transform: 'translateX(4px)',
                                  },
                                  '&:active': {
                                    transform: 'translateX(2px)',
                                  },
                                }}
                              >
                                <ListItemIcon
                                  sx={{
                                    color: isActive ? group.color : 'text.secondary',
                                    minWidth: { xs: 36, sm: 40 },
                                    position: 'relative',
                                    '& .MuiSvgIcon-root': {
                                      fontSize: { xs: '1.25rem', sm: '1.4rem' },
                                    },
                                  }}
                                >
                                  {item.icon}
                                  {/* Section color dot */}
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      top: -2,
                                      right: { xs: 10, sm: 12 },
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      bgcolor: group.color,
                                      opacity: isActive ? 1 : 0.4,
                                      transition: 'opacity 0.2s ease',
                                    }}
                                  />
                                </ListItemIcon>
                                <ListItemText
                                  primary={item.text}
                                  primaryTypographyProps={{
                                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                    fontWeight: isActive ? 700 : 500,
                                    noWrap: true,
                                    color: isActive ? group.color : 'text.primary',
                                  }}
                                />
                              </ListItemButton>
                            </ListItem>
                          </Fade>
                        );
                      })}
                    </Box>
                  </Fade>
                )}
              </Box>
            );
          });
        })()}

        {/* Departamente Section - Only for ADMIN */}
        {isAdmin && departments && departments.length > 0 && (
          <Box>
            <Divider sx={{ my: 1, mx: 1, opacity: 0.4 }} />
            <ListItem
              disablePadding
              sx={{ py: 0.25 }}
            >
              <ListItemButton
                onClick={() => setDeptOpen(!deptOpen)}
                sx={{
                  borderRadius: 2,
                  mx: 0.5,
                  py: { xs: 0.75, sm: 1 },
                  px: { xs: 1.5, sm: 2 },
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: alpha('#f59e0b', 0.06),
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: '#f59e0b',
                    minWidth: { xs: 36, sm: 40 },
                    '& .MuiSvgIcon-root': {
                      fontSize: { xs: '1.25rem', sm: '1.4rem' },
                    },
                  }}
                >
                  <GroupsIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Departamente"
                  primaryTypographyProps={{
                    fontWeight: 700,
                    color: alpha('#f59e0b', 0.8),
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontSize: '0.65rem',
                  }}
                />
                {deptOpen ? (
                  <ExpandLessIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
                ) : (
                  <ExpandMoreIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
                )}
              </ListItemButton>
            </ListItem>

            {deptOpen && (
              <Fade in={deptOpen}>
                <Box sx={{ pl: 1 }}>
                  {[...departments]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((dept) => {
                      const count = deptUserCounts[dept.id] || 0;
                      return (
                        <ListItem key={dept.id} disablePadding sx={{ py: 0.15 }}>
                          <ListItemButton
                            onClick={() => handleNavigate(`/users?department=${dept.id}`)}
                            sx={{
                              borderRadius: 2,
                              mx: 0.5,
                              py: { xs: 0.5, sm: 0.75 },
                              px: { xs: 1.5, sm: 2 },
                              minHeight: 0,
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                bgcolor: alpha('#f59e0b', 0.08),
                                transform: 'translateX(4px)',
                              },
                            }}
                          >
                            <DotIcon
                              sx={{
                                fontSize: 8,
                                color: alpha('#f59e0b', 0.5),
                                mr: 1.5,
                              }}
                            />
                            <ListItemText
                              primary={dept.name}
                              primaryTypographyProps={{
                                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                                fontWeight: 400,
                                noWrap: true,
                                color: 'text.secondary',
                              }}
                            />
                            <Chip
                              label={count}
                              size="small"
                              sx={{
                                height: 20,
                                minWidth: 28,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                bgcolor: alpha('#f59e0b', 0.1),
                                color: '#f59e0b',
                                '& .MuiChip-label': { px: 0.75 },
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                </Box>
              </Fade>
            )}
          </Box>
        )}
      </List>

      <Divider sx={{ opacity: 0.6 }} />

      {/* Bottom Actions */}
      <List sx={{ py: 1, px: { xs: 0.5, sm: 1 } }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleNavigate('/profile')}
            sx={{
              borderRadius: 2,
              mx: 0.5,
              py: { xs: 1, sm: 1.25 },
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                transform: 'translateX(4px)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
              <SettingsIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.4rem' } }} />
            </ListItemIcon>
            <ListItemText
              primary="Profil"
              primaryTypographyProps={{
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                fontWeight: 500,
              }}
            />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={toggleTheme}
            sx={{
              borderRadius: 2,
              mx: 0.5,
              py: { xs: 1, sm: 1.25 },
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: alpha(mode === 'dark' ? '#f59e0b' : '#7c3aed', 0.08),
                transform: 'translateX(4px)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 }, color: mode === 'dark' ? '#f59e0b' : '#7c3aed' }}>
              {mode === 'dark' ? (
                <LightModeIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.4rem' } }} />
              ) : (
                <DarkModeIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.4rem' } }} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={mode === 'dark' ? 'Mod Luminos' : 'Mod Intunecat'}
              primaryTypographyProps={{
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                fontWeight: 500,
              }}
            />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              mx: 0.5,
              py: { xs: 1, sm: 1.25 },
              color: 'error.main',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: alpha(theme.palette.error.main, 0.08),
                transform: 'translateX(4px)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 }, color: 'error.main' }}>
              <LogoutIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.4rem' } }} />
            </ListItemIcon>
            <ListItemText
              primary="Deconectare"
              primaryTypographyProps={{
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                fontWeight: 500,
              }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          ml: { lg: `${drawerWidth}px` },
          bgcolor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(8px)',
          color: 'text.primary',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 56, sm: 64 },
            px: { xs: 1.5, sm: 2, md: 3 },
          }}
        >
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              mr: { xs: 1, sm: 2 },
              display: { lg: 'none' },
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.15),
              },
            }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              flexGrow: 1,
              fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
              fontWeight: 600,
            }}
          >
            {filteredMenuItems.find((item) => item.path === location.pathname)?.text || 'WorkSchedule'}
          </Typography>

          {/* Notifications Bell */}
          <NotificationBell />

          <Tooltip title="Contul meu">
            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{
                p: 0.5,
                ml: { xs: 0.5, sm: 1 },
              }}
            >
              <Avatar
                sx={{
                  width: { xs: 32, sm: 36 },
                  height: { xs: 32, sm: 36 },
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  fontWeight: 600,
                }}
              >
                {user?.fullName?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 180,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            <MenuItem
              onClick={() => { handleNavigate('/profile'); handleProfileMenuClose(); }}
              sx={{ py: 1.5 }}
            >
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              Profilul Meu
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={handleLogout}
              sx={{ color: 'error.main', py: 1.5 }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" color="error" />
              </ListItemIcon>
              Deconectare
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }}
      >
        {/* Mobile/Tablet Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: { xs: '85vw', sm: drawerWidth },
              maxWidth: 300,
              borderRight: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', lg: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: 'none',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 2, md: 3 },
          width: { xs: '100%', lg: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: '56px', sm: '64px' },
          minHeight: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
          overflowX: 'hidden',
          overflowY: 'auto',
          maxWidth: '100%',
          // Smooth scrolling
          scrollBehavior: 'smooth',
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 4,
            bgcolor: alpha(theme.palette.primary.main, 0.2),
          },
        }}
      >
        <Slide direction="up" in={true} mountOnEnter unmountOnExit>
          <Box>
            <Outlet />
          </Box>
        </Slide>
      </Box>
    </Box>
  );
};

export default MainLayout;
