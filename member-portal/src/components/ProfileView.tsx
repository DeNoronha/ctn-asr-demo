import { Button, Modal } from '@mantine/core';
import type React from 'react';
import { useState } from 'react';
import { apiClient } from '../services/apiClient';
import type { ComponentProps } from '../types';

export const ProfileView: React.FC<ComponentProps> = ({
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
      await apiClient.member.updateProfile(formData);
      onNotification('Profile updated successfully', 'success');
      setEditMode(false);
      onDataChange();
    } catch (_error) {
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
          <Button color="blue" onClick={() => setEditMode(true)}>
            Edit Profile
          </Button>
        )}
      </div>

      {!editMode ? (
        <>
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
              <div className="info-item">
                <strong>Member Since:</strong>
                <span>{new Date(memberData.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {memberData.registryIdentifiers && memberData.registryIdentifiers.length > 0 && (
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <div className="card-header">
                <h3>Registry Identifiers</h3>
              </div>
              <div className="registry-identifiers">
                {memberData.registryIdentifiers.map((identifier) => (
                  <div
                    key={`${identifier.identifierType}-${identifier.identifierValue}`}
                    className="registry-item"
                  >
                    <div className="registry-header">
                      <div className="registry-type-badge">
                        {identifier.identifierType}
                        {identifier.countryCode && (
                          <span className="country-flag"> {identifier.countryCode}</span>
                        )}
                      </div>
                      {identifier.validationStatus && (
                        <span
                          className={`status-badge status-${identifier.validationStatus.toLowerCase()}`}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {identifier.validationStatus}
                        </span>
                      )}
                    </div>
                    <div className="registry-value">{identifier.identifierValue}</div>
                    {identifier.registryName && (
                      <div className="registry-name">{identifier.registryName}</div>
                    )}
                    {identifier.registryUrl && (
                      <div className="registry-link">
                        <a
                          href={identifier.registryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="k-link"
                        >
                          View in Registry
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      <Modal opened={editMode} onClose={() => setEditMode(false)} title="Edit Profile" size="lg">
        <form onSubmit={handleSubmit} className="simple-form">
          <div className="form-field">
            <label htmlFor="domain">Domain</label>
            <input
              type="text"
              id="domain"
              name="domain"
              value={formData.domain}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          <div className="form-field">
            <label htmlFor="address_line1">Address Line 1</label>
            <input
              type="text"
              id="address_line1"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          <div className="form-field">
            <label htmlFor="address_line2">Address Line 2</label>
            <input
              type="text"
              id="address_line2"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="postal_code">Postal Code</label>
              <input
                type="text"
                id="postal_code"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="province">Province/State</label>
            <input
              type="text"
              id="province"
              name="province"
              value={formData.province}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          <div className="form-field">
            <label htmlFor="country_code">Country Code (2 letters)</label>
            <input
              type="text"
              id="country_code"
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
            <Button type="submit" color="blue" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
