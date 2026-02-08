import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
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
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const ParkingPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" gutterBottom>
          Parcări Etajate
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gestionează problemele, prejudiciile și ridicările de numerar din parcări
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant={isMobile ? 'fullWidth' : 'standard'}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: { xs: 56, sm: 64 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            },
          }}
        >
          <Tab
            icon={<IssuesIcon />}
            label="Probleme Parcări"
            iconPosition={isMobile ? 'top' : 'start'}
          />
          <Tab
            icon={<DamagesIcon />}
            label="Prejudicii Parcări"
            iconPosition={isMobile ? 'top' : 'start'}
          />
          <Tab
            icon={<CashIcon />}
            label="Automate de Plată"
            iconPosition={isMobile ? 'top' : 'start'}
          />
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
