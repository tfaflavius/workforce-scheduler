import { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Button,
} from '@mui/material';
import {
  AccountTree as FlowIcon,
  ArrowForward as ArrowIcon,
  Create as CreateIcon,
  Inbox as InboxIcon,
  CheckCircle as ResolveIcon,
  AddCircle as AddIcon,
} from '@mui/icons-material';
import { useGetTaskFlowsQuery } from '../../../store/api/permissions.api';
import { TASK_TYPE_LABELS } from '../../../constants/permissions';
import { getRoleLabel } from '../../../utils/roleHelpers';
import { removeDiacritics } from '../../../utils/removeDiacritics';
import type { TaskFlowRule } from '../../../types/permission.types';

interface UserFlowParticipationProps {
  user: {
    id: string;
    fullName: string;
    role: string;
    department?: { id: string; name: string } | null;
  };
  onGrantAccess?: () => void;
}

const matchesRole = (flowRole: string | null, userRole: string) =>
  flowRole === null || flowRole === userRole;

const matchesDept = (flowDeptId: string | null, userDeptId: string | null) =>
  flowDeptId === null || flowDeptId === userDeptId;

const FlowEntry = ({ flow, highlightStep }: { flow: TaskFlowRule; highlightStep: 'creator' | 'receiver' | 'resolver' }) => {
  const steps = [
    {
      key: 'creator',
      dept: flow.creatorDepartment,
      role: flow.creatorRole,
    },
    {
      key: 'receiver',
      dept: flow.receiverDepartment,
      role: flow.receiverRole,
    },
    {
      key: 'resolver',
      dept: flow.resolverDepartment,
      role: flow.resolverRole,
    },
  ];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', py: 0.5 }}>
      <Chip
        label={TASK_TYPE_LABELS[flow.taskType] || flow.taskType}
        size="small"
        sx={{ fontWeight: 'bold', fontSize: '0.7rem', height: 24 }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mx: 0.5 }}>:</Typography>
      {steps.map((step, idx) => (
        <Box key={step.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
          {idx > 0 && <ArrowIcon sx={{ fontSize: 12, color: 'text.disabled' }} />}
          <Chip
            label={`${step.dept ? removeDiacritics(step.dept.name) : 'Oricine'} (${getRoleLabel(step.role)})`}
            size="small"
            color={step.key === highlightStep ? 'primary' : 'default'}
            variant={step.key === highlightStep ? 'filled' : 'outlined'}
            sx={{
              fontSize: '0.65rem',
              height: 20,
              fontWeight: step.key === highlightStep ? 'bold' : 'normal',
              border: step.key === highlightStep ? '2px solid' : undefined,
            }}
          />
        </Box>
      ))}
    </Box>
  );
};

const UserFlowParticipation = ({ user, onGrantAccess }: UserFlowParticipationProps) => {
  const { data: flows, isLoading } = useGetTaskFlowsQuery();

  const participation = useMemo(() => {
    if (!flows) return { creates: [], receives: [], resolves: [] };

    const userDeptId = user.department?.id || null;
    const activeFlows = flows.filter((f) => f.isActive);

    return {
      creates: activeFlows.filter(
        (f) => matchesRole(f.creatorRole, user.role) && matchesDept(f.creatorDepartmentId, userDeptId),
      ),
      receives: activeFlows.filter(
        (f) => matchesRole(f.receiverRole, user.role) && matchesDept(f.receiverDepartmentId, userDeptId),
      ),
      resolves: activeFlows.filter(
        (f) => matchesRole(f.resolverRole, user.role) && matchesDept(f.resolverDepartmentId, userDeptId),
      ),
    };
  }, [flows, user.role, user.department?.id]);

  const totalFlows = participation.creates.length + participation.receives.length + participation.resolves.length;

  if (isLoading) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlowIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography variant="subtitle2" fontWeight="bold">
            Fluxuri in care participa
          </Typography>
          {totalFlows > 0 && (
            <Chip label={totalFlows} size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
          )}
        </Box>
        {onGrantAccess && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={onGrantAccess}
          >
            Adauga Acces la Flux
          </Button>
        )}
      </Box>

      {totalFlows === 0 && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Acest utilizator nu participa in niciun flux de task-uri pe baza rolului si departamentului actual.
        </Alert>
      )}

      {/* Creaza */}
      {participation.creates.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <CreateIcon sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="caption" fontWeight="bold" color="success.main">
              CREAZA ({participation.creates.length})
            </Typography>
          </Box>
          {participation.creates.map((flow) => (
            <FlowEntry key={`create-${flow.id}`} flow={flow} highlightStep="creator" />
          ))}
        </Box>
      )}

      {participation.creates.length > 0 && participation.receives.length > 0 && <Divider sx={{ my: 1 }} />}

      {/* Primeste */}
      {participation.receives.length > 0 && (
        <Box sx={{ mt: participation.creates.length > 0 ? 0 : 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <InboxIcon sx={{ fontSize: 16, color: 'info.main' }} />
            <Typography variant="caption" fontWeight="bold" color="info.main">
              PRIMESTE ({participation.receives.length})
            </Typography>
          </Box>
          {participation.receives.map((flow) => (
            <FlowEntry key={`receive-${flow.id}`} flow={flow} highlightStep="receiver" />
          ))}
        </Box>
      )}

      {(participation.creates.length > 0 || participation.receives.length > 0) && participation.resolves.length > 0 && (
        <Divider sx={{ my: 1 }} />
      )}

      {/* Rezolva */}
      {participation.resolves.length > 0 && (
        <Box sx={{ mt: (participation.creates.length > 0 || participation.receives.length > 0) ? 0 : 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <ResolveIcon sx={{ fontSize: 16, color: 'warning.main' }} />
            <Typography variant="caption" fontWeight="bold" color="warning.main">
              REZOLVA ({participation.resolves.length})
            </Typography>
          </Box>
          {participation.resolves.map((flow) => (
            <FlowEntry key={`resolve-${flow.id}`} flow={flow} highlightStep="resolver" />
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default UserFlowParticipation;
