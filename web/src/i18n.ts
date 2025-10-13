import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

import deTranslations from './locales/de/translation.json';
// Translation resources
import enTranslations from './locales/en/translation.json';
import nlTranslations from './locales/nl/translation.json';

i18n
  // Load translation using http backend
  // Can be configured to load from API or CDN
  .use(HttpBackend)
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    // Embedded translations (can also load from external sources)
    resources: {
      en: {
        translation: enTranslations,
      },
      nl: {
        translation: nlTranslations,
      },
      de: {
        translation: deTranslations,
      },
    },

    // Language to use if translations in user language are not available
    fallbackLng: 'en',

    // Default language
    lng: 'nl', // Default to Dutch for CTN

    // Debug mode (disable in production)
    debug: process.env.NODE_ENV === 'development',

    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Language detection options
    detection: {
      // Order of language detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],

      // Keys to lookup language from
      lookupLocalStorage: 'ctn-language',

      // Cache user language
      caches: ['localStorage'],

      // Exclude cache for certain languages
      excludeCacheFor: ['cimode'],
    },

    // Backend options (if loading from external source)
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // React-specific options
    react: {
      // Wait for translations to load before rendering
      useSuspense: true,
    },
  });

export default i18n;
