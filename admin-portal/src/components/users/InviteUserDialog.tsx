/**
 * Invite User Dialog
 * System Admins can invite new users (Association Admins or Members)
 */

import { Button, Group, Modal, Select, Text, TextInput } from '@mantine/core';
import type React from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserRole } from '../../auth/authConfig';
import { UserPlus } from '../icons';
import './UserManagement.css';

interface InviteUserDialogProps {
  onClose: () => void;
  onInvite: (userData: { email: string; name: string; role: UserRole }) => void;
}

const InviteUserDialog: React.FC<InviteUserDialogProps> = ({ onClose, onInvite }) => {
  const { t } = useTranslation();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.ASSOCIATION_ADMIN);
  const [errors, setErrors] = useState<{ email?: string; name?: string }>({});

  const roleDescriptions = {
    [UserRole.SYSTEM_ADMIN]: t('userManagement.roleDescriptions.systemAdmin'),
    [UserRole.ASSOCIATION_ADMIN]: t('userManagement.roleDescriptions.associationAdmin'),
    [UserRole.MEMBER]: t('userManagement.roleDescriptions.member'),
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
    <Modal opened onClose={onClose} title={t('userManagement.inviteUserTitle')} size="md" trapFocus>
      <TextInput
        ref={emailInputRef}
        label={t('userManagement.emailLabel')}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('userManagement.emailPlaceholder')}
        error={errors.email}
        description={t('userManagement.emailDescription')}
        required
        mb="md"
        data-autofocus
      />

      <TextInput
        label={t('userManagement.nameLabel')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('userManagement.namePlaceholder')}
        error={errors.name}
        required
        mb="md"
      />

      <Select
        label={t('userManagement.roleLabel')}
        value={role}
        onChange={(value) => setRole((value as UserRole) || UserRole.ASSOCIATION_ADMIN)}
        data={[
          { value: UserRole.ASSOCIATION_ADMIN, label: t('userManagement.roles.associationAdmin') },
          { value: UserRole.MEMBER, label: t('userManagement.roles.member') },
          { value: UserRole.SYSTEM_ADMIN, label: t('userManagement.roles.systemAdmin') },
        ]}
        required
        mb="xs"
      />
      <Text size="sm" c="dimmed" mb="xl">
        {roleDescriptions[role]}
      </Text>

      <Group justify="flex-end">
        <Button onClick={onClose} variant="default">
          {t('common.cancel')}
        </Button>
        <Button color="blue" onClick={handleSubmit} leftSection={<UserPlus size={16} />}>
          {t('userManagement.sendInvitation')}
        </Button>
      </Group>
    </Modal>
  );
};

export default InviteUserDialog;
