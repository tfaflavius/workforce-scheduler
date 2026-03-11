/**
 * Shared status helper functions for color and label mapping.
 * Consolidates duplicate getStatusColor / getStatusLabel helpers that were
 * scattered across multiple page components.
 */

// ---- Color helpers ----

/**
 * Generic status-to-MUI-chip-color mapping used by shift swaps,
 * leave requests, edit requests, daily reports, and parking modules.
 */
export const getStatusColor = (
  status: string,
): 'success' | 'error' | 'warning' | 'info' | 'default' => {
  switch (status) {
    // Common approval-related statuses
    case 'APPROVED':
    case 'FINALIZAT':
    case 'SUBMITTED':
      return 'success';
    case 'REJECTED':
      return 'error';
    case 'PENDING':
    case 'DRAFT':
    case 'ACTIVE':
      return 'warning';
    case 'AWAITING_ADMIN':
      return 'info';
    case 'CANCELLED':
    case 'EXPIRED':
    default:
      return 'default';
  }
};

// ---- Label helpers ----

/**
 * Maps status strings to Romanian display labels.
 * Covers shift swap, leave request, daily report, edit request,
 * and parking issue/damage statuses.
 */
export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return 'In asteptare';
    case 'AWAITING_ADMIN':
      return 'Asteapta aprobare admin';
    case 'APPROVED':
      return 'Aprobat';
    case 'REJECTED':
      return 'Respins';
    case 'CANCELLED':
      return 'Anulat';
    case 'EXPIRED':
      return 'Expirat';
    case 'SUBMITTED':
      return 'Trimis';
    case 'DRAFT':
      return 'Ciorna';
    case 'ACTIVE':
      return 'Activ';
    case 'FINALIZAT':
      return 'Finalizat';
    default:
      return status;
  }
};
