import { useCallback, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { type LegalEntity, type LegalEntityContact, api } from '../services/api';

interface UseMemberDetailDataProps {
  legalEntityId: string | undefined;
}

interface UseMemberDetailDataReturn {
  legalEntity: LegalEntity | null;
  contacts: LegalEntityContact[];
  loading: boolean;
  loadLegalEntityData: () => Promise<void>;
  handleContactCreate: (
    contact: Omit<LegalEntityContact, 'legal_entity_contact_id' | 'dt_created' | 'dt_modified'>
  ) => Promise<LegalEntityContact>;
  handleContactUpdate: (
    contactId: string,
    data: Partial<LegalEntityContact>
  ) => Promise<LegalEntityContact>;
  handleContactDelete: (contactId: string) => Promise<void>;
  handleLegalEntityUpdate: (data: LegalEntity) => Promise<void>;
}

export const useMemberDetailData = ({
  legalEntityId,
}: UseMemberDetailDataProps): UseMemberDetailDataReturn => {
  const [legalEntity, setLegalEntity] = useState<LegalEntity | null>(null);
  const [contacts, setContacts] = useState<LegalEntityContact[]>([]);
  const [loading, setLoading] = useState(true);
  const notification = useNotification();

  const loadLegalEntityData = useCallback(async () => {
    if (!legalEntityId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Load legal entity details
      const entityData = await api.getLegalEntity(legalEntityId);
      setLegalEntity(entityData);

      // Load contacts
      const contactsData = await api.getContacts(legalEntityId);
      setContacts(contactsData);
    } catch (error) {
      console.error('Failed to load legal entity data:', error);
      notification.showError('Failed to load company information');
    } finally {
      setLoading(false);
    }
  }, [legalEntityId, notification]);

  const handleContactCreate = useCallback(
    async (
      contact: Omit<LegalEntityContact, 'legal_entity_contact_id' | 'dt_created' | 'dt_modified'>
    ): Promise<LegalEntityContact> => {
      try {
        const newContact = await api.createContact(contact);
        setContacts((prev) => [...prev, newContact]);
        notification.showSuccess('Contact created successfully');
        return newContact;
      } catch (error) {
        console.error('Failed to create contact:', error);
        notification.showError('Failed to create contact');
        throw error;
      }
    },
    [notification]
  );

  const handleContactUpdate = useCallback(
    async (contactId: string, data: Partial<LegalEntityContact>): Promise<LegalEntityContact> => {
      try {
        const updated = await api.updateContact(contactId, data);
        setContacts((prev) =>
          prev.map((c) => (c.legal_entity_contact_id === contactId ? updated : c))
        );
        notification.showSuccess('Contact updated successfully');
        return updated;
      } catch (error) {
        console.error('Failed to update contact:', error);
        notification.showError('Failed to update contact');
        throw error;
      }
    },
    [notification]
  );

  const handleContactDelete = useCallback(
    async (contactId: string): Promise<void> => {
      try {
        await api.deleteContact(contactId);
        setContacts((prev) => prev.filter((c) => c.legal_entity_contact_id !== contactId));
        notification.showSuccess('Contact deleted successfully');
      } catch (error) {
        console.error('Failed to delete contact:', error);
        notification.showError('Failed to delete contact');
        throw error;
      }
    },
    [notification]
  );

  const handleLegalEntityUpdate = useCallback(
    async (data: LegalEntity): Promise<void> => {
      if (!legalEntity?.legal_entity_id) {
        notification.showError('No legal entity ID available');
        return;
      }

      try {
        const updated = await api.updateLegalEntity(legalEntity.legal_entity_id, data);
        setLegalEntity(updated);
        notification.showSuccess('Company information updated successfully');
      } catch (error) {
        console.error('Failed to update company:', error);
        notification.showError('Failed to update company information');
        throw error;
      }
    },
    [legalEntity?.legal_entity_id, notification]
  );

  return {
    legalEntity,
    contacts,
    loading,
    loadLegalEntityData,
    handleContactCreate,
    handleContactUpdate,
    handleContactDelete,
    handleLegalEntityUpdate,
  };
};
