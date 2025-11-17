/**
 * Export Utility Functions
 * Provides CSV, Excel, and JSON export capabilities for data grids
 */

import * as XLSX from 'xlsx';
import type { AuditLog } from '../services/auditLogService';
import { formatDateTimeGB } from './dateFormat';

/**
 * Sanitize text for CSV export (escape quotes and commas)
 */
function sanitizeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If the value contains quotes, commas, or newlines, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Format date for current locale (YYYY-MM-DD format for exports)
 */
function formatDateForExport(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Export audit logs as CSV
 */
export function exportAuditLogsAsCSV(logs: AuditLog[]): void {
  if (logs.length === 0) {
    throw new Error('No data to export');
  }

  // CSV headers
  const headers = [
    'Timestamp',
    'Event Type',
    'User Email',
    'Action',
    'Resource Type',
    'Resource ID',
    'Result',
    'Severity',
    'Details',
  ];

  // CSV rows
  const rows = logs.map((log) => [
    sanitizeCSV(formatDateTimeGB(log.timestamp)),
    sanitizeCSV(log.action),
    sanitizeCSV(log.userName || ''),
    sanitizeCSV(log.action),
    sanitizeCSV(log.targetType || ''),
    sanitizeCSV(log.targetId || ''),
    sanitizeCSV(log.result || 'success'),
    sanitizeCSV(log.severity || 'INFO'),
    sanitizeCSV(log.details || ''),
  ]);

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-logs-${formatDateForExport()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export audit logs as Excel (XLSX)
 */
export function exportAuditLogsAsExcel(logs: AuditLog[]): void {
  if (logs.length === 0) {
    throw new Error('No data to export');
  }

  // Prepare data for Excel
  const worksheetData = [
    // Headers
    [
      'Timestamp',
      'Event Type',
      'User Email',
      'Action',
      'Resource Type',
      'Resource ID',
      'Result',
      'Severity',
      'Details',
    ],
    // Data rows
    ...logs.map((log) => [
      formatDateTimeGB(log.timestamp),
      log.action,
      log.userName || '',
      log.action,
      log.targetType || '',
      log.targetId || '',
      log.result || 'success',
      log.severity || 'INFO',
      log.details || '',
    ]),
  ];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths for better readability
  const columnWidths = [
    { wch: 20 }, // Timestamp
    { wch: 25 }, // Event Type
    { wch: 30 }, // User Email
    { wch: 25 }, // Action
    { wch: 20 }, // Resource Type
    { wch: 36 }, // Resource ID (UUID)
    { wch: 10 }, // Result
    { wch: 12 }, // Severity
    { wch: 50 }, // Details
  ];
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Logs');

  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, `audit-logs-${formatDateForExport()}.xlsx`);
}

/**
 * Export audit logs as JSON
 */
export function exportAuditLogsAsJSON(logs: AuditLog[]): void {
  if (logs.length === 0) {
    throw new Error('No data to export');
  }

  // Prepare JSON data with formatted timestamps
  const jsonData = logs.map((log) => ({
    timestamp: formatDateTimeGB(log.timestamp),
    eventType: log.action,
    userEmail: log.userName || '',
    action: log.action,
    resourceType: log.targetType || '',
    resourceId: log.targetId || '',
    result: log.result || 'success',
    severity: log.severity || 'INFO',
    details: log.details || '',
  }));

  // Create blob and download
  const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-logs-${formatDateForExport()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
