import React from 'react';
import { Box, Grid, Skeleton, Card, CardContent, Stack } from '@mui/material';

export const DashboardSkeleton: React.FC = () => {
  return (
    <Box sx={{ width: '100%', p: { xs: 0, sm: 1 } }}>
      {/* Header skeleton */}
      <Skeleton
        variant="rounded"
        sx={{
          height: { xs: 80, sm: 100, md: 120 },
          borderRadius: { xs: 2, sm: 3 },
          mb: { xs: 2, sm: 3 },
        }}
      />

      {/* Stat cards skeleton */}
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
        {[1, 2, 3, 4].map((i) => (
          <Grid key={i} size={{ xs: 6, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" sx={{ fontSize: '0.75rem' }} />
                    <Skeleton variant="text" width="40%" sx={{ fontSize: '2rem', mt: 0.5 }} />
                    <Skeleton variant="text" width="80%" sx={{ fontSize: '0.75rem', mt: 0.5 }} />
                  </Box>
                  <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 2, flexShrink: 0 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Section skeleton */}
      <Skeleton variant="text" width={150} sx={{ fontSize: '0.875rem', mb: 2 }} />
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Stack key={i} direction="row" alignItems="center" spacing={2}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="text" width="30%" sx={{ fontSize: '0.75rem' }} />
                </Box>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardSkeleton;
