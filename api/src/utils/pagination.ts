/**
 * Pagination utility for list endpoints
 */

import { HttpRequest } from '@azure/functions';

/**
 * Request-like type that works with both HttpRequest and AuthenticatedRequest
 */
interface RequestLike {
  query: URLSearchParams;
}

/**
 * Pagination parameters extracted from request
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Pagination metadata to include in responses
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Default pagination values
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 1000;
const MIN_LIMIT = 1;

/**
 * Extract and validate pagination parameters from request
 * @param request HTTP request or authenticated request
 * @returns Validated pagination parameters
 */
export function getPaginationParams(request: RequestLike): PaginationParams {
  const query = request.query;

  // Parse page number
  let page = parseInt(query.get('page') || String(DEFAULT_PAGE), 10);
  if (isNaN(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  // Parse limit
  let limit = parseInt(query.get('limit') || String(DEFAULT_LIMIT), 10);
  if (isNaN(limit) || limit < MIN_LIMIT) {
    limit = DEFAULT_LIMIT;
  }
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  // Calculate offset
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Create pagination metadata
 * @param page Current page number
 * @param limit Items per page
 * @param totalItems Total number of items
 * @returns Pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  totalItems: number
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    page,
    pageSize: limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Create a paginated response
 * @param data Array of items for current page
 * @param page Current page number
 * @param limit Items per page
 * @param totalItems Total number of items
 * @returns Paginated response with data and metadata
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  totalItems: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: createPaginationMeta(page, limit, totalItems),
  };
}

/**
 * Generate SQL LIMIT and OFFSET clause
 * @param params Pagination parameters
 * @returns SQL clause string
 */
export function getPaginationSQL(params: PaginationParams): string {
  return `LIMIT ${params.limit} OFFSET ${params.offset}`;
}

/**
 * Get count query from a SELECT query
 * Replaces SELECT columns with SELECT COUNT(*)
 * @param query Original SELECT query
 * @returns COUNT query
 */
export function getCountQuery(query: string): string {
  // Remove LIMIT and OFFSET
  let countQuery = query.replace(/LIMIT\s+\d+(\s+OFFSET\s+\d+)?/gi, '').trim();

  // Remove ORDER BY (not needed for count)
  countQuery = countQuery.replace(/ORDER\s+BY\s+[^)]+$/gi, '').trim();

  // Replace SELECT ... FROM with SELECT COUNT(*) FROM
  // Handle both simple and complex SELECT statements
  if (countQuery.includes('SELECT DISTINCT')) {
    // For DISTINCT queries, we need to count the distinct results
    countQuery = countQuery.replace(
      /SELECT\s+DISTINCT\s+.+?\s+FROM/is,
      'SELECT COUNT(DISTINCT *) FROM'
    );
  } else {
    // For regular queries, just count all rows
    countQuery = countQuery.replace(
      /SELECT\s+.+?\s+FROM/is,
      'SELECT COUNT(*) FROM'
    );
  }

  return countQuery;
}

/**
 * Execute paginated query
 * Helper function to execute a paginated database query with count
 * @param pool Database pool
 * @param baseQuery Base SELECT query (without LIMIT/OFFSET)
 * @param params Query parameters
 * @param pagination Pagination parameters
 * @returns Paginated response with data and metadata
 */
export async function executePaginatedQuery<T>(
  pool: any,
  baseQuery: string,
  params: any[],
  pagination: PaginationParams
): Promise<PaginatedResponse<T>> {
  // Get total count
  const countQuery = getCountQuery(baseQuery);
  const countResult = await pool.query(countQuery, params);
  const totalItems = parseInt(countResult.rows[0].count, 10);

  // Get paginated data
  const dataQuery = `${baseQuery} ${getPaginationSQL(pagination)}`;
  const dataResult = await pool.query(dataQuery, params);

  return createPaginatedResponse<T>(
    dataResult.rows,
    pagination.page,
    pagination.limit,
    totalItems
  );
}
