import {
  Button,
  Group,
  Modal,
  Select,
  TextInput,
  Textarea,
} from '@mantine/core';
import { DataTable, useDataTableColumns } from 'mantine-datatable';
import React, { useEffect, useState } from 'react';

import { helpContent } from '../config/helpContent';
import { useNotification } from '../contexts/NotificationContext';
import { type LegalEntityEndpoint, apiV2 } from "../services/api";
import { formatDateTime } from '../utils/dateFormat';
import { getEmptyState } from '../utils/emptyStates';
import { endpointSuccessMessages } from '../utils/successMessages';
import { EmptyState } from './EmptyState';
import { ErrorBoundary } from './ErrorBoundary';
import { HelpTooltip } from './help/HelpTooltip';
import { Plus } from './icons';
import { defaultDataTableProps } from './shared/DataTableConfig';
import './EndpointManagement.css';

interface EndpointManagementProps {
  legalEntityId: string;
  legalEntityName: string;
}

const DATA_CATEGORIES = [
  { value: 'CONTAINER', label: 'Container Tracking' },
  { value: 'CUSTOMS', label: 'Customs' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'GENERAL', label: 'General' },
];

const EndpointManagementComponent: React.FC<EndpointManagementProps> = ({
  legalEntityId,
  legalEntityName,
}) => {
  const [endpoints, setEndpoints] = useState<LegalEntityEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const notification = useNotification();

  const [formData, setFormData] = useState({
    endpoint_name: '',
    endpoint_url: '',
    endpoint_description: '',
    data_category: 'CONTAINER',
    endpoint_type: 'REST_API',
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: Load function is stable, depends only on legalEntityId
  useEffect(() => {
    loadEndpoints();
  }, [legalEntityId]);

  const loadEndpoints = async () => {
    setLoading(true);
    try {
      const endpoints = await apiV2.getEndpoints(legalEntityId);
      setEndpoints(endpoints);
    } catch (error) {
      console.error('Error loading endpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEndpoint = async () => {
    setLoading(true);
    try {
      await apiV2.addEndpoint({
        legal_entity_id: legalEntityId,
        endpoint_name: formData.endpoint_name,
        endpoint_url: formData.endpoint_url,
        endpoint_description: formData.endpoint_description,
        data_category: (formData.data_category ||
          'CONTAINER') as LegalEntityEndpoint['data_category'],
        endpoint_type: (formData.endpoint_type ||
          'REST_API') as LegalEntityEndpoint['endpoint_type'],
        is_active: true,
      });

      const msg = endpointSuccessMessages.created(formData.endpoint_url);
      notification.showSuccess(msg.title);
      setShowDialog(false);
      setFormData({
        endpoint_name: '',
        endpoint_url: '',
        endpoint_description: '',
        data_category: 'CONTAINER',
        endpoint_type: 'REST_API',
      });
      loadEndpoints();
    } catch (error: unknown) {
      console.error('Error creating endpoint:', error);
      const err = error as { response?: { data?: { error?: string } } };
      notification.showError(err.response?.data?.error || 'Failed to create endpoint');
    } finally {
      setLoading(false);
    }
  };

  // mantine-datatable column definitions
  const { effectiveColumns } = useDataTableColumns<LegalEntityEndpoint>({
    key: 'endpoints-grid',
    columns: [
      {
        accessor: 'endpoint_name',
        title: 'Endpoint Name',
        width: 250,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'endpoint_url',
        title: 'URL',
        width: 300,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'data_category',
        title: 'Category',
        width: 150,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'endpoint_type',
        title: 'Type',
        width: 120,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'is_active',
        title: 'Status',
        width: 120,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (endpoint) => (
          <div>
            <span className={`status-badge ${endpoint.is_active ? 'active' : 'inactive'}`}>
              {endpoint.is_active ? '● Active' : '○ Inactive'}
            </span>
          </div>
        ),
      },
      {
        accessor: 'dt_created',
        title: 'Created',
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (endpoint) => <div>{formatDateTime(endpoint.dt_created)}</div>,
      },
    ],
  });

  return (
    <div className="endpoint-management">
      <div className="endpoint-header">
        <div>
          <h2>System Endpoints</h2>
          <p className="entity-name">{legalEntityName}</p>
        </div>
        <Button
          color="blue"
          onClick={() => setShowDialog(true)}
          disabled={loading}
          aria-label="Register new endpoint"
        >
          <Plus size={16} />
          Register Endpoint
        </Button>
      </div>

      {endpoints.length === 0 ? (
        (() => {
          const es = getEmptyState('endpoint', 'noEndpoints');
          return (
            <EmptyState
              message={es.message}
              hint={es.hint}
              action={
                es.action
                  ? { label: es.action.label, onClick: () => setShowDialog(true) }
                  : undefined
              }
            />
          );
        })()
      ) : (
        <ErrorBoundary>
          <DataTable
            {...defaultDataTableProps}
            records={endpoints}
            columns={effectiveColumns}
            fetching={loading}
            storeColumnsKey="endpoints-grid"
          />
        </ErrorBoundary>
      )}

      <Modal
        opened={showDialog}
        onClose={() => setShowDialog(false)}
        title="Register New Endpoint"
        size="lg"
      >
        <div className="endpoint-form">
          <div className="form-field">
            <TextInput
              label="Endpoint Name *"
              value={formData.endpoint_name}
              onChange={(e) => setFormData({ ...formData, endpoint_name: e.target.value })}
              placeholder="e.g., Container Tracking System"
            />
          </div>

          <div className="form-field">
            <TextInput
              label={
                <>
                  Endpoint URL *
                  <HelpTooltip content={helpContent.endpointUrl} dataTestId="endpoint-url-help" />
                </>
              }
              value={formData.endpoint_url}
              onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
              placeholder="https://your-system.com/api"
            />
          </div>

          <div className="form-field">
            <Textarea
              label="Description"
              value={formData.endpoint_description}
              onChange={(e) => setFormData({ ...formData, endpoint_description: e.target.value })}
              placeholder="Brief description of this endpoint"
              rows={3}
            />
          </div>

          <div className="form-field">
            <Select
              label="Data Category *"
              data={DATA_CATEGORIES}
              value={formData.data_category}
              onChange={(value) => setFormData({ ...formData, data_category: value || '' })}
            />
          </div>
        </div>

        <Group mt="xl" justify="flex-end">
          <Button
            onClick={() => setShowDialog(false)}
            variant="default"
            aria-label="Cancel endpoint registration"
          >
            Cancel
          </Button>
          <Button
            color="blue"
            onClick={handleCreateEndpoint}
            disabled={!formData.endpoint_name || !formData.endpoint_url || loading}
            aria-label="Save and register endpoint"
          >
            Register Endpoint
          </Button>
        </Group>
      </Modal>
    </div>
  );
};

export const EndpointManagement = React.memo(EndpointManagementComponent);
