/**
 * Reusable Confirmation Dialog Component
 * WCAG 2.1 AA compliant with keyboard navigation and focus management
 */

import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from '../icons';

export interface ConfirmDialogProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
}

/**
 * ConfirmDialog - A reusable confirmation dialog with loading states
 *
 * Features:
 * - Customizable title, message, and button labels
 * - Three variants: danger (red), warning (yellow), info (blue)
 * - Loading state during async operations
 * - Keyboard support (Enter = confirm, Esc = cancel)
 * - Focus trap for accessibility
 * - WCAG 2.1 AA compliant
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  icon,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // Error is handled by the parent component
      console.error('Confirmation action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      handleConfirm();
    }
  };

  // Color mapping for variants
  const variantColors = {
    danger: 'red',
    warning: 'yellow',
    info: 'blue',
  };

  const color = variantColors[variant];

  // Default icon if none provided
  const displayIcon = icon || <AlertTriangle size={24} />;

  return (
    <Modal
      opened={opened}
      onClose={loading ? () => {} : onClose}
      title={title}
      size="md"
      trapFocus
      closeOnEscape={!loading}
      closeOnClickOutside={!loading}
      withCloseButton={!loading}
      onKeyDown={handleKeyDown}
    >
      <Stack gap="md">
        {/* Icon and Message */}
        <Group gap="md" align="flex-start">
          <div style={{ color: `var(--mantine-color-${color}-6)`, marginTop: 2 }}>
            {displayIcon}
          </div>
          <Text size="sm" style={{ flex: 1 }}>
            {message}
          </Text>
        </Group>

        {/* Action Buttons */}
        <Group justify="flex-end" mt="md">
          <Button
            variant="subtle"
            onClick={onClose}
            disabled={loading}
            aria-label={cancelLabel || t('common.cancel')}
          >
            {cancelLabel || t('common.cancel')}
          </Button>
          <Button
            color={color}
            onClick={handleConfirm}
            loading={loading}
            aria-label={confirmLabel || t('common.confirm')}
            data-autofocus
          >
            {confirmLabel || t('common.confirm')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
