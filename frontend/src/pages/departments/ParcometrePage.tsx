import React from 'react';
import { Box, Typography, Card, alpha } from '@mui/material';
import { ConfirmationNumber as MeterIcon } from '@mui/icons-material';

const ParcometrePage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <MeterIcon sx={{ fontSize: 32, color: '#8b5cf6' }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Parcometre
        </Typography>
      </Box>

      <Card
        sx={{
          borderRadius: 3,
          p: 4,
          textAlign: 'center',
          bgcolor: alpha('#8b5cf6', 0.06),
          border: '1px dashed',
          borderColor: alpha('#8b5cf6', 0.3),
        }}
      >
        <MeterIcon sx={{ fontSize: 64, color: alpha('#8b5cf6', 0.4), mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#8b5cf6', mb: 1 }}>
          Parcometre
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sectiunea va fi populata ulterior cu functionalitati specifice departamentului.
        </Typography>
      </Card>
    </Box>
  );
};

export default ParcometrePage;
