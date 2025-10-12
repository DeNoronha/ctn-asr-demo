import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DropDownList, DropDownListChangeEvent, ListItemProps } from '@progress/kendo-react-dropdowns';
import './LanguageSwitcher.css';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

const DROPDOWN_STYLE = { width: '180px' } as const;

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(() => {
    // Handle language variants like 'en-US' by taking only the base code
    const currentLangCode = i18n.language.split('-')[0];
    return languages.find(lang => lang.code === currentLangCode) || languages[0];
  });

  const handleLanguageChange = (event: DropDownListChangeEvent) => {
    const language = event.value as Language;

    // Store language preference in localStorage
    try {
      localStorage.setItem('ctn-language', language.code);
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }

    // Reload the page to apply language changes globally
    window.location.reload();
  };

  const itemRender = (li: React.ReactElement, itemProps: ListItemProps) => {
    const language = itemProps.dataItem as Language;
    return React.cloneElement(li, {},
      <span className="language-item">
        <span className="language-flag" aria-hidden="true">{language.flag}</span>
        <span className="language-name">{language.name}</span>
      </span>
    );
  };

  const valueRender = (element: React.ReactElement, value: Language | null) => {
    if (!value) return element;

    return React.cloneElement(element, {},
      <span className="language-item">
        <span className="language-flag" aria-hidden="true">{value.flag}</span>
        <span className="language-name">{value.name}</span>
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
