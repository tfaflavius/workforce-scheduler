import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
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

export interface ColumnDef<T = Record<string, any>> {
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
  render?: (value: any, row: T) => React.ReactNode;
  /** Show as chip on mobile card view */
  chipOnMobile?: boolean;
  /** Color for mobile chip */
  chipColor?: string;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Key to use for sorting (defaults to `key` if not set) */
  sortKey?: string;
}

type SortDirection = 'asc' | 'desc' | null;

interface ResponsiveTableProps<T extends Record<string, any> = Record<string, any>> {
  columns: ColumnDef<T>[];
  data: T[];
  /** Key field for unique row identification */
  keyField?: string;
  /** Row click handler */
  onRowClick?: (row: T) => void;
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
export function ResponsiveTable<T extends Record<string, any> = Record<string, any>>({
  columns,
  data,
  keyField = 'id',
  onRowClick,
  emptyMessage = 'Nu exista date',
  mobileCardView = true,
  maxHeight,
  showIndex = false,
  dense = false,
}: ResponsiveTableProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSortClick = useCallback((columnKey: string) => {
    if (sortColumn === columnKey) {
      // Cycle: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  // Sort data based on current sort state
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    const col = columns.find((c) => c.key === sortColumn);
    if (!col) return data;

    const key = col.sortKey || col.key;

    return [...data].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      // Handle null/undefined — push them to the end
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      } else {
        // Try parsing as dates if both are date-like strings
        const aDate = Date.parse(String(aVal));
        const bDate = Date.parse(String(bVal));
        if (!isNaN(aDate) && !isNaN(bDate)) {
          comparison = aDate - bDate;
        } else {
          // Case-insensitive string comparison using locale
          comparison = String(aVal).localeCompare(String(bVal), undefined, {
            sensitivity: 'base',
            numeric: true,
          });
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, columns, sortColumn, sortDirection]);

  // Filter columns based on screen size
  const visibleColumns = useMemo(() => columns.filter((col) => {
    if (isMobile && col.hideOnMobile) return false;
    if (isTablet && col.hideOnTablet) return false;
    return true;
  }), [columns, isMobile, isTablet]);

  // Mobile card columns (all columns, including hidden ones for chips)
  const mobileMainColumns = useMemo(() => columns.filter((col) => !col.hideOnMobile), [columns]);
  const mobileChipColumns = useMemo(() => columns.filter((col) => col.hideOnMobile && col.chipOnMobile), [columns]);

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
        {sortedData.map((row, index) => (
          <Card
            key={row[keyField] ?? index}
            role={onRowClick ? 'button' : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={onRowClick ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRowClick(row);
              }
            } : undefined}
            sx={{
              cursor: onRowClick ? 'pointer' : 'default',
              borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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
                {mobileMainColumns.map((col, colIdx) => {
                  const val = col.render ? col.render(row[col.key], row) : row[col.key];
                  const isFirst = colIdx === 0;
                  return (
                    <Stack key={col.key} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                        {col.label}
                      </Typography>
                      <Box sx={{ maxWidth: '60%', textAlign: 'right' }}>
                        {typeof val === 'object' ? val : (
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: isFirst ? '0.85rem' : '0.8rem',
                              fontWeight: isFirst ? 600 : 400,
                              color: isFirst ? 'text.primary' : 'text.secondary',
                            }}
                            noWrap
                          >
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
                sortDirection={sortColumn === col.key && sortDirection ? sortDirection : false}
                sx={{
                  fontWeight: 700,
                  bgcolor: 'background.paper',
                  minWidth: col.minWidth,
                  whiteSpace: 'nowrap',
                }}
              >
                {col.sortable ? (
                  <TableSortLabel
                    active={sortColumn === col.key && sortDirection !== null}
                    direction={sortColumn === col.key && sortDirection ? sortDirection : 'asc'}
                    onClick={() => handleSortClick(col.key)}
                  >
                    {col.label}
                  </TableSortLabel>
                ) : (
                  col.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedData.map((row, index) => (
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
}

export default ResponsiveTable;
