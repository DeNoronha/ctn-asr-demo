import React, { useEffect, useState } from 'react';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Button } from '@progress/kendo-react-buttons';
import { Dialog } from '@progress/kendo-react-dialogs';
import { Input } from '@progress/kendo-react-inputs';
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

  const StatusCell = (props: any) => {
    const status = props.dataItem.subscription.status;
    const className = `status-badge status-${status}`;
    return <td><span className={className}>{status}</span></td>;
  };

  const TypeCell = (props: any) => {
    return <td>{props.dataItem.subscription.type}</td>;
  };

  const FeeCell = (props: any) => {
    return <td>€{props.dataItem.subscription.monthlyFee}/month</td>;
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h2>Tenant Management</h2>
        <Button themeColor="primary" onClick={() => setShowDialog(true)}>
          Add Tenant
        </Button>
      </div>

      <div className="card">
        <Grid data={tenants} style={{ height: '600px' }}>
          <GridColumn field="tenantId" title="Tenant ID" width="180px" />
          <GridColumn field="organizationName" title="Organization" width="150px" />
          <GridColumn field="terminalName" title="Terminal" width="200px" />
          <GridColumn field="subscription.type" title="Type" width="120px" cell={TypeCell} />
          <GridColumn field="subscription.status" title="Status" width="120px" cell={StatusCell} />
          <GridColumn field="subscription.monthlyFee" title="Monthly Fee" width="150px" cell={FeeCell} />
        </Grid>
      </div>

      {showDialog && (
        <Dialog
          title="Add New Tenant"
          onClose={() => setShowDialog(false)}
          width={500}
        >
          <div style={{ padding: '16px' }}>
            <div className="form-field" style={{ marginBottom: '16px' }}>
              <label>Organization ID</label>
              <Input
                value={newTenant.organizationId}
                onChange={(e) => setNewTenant({ ...newTenant, organizationId: e.value })}
                placeholder="itg"
              />
            </div>
            <div className="form-field" style={{ marginBottom: '16px' }}>
              <label>Organization Name</label>
              <Input
                value={newTenant.organizationName}
                onChange={(e) => setNewTenant({ ...newTenant, organizationName: e.value })}
                placeholder="ITG"
              />
            </div>
            <div className="form-field" style={{ marginBottom: '16px' }}>
              <label>Terminal Code</label>
              <Input
                value={newTenant.terminalCode}
                onChange={(e) => setNewTenant({ ...newTenant, terminalCode: e.value })}
                placeholder="hengelo"
              />
            </div>
            <div className="form-field" style={{ marginBottom: '24px' }}>
              <label>Terminal Name</label>
              <Input
                value={newTenant.terminalName}
                onChange={(e) => setNewTenant({ ...newTenant, terminalName: e.value })}
                placeholder="ITG Hengelo"
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button themeColor="primary" onClick={handleCreateTenant}>
                Create
              </Button>
              <Button onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Dialog>
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
