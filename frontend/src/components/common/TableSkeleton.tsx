import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
} from '@mui/material';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export const TableSkeleton = React.memo(
  ({ rows = 5, columns = 4, showHeader = true }: TableSkeletonProps) => {
    // Use deterministic widths based on index to avoid hydration mismatches
    const getHeaderWidth = (index: number) => {
      const widths = [70, 85, 60, 75, 90, 65, 80, 55, 72, 88];
      return `${widths[index % widths.length]}%`;
    };

    const getCellWidth = (rowIndex: number, colIndex: number) => {
      const widths = [55, 70, 45, 65, 80, 50, 60, 75, 42, 68];
      return `${widths[(rowIndex * 3 + colIndex) % widths.length]}%`;
    };

    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          {showHeader && (
            <TableHead>
              <TableRow>
                {Array.from({ length: columns }).map((_, i) => (
                  <TableCell key={i}>
                    <Skeleton variant="text" width={getHeaderWidth(i)} />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
          )}
          <TableBody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton variant="text" width={getCellWidth(rowIndex, colIndex)} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }
);

TableSkeleton.displayName = 'TableSkeleton';

export default TableSkeleton;
