import { Button } from '@mantine/core';
import type React from 'react';
import type { LegalEntity, LegalEntityContact, Member } from '../../services/api';
import { getMembershipColor, getStatusColor } from '../../utils/colors';
import { safeFormatDate } from '../../utils/safeArray';
import type { MemberFormData } from '../../utils/validation';
import { CompanyDetails } from '../CompanyDetails';
import { CompanyForm } from '../CompanyForm';
import { ContactsManager } from '../ContactsManager';
import { EndpointManagement } from '../EndpointManagement';
import MemberForm from '../MemberForm';
import '../MemberDetailDialog.css';

// Helper functions
const getStatusBadge = (status: string) => {
  return (
    <span
      className="detail-badge"
      style={{ backgroundColor: getStatusColor(status), color: '#ffffff' }}
    >
      {status}
    </span>
  );
};

const getMembershipBadge = (level: string) => {
  return (
    <span
      className="detail-badge"
      style={{ backgroundColor: getMembershipColor(level), color: '#ffffff' }}
    >
      {level}
    </span>
  );
};

const formatDate = (dateString: string | null | undefined) => {
  return safeFormatDate(dateString);
};

// Overview Tab Component
interface OverviewTabProps {
  member: Member;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (data: MemberFormData) => Promise<void>;
  onCancel: () => void;
  onIssueToken: () => Promise<void>;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  member,
  isEditing,
  onEdit,
  onUpdate,
  onCancel,
  onIssueToken,
}) => {
  if (isEditing) {
    return (
      <div className="detail-content">
        <MemberForm
          initialData={{
            org_id: member.org_id,
            legal_name: member.legal_name,
            domain: member.domain,
            lei: member.lei || '',
            kvk: member.kvk || '',
          }}
          onSubmit={onUpdate}
          onCancel={onCancel}
        />
      </div>
    );
  }

  return (
    <div className="detail-content">
      <div className="detail-view">
        <div className="detail-section">
          <h3>Organization Information</h3>
          <div className="detail-grid">
            <div className="detail-field">
              <strong>Organization ID</strong>
              <span>{member.org_id}</span>
            </div>
            <div className="detail-field">
              <strong>Legal Name</strong>
              <span>{member.legal_name}</span>
            </div>
            <div className="detail-field">
              <strong>Domain</strong>
              <span>{member.domain}</span>
            </div>
            <div className="detail-field">
              <strong>Status</strong>
              {getStatusBadge(member.status)}
            </div>
            <div className="detail-field">
              <strong>Membership Level</strong>
              {getMembershipBadge(member.membership_level)}
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Identifiers</h3>
          <div className="detail-grid">
            <div className="detail-field">
              <strong>LEI</strong>
              <span>{member.lei || 'Not provided'}</span>
            </div>
            <div className="detail-field">
              <strong>KVK Number</strong>
              <span>{member.kvk || 'Not provided'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Timestamps</h3>
          <div className="detail-grid">
            <div className="detail-field">
              <strong>Created</strong>
              <span>{formatDate(member.created_at)}</span>
            </div>
            {member.updated_at && (
              <div className="detail-field">
                <strong>Last Updated</strong>
                <span>{formatDate(member.updated_at)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="detail-actions">
          <Button color="blue" onClick={onEdit}>
            Edit Member
          </Button>
          <Button color="green" onClick={onIssueToken} disabled={member.status !== 'ACTIVE'}>
            Issue Token
          </Button>
        </div>
      </div>
    </div>
  );
};

// Company Tab Component
interface CompanyTabProps {
  loading: boolean;
  legalEntity: LegalEntity | null;
  isEditingCompany: boolean;
  onEdit: () => void;
  onSave: (data: LegalEntity) => Promise<void>;
  onCancel: () => void;
}

export const CompanyTab: React.FC<CompanyTabProps> = ({
  loading,
  legalEntity,
  isEditingCompany,
  onEdit,
  onSave,
  onCancel,
}) => {
  if (loading) {
    return (
      <div className="detail-content">
        <div className="loading-state">Loading company information...</div>
      </div>
    );
  }

  if (!legalEntity) {
    return (
      <div className="detail-content">
        <div className="empty-state">No legal entity information available</div>
      </div>
    );
  }

  if (isEditingCompany) {
    return (
      <div className="detail-content">
        <CompanyForm data={legalEntity} onSave={onSave} onCancel={onCancel} />
      </div>
    );
  }

  return (
    <div className="detail-content">
      <CompanyDetails company={legalEntity} onEdit={onEdit} />
    </div>
  );
};

// Contacts Tab Component
interface ContactsTabProps {
  loading: boolean;
  legalEntityId: string | undefined;
  contacts: LegalEntityContact[];
  onContactCreate: (
    contact: Omit<LegalEntityContact, 'legal_entity_contact_id' | 'dt_created' | 'dt_modified'>
  ) => Promise<LegalEntityContact>;
  onContactUpdate: (
    contactId: string,
    data: Partial<LegalEntityContact>
  ) => Promise<LegalEntityContact>;
  onContactDelete: (contactId: string) => Promise<void>;
}

export const ContactsTab: React.FC<ContactsTabProps> = ({
  loading,
  legalEntityId,
  contacts,
  onContactCreate,
  onContactUpdate,
  onContactDelete,
}) => {
  if (loading) {
    return (
      <div className="detail-content">
        <div className="loading-state">Loading contacts...</div>
      </div>
    );
  }

  if (!legalEntityId) {
    return (
      <div className="detail-content">
        <div className="empty-state">No legal entity ID available</div>
      </div>
    );
  }

  return (
    <div className="detail-content">
      <ContactsManager
        legalEntityId={legalEntityId}
        contacts={contacts}
        onContactCreate={onContactCreate}
        onContactUpdate={onContactUpdate}
        onContactDelete={onContactDelete}
      />
    </div>
  );
};

// Endpoints Tab Component
interface EndpointsTabProps {
  legalEntityId: string;
  legalEntityName: string;
}

export const EndpointsTab: React.FC<EndpointsTabProps> = ({ legalEntityId, legalEntityName }) => {
  return (
    <div className="detail-content">
      <EndpointManagement legalEntityId={legalEntityId} legalEntityName={legalEntityName} />
    </div>
  );
};

// Activity Tab Component
interface ActivityTabProps {
  member: Member;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({ member }) => {
  return (
    <div className="detail-content">
      <div className="activity-timeline">
        <div className="timeline-item">
          <div className="timeline-marker" />
          <div className="timeline-content">
            <h4>Member Registered</h4>
            <p>{formatDate(member.created_at)}</p>
            <span className="timeline-meta">Initial registration</span>
          </div>
        </div>
        {member.updated_at && (
          <div className="timeline-item">
            <div className="timeline-marker" />
            <div className="timeline-content">
              <h4>Last Updated</h4>
              <p>{formatDate(member.updated_at)}</p>
              <span className="timeline-meta">Profile information modified</span>
            </div>
          </div>
        )}
        {member.status === 'ACTIVE' && (
          <div className="timeline-item">
            <div className="timeline-marker active" />
            <div className="timeline-content">
              <h4>Current Status</h4>
              <p>Active Member</p>
              <span className="timeline-meta">Full access to services</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Tokens Tab Component
interface TokensTabProps {
  member: Member;
  onIssueToken: () => Promise<void>;
}

export const TokensTab: React.FC<TokensTabProps> = ({ member, onIssueToken }) => {
  return (
    <div className="detail-content">
      <div className="tokens-section">
        <h3>Token Management</h3>
        <p>Issue and manage access tokens for this member.</p>
        <div className="token-actions">
          <Button color="blue" onClick={onIssueToken} disabled={member.status !== 'ACTIVE'}>
            Issue New Token
          </Button>
        </div>
        {member.status !== 'ACTIVE' && (
          <div className="warning-message">⚠️ Tokens can only be issued for active members</div>
        )}
      </div>
    </div>
  );
};
