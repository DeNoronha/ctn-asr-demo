import { Button } from '@progress/kendo-react-buttons';
import { Dialog } from '@progress/kendo-react-dialogs';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Input, TextArea } from '@progress/kendo-react-inputs';
import { Plus } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import './EndpointManagement.css';

interface Endpoint {
  legal_entity_endpoint_id: string;
  endpoint_name: string;
  endpoint_url: string;
  data_category: string;
  endpoint_type: string;
  is_active: boolean;
  dt_created: string;
}

interface Token {
  endpoint_authorization_id: string;
  token_value: string;
  token_type: string;
  issued_at: string;
  expires_at: string;
  is_active: boolean;
}

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

export const EndpointManagement: React.FC<EndpointManagementProps> = ({
  legalEntityId,
  legalEntityName,
}) => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [newToken, setNewToken] = useState<Token | null>(null);
  const notification = useNotification();

  const [formData, setFormData] = useState({
    endpoint_name: '',
    endpoint_url: '',
    endpoint_description: '',
    data_category: 'CONTAINER',
    endpoint_type: 'REST_API',
  });

  const API_BASE =
    process.env.VITE_API_URL || 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1';

  useEffect(() => {
    loadEndpoints();
  }, [legalEntityId]);

  const loadEndpoints = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/legal-entities/${legalEntityId}/endpoints`);
      const data = await response.json();
      setEndpoints(data);
    } catch (error) {
      console.error('Error loading endpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEndpoint = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/legal-entities/${legalEntityId}/endpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowDialog(false);
        setFormData({
          endpoint_name: '',
          endpoint_url: '',
          endpoint_description: '',
          data_category: 'CONTAINER',
          endpoint_type: 'REST_API',
        });
        loadEndpoints();
      }
    } catch (error) {
      console.error('Error creating endpoint:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueToken = async (endpoint: Endpoint) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/endpoints/${endpoint.legal_entity_endpoint_id}/tokens`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      if (response.ok) {
        const token = await response.json();
        setNewToken(token);
        setSelectedEndpoint(endpoint);
        setShowTokenDialog(true);
      }
    } catch (error) {
      console.error('Error issuing token:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notification.showSuccess('Token copied to clipboard');
  };

  const StatusCell = (props: any) => {
    return (
      <td>
        <span className={`status-badge ${props.dataItem.is_active ? 'active' : 'inactive'}`}>
          {props.dataItem.is_active ? '● Active' : '○ Inactive'}
        </span>
      </td>
    );
  };

  const ActionsCell = (props: any) => {
    return (
      <td>
        <Button
          themeColor="primary"
          size="small"
          title="Issue token for this endpoint"
          aria-label={`Issue token for ${props.dataItem.endpoint_name}`}
          onClick={() => handleIssueToken(props.dataItem)}
          disabled={loading}
        >
          Issue Token
        </Button>
      </td>
    );
  };

  return (
    <div className="endpoint-management">
      <div className="endpoint-header">
        <div>
          <h2>System Endpoints</h2>
          <p className="entity-name">{legalEntityName}</p>
        </div>
        <Button themeColor="primary" onClick={() => setShowDialog(true)} disabled={loading}>
          <Plus size={16} />
          Register Endpoint
        </Button>
      </div>

      <Grid data={endpoints} style={{ height: '500px' }}>
        <GridColumn field="endpoint_name" title="Endpoint Name" width="250px" />
        <GridColumn field="endpoint_url" title="URL" width="300px" />
        <GridColumn field="data_category" title="Category" width="150px" />
        <GridColumn field="endpoint_type" title="Type" width="120px" />
        <GridColumn field="is_active" title="Status" width="120px" cell={StatusCell} />
        <GridColumn
          field="dt_created"
          title="Created"
          width="180px"
          format="{0:yyyy-MM-dd HH:mm}"
        />
        <GridColumn title="Actions" width="150px" cell={ActionsCell} />
      </Grid>

      {showDialog && (
        <Dialog title="Register New Endpoint" onClose={() => setShowDialog(false)} width={600}>
          <div className="endpoint-form">
            <div className="form-field">
              <label>Endpoint Name *</label>
              <Input
                value={formData.endpoint_name}
                onChange={(e) => setFormData({ ...formData, endpoint_name: e.value })}
                placeholder="e.g., Container Tracking System"
              />
            </div>

            <div className="form-field">
              <label>Endpoint URL *</label>
              <Input
                value={formData.endpoint_url}
                onChange={(e) => setFormData({ ...formData, endpoint_url: e.value })}
                placeholder="https://your-system.com/api"
              />
            </div>

            <div className="form-field">
              <label>Description</label>
              <TextArea
                value={formData.endpoint_description}
                onChange={(e) => setFormData({ ...formData, endpoint_description: e.value })}
                placeholder="Brief description of this endpoint"
                rows={3}
              />
            </div>

            <div className="form-field">
              <label>Data Category *</label>
              <DropDownList
                data={DATA_CATEGORIES}
                textField="label"
                dataItemKey="value"
                value={DATA_CATEGORIES.find((c) => c.value === formData.data_category)}
                onChange={(e) => setFormData({ ...formData, data_category: e.value.value })}
              />
            </div>
          </div>

          <div className="dialog-actions">
            <Button onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              themeColor="primary"
              onClick={handleCreateEndpoint}
              disabled={!formData.endpoint_name || !formData.endpoint_url || loading}
            >
              Register Endpoint
            </Button>
          </div>
        </Dialog>
      )}

      {showTokenDialog && newToken && selectedEndpoint && (
        <Dialog
          title="Token Issued Successfully"
          onClose={() => setShowTokenDialog(false)}
          width={700}
        >
          <div className="token-display">
            <p className="success-message">
              ✅ New token issued for <strong>{selectedEndpoint.endpoint_name}</strong>
            </p>

            <div className="token-info">
              <label>Token Value:</label>
              <div className="token-value-container">
                <code className="token-value">{newToken.token_value}</code>
                <Button size="small" onClick={() => copyToClipboard(newToken.token_value)}>
                  Copy
                </Button>
              </div>
            </div>

            <div className="token-details">
              <div className="token-detail">
                <strong>Type:</strong> {newToken.token_type}
              </div>
              <div className="token-detail">
                <strong>Issued:</strong> {new Date(newToken.issued_at).toLocaleString()}
              </div>
              <div className="token-detail">
                <strong>Expires:</strong> {new Date(newToken.expires_at).toLocaleString()}
              </div>
            </div>

            <div className="token-warning">
              ⚠️ <strong>Important:</strong> Save this token securely. It won't be displayed again.
            </div>
          </div>

          <div className="dialog-actions">
            <Button themeColor="primary" onClick={() => setShowTokenDialog(false)}>
              Done
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
};
