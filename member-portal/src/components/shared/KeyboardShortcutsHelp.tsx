/**
 * Keyboard Shortcuts Help Modal (Member Portal)
 * Displays all available keyboard shortcuts organized by category
 * Accessible with WCAG 2.1 AA compliance
 */

import { Badge, Group, Kbd, Modal, Stack, Table, Text, Title } from '@mantine/core';
import { IconKeyboard } from '@tabler/icons-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { getShortcutsList } from '../../hooks/useGlobalShortcuts';

interface KeyboardShortcutsHelpProps {
  opened: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  opened,
  onClose,
}) => {
  const { t } = useTranslation();
  const shortcuts = getShortcutsList();

  // Group shortcuts by category
  const navigationShortcuts = shortcuts.filter((s) => s.category === 'navigation');
  const actionShortcuts = shortcuts.filter((s) => s.category === 'actions');
  const searchShortcuts = shortcuts.filter((s) => s.category === 'search');
  const generalShortcuts = shortcuts.filter((s) => s.category === 'general');

  const renderShortcutKey = (keyCombo: string) => {
    // Split key combinations and render each key separately
    const keys = keyCombo.split('+').map((k) => k.trim());

    return (
      <Group gap="xs">
        {keys.map((key, index) => (
          <React.Fragment key={`${key}-${index}`}>
            <Kbd>{key}</Kbd>
            {index < keys.length - 1 && <Text size="sm">+</Text>}
          </React.Fragment>
        ))}
      </Group>
    );
  };

  const renderShortcutTable = (
    shortcuts: Array<{ key: string; description: string; category: string }>,
    categoryTitle: string
  ) => {
    if (shortcuts.length === 0) return null;

    return (
      <Stack gap="xs">
        <Group gap="xs">
          <Title order={5}>{categoryTitle}</Title>
          <Badge size="sm" variant="light" color="blue">
            {shortcuts.length}
          </Badge>
        </Group>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('shortcuts.action', 'Action')}</Table.Th>
              <Table.Th>{t('shortcuts.shortcut', 'Shortcut')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {shortcuts.map((shortcut, index) => (
              <Table.Tr key={`${shortcut.key}-${index}`}>
                <Table.Td>
                  <Text size="sm">{t(shortcut.description)}</Text>
                </Table.Td>
                <Table.Td>{renderShortcutKey(shortcut.key)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <IconKeyboard size={24} />
          <Text fw={600} size="lg">
            {t('shortcuts.title', 'Keyboard Shortcuts')}
          </Text>
        </Group>
      }
      size="lg"
      centered
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
    >
      <Stack gap="xl">
        <Text size="sm" c="dimmed">
          {t(
            'shortcuts.description',
            'Use these keyboard shortcuts to navigate faster and perform actions more efficiently.'
          )}
        </Text>

        {renderShortcutTable(navigationShortcuts, t('shortcuts.categoryNavigation', 'Navigation'))}
        {renderShortcutTable(searchShortcuts, t('shortcuts.categorySearch', 'Search & Filter'))}
        {renderShortcutTable(actionShortcuts, t('shortcuts.categoryActions', 'Actions'))}
        {renderShortcutTable(generalShortcuts, t('shortcuts.categoryGeneral', 'General'))}

        <Text size="xs" c="dimmed" fs="italic">
          {t(
            'shortcuts.note',
            'Note: Shortcuts may vary based on your operating system. Cmd is used on macOS, Ctrl on Windows and Linux.'
          )}
        </Text>
      </Stack>
    </Modal>
  );
};
