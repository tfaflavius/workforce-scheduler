import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Fade,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Inventory as InventoryIcon } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { isAdminOrAbove, isMasterAdmin } from '../../utils/roleHelpers';
import { PARCOMETRE_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME } from '../../constants/departments';
import { STOCK_CATEGORIES, STOCK_CATEGORY_LABELS } from '../../constants/equipmentStock';
import type { StockCategory } from '../../constants/equipmentStock';
import GradientHeader from '../../components/common/GradientHeader';
import StockCategoryTab from './components/StockCategoryTab';
import StockDefinitionsManager from './components/StockDefinitionsManager';

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
      id={`stock-tabpanel-${index}`}
      aria-labelledby={`stock-tab-${index}`}
      {...other}
    >
      <Fade in={true} timeout={400}>
        <Box sx={{ pt: { xs: 1.5, sm: 2 } }}>{children}</Box>
      </Fade>
    </div>
  );
}

const EquipmentStockPage: React.FC = () => {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState(0);
  const { user } = useAppSelector((state) => state.auth);

  const userDept = user?.department?.name || '';
  const isAdmin = isAdminOrAbove(user?.role);
  const isMaster = isMasterAdmin(user?.role);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  // Determine edit permissions per category
  const canEditCategory = useCallback((category: StockCategory): boolean => {
    if (isAdmin) return true;
    if (category === 'PARCOMETRE' && userDept === PARCOMETRE_DEPARTMENT_NAME) return true;
    if (category === 'PARCARI_STRADALE' && userDept === MAINTENANCE_DEPARTMENT_NAME) return true;
    return false;
  }, [isAdmin, userDept]);

  // Build tab configuration
  const tabConfig = useMemo(() => {
    const tabs: Array<{
      label: string;
      shortLabel: string;
      color: string;
      component: 'category' | 'definitions';
      category?: StockCategory;
    }> = [
      {
        label: STOCK_CATEGORY_LABELS.PARCARI_ETAJATE,
        shortLabel: 'Etajate',
        color: '#3b82f6',
        component: 'category',
        category: 'PARCARI_ETAJATE',
      },
      {
        label: STOCK_CATEGORY_LABELS.PARCARI_STRADALE,
        shortLabel: 'Stradale',
        color: '#10b981',
        component: 'category',
        category: 'PARCARI_STRADALE',
      },
      {
        label: STOCK_CATEGORY_LABELS.PARCOMETRE,
        shortLabel: 'Parcometre',
        color: '#f59e0b',
        component: 'category',
        category: 'PARCOMETRE',
      },
    ];

    if (isMaster) {
      tabs.push({
        label: 'Definitii',
        shortLabel: 'Definitii',
        color: '#8b5cf6',
        component: 'definitions',
      });
    }

    return tabs;
  }, [isMaster]);

  const getTabContent = (index: number) => {
    const tab = tabConfig[index];
    if (!tab) return null;

    if (tab.component === 'definitions') {
      return <StockDefinitionsManager />;
    }

    return (
      <StockCategoryTab
        category={tab.category!}
        canEdit={canEditCategory(tab.category!)}
      />
    );
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
      <GradientHeader
        title="Stoc Echipamente"
        subtitle="Gestioneaza stocul de echipamente pe categorii"
        icon={<InventoryIcon />}
        gradient="#3b82f6 0%, #10b981 100%"
      />

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
          variant={isCompact ? 'scrollable' : 'fullWidth'}
          scrollButtons={isCompact ? 'auto' : false}
          allowScrollButtonsMobile
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

export default EquipmentStockPage;
