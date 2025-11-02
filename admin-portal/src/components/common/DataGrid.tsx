/**
 * Mantine React Table Wrapper
 * Replacement for Kendo Grid
 *
 * Usage:
 * import { DataGrid } from './components/common/DataGrid';
 *
 * <DataGrid
 *   data={myData}
 *   columns={[
 *     {
 *       accessorKey: 'name',
 *       header: 'Name',
 *       Cell: ({ row }) => <span>{row.original.name}</span>,
 *     },
 *   ]}
 *   enablePagination
 *   enableSorting
 *   enableFiltering
 * />
 */

import { useMemo } from 'react';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_TableOptions,
} from 'mantine-react-table';

interface DataGridProps<TData extends Record<string, any>> {
  data: TData[];
  columns: MRT_ColumnDef<TData>[];
  enablePagination?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableRowSelection?: boolean;
  enableColumnResizing?: boolean;
  enableColumnOrdering?: boolean;
  enableHiding?: boolean;
  enableGlobalFilter?: boolean;
  onRowSelectionChange?: (selectedRows: Record<string, boolean>) => void;
  initialState?: MRT_TableOptions<TData>['initialState'];
  renderTopToolbarCustomActions?: MRT_TableOptions<TData>['renderTopToolbarCustomActions'];
}

export function DataGrid<TData extends Record<string, any>>({
  data,
  columns,
  enablePagination = true,
  enableSorting = true,
  enableFiltering = false,
  enableRowSelection = false,
  enableColumnResizing = true,
  enableColumnOrdering = true,
  enableHiding = true,
  enableGlobalFilter = true,
  onRowSelectionChange,
  initialState,
  renderTopToolbarCustomActions,
}: DataGridProps<TData>) {
  const table = useMantineReactTable({
    columns,
    data,

    // Standard features - Consistent across all grids
    enablePagination,
    enableSorting,
    enableFilters: enableFiltering,
    enableColumnFilters: enableFiltering,
    enableRowSelection,
    enableColumnResizing,
    enableColumnOrdering,
    enableHiding, // Column show/hide via header menu
    enableGlobalFilter,

    // Callbacks
    onRowSelectionChange: onRowSelectionChange
      ? (updater) => {
          const newSelection =
            typeof updater === 'function'
              ? updater(table.getState().rowSelection)
              : updater;
          onRowSelectionChange(newSelection);
        }
      : undefined,

    // Initial state
    initialState: {
      pagination: { pageSize: 20, pageIndex: 0 },
      ...initialState,
    },

    // Standardized table styling
    mantineTableProps: {
      striped: true,
      highlightOnHover: true,
      withColumnBorders: true, // Show column separators for resizing
      withTableBorder: true,
    },

    // Pagination options
    mantinePaginationProps: {
      showRowsPerPage: true,
      rowsPerPageOptions: ['10', '20', '50', '100'],
    },

    // Toolbar positioning - Consistent layout
    positionGlobalFilter: 'left', // Search on left
    positionToolbarAlertBanner: 'bottom',
    positionActionsColumn: 'last',

    // Custom actions (if provided)
    renderTopToolbarCustomActions,
  });

  return <MantineReactTable table={table} />;
}

/**
 * Example usage:
 *
 * const columns = [
 *   {
 *     accessorKey: 'name',
 *     header: 'Name',
 *   },
 *   {
 *     accessorKey: 'status',
 *     header: 'Status',
 *     Cell: ({ row }) => (
 *       <span className={`status-${row.original.status}`}>
 *         {row.original.status}
 *       </span>
 *     ),
 *   },
 *   {
 *     id: 'actions',
 *     header: 'Actions',
 *     Cell: ({ row }) => (
 *       <Button onClick={() => handleEdit(row.original)}>
 *         Edit
 *       </Button>
 *     ),
 *   },
 * ];
 *
 * <DataGrid
 *   data={members}
 *   columns={columns}
 *   enableRowSelection
 *   onRowSelectionChange={(selection) => console.log(selection)}
 * />
 */
