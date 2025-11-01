import {
  DropDownList,
  type DropDownListChangeEvent,
  type ListItemProps,
} from '@progress/kendo-react-dropdowns';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';
import { TEXT_COLORS, MEMBERSHIP_COLORS } from '../utils/colors';

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

const DROPDOWN_STYLE = { width: '180px' } as const;

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(() => {
    // Handle language variants like 'en-US' by taking only the base code
    const currentLangCode = (i18n.language || 'nl').split('-')[0];
    return languages.find((lang) => lang.code === currentLangCode) || languages[0];
  });

  const handleLanguageChange = (event: DropDownListChangeEvent) => {
    const language = event.value as Language;
    setSelectedLanguage(language);

    // Store language preference in localStorage
    try {
      localStorage.setItem('ctn-language', language.code);
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }

    // Change language without reloading the page
    i18n.changeLanguage(language.code);
  };

  const itemRender = (li: React.ReactElement, itemProps: ListItemProps) => {
    const language = itemProps.dataItem as Language;
    const isSelected = itemProps.selected;

    // Use inline styles to force high contrast (highest CSS specificity)
    const containerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: isSelected ? '#ffffff' : TEXT_COLORS.primary,
      fontWeight: isSelected ? 600 : 500,
      backgroundColor: isSelected ? MEMBERSHIP_COLORS.FULL : '#ffffff',
      padding: '8px 12px',
      width: '100%',
    };

    return React.cloneElement(
      li,
      {},
      <span className="language-item" style={containerStyle}>
        <span className="language-flag" aria-hidden="true">
          {language.flag}
        </span>
        <span className="language-name" style={{ color: isSelected ? '#ffffff' : TEXT_COLORS.primary }}>
          {language.name}
        </span>
      </span>
    );
  };

  const valueRender = (element: React.ReactElement, value: Language | null) => {
    if (!value) return element;

    return React.cloneElement(
      element,
      {},
      <span className="language-item">
        <span className="language-flag" aria-hidden="true">
          {value.flag}
        </span>
        <span className="language-name" style={{ color: TEXT_COLORS.primary, fontWeight: 500 }}>
          {value.name}
        </span>
      </span>
    );
  };

  return (
    <div className="language-switcher" role="region" aria-label="Language selection">
      <DropDownList
        data={languages}
        textField="name"
        dataItemKey="code"
        value={selectedLanguage}
        onChange={handleLanguageChange}
        itemRender={itemRender}
        valueRender={valueRender}
        style={DROPDOWN_STYLE}
      />
    </div>
  );
};

export default LanguageSwitcher;
