import { useState, useEffect, useMemo, useCallback } from 'react';
import type { DataTableSortStatus } from 'mantine-datatable';
import type { Member } from '../services/api';
import { useGridState } from './useGridState';

interface UseMembersGridStateProps {
  members: Member[];
  totalMembers?: number;
}

export const useMembersGridState = ({ members, totalMembers }: UseMembersGridStateProps) => {
  // Use grid state hook for URL-based pagination persistence
  const { page, pageSize, skip, updatePage, updatePageSize } = useGridState('members-grid', {
    defaultPage: 1,
    defaultPageSize: 10, // Match DataTable's first recordsPerPageOptions value
    enableFilterPersistence: true,
    resetPageOnFilterChange: false,
  });

  const [gridData, setGridData] = useState<Member[]>(members);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [total, setTotal] = useState(totalMembers || members.length);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Member>>({
    columnAccessor: 'legal_name',
    direction: 'asc',
  });
  const [query, setQuery] = useState('');

  // Update total when totalMembers prop changes
  useEffect(() => {
    setTotal(totalMembers || members.length);
  }, [totalMembers, members.length]);

  // Update grid data when members change
  useEffect(() => {
    setGridData(members);
  }, [members]);

  // Client-side sorting, filtering, and pagination (useMemo for sync calculation)
  const { sortedData, filteredCount } = useMemo(() => {
    let filtered = [...gridData];

    // Apply search filter
    if (query) {
      filtered = filtered.filter((member) =>
        member.legal_name?.toLowerCase().includes(query.toLowerCase()) ||
        member.status?.toLowerCase().includes(query.toLowerCase()) ||
        member.lei?.toLowerCase().includes(query.toLowerCase()) ||
        member.euid?.toLowerCase().includes(query.toLowerCase()) ||
        member.kvk?.toLowerCase().includes(query.toLowerCase()) ||
        member.org_id?.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply sorting
    if (sortStatus.columnAccessor) {
      const accessor = sortStatus.columnAccessor as keyof Member;
      filtered.sort((a, b) => {
        const aVal = a[accessor];
        const bVal = b[accessor];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortStatus.direction === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (aVal < bVal) return sortStatus.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortStatus.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const filteredCount = filtered.length;

    // Apply pagination - required when using controlled mode (page prop)
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const sortedData = filtered.slice(startIndex, endIndex);

    return { sortedData, filteredCount };
  }, [gridData, sortStatus, query, page, pageSize]);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleSelectedRecordsChange = useCallback((records: Member[]) => {
    setSelectedIds(records.map((r) => r.org_id));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return {
    // State
    gridData,
    selectedIds,
    total,
    sortStatus,
    query,
    page,
    pageSize,
    sortedData,
    filteredCount,
    skip,

    // Actions
    setSortStatus,
    setQuery,
    updatePage,
    updatePageSize,
    handleQueryChange,
    handleSelectedRecordsChange,
    clearSelection,
  };
};
