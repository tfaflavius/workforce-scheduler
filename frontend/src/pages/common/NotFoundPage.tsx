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
      <NotFoundIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h4" fontWeight={700} gutterBottom>
        404
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Pagina nu a fost gasita
      </Typography>
      <Typography variant="body2" color="text.disabled" sx={{ mb: 3, maxWidth: 400 }}>
        Pagina pe care o cauti nu exista sau a fost mutata.
      </Typography>
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Inapoi la Dashboard
        </Button>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Pagina anterioara
        </Button>
      </Stack>
    </Box>
  );
};

export default NotFoundPage;
