import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DropDownList } from '@progress/kendo-react-dropdowns';
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

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    languages.find(lang => lang.code === i18n.language) || languages[0]
  );

  const handleLanguageChange = (event: any) => {
    const language = event.value as Language;
    setSelectedLanguage(language);
    i18n.changeLanguage(language.code);

    // Store language preference in localStorage
    localStorage.setItem('ctn-language', language.code);

    // Reload the page to apply language changes globally
    window.location.reload();
  };

  const itemRender = (li: React.ReactElement, itemProps: any) => {
    const language = itemProps.dataItem as Language;
    return React.cloneElement(li, {},
      <span className="language-item">
        <span className="language-flag">{language.flag}</span>
        <span className="language-name">{language.name}</span>
      </span>
    );
  };

  const valueRender = (element: React.ReactElement, value: Language) => {
    return React.cloneElement(element, {},
      <span className="language-item">
        <span className="language-flag">{value.flag}</span>
        <span className="language-name">{value.name}</span>
      </span>
    );
  };

  return (
    <div className="language-switcher">
      <DropDownList
        data={languages}
        textField="name"
        dataItemKey="code"
        value={selectedLanguage}
        onChange={handleLanguageChange}
        itemRender={itemRender}
        valueRender={valueRender}
        style={{ width: '180px' }}
      />
    </div>
  );
};

export default LanguageSwitcher;
