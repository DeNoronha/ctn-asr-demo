import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Tenant {
  id: string;
  tenantId: string;
  organizationName: string;
  terminalName: string;
  subscription: {
    type: string;
    status: string;
    monthlyFee: number;
  };
}

const Admin: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [newTenant, setNewTenant] = useState({
    organizationId: '',
    organizationName: '',
    terminalCode: '',
    terminalName: ''
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const response = await axios.get<Tenant[]>('/api/v1/tenants');
      setTenants(response.data || []);
    } catch (error) {
      console.error('Failed to load tenants:', error);
      // Mock data for demo
      setTenants([
        {
          id: 'itg-hengelo',
          tenantId: 'itg-hengelo',
          organizationName: 'ITG',
          terminalName: 'ITG Hengelo',
          subscription: {
            type: 'saas',
            status: 'active',
            monthlyFee: 499
          }
        },
        {
          id: 'itv-venlo',
          tenantId: 'itv-venlo',
          organizationName: 'ITV',
          terminalName: 'ITV Venlo',
          subscription: {
            type: 'saas',
            status: 'trial',
            monthlyFee: 0
          }
        }
      ]);
    }
  };

  const handleCreateTenant = async () => {
    try {
      await axios.post('/api/v1/tenants', newTenant);
      alert('Tenant created successfully!');
      setShowDialog(false);
      loadTenants();
    } catch (error) {
      console.error('Failed to create tenant:', error);
      alert('Failed to create tenant');
    }
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h2>Tenant Management</h2>
        <button className="btn-primary" onClick={() => setShowDialog(true)}>
          Add Tenant
        </button>
      </div>

      <div className="card">
        <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Tenant ID</th>
                <th style={{ width: '150px' }}>Organization</th>
                <th style={{ width: '200px' }}>Terminal</th>
                <th style={{ width: '120px' }}>Type</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '150px' }}>Monthly Fee</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No tenants found
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>{tenant.tenantId}</td>
                    <td>{tenant.organizationName}</td>
                    <td>{tenant.terminalName}</td>
                    <td>{tenant.subscription.type}</td>
                    <td>
                      <span className={`status-badge status-${tenant.subscription.status}`}>
                        {tenant.subscription.status}
                      </span>
                    </td>
                    <td>€{tenant.subscription.monthlyFee}/month</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Add New Tenant</h3>
              <button
                onClick={() => setShowDialog(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '0 8px',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <div className="form-field" style={{ marginBottom: '16px' }}>
                <label>Organization ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTenant.organizationId}
                  onChange={(e) => setNewTenant({ ...newTenant, organizationId: e.target.value })}
                  placeholder="itg"
                />
              </div>
              <div className="form-field" style={{ marginBottom: '16px' }}>
                <label>Organization Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTenant.organizationName}
                  onChange={(e) => setNewTenant({ ...newTenant, organizationName: e.target.value })}
                  placeholder="ITG"
                />
              </div>
              <div className="form-field" style={{ marginBottom: '16px' }}>
                <label>Terminal Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTenant.terminalCode}
                  onChange={(e) => setNewTenant({ ...newTenant, terminalCode: e.target.value })}
                  placeholder="hengelo"
                />
              </div>
              <div className="form-field" style={{ marginBottom: '24px' }}>
                <label>Terminal Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTenant.terminalName}
                  onChange={(e) => setNewTenant({ ...newTenant, terminalName: e.target.value })}
                  placeholder="ITG Hengelo"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="btn-primary" onClick={handleCreateTenant}>
                  Create
                </button>
                <button className="btn-secondary" onClick={() => setShowDialog(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>System Configuration</h3>
        <div style={{ color: '#64748b' }}>
          <p><strong>Mode:</strong> SaaS Multi-Tenant</p>
          <p><strong>Total Tenants:</strong> {tenants.length}</p>
          <p><strong>Active Subscriptions:</strong> {tenants.filter(t => t.subscription.status === 'active').length}</p>
          <p><strong>Model Version:</strong> v1.3.2 (shared)</p>
        </div>
      </div>
    </div>
  );
};

export default Admin;
