/**
 * Settings Component
 * Application settings with external documentation links and translation management
 */

import { Button } from '@progress/kendo-react-buttons';
import { BookOpen, ExternalLink, FileText, Globe, HelpCircle } from 'lucide-react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import './Settings.css';

const Settings: React.FC = () => {
  const { t } = useTranslation();

  const handleLokaliseClick = () => {
    // Open Lokalise translation management platform
    window.open('https://app.lokalise.com', '_blank', 'noopener,noreferrer');
  };

  const externalLinks = [
    {
      title: t('settings.swagger', 'API Documentation (Swagger)'),
      description: t('settings.swaggerDesc', 'Interactive API documentation with endpoint testing capabilities'),
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
      description: t('settings.wikiDesc', 'Comprehensive documentation, architecture, and best practices'),
      icon: BookOpen,
      url: 'https://github.com/ctn-demo/ASR/wiki',
      color: '#ff8c00',
    },
  ];

  return (
    <div className="settings-container">
      <div className="view-header">
        <h2>{t('settings.title', 'Settings')}</h2>
      </div>

      <div className="settings-content">
        {/* External Resources Section */}
        <section className="settings-section">
          <h3 className="section-title">
            <ExternalLink size={20} />
            {t('settings.externalResources', 'External Resources')}
          </h3>
          <p className="section-description">
            {t('settings.externalResourcesDesc', 'Access documentation, guides, and API references')}
          </p>

          <div className="resources-grid">
            {externalLinks.map((link, index) => {
              const IconComponent = link.icon;
              return (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resource-card"
                  style={{ '--card-color': link.color } as React.CSSProperties}
                >
                  <div className="resource-icon">
                    <IconComponent size={24} />
                  </div>
                  <div className="resource-content">
                    <h4 className="resource-title">{link.title}</h4>
                    <p className="resource-description">{link.description}</p>
                  </div>
                  <div className="resource-arrow">
                    <ExternalLink size={16} />
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* Translation Management Section */}
        <section className="settings-section">
          <h3 className="section-title">
            <Globe size={20} />
            {t('settings.translationManagement', 'Translation Management')}
          </h3>
          <p className="section-description">
            {t(
              'settings.translationDesc',
              'Manage application translations and localization using Lokalise'
            )}
          </p>

          <div className="translation-card">
            <div className="translation-info">
              <h4>{t('settings.lokalise', 'Lokalise Platform')}</h4>
              <p>
                {t(
                  'settings.lokaliseInfo',
                  'Edit translations for Dutch (NL), English (EN), and German (DE). Changes sync automatically to the application.'
                )}
              </p>
              <ul className="translation-features">
                <li>✓ {t('settings.feature1', 'Real-time translation updates')}</li>
                <li>✓ {t('settings.feature2', 'Multi-language support (NL, EN, DE)')}</li>
                <li>✓ {t('settings.feature3', 'Context-aware translation editor')}</li>
                <li>✓ {t('settings.feature4', 'Translation quality checks')}</li>
              </ul>
            </div>
            <div className="translation-action">
              <Button
                themeColor="primary"
                size="large"
                onClick={handleLokaliseClick}
                icon="globe"
              >
                <Globe size={18} style={{ marginRight: '8px' }} />
                {t('settings.openLokalise', 'Open Lokalise')}
              </Button>
            </div>
          </div>
        </section>

        {/* Application Information */}
        <section className="settings-section">
          <h3 className="section-title">{t('settings.appInfo', 'Application Information')}</h3>
          <div className="app-info-grid">
            <div className="info-item">
              <span className="info-label">{t('settings.environment', 'Environment')}:</span>
              <span className="info-value">Development</span>
            </div>
            <div className="info-item">
              <span className="info-label">{t('settings.apiUrl', 'API URL')}:</span>
              <span className="info-value">func-ctn-demo-asr-dev.azurewebsites.net</span>
            </div>
            <div className="info-item">
              <span className="info-label">{t('settings.region', 'Region')}:</span>
              <span className="info-value">West Europe</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
