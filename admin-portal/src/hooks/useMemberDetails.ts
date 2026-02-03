/**
 * useMemberDetails Hook
 * Manages all member-related data fetching including legal entity, contacts, identifiers, and endpoints
 *
 * Usage:
 * ```tsx
 * const {
 *   legalEntity,
 *   contacts,
 *   identifiers,
 *   endpoints,
 *   hasKvkRegistryData,
 *   loading,
 *   handlers
 * } = useMemberDetails(member.legal_entity_id);
 * ```
 */

import { useEffect, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { type LegalEntity, type LegalEntityContact, api } from '../services/api';
import {
  type LegalEntityEndpoint,
  type LegalEntityIdentifier,
  apiV2,
  enrichLegalEntity,
} from '../services/api';
import { logger } from '../utils/logger';

interface UseMemberDetailsReturn {
  legalEntity: LegalEntity | null;
  contacts: LegalEntityContact[];
  identifiers: LegalEntityIdentifier[];
  endpoints: LegalEntityEndpoint[];
  hasKvkRegistryData: boolean;
  hasLeiRegistryData: boolean;
  hasPeppolRegistryData: boolean;
  hasViesRegistryData: boolean;
  hasGermanRegistryData: boolean;
  hasEoriRegistryData: boolean;
  hasBelgiumRegistryData: boolean;
  loading: boolean;
  handlers: {
    updateLegalEntity: (data: LegalEntity) => Promise<void>;
    createContact: (
      contact: Omit<LegalEntityContact, 'legal_entity_contact_id' | 'dt_created' | 'dt_modified'>
    ) => Promise<LegalEntityContact>;
    updateContact: (
      contactId: string,
      data: Partial<LegalEntityContact>
    ) => Promise<LegalEntityContact>;
    deleteContact: (contactId: string) => Promise<void>;
    createIdentifier: (
      identifier: Omit<
        LegalEntityIdentifier,
        'legal_entity_reference_id' | 'dt_created' | 'dt_modified'
      >
    ) => Promise<LegalEntityIdentifier>;
    updateIdentifier: (
      identifierId: string,
      data: Partial<LegalEntityIdentifier>
    ) => Promise<LegalEntityIdentifier>;
    deleteIdentifier: (identifierId: string) => Promise<void>;
    refreshIdentifiers: () => Promise<void>;
    refreshLegalEntity: () => Promise<void>;
    refreshAll: () => Promise<void>;
    enrichAndRefresh: () => Promise<void>;
    refreshKvkData: () => Promise<void>;
    refreshLeiData: () => Promise<void>;
    refreshPeppolData: () => Promise<void>;
    refreshViesData: () => Promise<void>;
    refreshGermanData: () => Promise<void>;
    refreshEoriData: () => Promise<void>;
    refreshBelgiumData: () => Promise<void>;
  };
}

export function useMemberDetails(legalEntityId?: string): UseMemberDetailsReturn {
  const [legalEntity, setLegalEntity] = useState<LegalEntity | null>(null);
  const [contacts, setContacts] = useState<LegalEntityContact[]>([]);
  const [identifiers, setIdentifiers] = useState<LegalEntityIdentifier[]>([]);
  const [endpoints, setEndpoints] = useState<LegalEntityEndpoint[]>([]);
  const [hasKvkRegistryData, setHasKvkRegistryData] = useState(false);
  const [hasLeiRegistryData, setHasLeiRegistryData] = useState(false);
  const [hasPeppolRegistryData, setHasPeppolRegistryData] = useState(false);
  const [hasViesRegistryData, setHasViesRegistryData] = useState(false);
  const [hasGermanRegistryData, setHasGermanRegistryData] = useState(false);
  const [hasEoriRegistryData, setHasEoriRegistryData] = useState(false);
  const [hasBelgiumRegistryData, setHasBelgiumRegistryData] = useState(false);
  const [loading, setLoading] = useState(false);
  const notification = useNotification();

  // Load all data when legalEntityId changes
  useEffect(() => {
    const loadData = async () => {
      if (!legalEntityId) {
        return;
      }

      setLoading(true);
      try {
        // Load legal entity
        const entity = await api.getLegalEntity(legalEntityId);
        setLegalEntity(entity);

        // Load contacts
        const entityContacts = await api.getContacts(legalEntityId);
        setContacts(entityContacts);

        // Load identifiers
        const entityIdentifiers = await apiV2.getIdentifiers(legalEntityId);
        setIdentifiers(entityIdentifiers);

        // Load endpoints (non-blocking)
        try {
          const entityEndpoints = await apiV2.getEndpoints(legalEntityId);
          setEndpoints(entityEndpoints);
        } catch (endpointError: unknown) {
          logger.error('Failed to load endpoints:', endpointError);
          setEndpoints([]);
        }

        // Check KvK registry data (non-blocking)
        try {
          await apiV2.getKvkRegistryData(legalEntityId);
          setHasKvkRegistryData(true);
        } catch (kvkError: unknown) {
          if (kvkError && typeof kvkError === 'object' && 'response' in kvkError) {
            const axiosError = kvkError as { response?: { status: number } };
            if (axiosError.response?.status !== 404) {
              logger.error('Error checking KvK registry data:', kvkError);
            }
          }
          setHasKvkRegistryData(false);
        }

        // Check LEI registry data (non-blocking)
        try {
          await apiV2.getLeiRegistryData(legalEntityId);
          setHasLeiRegistryData(true);
        } catch (leiError: unknown) {
          if (leiError && typeof leiError === 'object' && 'response' in leiError) {
            const axiosError = leiError as { response?: { status: number } };
            if (axiosError.response?.status !== 404) {
              logger.error('Error checking LEI registry data:', leiError);
            }
          }
          setHasLeiRegistryData(false);
        }

        // Check Peppol registry data (non-blocking)
        try {
          const peppolResponse = await apiV2.getPeppolRegistryData(legalEntityId);
          setHasPeppolRegistryData(peppolResponse.hasData);
        } catch (peppolError: unknown) {
          if (peppolError && typeof peppolError === 'object' && 'response' in peppolError) {
            const axiosError = peppolError as { response?: { status: number } };
            if (axiosError.response?.status !== 404) {
              logger.error('Error checking Peppol registry data:', peppolError);
            }
          }
          setHasPeppolRegistryData(false);
        }

        // Check VIES registry data (non-blocking)
        try {
          const viesResponse = await apiV2.getViesRegistryData(legalEntityId);
          setHasViesRegistryData(viesResponse.hasData);
        } catch (viesError: unknown) {
          if (viesError && typeof viesError === 'object' && 'response' in viesError) {
            const axiosError = viesError as { response?: { status: number } };
            if (axiosError.response?.status !== 404) {
              logger.error('Error checking VIES registry data:', viesError);
            }
          }
          setHasViesRegistryData(false);
        }

        // Check German registry data (non-blocking)
        try {
          const germanResponse = await apiV2.getGermanRegistryData(legalEntityId);
          setHasGermanRegistryData(germanResponse.hasData);
        } catch (germanError: unknown) {
          if (germanError && typeof germanError === 'object' && 'response' in germanError) {
            const axiosError = germanError as { response?: { status: number } };
            if (axiosError.response?.status !== 404) {
              logger.error('Error checking German registry data:', germanError);
            }
          }
          setHasGermanRegistryData(false);
        }

        // Check EORI registry data (non-blocking)
        try {
          const eoriResponse = await apiV2.getEoriRegistryData(legalEntityId);
          setHasEoriRegistryData(eoriResponse.hasData);
        } catch (eoriError: unknown) {
          if (eoriError && typeof eoriError === 'object' && 'response' in eoriError) {
            const axiosError = eoriError as { response?: { status: number } };
            if (axiosError.response?.status !== 404) {
              logger.error('Error checking EORI registry data:', eoriError);
            }
          }
          setHasEoriRegistryData(false);
        }

        // Check Belgium registry data (non-blocking)
        try {
          const belgiumResponse = await apiV2.getBelgiumRegistryData(legalEntityId);
          setHasBelgiumRegistryData(belgiumResponse.hasData);
        } catch (belgiumError: unknown) {
          if (belgiumError && typeof belgiumError === 'object' && 'response' in belgiumError) {
            const axiosError = belgiumError as { response?: { status: number } };
            if (axiosError.response?.status !== 404) {
              logger.error('Error checking Belgium registry data:', belgiumError);
            }
          }
          setHasBelgiumRegistryData(false);
        }
      } catch (error) {
        logger.error('Failed to load legal entity data:', error);
        notification.showError('Failed to load company information');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [legalEntityId]);

  // Handler for updating legal entity
  const updateLegalEntity = async (data: LegalEntity): Promise<void> => {
    if (!legalEntity) return;

    try {
      // biome-ignore lint/style/noNonNullAssertion: legalEntity null-check performed above
      const updated = await api.updateLegalEntity(legalEntity.legal_entity_id!, data);
      setLegalEntity(updated);
      notification.showSuccess('Company information updated successfully');
    } catch (error) {
      logger.error('Failed to update company:', error);
      notification.showError('Failed to update company information');
      throw error;
    }
  };

  // Handler for creating contact
  const createContact = async (
    contact: Omit<LegalEntityContact, 'legal_entity_contact_id' | 'dt_created' | 'dt_modified'>
  ): Promise<LegalEntityContact> => {
    try {
      const newContact = await api.createContact(contact);
      setContacts((prev) => [...prev, newContact]);
      notification.showSuccess('Contact created successfully');
      return newContact;
    } catch (error) {
      logger.error('Failed to create contact:', error);
      notification.showError('Failed to create contact');
      throw error;
    }
  };

  // Handler for updating contact
  const updateContact = async (
    contactId: string,
    data: Partial<LegalEntityContact>
  ): Promise<LegalEntityContact> => {
    try {
      const updated = await api.updateContact(contactId, data);
      setContacts((prev) =>
        prev.map((c) => (c.legal_entity_contact_id === contactId ? updated : c))
      );
      notification.showSuccess('Contact updated successfully');
      return updated;
    } catch (error) {
      logger.error('Failed to update contact:', error);
      notification.showError('Failed to update contact');
      throw error;
    }
  };

  // Handler for deleting contact
  const deleteContact = async (contactId: string): Promise<void> => {
    try {
      await api.deleteContact(contactId);
      setContacts((prev) => prev.filter((c) => c.legal_entity_contact_id !== contactId));
      notification.showSuccess('Contact deleted successfully');
    } catch (error) {
      logger.error('Failed to delete contact:', error);
      notification.showError('Failed to delete contact');
      throw error;
    }
  };

  // Handler for creating identifier
  const createIdentifier = async (
    identifier: Omit<
      LegalEntityIdentifier,
      'legal_entity_reference_id' | 'dt_created' | 'dt_modified'
    >
  ): Promise<LegalEntityIdentifier> => {
    if (!legalEntityId) {
      throw new Error('Legal entity ID is required');
    }

    try {
      const newIdentifier = await apiV2.addIdentifier(identifier);
      // Refetch all identifiers to get fresh data (including auto-generated EUID)
      const refreshedIdentifiers = await apiV2.getIdentifiers(legalEntityId);
      setIdentifiers(refreshedIdentifiers);

      // Check if EUID was auto-generated
      const euidAutoGenerated =
        'euid_auto_generated' in newIdentifier &&
        (newIdentifier as Record<string, unknown>).euid_auto_generated === true;
      if (euidAutoGenerated) {
        notification.showSuccess(
          `${identifier.identifier_type} added successfully. EUID automatically generated and added.`
        );
      } else {
        notification.showSuccess('Identifier added successfully');
      }
      return newIdentifier;
    } catch (error) {
      logger.error('Failed to create identifier:', error);
      notification.showError('Failed to create identifier');
      throw error;
    }
  };

  // Handler for updating identifier
  const updateIdentifier = async (
    identifierId: string,
    data: Partial<LegalEntityIdentifier>
  ): Promise<LegalEntityIdentifier> => {
    if (!legalEntityId) {
      throw new Error('Legal entity ID is required');
    }

    try {
      const updated = await apiV2.updateIdentifier(identifierId, data);
      // Refetch all identifiers to get fresh data (including auto-updated EUID)
      const refreshedIdentifiers = await apiV2.getIdentifiers(legalEntityId);
      setIdentifiers(refreshedIdentifiers);

      // Check if EUID was auto-updated
      const euidAutoUpdated =
        'euid_auto_updated' in updated &&
        (updated as Record<string, unknown>).euid_auto_updated === true;
      if (euidAutoUpdated) {
        notification.showSuccess(
          'Identifier updated successfully. EUID automatically synchronized.'
        );
      } else {
        notification.showSuccess('Identifier updated successfully');
      }
      return updated;
    } catch (error) {
      logger.error('Failed to update identifier:', error);
      notification.showError('Failed to update identifier');
      throw error;
    }
  };

  // Handler for deleting identifier
  const deleteIdentifier = async (identifierId: string): Promise<void> => {
    try {
      await apiV2.deleteIdentifier(identifierId);
      setIdentifiers((prev) => prev.filter((i) => i.legal_entity_reference_id !== identifierId));
      notification.showSuccess('Identifier deleted successfully');
    } catch (error) {
      logger.error('Failed to delete identifier:', error);
      notification.showError('Failed to delete identifier');
      throw error;
    }
  };

  // Handler for refreshing identifiers
  const refreshIdentifiers = async (): Promise<void> => {
    if (!legalEntityId) {
      throw new Error('Legal entity ID is required');
    }

    try {
      const refreshedIdentifiers = await apiV2.getIdentifiers(legalEntityId);
      setIdentifiers(refreshedIdentifiers);
    } catch (error) {
      logger.error('Failed to refresh identifiers:', error);
      throw error;
    }
  };

  // Handler for refreshing legal entity data (company details)
  const refreshLegalEntity = async (): Promise<void> => {
    if (!legalEntityId) {
      return;
    }

    try {
      const entity = await api.getLegalEntity(legalEntityId);
      setLegalEntity(entity);
    } catch (error) {
      logger.error('Failed to refresh legal entity:', error);
      throw error;
    }
  };

  // Handler for refreshing all data (legal entity + identifiers + registry data)
  const refreshAll = async (): Promise<void> => {
    if (!legalEntityId) {
      return;
    }

    setLoading(true);
    try {
      // Refresh legal entity
      const entity = await api.getLegalEntity(legalEntityId);
      setLegalEntity(entity);

      // Refresh identifiers
      const refreshedIdentifiers = await apiV2.getIdentifiers(legalEntityId);
      setIdentifiers(refreshedIdentifiers);

      // Refresh registry data flags
      try {
        await apiV2.getKvkRegistryData(legalEntityId);
        setHasKvkRegistryData(true);
      } catch (_error) {
        setHasKvkRegistryData(false);
      }

      try {
        await apiV2.getLeiRegistryData(legalEntityId);
        setHasLeiRegistryData(true);
      } catch (_error) {
        setHasLeiRegistryData(false);
      }

      try {
        const peppolResponse = await apiV2.getPeppolRegistryData(legalEntityId);
        setHasPeppolRegistryData(peppolResponse.hasData);
      } catch (_error) {
        setHasPeppolRegistryData(false);
      }

      try {
        const viesResponse = await apiV2.getViesRegistryData(legalEntityId);
        setHasViesRegistryData(viesResponse.hasData);
      } catch (_error) {
        setHasViesRegistryData(false);
      }

      try {
        const germanResponse = await apiV2.getGermanRegistryData(legalEntityId);
        setHasGermanRegistryData(germanResponse.hasData);
      } catch (_error) {
        setHasGermanRegistryData(false);
      }

      try {
        const eoriResponse = await apiV2.getEoriRegistryData(legalEntityId);
        setHasEoriRegistryData(eoriResponse.hasData);
      } catch (_error) {
        setHasEoriRegistryData(false);
      }

      try {
        const belgiumResponse = await apiV2.getBelgiumRegistryData(legalEntityId);
        setHasBelgiumRegistryData(belgiumResponse.hasData);
      } catch (_error) {
        setHasBelgiumRegistryData(false);
      }
    } catch (error) {
      logger.error('Failed to refresh all data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Handler for enriching from registries and refreshing all data
  // This calls the enrich endpoint which updates legal_entity with KVK data (name, address, etc.)
  const enrichAndRefresh = async (): Promise<void> => {
    if (!legalEntityId) {
      return;
    }

    setLoading(true);
    try {
      // Call enrich endpoint to sync from external registries
      const enrichResult = await enrichLegalEntity(legalEntityId);

      // Show notification with what was updated
      if (enrichResult.company_details_updated && enrichResult.updated_fields.length > 0) {
        notification.showSuccess(
          `Company details updated: ${enrichResult.updated_fields.join(', ')}`
        );
      } else if (enrichResult.added_count > 0) {
        notification.showSuccess(`Added ${enrichResult.added_count} new identifier(s)`);
      } else {
        notification.showInfo('Company details are already up to date');
      }

      // Refresh all data from database
      await refreshAll();
    } catch (error) {
      logger.error('Failed to enrich and refresh:', error);
      notification.showError('Failed to update company details from registry');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Handler for refreshing KvK data
  const refreshKvkData = async (): Promise<void> => {
    if (!legalEntityId) {
      return;
    }

    try {
      await apiV2.getKvkRegistryData(legalEntityId);
      setHasKvkRegistryData(true);
    } catch (_error) {
      setHasKvkRegistryData(false);
    }
  };

  // Handler for refreshing LEI data
  const refreshLeiData = async (): Promise<void> => {
    if (!legalEntityId) {
      return;
    }

    try {
      await apiV2.getLeiRegistryData(legalEntityId);
      setHasLeiRegistryData(true);
    } catch (_error) {
      setHasLeiRegistryData(false);
    }
  };

  // Handler for refreshing Peppol data
  const refreshPeppolData = async (): Promise<void> => {
    if (!legalEntityId) {
      return;
    }

    try {
      const response = await apiV2.getPeppolRegistryData(legalEntityId);
      setHasPeppolRegistryData(response.hasData);
    } catch (_error) {
      setHasPeppolRegistryData(false);
    }
  };

  // Handler for refreshing VIES data
  const refreshViesData = async (): Promise<void> => {
    if (!legalEntityId) {
      return;
    }

    try {
      const response = await apiV2.getViesRegistryData(legalEntityId);
      setHasViesRegistryData(response.hasData);
    } catch (_error) {
      setHasViesRegistryData(false);
    }
  };

  // Handler for refreshing German registry data
  const refreshGermanData = async (): Promise<void> => {
    if (!legalEntityId) {
      return;
    }

    try {
      const response = await apiV2.getGermanRegistryData(legalEntityId);
      setHasGermanRegistryData(response.hasData);
    } catch (_error) {
      setHasGermanRegistryData(false);
    }
  };

  // Handler for refreshing EORI registry data
  const refreshEoriData = async (): Promise<void> => {
    if (!legalEntityId) {
      return;
    }

    try {
      const response = await apiV2.getEoriRegistryData(legalEntityId);
      setHasEoriRegistryData(response.hasData);
    } catch (_error) {
      setHasEoriRegistryData(false);
    }
  };

  // Handler for refreshing Belgium KBO registry data
  const refreshBelgiumData = async (): Promise<void> => {
    if (!legalEntityId) {
      return;
    }

    try {
      const response = await apiV2.getBelgiumRegistryData(legalEntityId);
      setHasBelgiumRegistryData(response.hasData);
    } catch (_error) {
      setHasBelgiumRegistryData(false);
    }
  };

  return {
    legalEntity,
    contacts,
    identifiers,
    endpoints,
    hasKvkRegistryData,
    hasLeiRegistryData,
    hasPeppolRegistryData,
    hasViesRegistryData,
    hasGermanRegistryData,
    hasEoriRegistryData,
    hasBelgiumRegistryData,
    loading,
    handlers: {
      updateLegalEntity,
      createContact,
      updateContact,
      deleteContact,
      createIdentifier,
      updateIdentifier,
      deleteIdentifier,
      refreshIdentifiers,
      refreshLegalEntity,
      refreshAll,
      enrichAndRefresh,
      refreshKvkData,
      refreshLeiData,
      refreshPeppolData,
      refreshViesData,
      refreshGermanData,
      refreshEoriData,
      refreshBelgiumData,
    },
  };
}
