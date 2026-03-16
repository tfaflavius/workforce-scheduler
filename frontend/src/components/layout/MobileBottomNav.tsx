import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { preloadRoute } from '../../utils/routePreloader';
import {
  Box,
  Badge,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  Description as DailyReportIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { useGetUnreadCountQuery } from '../../store/api/notifications.api';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

const MobileBottomNav: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const { data: unreadCount = 0 } = useGetUnreadCountQuery(undefined, {
    pollingInterval: 30000,
  });

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MASTER_ADMIN';
  const isManager = user?.role === 'MANAGER';

  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      {
        label: 'Acasa',
        icon: <DashboardIcon />,
        path: '/dashboard',
      },
    ];

    if (isAdmin || isManager) {
      items.push({
        label: 'Programe',
        icon: <CalendarIcon />,
        path: '/schedules',
      });
    } else {
      items.push({
        label: 'Program',
        icon: <ScheduleIcon />,
        path: '/my-schedule',
      });
    }

    items.push({
      label: 'Raport',
      icon: <DailyReportIcon />,
      path: '/daily-reports',
    });

    items.push({
      label: 'Notificari',
      icon: <NotificationsIcon />,
      path: '/notifications',
      badge: unreadCount,
    });

    items.push({
      label: 'Profil',
      icon: <PersonIcon />,
      path: '/profile',
    });

    return items;
  }, [isAdmin, isManager, unreadCount]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <Box
      component="nav"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        display: { xs: 'flex', lg: 'none' },
        height: 'calc(56px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        bgcolor: alpha(theme.palette.background.paper, 0.92),
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
        boxShadow: `0 -2px 12px ${alpha(theme.palette.common.black, 0.08)}`,
        justifyContent: 'space-around',
        alignItems: 'center',
      }}
    >
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <Box
            key={item.path}
            onClick={() => {
              // Haptic feedback on tap
              if ('vibrate' in navigator) navigator.vibrate(10);
              navigate(item.path);
            }}
            onTouchStart={() => preloadRoute(item.path)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              height: 56,
              cursor: 'pointer',
              position: 'relative',
              transition: 'color 0.2s ease',
              color: active ? theme.palette.primary.main : theme.palette.text.secondary,
              WebkitTapHighlightColor: 'transparent',
              '&:active': {
                transform: 'scale(0.92)',
              },
            }}
          >
            {/* Active indicator dot */}
            {active && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 2,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  bgcolor: theme.palette.primary.main,
                  boxShadow: `0 0 6px ${alpha(theme.palette.primary.main, 0.6)}`,
                }}
              />
            )}

            <Badge
              badgeContent={item.badge || 0}
              color="error"
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  height: 16,
                  minWidth: 16,
                  top: -2,
                  right: -4,
                  boxShadow: item.badge ? `0 0 8px ${alpha(theme.palette.error.main, 0.4)}` : 'none',
                },
              }}
            >
              <Box
                sx={{
                  '& .MuiSvgIcon-root': {
                    fontSize: active ? '1.5rem' : '1.35rem',
                    transition: 'font-size 0.2s ease',
                  },
                }}
              >
                {item.icon}
              </Box>
            </Badge>

            <Box
              component="span"
              sx={{
                fontSize: '0.6rem',
                fontWeight: active ? 700 : 500,
                mt: 0.25,
                lineHeight: 1,
                letterSpacing: active ? '0.02em' : 0,
              }}
            >
              {item.label}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default React.memo(MobileBottomNav);
