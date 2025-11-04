/**
 * Shared DataTable Configuration
 *
 * This file contains common configuration options for mantine-datatable components
 * to reduce duplication and ensure consistency across all tables in the application.
 *
 * Usage:
 * ```tsx
 * import { defaultDataTableProps, defaultPaginationOptions } from './shared/DataTableConfig';
 *
 * <DataTable
 *   {...defaultDataTableProps}
 *   records={data}
 *   columns={columns}
 *   // Add component-specific props here
 * />
 * ```
 */

/**
 * Default props for all DataTable instances
 * Provides consistent styling and behavior across the application
 */
export const defaultDataTableProps = {
  /** Show table border */
  withTableBorder: true,

  /** Show column borders */
  withColumnBorders: true,

  /** Alternate row background colors */
  striped: true,

  /** Highlight row on hover */
  highlightOnHover: true,

  /** Empty state message */
  noRecordsText: 'No records found',

  /** Minimum table height (prevents layout shift when empty) */
  minHeight: 200,
} as const;

/**
 * Default pagination options (records per page)
 * Standard set of page size options used across all paginated tables
 */
export const defaultPaginationOptions = [10, 20, 50, 100] as const;

/**
 * Default column configuration props
 * These can be used when defining columns with useDataTableColumns
 */
export const defaultColumnProps = {
  /** Allow columns to be resized */
  resizable: true,

  /** Allow columns to be hidden/shown via column selector */
  toggleable: true,

  /** Allow columns to be sorted */
  sortable: true,
} as const;

/**
 * Helper function to create consistent storeColumnsKey values
 * This ensures column preferences are stored separately for each table
 *
 * @param componentName - Name of the component using the table (e.g., 'members', 'tasks')
 * @returns A consistent key for localStorage column storage
 */
export function getStoreColumnsKey(componentName: string): string {
  return `${componentName}-grid`;
}
