/**
 * Invite User Dialog
 * System Admins can invite new users (Association Admins or Members)
 */

import { Button, Group, Modal, Select, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import type React from 'react';
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

  const form = useForm({
    initialValues: {
      email: '',
      name: '',
      role: UserRole.ASSOCIATION_ADMIN,
    },
    validate: {
      email: (value) => {
        if (!value.trim())
          return t('userManagement.validation.emailRequired') || 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return t('userManagement.validation.emailInvalid') || 'Invalid email format';
        }
        return null;
      },
      name: (value) => {
        if (!value.trim()) return t('userManagement.validation.nameRequired') || 'Name is required';
        return null;
      },
    },
    validateInputOnBlur: true, // Real-time validation on blur
  });

  const roleDescriptions = {
    [UserRole.SYSTEM_ADMIN]: t('userManagement.roleDescriptions.systemAdmin'),
    [UserRole.ASSOCIATION_ADMIN]: t('userManagement.roleDescriptions.associationAdmin'),
    [UserRole.MEMBER]: t('userManagement.roleDescriptions.member'),
  };

  const handleSubmit = form.onSubmit((values) => {
    onInvite(values);
  });

  return (
    <Modal opened onClose={onClose} title={t('userManagement.inviteUserTitle')} size="md" trapFocus>
      <form onSubmit={handleSubmit}>
        <TextInput
          {...form.getInputProps('email')}
          label={t('userManagement.emailLabel')}
          type="email"
          placeholder={t('userManagement.emailPlaceholder')}
          description={t('userManagement.emailDescription')}
          required
          mb="md"
          data-autofocus
        />

        <TextInput
          {...form.getInputProps('name')}
          label={t('userManagement.nameLabel')}
          placeholder={t('userManagement.namePlaceholder')}
          required
          mb="md"
        />

        <Select
          {...form.getInputProps('role')}
          label={t('userManagement.roleLabel')}
          data={[
            {
              value: UserRole.ASSOCIATION_ADMIN,
              label: t('userManagement.roles.associationAdmin'),
            },
            { value: UserRole.MEMBER, label: t('userManagement.roles.member') },
            { value: UserRole.SYSTEM_ADMIN, label: t('userManagement.roles.systemAdmin') },
          ]}
          required
          mb="xs"
        />
        <Text size="sm" c="dimmed" mb="xl">
          {roleDescriptions[form.values.role]}
        </Text>

        <Group justify="flex-end">
          <Button onClick={onClose} variant="default" type="button">
            {t('common.cancel')}
          </Button>
          <Button type="submit" color="blue" leftSection={<UserPlus size={16} />}>
            {t('userManagement.sendInvitation')}
          </Button>
        </Group>
      </form>
    </Modal>
  );
};

export default InviteUserDialog;
