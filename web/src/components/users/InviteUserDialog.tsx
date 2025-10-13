/**
 * Invite User Dialog
 * System Admins can invite new users (Association Admins or Members)
 */

import { Button } from '@progress/kendo-react-buttons';
import { Dialog } from '@progress/kendo-react-dialogs';
import { UserPlus } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { UserRole } from '../../auth/authConfig';
import './UserManagement.css';

interface InviteUserDialogProps {
  onClose: () => void;
  onInvite: (userData: { email: string; name: string; role: UserRole }) => void;
}

const InviteUserDialog: React.FC<InviteUserDialogProps> = ({ onClose, onInvite }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.ASSOCIATION_ADMIN);
  const [errors, setErrors] = useState<{ email?: string; name?: string }>({});

  const roleDescriptions = {
    [UserRole.SYSTEM_ADMIN]: 'Full access. Can create and manage Association Admins.',
    [UserRole.ASSOCIATION_ADMIN]: 'Can manage association data via Admin Portal.',
    [UserRole.MEMBER]: 'Limited access via Member Portal for self-service.',
  };

  const validateForm = () => {
    const newErrors: { email?: string; name?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onInvite({ email, name, role });
    }
  };

  return (
    <Dialog title="Invite New User" onClose={onClose} className="user-dialog">
      <div className="dialog-content">
        <div className="form-group">
          <label>Email Address *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
          <p className="help-text">User will receive an invitation email</p>
        </div>

        <div className="form-group">
          <label>Full Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label>Role *</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value={UserRole.ASSOCIATION_ADMIN}>Association Admin</option>
            <option value={UserRole.MEMBER}>Member</option>
            <option value={UserRole.SYSTEM_ADMIN}>System Admin</option>
          </select>
          <div className="role-description">{roleDescriptions[role]}</div>
        </div>

        <div className="dialog-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button themeColor="primary" onClick={handleSubmit}>
            <UserPlus size={16} style={{ marginRight: 8 }} />
            Send Invitation
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default InviteUserDialog;
