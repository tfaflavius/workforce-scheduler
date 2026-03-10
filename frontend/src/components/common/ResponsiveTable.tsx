import React from 'react';
import {
  Box,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Stack,
  Chip,
  alpha,
} from '@mui/material';

export interface ColumnDef {
  key: string;
  label: string;
  /** Hide on mobile (xs) screens */
  hideOnMobile?: boolean;
  /** Hide on tablet (sm) screens */
  hideOnTablet?: boolean;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Minimum width */
  minWidth?: number;
  /** Custom render function */
  render?: (value: any, row: any) => React.ReactNode;
  /** Show as chip on mobile card view */
  chipOnMobile?: boolean;
  /** Color for mobile chip */
  chipColor?: string;
}

interface ResponsiveTableProps {
  columns: ColumnDef[];
  data: any[];
  /** Key field for unique row identification */
  keyField?: string;
  /** Row click handler */
  onRowClick?: (row: any) => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Show card view on mobile instead of table */
  mobileCardView?: boolean;
  /** Maximum height for scrollable container */
  maxHeight?: number;
  /** Whether to show row index */
  showIndex?: boolean;
  /** Dense padding */
  dense?: boolean;
}

/**
 * Responsive table component that adapts to screen size.
 * On mobile, can optionally render as cards instead of a table.
 */
export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  columns,
  data,
  keyField = 'id',
  onRowClick,
  emptyMessage = 'Nu exista date',
  mobileCardView = true,
  maxHeight,
  showIndex = false,
  dense = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Filter columns based on screen size
  const visibleColumns = columns.filter((col) => {
    if (isMobile && col.hideOnMobile) return false;
    if (isTablet && col.hideOnTablet) return false;
    return true;
  });

  // Mobile card columns (all columns, including hidden ones for chips)
  const mobileMainColumns = columns.filter((col) => !col.hideOnMobile);
  const mobileChipColumns = columns.filter((col) => col.hideOnMobile && col.chipOnMobile);

  // Empty state
  if (data.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  // Mobile card view
  if (isMobile && mobileCardView) {
    return (
      <Stack spacing={1.5}>
        {data.map((row, index) => (
          <Card
            key={row[keyField] ?? index}
            sx={{
              cursor: onRowClick ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              '&:hover': onRowClick ? { boxShadow: theme.shadows[4], transform: 'translateY(-1px)' } : {},
              '&:active': onRowClick ? { transform: 'scale(0.99)' } : {},
            }}
            onClick={() => onRowClick?.(row)}
          >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              {/* Chip fields at top */}
              {mobileChipColumns.length > 0 && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                  {mobileChipColumns.map((col) => {
                    const val = col.render ? col.render(row[col.key], row) : row[col.key];
                    if (val === undefined || val === null || val === '') return null;
                    return (
                      <Chip
                        key={col.key}
                        label={typeof val === 'object' ? col.label : `${col.label}: ${val}`}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          bgcolor: col.chipColor ? alpha(col.chipColor, 0.1) : alpha(theme.palette.primary.main, 0.1),
                          color: col.chipColor || theme.palette.primary.main,
                        }}
                      />
                    );
                  })}
                </Stack>
              )}
              {/* Main fields */}
              <Stack spacing={0.75}>
                {mobileMainColumns.map((col) => {
                  const val = col.render ? col.render(row[col.key], row) : row[col.key];
                  return (
                    <Stack key={col.key} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                        {col.label}
                      </Typography>
                      <Box sx={{ maxWidth: '60%', textAlign: 'right' }}>
                        {typeof val === 'object' ? val : (
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }} noWrap>
                            {val ?? '-'}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  // Desktop/tablet table view
  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{
        maxHeight: maxHeight,
        borderRadius: 2,
        '& .MuiTableCell-root': {
          fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
          py: dense ? 0.75 : { xs: 1, sm: 1.25 },
          px: { xs: 1, sm: 1.5, md: 2 },
        },
      }}
    >
      <Table stickyHeader={!!maxHeight} size={dense ? 'small' : 'medium'}>
        <TableHead>
          <TableRow>
            {showIndex && (
              <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', width: 40 }}>
                #
              </TableCell>
            )}
            {visibleColumns.map((col) => (
              <TableCell
                key={col.key}
                align={col.align || 'left'}
                sx={{
                  fontWeight: 700,
                  bgcolor: 'background.paper',
                  minWidth: col.minWidth,
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={row[keyField] ?? index}
              hover
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:last-child td': { borderBottom: 0 },
              }}
              onClick={() => onRowClick?.(row)}
            >
              {showIndex && (
                <TableCell sx={{ color: 'text.secondary' }}>
                  {index + 1}
                </TableCell>
              )}
              {visibleColumns.map((col) => (
                <TableCell key={col.key} align={col.align || 'left'}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ResponsiveTable;
