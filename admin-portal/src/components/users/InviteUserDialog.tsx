/**
 * Invite User Dialog
 * System Admins can invite new users (Association Admins or Members)
 */

import { Button, Group, Modal, Select, Text, TextInput } from '@mantine/core';
import type React from 'react';
import { useRef, useState } from 'react';
import { UserRole } from '../../auth/authConfig';
import { UserPlus } from '../icons';
import './UserManagement.css';

interface InviteUserDialogProps {
  onClose: () => void;
  onInvite: (userData: { email: string; name: string; role: UserRole }) => void;
}

const InviteUserDialog: React.FC<InviteUserDialogProps> = ({ onClose, onInvite }) => {
  const emailInputRef = useRef<HTMLInputElement>(null);
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
    <Modal opened onClose={onClose} title="Invite New User" size="md" trapFocus>
      <TextInput
        ref={emailInputRef}
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="user@example.com"
        error={errors.email}
        description="User will receive an invitation email"
        required
        mb="md"
        data-autofocus
      />

      <TextInput
        label="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="John Smith"
        error={errors.name}
        required
        mb="md"
      />

      <Select
        label="Role"
        value={role}
        onChange={(value) => setRole((value as UserRole) || UserRole.ASSOCIATION_ADMIN)}
        data={[
          { value: UserRole.ASSOCIATION_ADMIN, label: 'Association Admin' },
          { value: UserRole.MEMBER, label: 'Member' },
          { value: UserRole.SYSTEM_ADMIN, label: 'System Admin' },
        ]}
        required
        mb="xs"
      />
      <Text size="sm" c="dimmed" mb="xl">
        {roleDescriptions[role]}
      </Text>

      <Group justify="flex-end">
        <Button onClick={onClose} variant="default">
          Cancel
        </Button>
        <Button color="blue" onClick={handleSubmit} leftSection={<UserPlus size={16} />}>
          Send Invitation
        </Button>
      </Group>
    </Modal>
  );
};

export default InviteUserDialog;
