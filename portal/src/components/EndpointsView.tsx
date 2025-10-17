import { Button } from '@progress/kendo-react-buttons';
import { Dialog } from '@progress/kendo-react-dialogs';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { ComponentProps, Endpoint } from '../types';

const endpointTypes = ['REST_API', 'SOAP', 'SFTP', 'FTP', 'OTHER'];
const dataCategories = ['SHIPMENT', 'TRACKING', 'INVOICE', 'ORDER', 'OTHER'];
const authMethods = ['BEARER_TOKEN', 'BASIC_AUTH', 'API_KEY', 'OAUTH2', 'NONE'];

export const EndpointsView: React.FC<ComponentProps> = ({
  apiBaseUrl,
  getAccessToken,
  onNotification,
  onDataChange,
}) => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    endpoint_name: '',
    endpoint_url: '',
    endpoint_description: '',
    endpoint_type: 'REST_API',
    data_category: 'SHIPMENT',
    authentication_method: 'BEARER_TOKEN',
    is_active: true,
  });

  useEffect(() => {
    loadEndpoints();
  }, []);

  const loadEndpoints = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();

      console.log('Loading endpoints from:', `${apiBaseUrl}/member-endpoints`);

      const response = await fetch(`${apiBaseUrl}/member-endpoints`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Endpoints response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Endpoints loaded:', data);
        setEndpoints(data.endpoints || []);
      } else {
        const errorText = await response.text();
        console.error('Failed to load endpoints:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error loading endpoints:', error);
      onNotification('Failed to load endpoints', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      endpoint_name: '',
      endpoint_url: '',
      endpoint_description: '',
      endpoint_type: 'REST_API',
      data_category: 'SHIPMENT',
      authentication_method: 'BEARER_TOKEN',
      is_active: true,
    });
    setShowDialog(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getAccessToken();

      console.log('Creating endpoint:', formData);

      const response = await fetch(`${apiBaseUrl}/member-endpoints`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || `Failed to create endpoint: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Endpoint created:', responseData);

      onNotification('Endpoint created successfully', 'success');
      setShowDialog(false);
      await loadEndpoints();
      onDataChange();
    } catch (error) {
      console.error('Error creating endpoint:', error);
      onNotification(error instanceof Error ? error.message : 'Failed to create endpoint', 'error');
    }
  };

  return (
    <div className="endpoints-view">
      <div className="page-header">
        <div>
          <h2>Data Endpoints</h2>
          <p className="page-subtitle">Manage your organization's data endpoints</p>
        </div>
        <Button themeColor="primary" onClick={handleAdd}>
          Add Endpoint
        </Button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading endpoints...</p>
          </div>
        ) : endpoints.length === 0 ? (
          <div className="empty-state">
            <h3>No Endpoints</h3>
            <p>Add your first data endpoint to get started.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>URL</th>
                <th>Type</th>
                <th>Category</th>
                <th>Auth Method</th>
                <th>Last Test</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((endpoint) => (
                <tr key={endpoint.legal_entity_endpoint_id}>
                  <td>
                    <strong>{endpoint.endpoint_name}</strong>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{endpoint.endpoint_url}</td>
                  <td>{endpoint.endpoint_type}</td>
                  <td>{endpoint.data_category || '-'}</td>
                  <td>{endpoint.authentication_method || '-'}</td>
                  <td>
                    {endpoint.last_connection_status ? (
                      <span
                        className={`status-badge ${endpoint.last_connection_status === 'SUCCESS' ? 'status-active' : 'status-inactive'}`}
                      >
                        {endpoint.last_connection_status}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <span className={endpoint.is_active ? 'status-active' : 'status-inactive'}>
                      {endpoint.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showDialog && (
        <Dialog title="Add Endpoint" onClose={() => setShowDialog(false)} width={700}>
          <form onSubmit={handleSubmit} className="simple-form">
            <div className="form-field">
              <label>Endpoint Name *</label>
              <input
                type="text"
                name="endpoint_name"
                value={formData.endpoint_name}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label>Endpoint URL *</label>
              <input
                type="url"
                name="endpoint_url"
                value={formData.endpoint_url}
                onChange={handleChange}
                placeholder="https://api.example.com/data"
                required
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label>Description</label>
              <textarea
                name="endpoint_description"
                value={formData.endpoint_description}
                onChange={handleChange}
                rows={3}
                className="form-input"
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Endpoint Type *</label>
                <select
                  name="endpoint_type"
                  value={formData.endpoint_type}
                  onChange={handleChange}
                  required
                  className="form-input"
                >
                  {endpointTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Data Category</label>
                <select
                  name="data_category"
                  value={formData.data_category}
                  onChange={handleChange}
                  className="form-input"
                >
                  {dataCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-field">
              <label>Authentication Method</label>
              <select
                name="authentication_method"
                value={formData.authentication_method}
                onChange={handleChange}
                className="form-input"
              >
                {authMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <Button type="button" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" themeColor="primary">
                Create Endpoint
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
};
