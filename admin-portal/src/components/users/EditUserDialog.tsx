/**
 * Edit User Dialog
 * System Admins can edit user roles and status
 */

import { Button, Checkbox, Group, Modal, Select, Text, TextInput } from '@mantine/core';
import type React from 'react';
import { useRef, useState } from 'react';
import { UserRole } from '../../auth/authConfig';
import { Save } from '../icons';
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
  const roleSelectRef = useRef<HTMLInputElement>(null);
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
    <Modal opened onClose={onClose} title={`Edit User: ${user.name}`} size="md" trapFocus>
      <TextInput
        label="Email"
        type="email"
        value={user.email}
        disabled
        description="Email cannot be changed"
        mb="md"
      />

      <TextInput
        label="Name"
        value={user.name}
        disabled
        description="Name is managed in Azure Entra ID"
        mb="md"
      />

      <Select
        ref={roleSelectRef}
        label="Role"
        value={role}
        onChange={(value) => setRole((value as UserRole) || UserRole.ASSOCIATION_ADMIN)}
        data={[
          { value: UserRole.SYSTEM_ADMIN, label: 'System Admin' },
          { value: UserRole.ASSOCIATION_ADMIN, label: 'Association Admin' },
          { value: UserRole.MEMBER, label: 'Member' },
        ]}
        mb="xs"
        data-autofocus
      />
      <Text size="sm" c="dimmed" mb="md">
        {roleDescriptions[role]}
      </Text>

      <Checkbox
        label="Account Enabled"
        checked={enabled}
        onChange={(e) => setEnabled(e.currentTarget.checked)}
        description="Disabled users cannot log in"
        mb="xl"
      />

      <Group justify="flex-end">
        <Button onClick={onClose} variant="default">
          Cancel
        </Button>
        <Button color="blue" onClick={handleSubmit} leftSection={<Save size={16} />}>
          Save Changes
        </Button>
      </Group>
    </Modal>
  );
};

export default EditUserDialog;
