import React from 'react';
import { Box } from '@mui/material';
import { AssignmentTurnedIn as ControlNotesIcon } from '@mui/icons-material';
import { GradientHeader } from '../../components/common';
import ControlNotesTab from '../departments/components/ControlNotesTab';

/**
 * Dedicated page for Note de Constatare — Control Parcari.
 * Accessible to Parcometre dept, Admin, and Manager. Re-uses ControlNotesTab
 * which already has the proper canEdit logic for these roles.
 */
const ControlNotesPage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: { xs: 1, sm: 2, md: 3 } }}>
      <GradientHeader
        title="Note de Constatare"
        subtitle="Control Parcari — evidenta notelor pe agent si luna"
        icon={<ControlNotesIcon />}
        gradient="#2563eb 0%, #1d4ed8 100%"
      />
      <ControlNotesTab />
    </Box>
  );
};

export default React.memo(ControlNotesPage);
