import { Button } from '@mantine/core';
import React, { useEffect } from 'react';
import type { LegalEntityIdentifier } from "../services/api";
import { getEmptyState } from '../utils/emptyStates';
import { EmptyState } from './EmptyState';
import { FileCheck, Plus } from './icons';
import './IdentifiersManager.css';
import '../styles/progressive-forms.css';
import { useIdentifierManagement, useIdentifierVerification } from '../hooks/useIdentifiers';
import { DeleteConfirmDialog, IdentifierDialog } from './identifiers/IdentifierDialogs';
import { IdentifiersTable } from './identifiers/IdentifiersTable';

interface IdentifiersManagerProps {
  legalEntityId: string;
  identifiers: LegalEntityIdentifier[];
  onIdentifierCreate: (
    identifier: Omit<
      LegalEntityIdentifier,
      'legal_entity_reference_id' | 'dt_created' | 'dt_modified'
    >
  ) => Promise<LegalEntityIdentifier>;
  onIdentifierUpdate: (
    identifierId: string,
    identifier: Partial<LegalEntityIdentifier>
  ) => Promise<LegalEntityIdentifier>;
  onIdentifierDelete: (identifierId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const IdentifiersManagerComponent: React.FC<IdentifiersManagerProps> = ({
  legalEntityId,
  identifiers,
  onIdentifierCreate,
  onIdentifierUpdate,
  onIdentifierDelete,
  onRefresh,
}) => {
  // Use custom hooks for managing state and operations
  const {
    isDialogOpen,
    editingIdentifier,
    formData,
    setFormData,
    availableIdentifierTypes,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    identifierToDelete,
    validationError,
    isValidIdentifier,
    handleAdd,
    handleEdit,
    handleCountryCodeChange,
    handleIdentifierTypeChange,
    handleIdentifierValueChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleSave,
    handleCancel,
  } = useIdentifierManagement(
    legalEntityId,
    onIdentifierCreate,
    onIdentifierUpdate,
    onIdentifierDelete
  );

  const {
    kvkVerificationFlags,
    hasKvkDocument,
    fetchingLei,
    fetchKvkVerification,
    handleFetchLei,
  } = useIdentifierVerification(legalEntityId, identifiers, onRefresh);

  // Fetch KvK verification status on mount
  useEffect(() => {
    if (legalEntityId) {
      fetchKvkVerification();
    }
  }, [legalEntityId, fetchKvkVerification]);

  return (
    <div className="identifiers-manager">
      <div className="section-header">
        <h3>Legal Identifiers</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="outline"
            color="cyan"
            onClick={handleFetchLei}
            disabled={fetchingLei || identifiers.length === 0}
            title="Enrich identifiers from external registries (GLEIF, Peppol, VIES)"
            aria-label={fetchingLei ? 'Enriching from registries...' : 'Enrich from registries'}
          >
            {fetchingLei ? 'Enriching...' : '>> Enrich'}
          </Button>
          <Button color="blue" onClick={handleAdd} aria-label="Add new identifier">
            <Plus size={16} />
            Add Identifier
          </Button>
        </div>
      </div>

      {identifiers.length > 0 ? (
        <IdentifiersTable
          identifiers={identifiers}
          kvkVerificationFlags={kvkVerificationFlags}
          hasKvkDocument={hasKvkDocument}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      ) : (
        (() => {
          const es = getEmptyState('identifier', 'noIdentifiers');
          return (
            <EmptyState
              icon={<FileCheck size={48} />}
              message={es.message}
              hint={es.hint}
              action={es.action ? { label: es.action.label, onClick: handleAdd } : undefined}
            />
          );
        })()
      )}

      <IdentifierDialog
        isOpen={isDialogOpen}
        editingIdentifier={editingIdentifier}
        formData={formData}
        setFormData={setFormData}
        availableIdentifierTypes={availableIdentifierTypes}
        validationError={validationError}
        isValidIdentifier={isValidIdentifier}
        onSave={handleSave}
        onCancel={handleCancel}
        onCountryCodeChange={handleCountryCodeChange}
        onIdentifierTypeChange={handleIdentifierTypeChange}
        onIdentifierValueChange={handleIdentifierValueChange}
      />

      <DeleteConfirmDialog
        isOpen={deleteConfirmOpen}
        identifier={identifierToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};

export const IdentifiersManager = React.memo(IdentifiersManagerComponent);
