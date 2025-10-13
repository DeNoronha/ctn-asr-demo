/**
 * Edit User Dialog
 * System Admins can edit user roles and status
 */

import { Button } from '@progress/kendo-react-buttons';
import { Dialog } from '@progress/kendo-react-dialogs';
import { Save } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { UserRole } from '../../auth/authConfig';
import './UserManagement.css';

interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  primaryRole: UserRole;
  enabled: boolean;
}

interface EditUserDialogProps {
  user: User;
  onClose: () => void;
  onUpdate: (userId: string, updates: Partial<User>) => void;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({ user, onClose, onUpdate }) => {
  const [role, setRole] = useState<UserRole>(user.primaryRole);
  const [enabled, setEnabled] = useState(user.enabled);

  const roleDescriptions = {
    [UserRole.SYSTEM_ADMIN]: 'Full access. Can create and manage Association Admins.',
    [UserRole.ASSOCIATION_ADMIN]: 'Can manage association data via Admin Portal.',
    [UserRole.MEMBER]: 'Limited access via Member Portal for self-service.',
  };

  const handleSubmit = () => {
    onUpdate(user.id, {
      primaryRole: role,
      roles: [role],
      enabled,
    });
  };

  return (
    <Dialog title={`Edit User: ${user.name}`} onClose={onClose} className="user-dialog">
      <div className="dialog-content">
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={user.email}
            disabled
            style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }}
          />
          <p className="help-text">Email cannot be changed</p>
        </div>

        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            value={user.name}
            disabled
            style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }}
          />
          <p className="help-text">Name is managed in Azure Entra ID</p>
        </div>

        <div className="form-group">
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value={UserRole.SYSTEM_ADMIN}>System Admin</option>
            <option value={UserRole.ASSOCIATION_ADMIN}>Association Admin</option>
            <option value={UserRole.MEMBER}>Member</option>
          </select>
          <div className="role-description">{roleDescriptions[role]}</div>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={{ marginRight: '8px', width: 'auto' }}
            />
            Account Enabled
          </label>
          <p className="help-text">Disabled users cannot log in</p>
        </div>

        <div className="dialog-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button themeColor="primary" onClick={handleSubmit}>
            <Save size={16} style={{ marginRight: 8 }} />
            Save Changes
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default EditUserDialog;
