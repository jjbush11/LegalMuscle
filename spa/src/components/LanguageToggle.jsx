import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageToggle.css';

const LanguageToggle = () => {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="language-toggle">
      <button 
        className="language-button" 
        onClick={toggleLanguage}
        title={t('language.toggle')}
      >
        <span className="language-icon">🌐</span>
        <span className="language-text">
          {i18n.language === 'en' ? t('language.spanish') : t('language.english')}
        </span>
      </button>
    </div>
  );
};

export default LanguageToggle;
