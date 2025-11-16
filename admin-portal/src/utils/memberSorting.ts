import type { DataTableSortStatus } from 'mantine-datatable';
import type { Member } from '../services/api';

/**
 * Sorts members array based on the provided sort status
 * Extracted from MembersGrid to reduce cognitive complexity
 *
 * @param members - Array of members to sort
 * @param sortStatus - Sort configuration (column accessor and direction)
 * @returns Sorted array of members
 */
export function sortMembers(members: Member[], sortStatus: DataTableSortStatus<Member>): Member[] {
  if (!sortStatus.columnAccessor) {
    return members;
  }

  const sorted = [...members];
  const accessor = sortStatus.columnAccessor as keyof Member;
  const isAscending = sortStatus.direction === 'asc';

  sorted.sort((a, b) => {
    const aVal = a[accessor];
    const bVal = b[accessor];

    // Handle null/undefined values
    const nullComparison = compareNullValues(aVal, bVal);
    if (nullComparison !== null) {
      return nullComparison;
    }

    // Handle string values
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return compareStrings(aVal, bVal, isAscending);
    }

    // Handle other comparable values (numbers, dates, etc.)
    return compareValues(aVal, bVal, isAscending);
  });

  return sorted;
}

/**
 * Compares null/undefined values
 * Returns null if both values are valid (non-null)
 */
function compareNullValues(aVal: unknown, bVal: unknown): number | null {
  if (aVal === null || aVal === undefined) return 1;
  if (bVal === null || bVal === undefined) return -1;
  return null;
}

/**
 * Compares string values with locale-aware sorting
 */
function compareStrings(aVal: string, bVal: string, isAscending: boolean): number {
  return isAscending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
}

/**
 * Compares non-string values (numbers, dates, etc.)
 */
function compareValues(aVal: unknown, bVal: unknown, isAscending: boolean): number {
  // Type guard to ensure values are comparable
  const a = aVal as number | Date;
  const b = bVal as number | Date;

  if (a < b) return isAscending ? -1 : 1;
  if (a > b) return isAscending ? 1 : -1;
  return 0;
}
