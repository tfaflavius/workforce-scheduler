import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Business as BusinessIcon,
  CheckCircle as ResolveIcon,
  Create as CreateIcon,
  Inbox as InboxIcon,
} from '@mui/icons-material';
import { TASK_TYPE_LABELS } from '../../../constants/permissions';
import { removeDiacritics } from '../../../utils/removeDiacritics';
import type { TaskFlowRule } from '../../../types/permission.types';

interface Department {
  id: string;
  name: string;
}

interface DepartmentFlowCardProps {
  department: Department;
  flows: TaskFlowRule[];
}

const getRoleLabel = (role: string | null) => {
  switch (role) {
    case 'ADMIN': return 'Admin';
    case 'MANAGER': return 'Manager';
    case 'USER': return 'Utilizator';
    default: return 'Oricine';
  }
};

const getRoleColor = (role: string | null): 'error' | 'warning' | 'info' | 'default' => {
  switch (role) {
    case 'ADMIN': return 'error';
    case 'MANAGER': return 'warning';
    case 'USER': return 'info';
    default: return 'default';
  }
};

const DepartmentFlowCard = ({ department, flows }: DepartmentFlowCardProps) => {
  const deptId = department.id;

  const creates = flows.filter((f) => f.creatorDepartmentId === deptId && f.isActive);
  const receives = flows.filter((f) => f.receiverDepartmentId === deptId && f.isActive);
  const resolves = flows.filter((f) => f.resolverDepartmentId === deptId && f.isActive);

  const hasFlows = creates.length > 0 || receives.length > 0 || resolves.length > 0;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ pb: 1, '&:last-child': { pb: 2 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <BusinessIcon color="primary" />
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {removeDiacritics(department.name)}
          </Typography>
        </Box>

        {!hasFlows && (
          <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
            Niciun flux activ
          </Typography>
        )}

        {/* Creaza */}
        {creates.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <CreateIcon sx={{ fontSize: 16, color: 'success.main' }} />
              <Typography variant="caption" fontWeight="bold" color="success.main">
                CREAZA
              </Typography>
            </Box>
            {creates.map((flow) => (
              <Box key={flow.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2.5, mb: 0.5, flexWrap: 'wrap' }}>
                <Chip
                  label={TASK_TYPE_LABELS[flow.taskType] || flow.taskType}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 22 }}
                />
                <ArrowForwardIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {flow.receiverDepartment ? removeDiacritics(flow.receiverDepartment.name) : 'Oricine'}
                </Typography>
                <Chip
                  label={getRoleLabel(flow.receiverRole)}
                  size="small"
                  color={getRoleColor(flow.receiverRole)}
                  sx={{ height: 18, fontSize: '0.6rem' }}
                />
              </Box>
            ))}
          </Box>
        )}

        {(creates.length > 0 && (receives.length > 0 || resolves.length > 0)) && <Divider sx={{ my: 1 }} />}

        {/* Primeste */}
        {receives.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <InboxIcon sx={{ fontSize: 16, color: 'info.main' }} />
              <Typography variant="caption" fontWeight="bold" color="info.main">
                PRIMESTE
              </Typography>
            </Box>
            {receives.map((flow) => (
              <Box key={flow.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2.5, mb: 0.5, flexWrap: 'wrap' }}>
                <Chip
                  label={TASK_TYPE_LABELS[flow.taskType] || flow.taskType}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 22 }}
                />
                <ArrowBackIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {flow.creatorDepartment ? removeDiacritics(flow.creatorDepartment.name) : 'Oricine'}
                </Typography>
                <Chip
                  label={getRoleLabel(flow.creatorRole)}
                  size="small"
                  color={getRoleColor(flow.creatorRole)}
                  sx={{ height: 18, fontSize: '0.6rem' }}
                />
              </Box>
            ))}
          </Box>
        )}

        {(receives.length > 0 && resolves.length > 0) && <Divider sx={{ my: 1 }} />}

        {/* Rezolva */}
        {resolves.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <ResolveIcon sx={{ fontSize: 16, color: 'warning.main' }} />
              <Typography variant="caption" fontWeight="bold" color="warning.main">
                REZOLVA
              </Typography>
            </Box>
            {resolves.map((flow) => (
              <Box key={flow.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2.5, mb: 0.5, flexWrap: 'wrap' }}>
                <Chip
                  label={TASK_TYPE_LABELS[flow.taskType] || flow.taskType}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 22 }}
                />
                <ArrowBackIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  primit de la {flow.creatorDepartment ? removeDiacritics(flow.creatorDepartment.name) : 'Oricine'}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DepartmentFlowCard;
