import React from 'react';
import { Box, Skeleton, Card, CardContent, Stack } from '@mui/material';

interface PageSkeletonProps {
  /** Show header skeleton (gradient header area) */
  showHeader?: boolean;
  /** Show filter bar skeleton */
  showFilters?: boolean;
  /** Number of card skeletons to show */
  cards?: number;
  /** Show table skeleton instead of cards */
  showTable?: boolean;
  /** Number of table rows */
  tableRows?: number;
}

const PageSkeleton: React.FC<PageSkeletonProps> = ({
  showHeader = true,
  showFilters = false,
  cards = 0,
  showTable = false,
  tableRows = 6,
}) => {
  return (
    <Stack spacing={2}>
      {/* Header skeleton */}
      {showHeader && (
        <Skeleton
          variant="rounded"
          width="100%"
          height={80}
          sx={{ borderRadius: 3 }}
        />
      )}

      {/* Filter bar skeleton */}
      {showFilters && (
        <Card>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <Skeleton variant="rounded" width={180} height={40} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rounded" width={140} height={40} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rounded" width={140} height={40} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rounded" width={100} height={40} sx={{ borderRadius: 2 }} />
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Card grid skeleton */}
      {cards > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 2,
          }}
        >
          {Array.from({ length: cards }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={110}
              sx={{ borderRadius: 3 }}
            />
          ))}
        </Box>
      )}

      {/* Table skeleton */}
      {showTable && (
        <Card>
          <CardContent>
            <Stack spacing={1}>
              {/* Table header */}
              <Skeleton variant="rounded" width="100%" height={44} sx={{ borderRadius: 1 }} />
              {/* Table rows */}
              {Array.from({ length: tableRows }).map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  width="100%"
                  height={48}
                  sx={{
                    borderRadius: 1,
                    opacity: 1 - (i * 0.1),
                  }}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
};

export default React.memo(PageSkeleton);
