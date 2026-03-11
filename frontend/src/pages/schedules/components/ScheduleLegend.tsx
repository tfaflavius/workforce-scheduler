import React from 'react';
import {
  Paper,
  Typography,
  Stack,
  Chip,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

export interface ScheduleLegendProps {
  isMobile: boolean;
  legendExpanded: boolean;
  onToggleLegend: () => void;
}

const ScheduleLegend: React.FC<ScheduleLegendProps> = ({
  isMobile,
  legendExpanded,
  onToggleLegend,
}) => {
  return (
    <Paper sx={{ p: { xs: 1, sm: 1.5 }, width: '100%' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        onClick={() => isMobile && onToggleLegend()}
        sx={{ cursor: isMobile ? 'pointer' : 'default' }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" fontWeight="bold">
            Legenda:
          </Typography>
          {isMobile && !legendExpanded && (
            <Typography variant="caption" color="text.secondary">
              (apasa pentru a vedea)
            </Typography>
          )}
        </Stack>
        {isMobile && (
          <IconButton size="small">
            {legendExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        )}
      </Stack>
      <Collapse in={legendExpanded || !isMobile}>
        <Stack
          direction="row"
          spacing={0.5}
          flexWrap="wrap"
          useFlexGap
          alignItems="center"
          sx={{ mt: { xs: 1, sm: 0.5 } }}
        >
          <Chip label="Z - Zi 12h (07-19)" size="small" sx={{ bgcolor: '#4CAF50', color: 'white', fontSize: '0.65rem', height: 22 }} />
          <Chip label="N - Noapte 12h (19-07)" size="small" sx={{ bgcolor: '#3F51B5', color: 'white', fontSize: '0.65rem', height: 22 }} />
          <Chip label="Z1 - Zi 8h (06-14)" size="small" sx={{ bgcolor: '#00BCD4', color: 'white', fontSize: '0.65rem', height: 22 }} />
          <Chip label="Z2 - Zi 8h (14-22)" size="small" sx={{ bgcolor: '#9C27B0', color: 'white', fontSize: '0.65rem', height: 22 }} />
          <Chip label="Z3 - Zi 8h (07:30-15:30)" size="small" sx={{ bgcolor: '#795548', color: 'white', fontSize: '0.65rem', height: 22 }} />
          <Chip label="Z4 - Zi 8h (09-17)" size="small" sx={{ bgcolor: '#009688', color: 'white', fontSize: '0.65rem', height: 22 }} />
          <Chip label="Z5 - Zi 8h (08-16)" size="small" sx={{ bgcolor: '#FF5722', color: 'white', fontSize: '0.65rem', height: 22 }} />
          <Chip label="Z6 - Zi 8h (13-21)" size="small" sx={{ bgcolor: '#673AB7', color: 'white', fontSize: '0.65rem', height: 22 }} />
          <Chip label="N8 - Noapte 8h (22-06)" size="small" sx={{ bgcolor: '#E91E63', color: 'white', fontSize: '0.65rem', height: 22 }} />
          <Chip label="CO - Concediu" size="small" sx={{ bgcolor: '#FF9800', color: 'white', fontSize: '0.65rem', height: 22 }} />
          <Chip label="- Liber" variant="outlined" size="small" sx={{ fontSize: '0.65rem', height: 22 }} />
        </Stack>
      </Collapse>
    </Paper>
  );
};

export default ScheduleLegend;
