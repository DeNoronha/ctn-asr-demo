/**
 * Generic Export Utilities for all grids
 * Supports Excel, PDF, and CSV exports for any data type
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface GenericExportOptions {
  title?: string;
  orientation?: 'portrait' | 'landscape';
  includeTimestamp?: boolean;
  columns: Array<{
    field: string;
    header: string;
  }>;
}

/**
 * Export any data to PDF
 */
export const exportGenericToPDF = <T extends Record<string, unknown>>(
  data: T[],
  options: GenericExportOptions
) => {
  const { title = 'Export', orientation = 'landscape', includeTimestamp = true, columns } = options;

  // Create PDF document
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4',
  });

  // Add title
  doc.setFontSize(18);
  doc.setTextColor(0, 51, 102); // CTN blue
  doc.text(title, 14, 15);

  // Add timestamp if requested
  if (includeTimestamp) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Total Records: ${data.length}`, 14, 27);
  }

  // Prepare table data
  const headers = columns.map((col) => col.header);
  const tableData = data.map((item) =>
    columns.map((col) => {
      const value = item[col.field];

      // Handle dates
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }

      // Handle date strings
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return new Date(value).toLocaleDateString();
      }

      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }

      return value.toString();
    })
  );

  // Add table
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: includeTimestamp ? 32 : 22,
    theme: 'striped',
    headStyles: {
      fillColor: [0, 51, 102], // CTN blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      // Add footer with page numbers
      const pageCount = doc.getNumberOfPages();
      const pageNumber = (doc.internal as any).getCurrentPageInfo().pageNumber as number;

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(
        `Page ${pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );

      // Add CTN branding
      doc.text(
        '© 2025 Connecting the Netherlands (CTN)',
        14,
        doc.internal.pageSize.getHeight() - 10
      );
    },
  });

  // Save PDF
  const fileName = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);

  return fileName;
};

/**
 * Export any data to CSV
 */
export const exportGenericToCSV = <T extends Record<string, unknown>>(
  data: T[],
  columns: Array<{ field: string; header: string }>,
  filename?: string
) => {
  const headers = columns.map((col) => col.header);

  const csvData = [
    headers.join(','),
    ...data.map((item) =>
      columns
        .map((col) => {
          const value = item[col.field];

          // Handle null/undefined
          if (value === null || value === undefined) {
            return '';
          }

          // Handle dates
          if (value instanceof Date) {
            return value.toLocaleDateString();
          }

          // Handle date strings
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            return new Date(value).toLocaleDateString();
          }

          // Escape quotes and wrap strings with commas/quotes in double quotes
          const strValue = value.toString();
          if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
            return `"${strValue.replace(/"/g, '""')}"`;
          }

          return strValue;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename || `Export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return filename;
};

/**
 * Format value for display (helper function)
 */
export const formatValueForExport = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(value).toLocaleDateString();
  }

  return value.toString();
};
