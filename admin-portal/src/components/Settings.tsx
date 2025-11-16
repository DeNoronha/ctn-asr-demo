/**
 * Settings Component - Mantine Refactored
 * Application settings with external documentation links and translation management
 */

import {
  Anchor,
  Box,
  Button,
  Card,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, ExternalLink, FileText, Globe, HelpCircle } from './icons';
import { PageHeader } from './shared/PageHeader';

const Settings: React.FC = () => {
  const { t } = useTranslation();

  const handleLokaliseClick = () => {
    // Open Lokalise translation management platform
    window.open('https://app.lokalise.com', '_blank', 'noopener,noreferrer');
  };

  const externalLinks = [
    {
      title: t('settings.swagger', 'API Documentation (Swagger)'),
      description: t(
        'settings.swaggerDesc',
        'Interactive API documentation with endpoint testing capabilities'
      ),
      icon: FileText,
      url: 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/swagger/ui',
      color: '#85ea2d',
    },
    {
      title: t('settings.howto', 'How-To Guides'),
      description: t('settings.howtoDesc', 'Step-by-step guides for common tasks and workflows'),
      icon: HelpCircle,
      url: 'https://github.com/ctn-demo/ASR/wiki/How-To',
      color: '#0066b3',
    },
    {
      title: t('settings.wiki', 'CTN Wiki'),
      description: t(
        'settings.wikiDesc',
        'Comprehensive documentation, architecture, and best practices'
      ),
      icon: BookOpen,
      url: 'https://github.com/ctn-demo/ASR/wiki',
      color: '#ff8c00',
    },
  ];

  return (
    <Stack gap="xl">
      <PageHeader titleKey="settings" />

      {/* External Resources Section */}
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Stack gap="md">
          <Group gap="xs">
            <ThemeIcon size="lg" variant="light" color="blue">
              <ExternalLink size={20} />
            </ThemeIcon>
            <Title order={3}>{t('settings.externalResources', 'External Resources')}</Title>
          </Group>

          <Text size="sm" c="dimmed">
            {t(
              'settings.externalResourcesDesc',
              'Access documentation, guides, and API references'
            )}
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 1, md: 3 }} spacing="md">
            {externalLinks.map((link) => {
              const IconComponent = link.icon;
              return (
                <Anchor
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="never"
                  style={{ height: '100%' }}
                >
                  <Card
                    shadow="sm"
                    padding="lg"
                    radius="md"
                    withBorder
                    style={{
                      height: '100%',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                    styles={{
                      root: {
                        '&:hover': {
                          borderColor: link.color,
                          transform: 'translateY(-4px)',
                          boxShadow: `0 4px 12px ${link.color}40`,
                        },
                      },
                    }}
                  >
                    <Group gap="md" align="flex-start" wrap="nowrap">
                      <ThemeIcon
                        size="xl"
                        radius="md"
                        variant="light"
                        color={link.color}
                        style={{ borderColor: link.color, borderWidth: 2, borderStyle: 'solid' }}
                      >
                        <IconComponent size={24} />
                      </ThemeIcon>

                      <Stack gap="xs" style={{ flex: 1 }}>
                        <Group justify="space-between" wrap="nowrap">
                          <Text fw={600} size="sm">
                            {link.title}
                          </Text>
                          <ExternalLink size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
                        </Group>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {link.description}
                        </Text>
                      </Stack>
                    </Group>
                  </Card>
                </Anchor>
              );
            })}
          </SimpleGrid>
        </Stack>
      </Paper>

      {/* Translation Management Section */}
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Stack gap="md">
          <Group gap="xs">
            <ThemeIcon size="lg" variant="light" color="blue">
              <Globe size={20} />
            </ThemeIcon>
            <Title order={3}>{t('settings.translationManagement', 'Translation Management')}</Title>
          </Group>

          <Text size="sm" c="dimmed">
            {t(
              'settings.translationDesc',
              'Manage application translations and localization using Lokalise'
            )}
          </Text>

          <Card
            shadow="sm"
            padding="xl"
            radius="md"
            withBorder
            style={{
              background:
                'linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-cyan-0) 100%)',
            }}
          >
            <Group align="flex-start" gap="xl" wrap="nowrap">
              <Stack gap="md" style={{ flex: 1 }}>
                <Title order={4} c="blue.9">
                  {t('settings.lokalise', 'Lokalise Platform')}
                </Title>
                <Text size="sm" c="blue.7">
                  {t(
                    'settings.lokaliseInfo',
                    'Edit translations for Dutch (NL), English (EN), and German (DE). Changes sync automatically to the application.'
                  )}
                </Text>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                  <List size="sm" spacing="xs" c="blue.7" icon={<Text fw={700}>✓</Text>}>
                    <List.Item>{t('settings.feature1', 'Real-time translation updates')}</List.Item>
                    <List.Item>
                      {t('settings.feature2', 'Multi-language support (NL, EN, DE)')}
                    </List.Item>
                    <List.Item>
                      {t('settings.feature3', 'Context-aware translation editor')}
                    </List.Item>
                    <List.Item>{t('settings.feature4', 'Translation quality checks')}</List.Item>
                  </List>
                </SimpleGrid>
              </Stack>

              <Box style={{ flexShrink: 0 }}>
                <Button
                  color="blue"
                  size="lg"
                  onClick={handleLokaliseClick}
                  leftSection={<Globe size={18} />}
                >
                  {t('settings.openLokalise', 'Open Lokalise')}
                </Button>
              </Box>
            </Group>
          </Card>
        </Stack>
      </Paper>
    </Stack>
  );
};

export default Settings;
