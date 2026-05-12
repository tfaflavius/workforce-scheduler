import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Grow,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { isAdminOrAbove } from '../../utils/roleHelpers';
import PvSessionsTab from './components/PvSessionsTab';
import PvMarketplaceTab from './components/PvMarketplaceTab';
import PvMyDaysTab from './components/PvMyDaysTab';
import PvSigningSessionsTab from './components/PvSigningSessionsTab';
import PvSigningMarketplaceTab from './components/PvSigningMarketplaceTab';
import PvSigningMyDaysTab from './components/PvSigningMyDaysTab';
import { CONTROL_DEPARTMENT_NAME, PROCESE_VERBALE_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME } from '../../constants/departments';
import type { OpenSessionState } from '../../types/navigation.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  /** Keep the panel mounted with display:none when inactive — preserves
   *  child component state (scroll, expanded items, form drafts, RTK
   *  Query cache) across tab switches. */
  keepMounted?: boolean;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, keepMounted, ...other } = props;
  const isActive = value === index;

  if (!isActive && !keepMounted) return null;

  return (
    <div
      role="tabpanel"
      id={`pv-tabpanel-${index}`}
      aria-labelledby={`pv-tab-${index}`}
      hidden={!isActive}
      style={isActive ? undefined : { display: 'none' }}
      {...other}
    >
      <Box sx={{ pt: { xs: 1.5, sm: 2 } }}>{children}</Box>
    </div>
  );
}

