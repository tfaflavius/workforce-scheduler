import { useState, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  Security as SecurityIcon,
  GridOn as MatrixIcon,
  People as PeopleIcon,
  AccountTree as FlowIcon,
  PersonAdd as OverrideIcon,
  Email as EmailIcon,
  Notifications as NotificationsIcon,
  Build as BuildIcon,
  Business as BusinessIcon,
  History as AuditIcon,
} from '@mui/icons-material';
import PermissionMatrixTab from './components/PermissionMatrixTab';
import UsersDepartmentsTab from './components/UsersDepartmentsTab';
import TaskFlowsTab from './components/TaskFlowsTab';
import UserOverridesTab from './components/UserOverridesTab';
import EmailNotificationRulesTab from './components/EmailNotificationRulesTab';
import NotificationSettingsTab from './components/NotificationSettingsTab';
import EquipmentTab from './components/EquipmentTab';
import ContactFirmsTab from './components/ContactFirmsTab';
import AuditTab from './components/AuditTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    sx={{ py: { xs: 1, sm: 2 } }}
  >
    {value === index && children}
  </Box>
);

const PermissionsPage = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const tabs = [
    { icon: <MatrixIcon />, label: 'Matrice Permisiuni', short: 'Matrice' },
    { icon: <PeopleIcon />, label: 'Utilizatori & Departamente', short: 'Utilizatori' },
    { icon: <FlowIcon />, label: 'Fluxuri Task-uri', short: 'Fluxuri' },
    { icon: <OverrideIcon />, label: 'Exceptii Utilizator', short: 'Exceptii' },
    { icon: <EmailIcon />, label: 'Fluxuri Email', short: 'Email' },
    { icon: <NotificationsIcon />, label: 'Setari Notificari', short: 'Notificari' },
    { icon: <BuildIcon />, label: 'Echipamente Parcari', short: 'Echipamente' },
    { icon: <BusinessIcon />, label: 'Firme Contact', short: 'Firme' },
    { icon: <AuditIcon />, label: 'Audit & Istoric', short: 'Audit' },
  ];

  return (
    <Box sx={{ p: { xs: 0.5, sm: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <SecurityIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: 'primary.main' }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
            Gestionare Permisiuni
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, display: { xs: 'none', sm: 'block' } }}>
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
            '& .MuiTab-root': {
              minHeight: { xs: 40, sm: 48 },
              textTransform: 'none',
              fontWeight: 600,
              minWidth: { xs: 'auto', sm: 90 },
              px: { xs: 1, sm: 2 },
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              iconPosition="start"
              label={isMobile ? tab.short : tab.label}
              {...(isMobile ? { 'aria-label': tab.label } : {})}
            />
          ))}
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
      <TabPanel value={tabIndex} index={5}>
        <NotificationSettingsTab />
      </TabPanel>
      <TabPanel value={tabIndex} index={6}>
        <EquipmentTab />
      </TabPanel>
      <TabPanel value={tabIndex} index={7}>
        <ContactFirmsTab />
      </TabPanel>
      <TabPanel value={tabIndex} index={8}>
        <AuditTab />
      </TabPanel>
    </Box>
  );
};

export default memo(PermissionsPage);
