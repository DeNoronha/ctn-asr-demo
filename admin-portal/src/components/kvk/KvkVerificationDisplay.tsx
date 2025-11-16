import { Button, Loader } from '@mantine/core';
import type React from 'react';
import type { KvkVerificationStatus } from '../../hooks/useKvkDocumentUpload';
import { TEXT_COLORS } from '../../utils/colors';
import { formatDate, formatDateTime } from '../../utils/dateFormat';

interface KvkApiResponse {
  kvkNumber: string;
  statutoryName: string;
  status?: string;
  tradeNames?: {
    businessName: string;
  };
}

interface KvkVerificationDisplayProps {
  verificationStatus: KvkVerificationStatus;
  onUploadNew: () => void;
}

// Type guard for KvK API response
const getKvkApiData = (verificationStatus: KvkVerificationStatus): KvkApiResponse | null => {
  const response = verificationStatus.kvk_api_response;
  if (!response || typeof response === 'string') {
    return null;
  }
  return response;
};

// Company Status Badge Component
const CompanyStatusBadge: React.FC<{ verificationStatus: KvkVerificationStatus }> = ({
  verificationStatus,
}) => {
  const kvkData = getKvkApiData(verificationStatus);
  if (!kvkData) return null;

  const getCompanyStatus = (): { text: string; color: string; icon: string } => {
    if (!kvkData?.status) {
      return { text: 'Active', color: TEXT_COLORS.success, icon: '✓' };
    }

    if (kvkData.status === 'Faillissement') {
      return { text: 'Bankrupt', color: TEXT_COLORS.error, icon: '⚠' };
    }
    if (kvkData.status === 'Ontbonden') {
      return { text: 'Dissolved', color: TEXT_COLORS.error, icon: '⚠' };
    }
    return { text: 'Active', color: TEXT_COLORS.success, icon: '✓' };
  };

  const companyStatus = getCompanyStatus();

  return (
    <div
      style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: companyStatus.color === TEXT_COLORS.success ? '#f0fdf4' : '#fef2f2',
        border: `2px solid ${companyStatus.color}`,
        borderRadius: '6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '1.5em' }}>{companyStatus.icon}</span>
        <div>
          <strong style={{ fontSize: '1.1em' }}>
            Company Status (KvK Registry):{' '}
            <span style={{ color: companyStatus.color }}>{companyStatus.text}</span>
          </strong>
          <div style={{ fontSize: '0.9em', color: TEXT_COLORS.muted, marginTop: '5px' }}>
            {kvkData.statutoryName}
            {verificationStatus.kvk_verified_at && (
              <span style={{ marginLeft: '10px', fontSize: '0.95em' }}>
                • Last verified: {formatDate(verificationStatus.kvk_verified_at)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get cell background color for PDF column
const getPdfCellBackground = (
  verificationStatus: KvkVerificationStatus,
  enteredMismatchFlag: string,
  extractedValue: string | null,
  enteredValue: string | null
): string => {
  if (verificationStatus.kvk_mismatch_flags?.includes(enteredMismatchFlag)) {
    return '#fee2e2'; // Red - PDF doesn't match entered data
  }
  if (extractedValue && enteredValue) {
    return '#d4edda'; // Green - data matches
  }
  return 'inherit';
};

// Helper function to get cell background color for KvK Registry column
const getKvkCellBackground = (
  verificationStatus: KvkVerificationStatus,
  kvkMismatchFlag: string,
  kvkValue: string | undefined,
  extractedValue: string | null
): string => {
  if (verificationStatus.kvk_mismatch_flags?.includes(kvkMismatchFlag)) {
    return '#fef3c7'; // Yellow - KvK doesn't match PDF
  }
  if (kvkValue && extractedValue) {
    return '#d4edda'; // Green - data matches
  }
  return 'inherit';
};

// Helper component for empty cell value
const EmptyCell: React.FC = () => (
  <span style={{ color: TEXT_COLORS.muted, fontStyle: 'italic' }}>—</span>
);

// Comparison Table Legend Component
const ComparisonLegend: React.FC = () => (
  <div style={{ marginBottom: '12px', fontSize: '0.85em', color: TEXT_COLORS.muted }}>
    <strong>Legend:</strong>{' '}
    <span
      style={{
        backgroundColor: '#d4edda',
        padding: '2px 6px',
        borderRadius: '3px',
        marginRight: '10px',
      }}
    >
      Data matches
    </span>
    <span
      style={{
        backgroundColor: '#fee2e2',
        padding: '2px 6px',
        borderRadius: '3px',
        marginRight: '10px',
      }}
    >
      PDF doesn't match entered data
    </span>
    <span style={{ backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '3px' }}>
      KvK doesn't match PDF
    </span>
  </div>
);

// Verification Comparison Table Component
const VerificationComparisonTable: React.FC<{ verificationStatus: KvkVerificationStatus }> = ({
  verificationStatus,
}) => {
  const kvkData = getKvkApiData(verificationStatus);

  if (!verificationStatus.kvk_extracted_company_name && !verificationStatus.kvk_extracted_number) {
    return null;
  }

  return (
    <div style={{ marginTop: '20px', marginBottom: '20px' }}>
      <strong style={{ marginBottom: '10px', display: 'block', fontSize: '1.05em' }}>
        Verification Details:
      </strong>

      <ComparisonLegend />

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
            <th
              style={{
                padding: '10px',
                textAlign: 'left',
                fontWeight: 600,
                width: '15%',
              }}
            >
              Field
            </th>
            <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>Entered by User</th>
            <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>From PDF</th>
            <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>KvK Registry</th>
          </tr>
        </thead>
        <tbody>
          {/* Company Name Row */}
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '10px', fontWeight: 500, backgroundColor: '#fafafa' }}>
              Company Name
            </td>
            <td style={{ padding: '10px' }}>
              {verificationStatus.entered_company_name || <EmptyCell />}
            </td>
            <td
              style={{
                padding: '10px',
                backgroundColor: getPdfCellBackground(
                  verificationStatus,
                  'entered_name_mismatch',
                  verificationStatus.kvk_extracted_company_name,
                  verificationStatus.entered_company_name
                ),
              }}
            >
              {verificationStatus.kvk_extracted_company_name || <EmptyCell />}
            </td>
            <td
              style={{
                padding: '10px',
                backgroundColor: getKvkCellBackground(
                  verificationStatus,
                  'company_name_mismatch',
                  kvkData?.statutoryName,
                  verificationStatus.kvk_extracted_company_name
                ),
              }}
            >
              {kvkData?.statutoryName || <EmptyCell />}
            </td>
          </tr>

          {/* KvK Number Row */}
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '10px', fontWeight: 500, backgroundColor: '#fafafa' }}>
              KvK Number
            </td>
            <td style={{ padding: '10px' }}>
              {verificationStatus.entered_kvk_number || <EmptyCell />}
            </td>
            <td
              style={{
                padding: '10px',
                backgroundColor: getPdfCellBackground(
                  verificationStatus,
                  'entered_kvk_mismatch',
                  verificationStatus.kvk_extracted_number,
                  verificationStatus.entered_kvk_number
                ),
              }}
            >
              {verificationStatus.kvk_extracted_number || <EmptyCell />}
            </td>
            <td
              style={{
                padding: '10px',
                backgroundColor: getKvkCellBackground(
                  verificationStatus,
                  'kvk_number_mismatch',
                  kvkData?.kvkNumber,
                  verificationStatus.kvk_extracted_number
                ),
              }}
            >
              {kvkData?.kvkNumber || <EmptyCell />}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// Validation Issues List Component
const ValidationIssuesList: React.FC<{ verificationStatus: KvkVerificationStatus }> = ({
  verificationStatus,
}) => {
  if (
    !verificationStatus.kvk_mismatch_flags ||
    verificationStatus.kvk_mismatch_flags.length === 0
  ) {
    return null;
  }

  const getFlagDescription = (flag: string): string => {
    const descriptions: { [key: string]: string } = {
      // Entered vs Extracted comparison flags
      entered_kvk_mismatch: 'Entered KvK number does not match extracted number from document',
      entered_name_mismatch: 'Entered company name does not match extracted name from document',

      // KvK API validation flags
      company_name_mismatch: 'Company name does not match KvK registry',
      kvk_number_mismatch: 'KvK number mismatch with registry',
      bankrupt: 'Company is bankrupt according to KvK',
      dissolved: 'Company is dissolved according to KvK',
      kvk_number_not_found: 'KvK number not found in registry',
      api_key_missing: 'KvK API key not configured',

      // Processing flags
      extraction_failed: 'Failed to extract data from document',
      processing_error: 'Error processing document',
      api_error: 'Failed to connect to KvK API',
    };

    return descriptions[flag] || flag;
  };

  const isEnteredDataMismatch = (flag: string): boolean => {
    return flag === 'entered_kvk_mismatch' || flag === 'entered_name_mismatch';
  };

  return (
    <div style={{ marginTop: '15px', marginBottom: '15px' }}>
      <strong style={{ display: 'block', marginBottom: '8px', fontSize: '1.05em' }}>
        ⚠️ Validation Issues:
      </strong>
      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
        {verificationStatus.kvk_mismatch_flags.map((flag) => (
          <li key={flag} style={{ color: isEnteredDataMismatch(flag) ? '#dc2626' : '#f59e0b' }}>
            {getFlagDescription(flag)}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Verification Metadata Component
const VerificationMetadata: React.FC<{ verificationStatus: KvkVerificationStatus }> = ({
  verificationStatus,
}) => {
  return (
    <>
      {verificationStatus.kvk_verification_notes && (
        <div style={{ marginTop: '10px' }}>
          <strong>Admin Notes:</strong>
          <div
            style={{
              padding: '10px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              marginTop: '5px',
            }}
          >
            {verificationStatus.kvk_verification_notes}
          </div>
        </div>
      )}

      {verificationStatus.kvk_verified_at && (
        <div style={{ marginTop: '10px', fontSize: '0.9em', color: TEXT_COLORS.muted }}>
          Verified: {formatDateTime(verificationStatus.kvk_verified_at)}
          {verificationStatus.kvk_verified_by && ` by ${verificationStatus.kvk_verified_by}`}
        </div>
      )}
    </>
  );
};

// Status Badge Component
const getStatusBadge = (status: string) => {
  const badges: { [key: string]: { color: string; text: string } } = {
    pending: { color: 'warning', text: 'Pending Verification' },
    verified: { color: 'success', text: 'Verified' },
    failed: { color: 'error', text: 'Verification Failed' },
    flagged: { color: 'warning', text: 'Flagged for Review' },
  };

  const badge = badges[status] || { color: 'info', text: status };

  return <span className={`k-badge k-badge-${badge.color}`}>{badge.text}</span>;
};

// Main Verification Display Component
export const KvkVerificationDisplay: React.FC<KvkVerificationDisplayProps> = ({
  verificationStatus,
  onUploadNew,
}) => {
  return (
    <div className="verification-status" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <strong>Status:</strong> {getStatusBadge(verificationStatus.kvk_verification_status)}
      </div>

      {verificationStatus.kvk_verification_status === 'pending' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: TEXT_COLORS.muted,
            marginBottom: '15px',
          }}
        >
          <Loader size="sm" />
          <span>Verifying document...</span>
        </div>
      )}

      <CompanyStatusBadge verificationStatus={verificationStatus} />
      <VerificationComparisonTable verificationStatus={verificationStatus} />
      <ValidationIssuesList verificationStatus={verificationStatus} />
      <VerificationMetadata verificationStatus={verificationStatus} />

      <div style={{ marginTop: '15px' }}>
        <a
          href={verificationStatus.kvk_document_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button color="cyan" size="sm">
            View Uploaded Document
          </Button>
        </a>
      </div>

      <div style={{ marginTop: '10px' }}>
        <Button color="blue" size="sm" onClick={onUploadNew}>
          Upload New Document
        </Button>
      </div>
    </div>
  );
};
