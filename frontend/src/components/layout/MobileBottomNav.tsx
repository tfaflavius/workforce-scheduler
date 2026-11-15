import { useGetChatUnreadCountQuery } from '../../store/api/chat.api';
import { BRAND_GRADIENT_SOFT } from '../../theme/brand';
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
  Forum as ChatIcon,
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
    skipPollingIfUnfocused: true, pollingInterval: 30000,
  });
  const { data: chatUnread } = useGetChatUnreadCountQuery(undefined, { skipPollingIfUnfocused: true, pollingInterval: 30000 });

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

    // "Mesaje" in locul lui "Profil" (profilul ramane in avatarul din dreapta sus si in meniu)
    items.push({
      label: 'Mesaje',
      icon: <ChatIcon />,
      path: '/chat',
      badge: chatUnread?.count || 0,
    });

    return items;
  }, [isAdmin, isManager, unreadCount, chatUnread]);

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
        height: 'calc(60px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        bgcolor: alpha(theme.palette.background.paper, 0.82),
        backdropFilter: 'saturate(180%) blur(16px)',
        WebkitBackdropFilter: 'saturate(180%) blur(16px)',
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
              height: 60,
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
              {/* Elementul activ: iconita intr-o pastila cu gradient de brand */}
              <Box
                sx={{
                  width: 52,
                  height: 28,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: active ? BRAND_GRADIENT_SOFT : 'transparent',
                  color: active ? '#fff' : 'inherit',
                  boxShadow: active ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}` : 'none',
                  transition: 'background 0.25s ease, box-shadow 0.25s ease',
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.3rem',
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
                mt: 0.4,
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
