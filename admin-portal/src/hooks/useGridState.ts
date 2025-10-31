/**
 * useGridState Hook
 *
 * Manages grid state (pagination, filters, sorting) with URL persistence.
 * Ensures grid state is preserved across navigation and page reloads.
 *
 * Features:
 * - Page number persistence in URL
 * - Page size persistence
 * - Filter state persistence (optional)
 * - Automatic state synchronization
 *
 * Usage:
 * ```typescript
 * const { page, pageSize, filters, updatePage, updatePageSize, updateFilters } =
 *   useGridState('members-grid');
 * ```
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface GridFilters {
  [key: string]: string | string[] | number | boolean | null;
}

export interface GridState {
  page: number;
  pageSize: number;
  filters: GridFilters;
}

export interface UseGridStateOptions {
  defaultPage?: number;
  defaultPageSize?: number;
  defaultFilters?: GridFilters;
  enableFilterPersistence?: boolean;
  resetPageOnFilterChange?: boolean; // default: true
}

/**
 * Hook for managing grid state with URL persistence
 * @param gridKey Unique identifier for this grid (used in storage keys)
 * @param options Configuration options
 */
export function useGridState(
  gridKey: string,
  options: UseGridStateOptions = {}
) {
  const {
    defaultPage = 1,
    defaultPageSize = 20,
    defaultFilters = {},
    enableFilterPersistence = true,
    resetPageOnFilterChange = true,
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  // Parse current state from URL
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam, 10) : defaultPage;
  });

  const [pageSize, setPageSize] = useState(() => {
    const sizeParam = searchParams.get('pageSize');
    return sizeParam ? parseInt(sizeParam, 10) : defaultPageSize;
  });

  const [filters, setFilters] = useState<GridFilters>(() => {
    if (!enableFilterPersistence) return defaultFilters;

    const filtersParam = searchParams.get('filters');
    if (filtersParam) {
      try {
        return JSON.parse(decodeURIComponent(filtersParam));
      } catch (e) {
        console.error('Failed to parse filters from URL:', e);
      }
    }
    return defaultFilters;
  });

  // Sync state with URL params
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);

    // Update page parameter
    if (page !== defaultPage) {
      newParams.set('page', page.toString());
    } else {
      newParams.delete('page');
    }

    // Update pageSize parameter
    if (pageSize !== defaultPageSize) {
      newParams.set('pageSize', pageSize.toString());
    } else {
      newParams.delete('pageSize');
    }

    // Update filters parameter (if enabled and not empty)
    if (enableFilterPersistence && Object.keys(filters).length > 0) {
      newParams.set('filters', encodeURIComponent(JSON.stringify(filters)));
    } else {
      newParams.delete('filters');
    }

    // Only update URL if params have changed
    const newParamsString = newParams.toString();
    const currentParamsString = searchParams.toString();

    if (newParamsString !== currentParamsString) {
      setSearchParams(newParams, { replace: true });
    }
  }, [page, pageSize, filters, enableFilterPersistence, defaultPage, defaultPageSize, searchParams, setSearchParams]);

  // Update page number
  const updatePage = useCallback((newPage: number) => {
    if (newPage < 1) return;
    setPage(newPage);
  }, []);

  // Update page size (resets to page 1)
  const updatePageSize = useCallback((newPageSize: number) => {
    if (newPageSize < 1) return;
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  }, []);

  // Update filters (resets to page 1)
  const updateFilters = useCallback((newFilters: GridFilters) => {
    setFilters(newFilters);
    if (resetPageOnFilterChange) {
      setPage(1); // Optional reset when filters change
    }
  }, [resetPageOnFilterChange]);

  // Clear filters (resets to page 1)
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setPage(1);
  }, [defaultFilters]);

  // Reset all state to defaults
  const reset = useCallback(() => {
    setPage(defaultPage);
    setPageSize(defaultPageSize);
    setFilters(defaultFilters);
  }, [defaultPage, defaultPageSize, defaultFilters]);

  // Calculate skip value for Kendo Grid
  const skip = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    filters,
    skip,
    updatePage,
    updatePageSize,
    updateFilters,
    clearFilters,
    reset,
  };
}
