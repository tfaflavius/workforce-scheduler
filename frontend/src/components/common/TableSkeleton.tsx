import React from 'react';
import { Box, Skeleton, Card, CardContent, Stack } from '@mui/material';

interface TableSkeletonProps {
  rows?: number;
  hasHeader?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, hasHeader = true }) => {
  return (
    <Box sx={{ width: '100%' }}>
      {hasHeader && (
        <Skeleton
          variant="rounded"
          sx={{
            height: { xs: 80, sm: 100 },
            borderRadius: { xs: 2, sm: 3 },
            mb: { xs: 2, sm: 3 },
          }}
        />
      )}

      {/* Filter/tabs skeleton */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Skeleton variant="rounded" width={80} height={36} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" width={80} height={36} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" width={80} height={36} sx={{ borderRadius: 2 }} />
      </Stack>

      {/* Table rows skeleton */}
      <Card>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={1.5}>
            {Array.from({ length: rows }).map((_, i) => (
              <Stack
                key={i}
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{
                  p: { xs: 1, sm: 1.5 },
                  borderRadius: 1.5,
                  bgcolor: 'action.hover',
                }}
              >
                <Skeleton variant="circular" width={36} height={36} sx={{ flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Skeleton variant="text" width={`${60 + Math.random() * 30}%`} />
                  <Skeleton variant="text" width={`${30 + Math.random() * 20}%`} sx={{ fontSize: '0.75rem' }} />
                </Box>
                <Skeleton variant="rounded" width={70} height={28} sx={{ borderRadius: 2, flexShrink: 0 }} />
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TableSkeleton;
