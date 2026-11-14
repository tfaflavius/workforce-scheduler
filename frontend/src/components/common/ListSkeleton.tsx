import { Box, Card, CardContent, Skeleton, Stack } from '@mui/material';

/** Schelet gri pentru liste/carduri cat se incarca datele (in locul cercului care se invarte). */
const ListSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <Stack spacing={1.5} sx={{ py: 1 }} aria-busy="true" aria-label="Se incarca">
    {Array.from({ length: rows }).map((_, i) => (
      <Card key={i} variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Skeleton variant="circular" width={36} height={36} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width="55%" sx={{ fontSize: '1rem' }} />
              <Skeleton variant="text" width="85%" />
            </Box>
            <Skeleton variant="rounded" width={56} height={22} sx={{ borderRadius: 2 }} />
          </Stack>
        </CardContent>
      </Card>
    ))}
  </Stack>
);

export default ListSkeleton;
