/**
 * PageHeader Component
 * Consistent page header using Mantine theme for all admin portal pages
 * Uses global theme settings - no custom styles
 */

import { Title } from '@mantine/core';
import type React from 'react';
import { useTranslation } from 'react-i18next';

interface PageHeaderProps {
  /** Translation key for the page title (without "pageHeaders." prefix) */
  titleKey: string;
}

/**
 * PageHeader - Renders a consistent h1 title for all pages
 * Uses Mantine's Title component with order={1} for semantic h1
 * All styling comes from theme.headings configuration in App.tsx
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ titleKey }) => {
  const { t } = useTranslation();

  return (
    <Title order={1} mb="xl">
      {t(`pageHeaders.${titleKey}`)}
    </Title>
  );
};
