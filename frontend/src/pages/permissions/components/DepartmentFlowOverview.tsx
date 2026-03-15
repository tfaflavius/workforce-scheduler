import { memo } from 'react';
import {
  Box,
  Typography,
  Grid,
} from '@mui/material';
import { AccountTree as FlowIcon } from '@mui/icons-material';
import DepartmentFlowCard from './DepartmentFlowCard';
import type { TaskFlowRule } from '../../../types/permission.types';

interface Department {
  id: string;
  name: string;
}

interface DepartmentFlowOverviewProps {
  departments: Department[];
  flows: TaskFlowRule[];
}

const DepartmentFlowOverview = ({ departments, flows }: DepartmentFlowOverviewProps) => {
  if (!departments.length || !flows.length) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <FlowIcon color="primary" />
        <Typography variant="h6" fontWeight="bold">
          Fluxuri per Departament
        </Typography>
      </Box>
      <Grid container spacing={2}>
        {departments.map((dept) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={dept.id}>
            <DepartmentFlowCard department={dept} flows={flows} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default memo(DepartmentFlowOverview);
