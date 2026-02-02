import { Button, Loader, Table, TextInput, Group, Text, Badge, ActionIcon, Tooltip } from '@mantine/core';
import { IconCheck, IconX, IconFlag, IconRefresh, IconEye } from '@tabler/icons-react';
import type React from 'react';
import { useState } from 'react';
import type { KvkVerificationStatus, KvkVerificationHistoryItem } from '../../hooks/useKvkDocumentUpload';
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
  verificationHistory?: KvkVerificationHistoryItem[];
  onUploadNew: () => void;
  onReviewVerification?: (status: 'verified' | 'rejected' | 'flagged', notes?: string) => Promise<void>;
  onTriggerReVerification?: () => Promise<void>;
  reviewingStatus?: boolean;
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
            Company Status (CoC Registry):{' '}
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
    return '#fef3c7'; // Yellow - CoC doesn't match PDF
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
      CoC doesn't match PDF
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
            <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>CoC Registry</th>
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

          {/* CoC Number Row */}
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '10px', fontWeight: 500, backgroundColor: '#fafafa' }}>
              CoC Number
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
      entered_kvk_mismatch: 'Entered CoC number does not match extracted number from document',
      entered_name_mismatch: 'Entered company name does not match extracted name from document',

      // CoC API validation flags
      company_name_mismatch: 'Company name does not match CoC registry',
      kvk_number_mismatch: 'CoC number mismatch with registry',
      bankrupt: 'Company is bankrupt according to CoC registry',
      dissolved: 'Company is dissolved according to CoC registry',
      kvk_number_not_found: 'CoC number not found in registry',
      api_key_missing: 'CoC API key not configured',

      // Processing flags
      extraction_failed: 'Failed to extract data from document',
      processing_error: 'Error processing document',
      api_error: 'Failed to connect to CoC API',
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

