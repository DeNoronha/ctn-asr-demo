/**
 * Edit User Dialog
 * System Admins can edit user roles and status
 */

import { Button, Checkbox, Group, Modal, Select, Text, TextInput } from '@mantine/core';
import type React from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const roleSelectRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<UserRole>(user.primaryRole);
  const [enabled, setEnabled] = useState(user.enabled);

  const roleDescriptions = {
    [UserRole.SYSTEM_ADMIN]: t('userManagement.roleDescriptions.systemAdmin'),
    [UserRole.ASSOCIATION_ADMIN]: t('userManagement.roleDescriptions.associationAdmin'),
    [UserRole.MEMBER]: t('userManagement.roleDescriptions.member'),
  };

  const handleSubmit = () => {
    onUpdate(user.id, {
      primaryRole: role,
      roles: [role],
      enabled,
    });
  };

  return (
    <Modal opened onClose={onClose} title={t('userManagement.editUserTitle', { userName: user.name })} size="md" trapFocus>
      <TextInput
        label={t('userManagement.emailLabel')}
        type="email"
        value={user.email}
        disabled
        description={t('userManagement.emailDisabledDescription')}
        mb="md"
      />

      <TextInput
        label={t('userManagement.nameLabel')}
        value={user.name}
        disabled
        description={t('userManagement.nameDisabledDescription')}
        mb="md"
      />

      <Select
        ref={roleSelectRef}
        label={t('userManagement.roleLabel')}
        value={role}
        onChange={(value) => setRole((value as UserRole) || UserRole.ASSOCIATION_ADMIN)}
        data={[
          { value: UserRole.SYSTEM_ADMIN, label: t('userManagement.roles.systemAdmin') },
          { value: UserRole.ASSOCIATION_ADMIN, label: t('userManagement.roles.associationAdmin') },
          { value: UserRole.MEMBER, label: t('userManagement.roles.member') },
        ]}
        mb="xs"
        data-autofocus
      />
      <Text size="sm" c="dimmed" mb="md">
        {roleDescriptions[role]}
      </Text>

      <Checkbox
        label={t('userManagement.accountEnabledLabel')}
        checked={enabled}
        onChange={(e) => setEnabled(e.currentTarget.checked)}
        description={t('userManagement.accountEnabledDescription')}
        mb="xl"
      />

      <Group justify="flex-end">
        <Button onClick={onClose} variant="default">
          {t('common.cancel')}
        </Button>
        <Button color="blue" onClick={handleSubmit} leftSection={<Save size={16} />}>
          {t('userManagement.saveChanges')}
        </Button>
      </Group>
    </Modal>
  );
};

export default EditUserDialog;
