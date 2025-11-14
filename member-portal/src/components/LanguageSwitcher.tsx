import { Select } from '@mantine/core';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

const languageOptions = languages.map((lang) => ({
  value: lang.code,
  label: `${lang.flag} ${lang.name}`,
}));

const DROPDOWN_STYLE = { width: '180px' } as const;

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    // Handle language variants like 'en-US' by taking only the base code
    return (i18n.language || 'nl').split('-')[0];
  });

  const handleLanguageChange = (code: string | null) => {
    if (!code) return;
    setSelectedLanguage(code);

    // Store language preference in localStorage
    try {
      localStorage.setItem('ctn-language', code);
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }

    // Change language without reloading the page
    i18n.changeLanguage(code);
  };

  return (
    <div className="language-switcher" role="region" aria-label="Language selection">
      <Select
        data={languageOptions}
        value={selectedLanguage}
        onChange={handleLanguageChange}
        style={DROPDOWN_STYLE}
      />
    </div>
  );
};

export default LanguageSwitcher;
