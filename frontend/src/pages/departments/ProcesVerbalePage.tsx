import React from 'react';
import { Box, Typography, Card, alpha } from '@mui/material';
import { Receipt as ReceiptIcon } from '@mui/icons-material';

const ProcesVerbalePage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <ReceiptIcon sx={{ fontSize: 32, color: '#3b82f6' }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Procese Verbale / Facturare
        </Typography>
      </Box>

      <Card
        sx={{
          borderRadius: 3,
          p: 4,
          textAlign: 'center',
          bgcolor: alpha('#3b82f6', 0.06),
          border: '1px dashed',
          borderColor: alpha('#3b82f6', 0.3),
        }}
      >
        <ReceiptIcon sx={{ fontSize: 64, color: alpha('#3b82f6', 0.4), mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#3b82f6', mb: 1 }}>
          Procese Verbale / Facturare
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sectiunea va fi populata ulterior cu functionalitati specifice departamentului.
        </Typography>
      </Card>
    </Box>
  );
};

export default ProcesVerbalePage;