const ProcesVerbalePage: React.FC = () => {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const [tabValue, setTabValue] = useState(0);
  const { user } = useAppSelector((state) => state.auth);
  const lastHandledIdRef = useRef<string | null>(null);

  // Track which tabs have been visited so we mount each tab only once and then
  // keep it alive (display:none) — eliminates the re-fetch + scroll-reset that
  // happens when MUI unmounts inactive panels.
  const [visitedTabs, setVisitedTabs] = useState<Set<number>>(new Set([0]));
  useEffect(() => {
    if (!visitedTabs.has(tabValue)) {
      setVisitedTabs(prev => new Set(prev).add(tabValue));
    }
  }, [tabValue, visitedTabs]);

  // Read notification deep link state
  const openSessionId = (location.state as OpenSessionState | null)?.openSessionId;

  const userDept = user?.department?.name || '';
  const isControl = userDept === CONTROL_DEPARTMENT_NAME;
  const isMaintenance = userDept === MAINTENANCE_DEPARTMENT_NAME;
  const isPvf = userDept === PROCESE_VERBALE_DEPARTMENT_NAME;
  const isAdmin = isAdminOrAbove(user?.role);

  // Auto-switch to Sesiuni tab when arriving from notification
  useEffect(() => {
    if (openSessionId && openSessionId !== lastHandledIdRef.current) {
      lastHandledIdRef.current = openSessionId;
      // Sesiuni tab is first tab for non-Control/non-Maintenance users (index 0)
      if (!isControl && !isMaintenance) {
        setTabValue(0); // Sesiuni Afisare is always tab 0 for PVF/admin
      }
      window.history.replaceState({}, document.title);
    }
  }, [openSessionId, isControl, isMaintenance]);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  // Build tab configuration based on user role/department
  // Admin/Manager/PVF: Sesiuni Afisare, Marketplace Afisare, Sesiuni Semnare, Marketplace Semnare
  // Control: Marketplace (Afisare), Zilele Mele (Afisare)
  // Intretinere Parcari: Marketplace (Semnare), Zilele Mele (Semnare)
  const tabConfig: Array<{ label: string; shortLabel: string; color: string; component: string }> = [];

  if (isAdmin || isPvf) {
    // Admin/PVF see both Afisare and Semnare sessions + marketplaces
    tabConfig.push({
      label: 'Sesiuni Afisare',
      shortLabel: 'Ses. Afisare',
      color: '#3b82f6',
      component: 'sessions-afisare',
    });
    tabConfig.push({
      label: 'Marketplace Afisare',
      shortLabel: 'Mkt. Afisare',
      color: '#d97706',
      component: 'marketplace-afisare',
    });
    tabConfig.push({
      label: 'Sesiuni Semnare',
      shortLabel: 'Ses. Semnare',
      color: '#64748b',
      component: 'sessions-semnare',
    });
    tabConfig.push({
      label: 'Marketplace Semnare',
      shortLabel: 'Mkt. Semnare',
      color: '#e879f9',
      component: 'marketplace-semnare',
    });
  } else if (isControl) {
    // Control users see only Afisare marketplace + their days
    tabConfig.push({
      label: 'Marketplace',
      shortLabel: 'Marketplace',
      color: '#d97706',
      component: 'marketplace-afisare',
    });
    tabConfig.push({
      label: 'Zilele Mele',
      shortLabel: 'Zilele Mele',
      color: '#059669',
      component: 'mydays-afisare',
    });
  } else if (isMaintenance) {
    // Intretinere Parcari users see only Semnare marketplace + their days
    tabConfig.push({
      label: 'Marketplace',
      shortLabel: 'Marketplace',
      color: '#d97706',
      component: 'marketplace-semnare',
    });
    tabConfig.push({
      label: 'Zilele Mele',
      shortLabel: 'Zilele Mele',
      color: '#059669',
      component: 'mydays-semnare',
    });
  }

  // Map tab indices to actual content
  const getTabContent = (index: number) => {
    const tab = tabConfig[index];
    if (!tab) return null;

    switch (tab.component) {
      case 'sessions-afisare':
        return <PvSessionsTab initialExpandedSessionId={openSessionId} />;
      case 'marketplace-afisare':
        return <PvMarketplaceTab />;
      case 'mydays-afisare':
        return <PvMyDaysTab />;
      case 'sessions-semnare':
        return <PvSigningSessionsTab initialExpandedSessionId={openSessionId} />;
      case 'marketplace-semnare':
        return <PvSigningMarketplaceTab />;
      case 'mydays-semnare':
        return <PvSigningMyDaysTab />;
      default:
        return null;
    }
  };

  // Determine page title and subtitle based on user department
  const getPageInfo = () => {
    if (isControl) {
      return {
        title: 'Afisare Procese Verbale',
        subtitle: 'Alege zilele disponibile si finalizeaza afisarile',
      };
    }
    if (isMaintenance) {
      return {
        title: 'Semnare Procese Verbale',
        subtitle: 'Alege zilele disponibile si finalizeaza semnarile',
      };
    }
    if (isPvf) {
      return {
        title: 'Procese Verbale',
        subtitle: 'Creeaza si gestioneaza sesiunile de afisare si semnare procese verbale',
      };
    }
    return {
      title: 'Procese Verbale',
      subtitle: 'Gestioneaza sesiunile de afisare si semnare procese verbale',
    };
  };

  const pageInfo = getPageInfo();

  return (
    <Box
      sx={{
        p: { xs: 0, sm: 1 },
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Grow in={true} timeout={500}>
        <Box
          sx={{
            mb: { xs: 2, sm: 3 },
            p: { xs: 2, sm: 2.5, md: 3 },
            background: theme.palette.mode === 'light'
              ? 'linear-gradient(135deg, #1e3a5f 0%, #334155 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: { xs: 2, sm: 3 },
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.3)',
          }}
        >
          {/* Background decoration */}
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
            <ReceiptIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                  mb: 0.5,
                }}
              >
                {pageInfo.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.9,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                }}
              >
                {pageInfo.subtitle}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Grow>

      {/* Tabs */}
      <Paper
        sx={{
          mb: { xs: 1.5, sm: 2 },
          borderRadius: { xs: 2, sm: 3 },
          overflow: 'hidden',
          boxShadow: theme.palette.mode === 'light'
            ? '0 2px 12px rgba(0, 0, 0, 0.08)'
            : '0 2px 12px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: { xs: 44, md: 72 },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              background: tabConfig[tabValue]?.color || '#3b82f6',
            },
            '& .MuiTab-root': {
              minHeight: { xs: 44, md: 72 },
              fontSize: { xs: '0.7rem', md: '0.875rem' },
              fontWeight: 500,
              textTransform: 'none',
              px: { xs: 0.5, md: 2 },
              minWidth: 0,
              '&.Mui-selected': {
                fontWeight: 700,
                color: tabConfig[tabValue]?.color || '#3b82f6',
              },
            },
          }}
        >
          {tabConfig.map((tab, index) => (
            <Tab
              key={index}
              label={isCompact ? tab.shortLabel : tab.label}
              sx={{
                '&.Mui-selected': {
                  color: tab.color,
                },
              }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Panels — only render tabs that have been visited; once mounted
          they stay mounted (keepMounted) so switching between them is instant
          and child state (scroll, filters, drafts) is preserved. */}
      {tabConfig.map((_, index) => {
        if (!visitedTabs.has(index)) return null;
        return (
          <TabPanel key={index} value={tabValue} index={index} keepMounted>
            {getTabContent(index)}
          </TabPanel>
        );
      })}
    </Box>
  );
};

export default ProcesVerbalePage;
