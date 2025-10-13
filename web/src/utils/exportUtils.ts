/**
 * Export Utilities for Members Grid
 * PDF and bulk operations functionality
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Member } from '../services/api';

export interface ExportOptions {
  title?: string;
  orientation?: 'portrait' | 'landscape';
  includeTimestamp?: boolean;
  columns?: string[];
}

/**
 * Export members to PDF
 */
export const exportToPDF = (members: Member[], options: ExportOptions = {}) => {
  const {
    title = 'CTN Members Export',
    orientation = 'landscape',
    includeTimestamp = true,
    columns = ['legal_name', 'org_id', 'domain', 'status', 'membership_level', 'lei', 'kvk'],
  } = options;

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
    doc.text(`Total Records: ${members.length}`, 14, 27);
  }

  // Define column headers
  const columnHeaders: { [key: string]: string } = {
    legal_name: 'Legal Name',
    org_id: 'Organization ID',
    domain: 'Domain',
    status: 'Status',
    membership_level: 'Membership',
    lei: 'LEI',
    kvk: 'KvK',
    created_at: 'Joined Date',
  };

  // Prepare table data
  const headers = columns.map((col) => columnHeaders[col] || col);
  const data = members.map((member) =>
    columns.map((col) => {
      const value = member[col as keyof Member];
      if (col === 'created_at' && value) {
        return new Date(value as string).toLocaleDateString();
      }
      return value?.toString() || '';
    })
  );

  // Add table
  autoTable(doc, {
    head: [headers],
    body: data,
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
    didDrawPage: (data) => {
      // Add footer with page numbers
      const pageCount = doc.getNumberOfPages();
      const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;

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
  const fileName = `CTN_Members_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);

  return fileName;
};

/**
 * Export detailed member report to PDF (single member)
 */
export const exportMemberDetailToPDF = (member: Member) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header
  doc.setFontSize(20);
  doc.setTextColor(0, 51, 102);
  doc.text('Member Profile', 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

  // Member details
  let y = 35;
  const lineHeight = 7;

  const addField = (label: string, value: string | undefined) => {
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50);
    doc.text(value || 'N/A', 70, y);

    y += lineHeight;
  };

  // Organization Information
  doc.setFontSize(14);
  doc.setTextColor(0, 51, 102);
  doc.text('Organization Information', 14, y);
  y += lineHeight + 2;

  addField('Legal Name:', member.legal_name);
  addField('Organization ID:', member.org_id);
  addField('Domain:', member.domain);
  addField('Status:', member.status);
  addField('Membership Level:', member.membership_level);

  y += 5;

  // Registration Details
  doc.setFontSize(14);
  doc.setTextColor(0, 51, 102);
  doc.text('Registration Details', 14, y);
  y += lineHeight + 2;

  addField('LEI:', member.lei);
  addField('KvK:', member.kvk);
  addField(
    'Joined Date:',
    member.created_at ? new Date(member.created_at).toLocaleDateString() : undefined
  );

  // Save PDF
  const fileName = `Member_${member.legal_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);

  return fileName;
};

/**
 * Bulk operations handler
 */
export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: string[];
}

export const performBulkOperation = async (
  memberIds: string[],
  operation: 'export' | 'token' | 'activate' | 'suspend' | 'delete',
  apiHandler: (id: string) => Promise<any>
): Promise<BulkOperationResult> => {
  const result: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const id of memberIds) {
    try {
      await apiHandler(id);
      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`${id}: ${error.message || 'Unknown error'}`);
    }
  }

  return result;
};

/**
 * Format bulk operation summary message
 */
export const formatBulkOperationSummary = (
  result: BulkOperationResult,
  operation: string
): string => {
  const total = result.success + result.failed;
  let message = `Bulk ${operation} completed: ${result.success}/${total} successful`;

  if (result.failed > 0) {
    message += `, ${result.failed} failed`;
  }

  return message;
};

/**
 * CSV export utility
 */
export const exportToCSV = (members: Member[], filename?: string) => {
  const headers = [
    'Legal Name',
    'Organization ID',
    'Domain',
    'Status',
    'Membership Level',
    'LEI',
    'KvK',
    'Joined Date',
  ];

  const csvData = [
    headers.join(','),
    ...members.map((member) =>
      [
        `"${member.legal_name}"`,
        member.org_id,
        member.domain,
        member.status,
        member.membership_level,
        member.lei || '',
        member.kvk || '',
        member.created_at ? new Date(member.created_at).toLocaleDateString() : '',
      ].join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    filename || `CTN_Members_${new Date().toISOString().split('T')[0]}.csv`
  );
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
