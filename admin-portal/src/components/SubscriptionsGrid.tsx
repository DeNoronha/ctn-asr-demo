import { Button } from '@progress/kendo-react-buttons';
import { DatePicker } from '@progress/kendo-react-dateinputs';
import { Dialog } from '@progress/kendo-react-dialogs';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Grid, GridColumn, GridToolbar } from '@progress/kendo-react-grid';
import { Input } from '@progress/kendo-react-inputs';
import type React from 'react';
import { useEffect, useState } from 'react';
import {
  formatCurrency as formatCurrencyUtil,
  formatDate as formatDateUtil,
} from '../utils/dateUtils';
import './SubscriptionsGrid.css';

interface Subscription {
  subscription_id: string;
  legal_entity_id: string;
  legal_name?: string;
  org_id?: string;
  plan_name: string;
  plan_description?: string;
  price: number;
  currency: string;
  billing_cycle: 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired' | 'suspended' | 'trial';
  start_date: string;
  next_billing_date?: string;
  auto_renew: boolean;
  created_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071/api';

const SubscriptionsGrid: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [_loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    legal_entity_id: '',
    plan_name: '',
    plan_description: '',
    price: 0,
    currency: 'EUR',
    billing_cycle: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    trial_period_days: 0,
    auto_renew: true,
  });

  const billingCycleOptions = [
    { text: 'Monthly', value: 'monthly' },
    { text: 'Quarterly', value: 'quarterly' },
    { text: 'Yearly', value: 'yearly' },
  ];

  const _statusOptions = [
    { text: 'Active', value: 'active' },
    { text: 'Cancelled', value: 'cancelled' },
    { text: 'Expired', value: 'expired' },
    { text: 'Suspended', value: 'suspended' },
    { text: 'Trial', value: 'trial' },
  ];

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/subscriptions`);
      if (!response.ok) throw new Error('Failed to load subscriptions');
      const data = await response.json();
      setSubscriptions(data);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create subscription');

      setShowCreateDialog(false);
      resetForm();
      loadSubscriptions();
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('Failed to create subscription');
    }
  };

  const handleUpdate = async () => {
    if (!selectedSubscription) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/subscriptions/${selectedSubscription.subscription_id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan_name: formData.plan_name,
            plan_description: formData.plan_description,
            price: formData.price,
            billing_cycle: formData.billing_cycle,
            auto_renew: formData.auto_renew,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to update subscription');

      setShowEditDialog(false);
      setSelectedSubscription(null);
      resetForm();
      loadSubscriptions();
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Failed to update subscription');
    }
  };

  const handleCancel = async (subscriptionId: string) => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/v1/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (!response.ok) throw new Error('Failed to cancel subscription');

      loadSubscriptions();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription');
    }
  };

  const resetForm = () => {
    setFormData({
      legal_entity_id: '',
      plan_name: '',
      plan_description: '',
      price: 0,
      currency: 'EUR',
      billing_cycle: 'monthly',
      trial_period_days: 0,
      auto_renew: true,
    });
  };

  const openEditDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setFormData({
      legal_entity_id: subscription.legal_entity_id,
      plan_name: subscription.plan_name,
      plan_description: subscription.plan_description || '',
      price: subscription.price,
      currency: subscription.currency,
      billing_cycle: subscription.billing_cycle,
      trial_period_days: 0,
      auto_renew: subscription.auto_renew,
    });
    setShowEditDialog(true);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return formatCurrencyUtil(amount, currency);
  };

  const formatSubscriptionDate = (dateString: string) => {
    return formatDateUtil(dateString);
  };

  const StatusCell = (props: any) => {
    const status = props.dataItem.status;
    const statusClass = `status-badge status-${status}`;
    return (
      <td>
        <span className={statusClass}>{status.toUpperCase()}</span>
      </td>
    );
  };

  const ActionsCell = (props: any) => {
    const subscription = props.dataItem;
    return (
      <td>
        <Button icon="edit" fillMode="flat" onClick={() => openEditDialog(subscription)}>
          Edit
        </Button>
        {subscription.status === 'active' && (
          <Button
            icon="cancel"
            fillMode="flat"
            onClick={() => handleCancel(subscription.subscription_id)}
          >
            Cancel
          </Button>
        )}
      </td>
    );
  };

  return (
    <div className="subscriptions-grid">
      <div className="grid-header">
        <h2>Subscriptions</h2>
        <Button icon="plus" themeColor="primary" onClick={() => setShowCreateDialog(true)}>
          New Subscription
        </Button>
      </div>

      <Grid data={subscriptions} style={{ height: '600px' }}>
        <GridToolbar>
          <span className="grid-toolbar-info">Total Subscriptions: {subscriptions.length}</span>
        </GridToolbar>

        <GridColumn field="org_id" title="Organization ID" width="150px" />
        <GridColumn field="legal_name" title="Company" width="200px" />
        <GridColumn field="plan_name" title="Plan" width="150px" />
        <GridColumn
          field="price"
          title="Price"
          width="120px"
          cell={(props) => <td>{formatCurrency(props.dataItem.price, props.dataItem.currency)}</td>}
        />
        <GridColumn field="billing_cycle" title="Billing Cycle" width="120px" />
        <GridColumn field="status" title="Status" width="100px" cell={StatusCell} />
        <GridColumn
          field="next_billing_date"
          title="Next Billing"
          width="130px"
          cell={(props) => (
            <td>
              {props.dataItem.next_billing_date
                ? formatSubscriptionDate(props.dataItem.next_billing_date)
                : 'N/A'}
            </td>
          )}
        />
        <GridColumn
          field="auto_renew"
          title="Auto Renew"
          width="100px"
          cell={(props) => <td>{props.dataItem.auto_renew ? 'Yes' : 'No'}</td>}
        />
        <GridColumn title="Actions" width="200px" cell={ActionsCell} />
      </Grid>

      {/* Create Dialog */}
      {showCreateDialog && (
        <Dialog title="Create Subscription" onClose={() => setShowCreateDialog(false)} width={500}>
          <div className="dialog-content">
            <div className="form-field">
              <label>Legal Entity ID</label>
              <Input
                value={formData.legal_entity_id}
                onChange={(e) => setFormData({ ...formData, legal_entity_id: e.value })}
                placeholder="Enter legal entity ID"
              />
            </div>

            <div className="form-field">
              <label>Plan Name</label>
              <Input
                value={formData.plan_name}
                onChange={(e) => setFormData({ ...formData, plan_name: e.value })}
                placeholder="e.g., Standard Plan"
              />
            </div>

            <div className="form-field">
              <label>Plan Description</label>
              <Input
                value={formData.plan_description}
                onChange={(e) => setFormData({ ...formData, plan_description: e.value })}
                placeholder="Optional description"
              />
            </div>

            <div className="form-field">
              <label>Price (EUR)</label>
              <Input
                type="number"
                value={formData.price.toString()}
                onChange={(e) =>
                  setFormData({ ...formData, price: Number.parseFloat(e.value) || 0 })
                }
              />
            </div>

            <div className="form-field">
              <label>Billing Cycle</label>
              <DropDownList
                data={billingCycleOptions}
                textField="text"
                dataItemKey="value"
                value={billingCycleOptions.find((o) => o.value === formData.billing_cycle)}
                onChange={(e) => setFormData({ ...formData, billing_cycle: e.value.value })}
              />
            </div>

            <div className="form-field">
              <label>Trial Period (days)</label>
              <Input
                type="number"
                value={formData.trial_period_days.toString()}
                onChange={(e) =>
                  setFormData({ ...formData, trial_period_days: Number.parseInt(e.value) || 0 })
                }
              />
            </div>

            <div className="form-field">
              <label>
                <input
                  type="checkbox"
                  checked={formData.auto_renew}
                  onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                />{' '}
                Auto Renew
              </label>
            </div>
          </div>

          <div className="dialog-actions">
            <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button themeColor="primary" onClick={handleCreate}>
              Create
            </Button>
          </div>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {showEditDialog && selectedSubscription && (
        <Dialog title="Edit Subscription" onClose={() => setShowEditDialog(false)} width={500}>
          <div className="dialog-content">
            <div className="form-field">
              <label>Plan Name</label>
              <Input
                value={formData.plan_name}
                onChange={(e) => setFormData({ ...formData, plan_name: e.value })}
              />
            </div>

            <div className="form-field">
              <label>Plan Description</label>
              <Input
                value={formData.plan_description}
                onChange={(e) => setFormData({ ...formData, plan_description: e.value })}
              />
            </div>

            <div className="form-field">
              <label>Price (EUR)</label>
              <Input
                type="number"
                value={formData.price.toString()}
                onChange={(e) =>
                  setFormData({ ...formData, price: Number.parseFloat(e.value) || 0 })
                }
              />
            </div>

            <div className="form-field">
              <label>Billing Cycle</label>
              <DropDownList
                data={billingCycleOptions}
                textField="text"
                dataItemKey="value"
                value={billingCycleOptions.find((o) => o.value === formData.billing_cycle)}
                onChange={(e) => setFormData({ ...formData, billing_cycle: e.value.value })}
              />
            </div>

            <div className="form-field">
              <label>
                <input
                  type="checkbox"
                  checked={formData.auto_renew}
                  onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                />{' '}
                Auto Renew
              </label>
            </div>
          </div>

          <div className="dialog-actions">
            <Button onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button themeColor="primary" onClick={handleUpdate}>
              Update
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default SubscriptionsGrid;
