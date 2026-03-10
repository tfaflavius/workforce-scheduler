import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Security as SecurityIcon,
  GridOn as MatrixIcon,
  People as PeopleIcon,
  AccountTree as FlowIcon,
  PersonAdd as OverrideIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import PermissionMatrixTab from './components/PermissionMatrixTab';
import UsersDepartmentsTab from './components/UsersDepartmentsTab';
import TaskFlowsTab from './components/TaskFlowsTab';
import UserOverridesTab from './components/UserOverridesTab';
import EmailNotificationRulesTab from './components/EmailNotificationRulesTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    sx={{ py: 2 }}
  >
    {value === index && children}
  </Box>
);

const PermissionsPage = () => {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <SecurityIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Gestionare Permisiuni
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administreaza permisiunile, fluxurile si accesul utilizatorilor
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 0 }}>
        <Tabs
          value={tabIndex}
          onChange={(_e, newVal) => setTabIndex(newVal)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 600 },
          }}
        >
          <Tab icon={<MatrixIcon />} iconPosition="start" label="Matrice Permisiuni" />
          <Tab icon={<PeopleIcon />} iconPosition="start" label="Utilizatori & Departamente" />
          <Tab icon={<FlowIcon />} iconPosition="start" label="Fluxuri Task-uri" />
          <Tab icon={<OverrideIcon />} iconPosition="start" label="Exceptii Utilizator" />
          <Tab icon={<EmailIcon />} iconPosition="start" label="Fluxuri Email" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <TabPanel value={tabIndex} index={0}>
        <PermissionMatrixTab />
      </TabPanel>
      <TabPanel value={tabIndex} index={1}>
        <UsersDepartmentsTab />
      </TabPanel>
      <TabPanel value={tabIndex} index={2}>
        <TaskFlowsTab />
      </TabPanel>
      <TabPanel value={tabIndex} index={3}>
        <UserOverridesTab />
      </TabPanel>
      <TabPanel value={tabIndex} index={4}>
        <EmailNotificationRulesTab />
      </TabPanel>
    </Box>
  );
};

export default PermissionsPage;
