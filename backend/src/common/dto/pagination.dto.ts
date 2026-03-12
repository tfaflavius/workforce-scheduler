/**
 * Shared pagination parameters and response wrapper.
 * Use PaginationParams in controllers/services that accept page/limit.
 * Use PaginatedResponse<T> as the return type for paginated endpoints.
 */

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Parse optional query string page/limit into PaginationParams.
 * Defaults: page=1, limit=100, max limit=500.
 */
export function parsePagination(
  page?: string | number,
  limit?: string | number,
  defaultLimit = 100,
  maxLimit = 500,
): PaginationParams {
  const p = Math.max(1, parseInt(String(page ?? 1), 10) || 1);
  const l = Math.min(maxLimit, Math.max(1, parseInt(String(limit ?? defaultLimit), 10) || defaultLimit));
  return { page: p, limit: l };
}

/**
 * Build a PaginatedResponse from data, total count, and params.
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}
