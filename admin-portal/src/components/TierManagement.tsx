/**
 * Tier Management Component - Admin view for managing member authentication tiers
 */

import { Button, Select } from '@mantine/core';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { apiV2 } from '../services/apiV2';
import { formatDate, formatDateTime } from '../utils/dateFormat';
import { LoadingState } from './shared/LoadingState';

// Form label components
const Label: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  <label id={id} className="form-label">
    {children}
  </label>
);
const Hint: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  <div
    id={id}
    className="form-hint"
    style={{ color: '#656565', fontSize: '0.875rem', marginTop: '0.25rem' }}
  >
    {children}
  </div>
);

interface TierManagementProps {
  legalEntityId: string;
}

interface TierInfo {
  tier: number;
  method: string;
  verifiedAt?: string;
  reverificationDue?: string;
  eherkenningLevel?: string;
}

interface TierOption {
  tier: number;
  name: string;
  access: string;
  method: string;
}

const TIER_OPTIONS: TierOption[] = [
  {
    tier: 3,
    name: 'Tier 3 - Email + KvK Verification',
    access: 'Public data only',
    method: 'EmailVerification',
  },
  {
    tier: 2,
    name: 'Tier 2 - DNS Verification',
    access: 'Sensitive data read + webhooks',
    method: 'DNS',
  },
  {
    tier: 1,
    name: 'Tier 1 - eHerkenning',
    access: 'Full access (read, write, publish)',
    method: 'eHerkenning',
  },
];

export const TierManagement: React.FC<TierManagementProps> = ({ legalEntityId }) => {
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const notification = useNotification();

  useEffect(() => {
    loadTierInfo();
  }, [legalEntityId]);

  const loadTierInfo = async () => {
    setLoading(true);
    try {
      const response = await apiV2.getTierInfo(legalEntityId);
      setTierInfo(response);

      // Set selected tier based on current tier
      const currentTier = TIER_OPTIONS.find((t) => t.tier === response.tier);
      if (currentTier) {
        setSelectedTier(currentTier);
      }
    } catch (error) {
      console.error('Error loading tier info:', error);
      notification.showError('Failed to load tier information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTier = async () => {
    if (!selectedTier) {
      notification.showError('Please select a tier');
      return;
    }

    setUpdating(true);
    try {
      await apiV2.updateTier(legalEntityId, {
        tier: selectedTier.tier,
        method: selectedTier.method,
      });

      notification.showSuccess('Tier updated successfully');
      await loadTierInfo(); // Reload to get updated info
    } catch (error) {
      console.error('Error updating tier:', error);
      notification.showError('Failed to update tier');
    } finally {
      setUpdating(false);
    }
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1:
        return '#4CAF50'; // Green
      case 2:
        return '#2196F3'; // Blue
      case 3:
        return '#FF9800'; // Orange
      default:
        return '#9E9E9E'; // Grey
    }
  };

  return (
    <LoadingState loading={loading} minHeight={400}>
      <div className="tier-management" style={{ padding: '24px' }}>
        <h3>Authentication Tier Management</h3>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Manage the member's authentication tier to control their data access level.
        </p>

        {tierInfo && (
          <div
            className="current-tier-info"
            style={{
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <h4 style={{ marginTop: 0 }}>Current Tier</h4>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}
            >
              <div
                style={{
                  background: getTierColor(tierInfo.tier),
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontWeight: 600,
                }}
              >
                Tier {tierInfo.tier}
              </div>
              <span style={{ color: '#666' }}>{tierInfo.method}</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginTop: '16px',
              }}
            >
              {tierInfo.verifiedAt && (
                <div>
                  <strong>Verified:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#666' }}>
                    {formatDateTime(tierInfo.verifiedAt)}
                  </p>
                </div>
              )}
              {tierInfo.reverificationDue && (
                <div>
                  <strong>Re-verification Due:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#ff9800' }}>
                    {formatDate(tierInfo.reverificationDue)}
                  </p>
                </div>
              )}
              {tierInfo.eherkenningLevel && (
                <div>
                  <strong>eHerkenning Level:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#666' }}>{tierInfo.eherkenningLevel}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="tier-selector" style={{ marginTop: '24px' }}>
          <div className="form-field">
            <Label>Select New Tier</Label>
            <Select
              data={TIER_OPTIONS.map((t) => ({ value: t.tier.toString(), label: t.name }))}
              value={selectedTier?.tier.toString() || null}
              onChange={(value) => {
                const tier = TIER_OPTIONS.find((t) => t.tier.toString() === value);
                setSelectedTier(tier || null);
              }}
            />
            <Hint>
              {selectedTier
                ? `${selectedTier.access} - Method: ${selectedTier.method}`
                : 'Select a tier to update'}
            </Hint>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <Button
              onClick={handleUpdateTier}
              color="blue"
              disabled={
                updating || !selectedTier || !!(tierInfo && selectedTier.tier === tierInfo.tier)
              }
            >
              {updating ? 'Updating...' : 'Update Tier'}
            </Button>
            <Button onClick={loadTierInfo} disabled={updating} variant="outline">
              Refresh
            </Button>
          </div>
        </div>

        <div
          className="tier-info-panel"
          style={{
            marginTop: '32px',
            background: '#fff3cd',
            border: '1px solid #ffecb5',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <h4 style={{ marginTop: 0, color: '#856404' }}>Tier Information</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404' }}>
            <li>
              <strong>Tier 1 (eHerkenning):</strong> Full access to read, write, and publish
              sensitive data. Requires eHerkenning EH3/EH4 authentication.
            </li>
            <li>
              <strong>Tier 2 (DNS Verification):</strong> Access to sensitive data read + webhook
              configuration. Requires DNS TXT record verification. Re-verification every 90 days.
            </li>
            <li>
              <strong>Tier 3 (Email + KvK):</strong> Public data access only. Default tier for
              email-verified members with KvK document upload.
            </li>
          </ul>
        </div>
      </div>
    </LoadingState>
  );
};
