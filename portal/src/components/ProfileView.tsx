import { Button } from '@progress/kendo-react-buttons';
import { Dialog } from '@progress/kendo-react-dialogs';
import type React from 'react';
import { useState } from 'react';
import type { ComponentProps } from '../types';

export const ProfileView: React.FC<ComponentProps> = ({
  apiBaseUrl,
  getAccessToken,
  memberData,
  onNotification,
  onDataChange,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    domain: memberData.domain,
    address_line1: '',
    address_line2: '',
    postal_code: '',
    city: '',
    province: '',
    country_code: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/member/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      onNotification('Profile updated successfully', 'success');
      setEditMode(false);
      onDataChange();
    } catch (error) {
      onNotification('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="profile-view">
      <div className="page-header">
        <div>
          <h2>Organization Profile</h2>
          <p className="page-subtitle">Manage your organization's information</p>
        </div>
        {!editMode && (
          <Button themeColor="primary" onClick={() => setEditMode(true)}>
            Edit Profile
          </Button>
        )}
      </div>

      {!editMode ? (
        <div className="card">
          <div className="card-header">
            <h3>Organization Details</h3>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <strong>Legal Name:</strong>
              <span>{memberData.legalName}</span>
            </div>
            <div className="info-item">
              <strong>Organization ID:</strong>
              <span>{memberData.organizationId}</span>
            </div>
            <div className="info-item">
              <strong>Domain:</strong>
              <span>{memberData.domain}</span>
            </div>
            <div className="info-item">
              <strong>Status:</strong>
              <span className={`status-badge status-${memberData.status.toLowerCase()}`}>
                {memberData.status}
              </span>
            </div>
            <div className="info-item">
              <strong>Membership Level:</strong>
              <span>{memberData.membershipLevel || 'Basic'}</span>
            </div>
            {memberData.lei && (
              <div className="info-item">
                <strong>LEI:</strong>
                <span>{memberData.lei}</span>
              </div>
            )}
            {memberData.kvk && (
              <div className="info-item">
                <strong>KVK:</strong>
                <span>{memberData.kvk}</span>
              </div>
            )}
            <div className="info-item">
              <strong>Member Since:</strong>
              <span>{new Date(memberData.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      ) : (
        <Dialog title="Edit Profile" onClose={() => setEditMode(false)} width={600}>
          <form onSubmit={handleSubmit} className="simple-form">
            <div className="form-field">
              <label>Domain</label>
              <input
                type="text"
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label>Address Line 1</label>
              <input
                type="text"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label>Address Line 2</label>
              <input
                type="text"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Postal Code</label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-field">
              <label>Province/State</label>
              <input
                type="text"
                name="province"
                value={formData.province}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label>Country Code (2 letters)</label>
              <input
                type="text"
                name="country_code"
                value={formData.country_code}
                onChange={handleChange}
                maxLength={2}
                className="form-input"
              />
            </div>
            <div className="form-actions">
              <Button type="button" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
              <Button type="submit" themeColor="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
};
