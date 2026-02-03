import { Button, Modal, Tabs } from '@mantine/core';
// MemberDetailDialog.tsx - Modal for member details and editing
import type React from 'react';
import { useEffect, useState } from 'react';
import { useMemberDetailData } from '../hooks/useMemberDetailData';
import type { Member } from '../services/api';
import type { MemberFormData } from '../utils/validation';
import {
  ActivityTab,
  CompanyTab,
  ContactsTab,
  EndpointsTab,
  OverviewTab,
  TokensTab,
} from './member/MemberDetailTabs';
import './MemberDetailDialog.css';

interface MemberDetailDialogProps {
  member: Member;
  onClose: () => void;
  onUpdate: (data: MemberFormData) => Promise<void>;
  onIssueToken: (legalEntityId: string) => Promise<void>;
}

const MemberDetailDialog: React.FC<MemberDetailDialogProps> = ({
  member,
  onClose,
  onUpdate,
  onIssueToken,
}) => {
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);

  const {
    legalEntity,
    contacts,
    loading,
    loadLegalEntityData,
    handleContactCreate,
    handleContactUpdate,
    handleContactDelete,
    handleLegalEntityUpdate,
  } = useMemberDetailData({ legalEntityId: member.legal_entity_id });

  // Load legal entity and contacts from API
  useEffect(() => {
    loadLegalEntityData();
  }, [loadLegalEntityData]);

  const handleUpdate = async (data: MemberFormData) => {
    await onUpdate(data);
    setIsEditing(false);
  };

  const handleUpdateCompany = async (data: typeof legalEntity) => {
    if (!data) return;
    await handleLegalEntityUpdate(data);
    setIsEditingCompany(false);
  };

  const handleIssueToken = async () => {
    await onIssueToken(member.legal_entity_id);
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={`Member Details: ${member.legal_name}`}
      size="xl"
      styles={{ body: { minHeight: '600px' } }}
    >
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="company">Company</Tabs.Tab>
          <Tabs.Tab value="contacts">Contacts</Tabs.Tab>
          <Tabs.Tab value="endpoints">Endpoints</Tabs.Tab>
          <Tabs.Tab value="activity">Activity</Tabs.Tab>
          <Tabs.Tab value="tokens">Tokens</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <OverviewTab
            member={member}
            isEditing={isEditing}
            onEdit={() => setIsEditing(true)}
            onUpdate={handleUpdate}
            onCancel={() => setIsEditing(false)}
            onIssueToken={handleIssueToken}
          />
        </Tabs.Panel>

        <Tabs.Panel value="company" pt="md">
          <CompanyTab
            loading={loading}
            legalEntity={legalEntity}
            isEditingCompany={isEditingCompany}
            onEdit={() => setIsEditingCompany(true)}
            onSave={handleUpdateCompany}
            onCancel={() => setIsEditingCompany(false)}
          />
        </Tabs.Panel>

        <Tabs.Panel value="contacts" pt="md">
          <ContactsTab
            loading={loading}
            legalEntityId={legalEntity?.legal_entity_id}
            contacts={contacts}
            onContactCreate={handleContactCreate}
            onContactUpdate={handleContactUpdate}
            onContactDelete={handleContactDelete}
          />
        </Tabs.Panel>

        <Tabs.Panel value="endpoints" pt="md">
          <EndpointsTab
            legalEntityId={member.legal_entity_id}
            legalEntityName={member.legal_name}
          />
        </Tabs.Panel>

        <Tabs.Panel value="activity" pt="md">
          <ActivityTab member={member} />
        </Tabs.Panel>

        <Tabs.Panel value="tokens" pt="md">
          <TokensTab member={member} onIssueToken={handleIssueToken} />
        </Tabs.Panel>
      </Tabs>

      <Button onClick={onClose} mt="xl" fullWidth>
        Close
      </Button>
    </Modal>
  );
};

export default MemberDetailDialog;
