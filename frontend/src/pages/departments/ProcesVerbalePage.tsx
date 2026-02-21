import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  alpha,
  Fade,
  Grow,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Store as MarketplaceIcon,
  Assignment as MyDaysIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import PvSessionsTab from './components/PvSessionsTab';
import PvMarketplaceTab from './components/PvMarketplaceTab';
import PvMyDaysTab from './components/PvMyDaysTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  if (value !== index) return null;

  return (
    <div
      role="tabpanel"
      id={`pv-tabpanel-${index}`}
      aria-labelledby={`pv-tab-${index}`}
      {...other}
    >
      <Fade in={true} timeout={400}>
        <Box sx={{ pt: { xs: 1.5, sm: 2 } }}>{children}</Box>
      </Fade>
    </div>
  );
}

const ProcesVerbalePage: React.FC = () => {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState(0);
  const { user } = useAppSelector((state) => state.auth);

  const userDept = user?.department?.name || '';
  const isControl = userDept === 'Control';
  const isPvf = userDept === 'Procese Verbale/Facturare';
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Control vede: Marketplace + Zilele Mele
  // PVF vede: Sesiuni + Marketplace
  // Admin/Manager vede: Sesiuni + Marketplace
  const tabConfig = [];

  if (!isControl) {
    tabConfig.push({
      label: 'Sesiuni',
      shortLabel: 'Sesiuni',
      color: '#3b82f6',
    });
  }

  tabConfig.push({
    label: 'Marketplace',
    shortLabel: 'Marketplace',
    color: '#f59e0b',
  });

  if (isControl || isAdmin) {
    tabConfig.push({
      label: 'Zilele Mele',
      shortLabel: 'Zilele Mele',
      color: '#10b981',
    });
  }

  // Map tab indices to actual content
  const getTabContent = (index: number) => {
    const tab = tabConfig[index];
    if (!tab) return null;

    switch (tab.label) {
      case 'Sesiuni':
        return <PvSessionsTab />;
      case 'Marketplace':
        return <PvMarketplaceTab />;
      case 'Zilele Mele':
        return <PvMyDaysTab />;
      default:
        return null;
    }
  };

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
              ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
              : 'linear-gradient(135deg, #1e40af 0%, #5b21b6 100%)',
            borderRadius: { xs: 2, sm: 3 },
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
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
                Afisare Procese Verbale
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.9,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                }}
              >
                {isControl
                  ? 'Alege zilele disponibile si finalizeaza afisarile'
                  : isPvf
                    ? 'Creeaza si gestioneaza sesiunile de afisare procese verbale'
                    : 'Gestioneaza sesiunile de afisare procese verbale'}
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
              fontSize: { xs: '0.8rem', md: '0.875rem' },
              fontWeight: 500,
              textTransform: 'none',
              px: { xs: 1, md: 2 },
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

      {/* Tab Panels */}
      {tabConfig.map((_, index) => (
        <TabPanel key={index} value={tabValue} index={index}>
          {getTabContent(index)}
        </TabPanel>
      ))}
    </Box>
  );
};

export default ProcesVerbalePage;
