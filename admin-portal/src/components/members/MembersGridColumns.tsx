import { TextInput } from '@mantine/core';
import type { DataTableColumn } from 'mantine-datatable';
import { useTranslation } from 'react-i18next';
import type { Member } from '../../services/api';
import { getMembershipColor, getStatusColor } from '../../utils/colors';
import { sanitizeGridCell } from '../../utils/sanitize';

interface ColumnDefinitionsProps {
  query: string;
  onQueryChange: (value: string) => void;
}

const statusTooltips: Record<string, string> = {
  ACTIVE: 'Member is active and in good standing',
  PENDING: 'Membership application pending approval',
  SUSPENDED: 'Member temporarily suspended - access restricted',
  TERMINATED: 'Membership terminated - no longer active',
  FLAGGED: 'Member flagged for review',
};

const membershipTooltips: Record<string, string> = {
  PREMIUM: 'Premium membership - full access to all services and priority support',
  FULL: 'Full membership - access to all standard services',
  BASIC: 'Basic membership - limited access to essential services',
};

export const useMembersGridColumns = ({
  query,
  onQueryChange,
}: ColumnDefinitionsProps): DataTableColumn<Member>[] => {
  const { t } = useTranslation();

  // Helper function to get translated column title
  const getColumnTitle = (field: string) => {
    const titleMap: Record<string, string> = {
      legal_name: t('members.legalName'),
      status: t('common.status'),
      lei: 'LEI',
      euid: 'EUID',
      kvk: 'KVK',
      legal_entity_id: t('members.legalEntityId', 'Legal Entity ID'),
      domain: t('members.domain', 'Domain'),
      membership_level: t('members.membership', 'Membership'),
      created_at: t('members.memberSince', 'Member Since'),
    };
    return titleMap[field] || field;
  };

  return [
    {
      // Legal Entity ID - first column, compact display showing only first 8 chars
      accessor: 'legal_entity_id',
      title: 'ID',
      width: 90,
      resizable: true,
      sortable: true,
      render: (member) => (
        <span
          title={member.legal_entity_id}
          style={{ fontFamily: 'monospace', fontSize: '0.85em', cursor: 'help' }}
        >
          {member.legal_entity_id?.substring(0, 8)}…
        </span>
      ),
    },
    {
      accessor: 'legal_name',
      title: getColumnTitle('legal_name'),
      width: 200,
      resizable: true,
      sortable: true,
      filter: (
        <TextInput
          placeholder="Search legal name..."
          value={query}
          onChange={(e) => onQueryChange(e.currentTarget.value)}
          size="xs"
        />
      ),
      filtering: query !== '',
      render: (member) => <div>{sanitizeGridCell(member.legal_name)}</div>,
    },
    {
      accessor: 'status',
      title: getColumnTitle('status'),
      width: 120,
      toggleable: true,
      resizable: true,
      sortable: true,
      render: (member) => (
        <output
          className="status-badge"
          style={{ backgroundColor: getStatusColor(member.status) }}
          title={statusTooltips[member.status] || 'Member status'}
          aria-label={`Status: ${member.status}`}
        >
          {member.status}
        </output>
      ),
    },
    {
      accessor: 'lei',
      title: 'LEI',
      width: 150,
      toggleable: true,
      resizable: true,
      sortable: true,
    },
    {
      accessor: 'euid',
      title: 'EUID',
      width: 180,
      toggleable: true,
      resizable: true,
      sortable: true,
    },
    {
      accessor: 'kvk',
      title: 'KVK',
      width: 120,
      toggleable: true,
      resizable: true,
      sortable: true,
      defaultToggle: false, // Hidden by default
    },
    {
      accessor: 'created_at',
      title: getColumnTitle('created_at'),
      width: 140,
      toggleable: true,
      resizable: true,
      sortable: true,
      defaultToggle: false, // Hidden by default
      render: (member) => <div>{new Date(member.created_at).toLocaleDateString()}</div>,
    },
    {
      accessor: 'domain',
      title: getColumnTitle('domain'),
      width: 150,
      toggleable: true,
      resizable: true,
      sortable: true,
      defaultToggle: false, // Hidden by default
      render: (member) => <div>{sanitizeGridCell(member.domain || '')}</div>,
    },
    /* membership_level column hidden - membership levels feature disabled */
  ];
};