// Verification History Table Component
const VerificationHistoryTable: React.FC<{
  history: KvkVerificationHistoryItem[];
}> = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <strong style={{ display: 'block', marginBottom: '10px' }}>Document History:</strong>
        <Text c="dimmed" size="sm">No verification history available.</Text>
      </div>
    );
  }

  const getStatusBadgeColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'verified':
      case 'approved':
        return 'green';
      case 'rejected':
        return 'red';
      case 'flagged':
        return 'yellow';
      case 'pending':
        return 'blue';
      default:
        return 'gray';
    }
  };

  return (
    <div style={{ marginTop: '20px', marginBottom: '20px' }}>
      <strong style={{ display: 'block', marginBottom: '10px' }}>Document History:</strong>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Verified By</Table.Th>
            <Table.Th>Notes</Table.Th>
            <Table.Th>Document</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {history.map((item) => (
            <Table.Tr key={item.verification_id}>
              <Table.Td>{formatDateTime(item.created_at)}</Table.Td>
              <Table.Td>
                <Badge color={getStatusBadgeColor(item.verification_status)} size="sm">
                  {item.verification_status}
                </Badge>
              </Table.Td>
              <Table.Td>
                {item.verified_by ? (
                  <span>
                    {item.verified_by}
                    {item.verified_at && (
                      <Text size="xs" c="dimmed">
                        {formatDateTime(item.verified_at)}
                      </Text>
                    )}
                  </span>
                ) : (
                  <Text c="dimmed" size="sm">—</Text>
                )}
              </Table.Td>
              <Table.Td>
                {item.verification_notes || <Text c="dimmed" size="sm">—</Text>}
              </Table.Td>
              <Table.Td>
                {item.document_url || item.document_blob_url ? (
                  <Tooltip label="View document">
                    <ActionIcon
                      component="a"
                      href={item.document_url || item.document_blob_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="light"
                      color="blue"
                      size="sm"
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                  </Tooltip>
                ) : (
                  <Text c="dimmed" size="sm">—</Text>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
};

// Admin Verification Actions Component
const AdminVerificationActions: React.FC<{
  onReviewVerification: (status: 'verified' | 'rejected' | 'flagged', notes?: string) => Promise<void>;
  onTriggerReVerification: () => Promise<void>;
  reviewingStatus: boolean;
  currentStatus: string;
}> = ({ onReviewVerification, onTriggerReVerification, reviewingStatus, currentStatus }) => {
  const [notes, setNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [pendingAction, setPendingAction] = useState<'verified' | 'rejected' | 'flagged' | null>(null);

  const handleAction = async (action: 'verified' | 'rejected' | 'flagged') => {
    if (action === 'rejected' || action === 'flagged') {
      setPendingAction(action);
      setShowNotesInput(true);
    } else {
      await onReviewVerification(action, notes);
      setNotes('');
    }
  };

  const confirmAction = async () => {
    if (pendingAction) {
      await onReviewVerification(pendingAction, notes);
      setNotes('');
      setShowNotesInput(false);
      setPendingAction(null);
    }
  };

  const cancelAction = () => {
    setShowNotesInput(false);
    setPendingAction(null);
    setNotes('');
  };

  // Don't show admin actions if already verified
  if (currentStatus === 'verified' || currentStatus === 'approved') {
    return null;
  }

  return (
    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
      <strong style={{ display: 'block', marginBottom: '10px' }}>Admin Verification Actions:</strong>

      {showNotesInput ? (
        <div>
          <TextInput
            placeholder={`Add notes for ${pendingAction} action...`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            mb="sm"
          />
          <Group>
            <Button
              size="sm"
              color={pendingAction === 'rejected' ? 'red' : 'yellow'}
              onClick={confirmAction}
              loading={reviewingStatus}
            >
              Confirm {pendingAction}
            </Button>
            <Button size="sm" variant="outline" onClick={cancelAction} disabled={reviewingStatus}>
              Cancel
            </Button>
          </Group>
        </div>
      ) : (
        <Group>
          <Tooltip label="Approve this verification">
            <Button
              size="sm"
              color="green"
              leftSection={<IconCheck size={16} />}
              onClick={() => handleAction('verified')}
              loading={reviewingStatus}
            >
              Verify
            </Button>
          </Tooltip>

          <Tooltip label="Reject this verification">
            <Button
              size="sm"
              color="red"
              leftSection={<IconX size={16} />}
              onClick={() => handleAction('rejected')}
              loading={reviewingStatus}
            >
              Reject
            </Button>
          </Tooltip>

          <Tooltip label="Flag for further review">
            <Button
              size="sm"
              color="yellow"
              leftSection={<IconFlag size={16} />}
              onClick={() => handleAction('flagged')}
              loading={reviewingStatus}
            >
              Flag
            </Button>
          </Tooltip>

          <Tooltip label="Re-run document verification">
            <Button
              size="sm"
              variant="outline"
              leftSection={<IconRefresh size={16} />}
              onClick={onTriggerReVerification}
              loading={reviewingStatus}
            >
              Re-verify
            </Button>
          </Tooltip>
        </Group>
      )}
    </div>
  );
};

// Main Verification Display Component
export const KvkVerificationDisplay: React.FC<KvkVerificationDisplayProps> = ({
  verificationStatus,
  verificationHistory = [],
  onUploadNew,
  onReviewVerification,
  onTriggerReVerification,
  reviewingStatus = false,
}) => {
  return (
    <div className="verification-status" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <strong>Status:</strong> {getStatusBadge(verificationStatus.kvk_verification_status)}
        {verificationStatus.document_uploaded_at && (
          <Text size="sm" c="dimmed" ml="md">
            Uploaded: {formatDateTime(verificationStatus.document_uploaded_at)}
          </Text>
        )}
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
          <span>Awaiting admin verification...</span>
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

      {onReviewVerification && onTriggerReVerification && (
        <AdminVerificationActions
          onReviewVerification={onReviewVerification}
          onTriggerReVerification={onTriggerReVerification}
          reviewingStatus={reviewingStatus}
          currentStatus={verificationStatus.kvk_verification_status}
        />
      )}

      <VerificationHistoryTable history={verificationHistory} />

      <div style={{ marginTop: '10px' }}>
        <Button color="blue" size="sm" onClick={onUploadNew}>
          Upload New Document
        </Button>
      </div>
    </div>
  );
};
