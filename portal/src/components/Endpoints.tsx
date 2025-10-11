import React, { useState, useEffect } from 'react';

interface EndpointsProps {
  apiBaseUrl: string;
  getAccessToken: () => Promise<string>;
  legalEntityId: string;
}

interface Endpoint {
  legal_entity_endpoint_id: string;
  endpoint_name: string;
  endpoint_url: string;
  endpoint_description: string;
  data_category: string;
  endpoint_type: string;
  is_active: boolean;
  last_connection_status: string;
}

export const Endpoints: React.FC<EndpointsProps> = ({ apiBaseUrl, getAccessToken, legalEntityId }) => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (legalEntityId) {
      loadEndpoints();
    }
  }, [legalEntityId]);

  const loadEndpoints = async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/entities/${legalEntityId}/endpoints`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load endpoints: ${response.status}`);
      }

      const data = await response.json();
      setEndpoints(data.endpoints || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load endpoints');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEndpoint = () => {
    setShowAddForm(true);
  };

  return (
    <div className="endpoints">
      <h2>API Endpoints</h2>
      
      <div className="endpoints-header">
        <p>Manage your organization's data endpoints for sharing with the CTN network.</p>
        <button onClick={handleAddEndpoint} className="btn-primary">
          Add New Endpoint
        </button>
      </div>

      {loading && <div className="loading">Loading endpoints...</div>}
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {!loading && endpoints.length === 0 && (
        <div className="empty-state">
          <p>No endpoints configured yet.</p>
          <p className="text-muted">Add your first endpoint to start sharing data with the CTN network.</p>
        </div>
      )}

      {endpoints.length > 0 && (
        <div className="endpoints-grid">
          {endpoints.map(endpoint => (
            <div key={endpoint.legal_entity_endpoint_id} className="endpoint-card">
              <div className="endpoint-header">
                <h3>{endpoint.endpoint_name}</h3>
                <span className={`status-badge ${endpoint.is_active ? 'active' : 'inactive'}`}>
                  {endpoint.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="endpoint-details">
                <div className="detail-row">
                  <strong>URL:</strong>
                  <code>{endpoint.endpoint_url}</code>
                </div>
                <div className="detail-row">
                  <strong>Type:</strong> {endpoint.endpoint_type}
                </div>
                <div className="detail-row">
                  <strong>Category:</strong> {endpoint.data_category}
                </div>
                {endpoint.endpoint_description && (
                  <div className="detail-row">
                    <strong>Description:</strong> {endpoint.endpoint_description}
                  </div>
                )}
                {endpoint.last_connection_status && (
                  <div className="detail-row">
                    <strong>Last Test:</strong>
                    <span className={`connection-status ${endpoint.last_connection_status.toLowerCase()}`}>
                      {endpoint.last_connection_status}
                    </span>
                  </div>
                )}
              </div>
              <div className="endpoint-actions">
                <button className="btn-secondary">Test Connection</button>
                <button className="btn-secondary">Edit</button>
                <button className="btn-danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add New Endpoint</h3>
            <p className="text-muted">Endpoint creation form coming soon...</p>
            <button onClick={() => setShowAddForm(false)} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
