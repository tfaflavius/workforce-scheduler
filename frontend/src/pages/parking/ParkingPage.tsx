import React, { useState, useEffect } from 'react';
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
  ReportProblem as IssuesIcon,
  Warning as DamagesIcon,
  LocalAtm as CashIcon,
  Build as MaintenanceIcon,
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import ParkingIssuesTab from './components/ParkingIssuesTab';
import ParkingDamagesTab from './components/ParkingDamagesTab';
import CashCollectionsTab from './components/CashCollectionsTab';
import MaintenanceIssuesTab from './components/MaintenanceIssuesTab';
import {
  useGetMyAssignedIssuesQuery,
} from '../../store/api/parking.api';

// Nume departament pentru verificare
const MAINTENANCE_DEPARTMENT_NAME = 'Intretinere Parcari';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  // Lazy rendering - don't mount inactive tabs at all
  if (value !== index) return null;

  return (
    <div
      role="tabpanel"
      id={`parking-tabpanel-${index}`}
      aria-labelledby={`parking-tab-${index}`}
      {...other}
    >
      <Fade in={true} timeout={400}>
        <Box sx={{ pt: { xs: 1.5, sm: 2 } }}>{children}</Box>
      </Fade>
    </div>
  );
}

const ParkingPage: React.FC = () => {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md')); // < 768px
  const location = useLocation();
  const [tabValue, setTabValue] = useState(0);

  // State for opening specific items from notifications
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [openDamageId, setOpenDamageId] = useState<string | null>(null);

  const { user } = useAppSelector((state) => state.auth);

  // Handle navigation state from notifications
  useEffect(() => {
    const state = location.state as { openIssueId?: string; openDamageId?: string; tab?: number } | null;
    if (state) {
      if (state.openIssueId) {
        setOpenIssueId(state.openIssueId);
        setTabValue(0);
      }
      if (state.openDamageId) {
        setOpenDamageId(state.openDamageId);
        setTabValue(1);
      }
      if (state.tab !== undefined) {
        setTabValue(state.tab);
      }
      // Clear the state after handling
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Check if user is from Intretinere Parcari department
  const isMaintenanceUser = user?.role === 'USER' && user?.department?.name === MAINTENANCE_DEPARTMENT_NAME;

  // Fetch data for maintenance users
  const { data: myAssignedIssues = [] } = useGetMyAssignedIssuesQuery(undefined, { skip: !isMaintenanceUser });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // For maintenance users, show only assigned issues count
  const maintenanceActiveCount = myAssignedIssues.filter(i => i.status === 'ACTIVE').length;

  const tabConfig = [
    {
      icon: <IssuesIcon />,
      label: 'Probleme Parcari',
      shortLabel: 'Probleme',
      color: '#ef4444',
      bgColor: alpha('#ef4444', 0.1),
    },
    {
      icon: <DamagesIcon />,
      label: 'Prejudicii Parcari',
      shortLabel: 'Prejudicii',
      color: '#f59e0b',
      bgColor: alpha('#f59e0b', 0.1),
    },
    {
      icon: <CashIcon />,
      label: 'Automate de Plata',
      shortLabel: 'Ridicari',
      color: '#10b981',
      bgColor: alpha('#10b981', 0.1),
    },
  ];

  // If user is from Intretinere Parcari, show only their assigned issues
  if (isMaintenanceUser) {
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
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
              borderRadius: { xs: 2, sm: 3 },
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)',
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
              <MaintenanceIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                    mb: 0.5,
                  }}
                >
                  Problemele Mele
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.9,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  }}
                >
                  Problemele din parcari alocate pentru rezolvare • {maintenanceActiveCount} active
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grow>

        {/* Main content - only assigned issues */}
        <MaintenanceIssuesTab />
      </Box>
    );
  }

  // Regular view for Dispecerat, Managers, and Admins
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
              ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
              : 'linear-gradient(135deg, #1e40af 0%, #5b21b6 100%)',
            borderRadius: { xs: 2, sm: 3 },
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(37, 99, 235, 0.3)',
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

          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
              mb: 0.5,
              position: 'relative',
            }}
          >
            Parcari Etajate
          </Typography>
          <Typography
            variant="body2"
            sx={{
              opacity: 0.9,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              position: 'relative',
            }}
          >
            Gestioneaza problemele, prejudiciile si ridicarile de numerar din parcari
          </Typography>
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
              background: tabConfig[tabValue].color,
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
                color: tabConfig[tabValue].color,
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
      <TabPanel value={tabValue} index={0}>
        <ParkingIssuesTab
          initialOpenId={openIssueId}
          onOpenIdHandled={() => setOpenIssueId(null)}
        />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <ParkingDamagesTab
          initialOpenId={openDamageId}
          onOpenIdHandled={() => setOpenDamageId(null)}
        />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <CashCollectionsTab />
      </TabPanel>
    </Box>
  );
};

export default ParkingPage;
