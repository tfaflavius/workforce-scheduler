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
  ReportProblem as IssuesIcon,
  Warning as DamagesIcon,
  LocalAtm as CashIcon,
} from '@mui/icons-material';
import ParkingIssuesTab from './components/ParkingIssuesTab';
import ParkingDamagesTab from './components/ParkingDamagesTab';
import CashCollectionsTab from './components/CashCollectionsTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`parking-tabpanel-${index}`}
      aria-labelledby={`parking-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Fade in={true} timeout={400}>
          <Box sx={{ pt: { xs: 1.5, sm: 2 } }}>{children}</Box>
        </Fade>
      )}
    </div>
  );
}

const ParkingPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // < 430px
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const tabConfig = [
    {
      icon: <IssuesIcon />,
      label: 'Probleme Parcări',
      shortLabel: 'Probleme',
      color: '#ef4444',
      bgColor: alpha('#ef4444', 0.1),
    },
    {
      icon: <DamagesIcon />,
      label: 'Prejudicii Parcări',
      shortLabel: 'Prejudicii',
      color: '#f59e0b',
      bgColor: alpha('#f59e0b', 0.1),
    },
    {
      icon: <CashIcon />,
      label: 'Automate de Plată',
      shortLabel: 'Ridicări',
      color: '#10b981',
      bgColor: alpha('#10b981', 0.1),
    },
  ];

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
            Parcări Etajate
          </Typography>
          <Typography
            variant="body2"
            sx={{
              opacity: 0.9,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              position: 'relative',
            }}
          >
            Gestionează problemele, prejudiciile și ridicările de numerar din parcări
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
          indicatorColor="primary"
          textColor="primary"
          sx={{
            minHeight: { xs: 56, sm: 64, md: 72 },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              background: tabConfig[tabValue].color,
            },
            '& .MuiTab-root': {
              minHeight: { xs: 56, sm: 64, md: 72 },
              fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
              fontWeight: 500,
              textTransform: 'none',
              transition: 'all 0.3s ease',
              px: { xs: 1, sm: 2 },
              '&.Mui-selected': {
                fontWeight: 600,
                color: tabConfig[tabValue].color,
                bgcolor: tabConfig[tabValue].bgColor,
              },
              '&:hover': {
                bgcolor: alpha(tabConfig[tabValue].color, 0.05),
              },
            },
          }}
        >
          {tabConfig.map((tab, index) => (
            <Tab
              key={index}
              icon={
                <Box
                  sx={{
                    p: { xs: 0.75, sm: 1 },
                    borderRadius: '50%',
                    bgcolor: tabValue === index ? tab.bgColor : 'transparent',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '& .MuiSvgIcon-root': {
                      fontSize: { xs: '1.25rem', sm: '1.5rem' },
                      color: tabValue === index ? tab.color : 'text.secondary',
                      transition: 'all 0.3s ease',
                    },
                  }}
                >
                  {tab.icon}
                </Box>
              }
              label={isMobile ? tab.shortLabel : tab.label}
              iconPosition="top"
              sx={{
                gap: { xs: 0.25, sm: 0.5 },
              }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <ParkingIssuesTab />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <ParkingDamagesTab />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <CashCollectionsTab />
      </TabPanel>
    </Box>
  );
};

export default ParkingPage;
