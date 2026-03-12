import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { SearchOff as NotFoundIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        px: 3,
      }}
    >
      <NotFoundIcon sx={{ fontSize: { xs: 60, sm: 80 }, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
        404
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
        Pagina nu a fost gasita
      </Typography>
      <Typography variant="body2" color="text.disabled" sx={{ mb: 3, maxWidth: 400 }}>
        Pagina pe care o cauti nu exista sau a fost mutata.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
        <Button variant="contained" onClick={() => navigate('/dashboard')} fullWidth sx={{ maxWidth: { sm: 'none' } }}>
          Inapoi la Dashboard
        </Button>
        <Button variant="outlined" onClick={() => navigate(-1)} fullWidth sx={{ maxWidth: { sm: 'none' } }}>
          Pagina anterioara
        </Button>
      </Stack>
    </Box>
  );
};

export default NotFoundPage;
