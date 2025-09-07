import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'default' | 'footer' | 'settings' | 'vertical';
  showIcon?: boolean;
}

const LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English'
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية'
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español'
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français'
  }
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  variant = 'default',
  showIcon = true
}) => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    
    // Store language preference in localStorage
    localStorage.setItem('language', languageCode);
    
    // Apply RTL for Arabic
    if (languageCode === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', languageCode);
    }
  };

  const getCurrentLanguage = () => {
    return LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];
  };

  const currentLanguage = getCurrentLanguage();

  // Different styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'footer':
        return {
          container: 'relative inline-block text-left',
          button: 'flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors',
          dropdown: 'absolute right-0 bottom-full mb-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50',
          item: 'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
        };
      
      case 'settings':
        return {
          container: 'relative',
          button: 'flex items-center justify-between w-full px-3 py-2 text-left bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:from-gray-100 hover:to-gray-200 transition-all duration-200',
          dropdown: 'absolute z-50 mt-1 w-full bg-white shadow-lg max-h-48 rounded-md py-1 text-sm ring-1 ring-black ring-opacity-5 overflow-auto border border-gray-200',
          item: 'cursor-pointer select-none relative py-2 px-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200'
        };
      
      case 'vertical':
        return {
          container: 'w-full',
          button: 'flex items-center justify-between w-full px-3 py-2 text-left bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200',
          dropdown: 'mt-1 w-full bg-white shadow-lg rounded-md py-1 text-sm ring-1 ring-black ring-opacity-5 overflow-auto border border-gray-200',
          item: 'cursor-pointer select-none relative py-2 px-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200'
        };
      
      default:
        return {
          container: 'relative inline-block text-left',
          button: 'inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          dropdown: 'origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50',
          item: 'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
        };
    }
  };

  const styles = getVariantStyles();
  const [isOpen, setIsOpen] = React.useState(false);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-language-selector]')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className={`${styles.container} ${className}`} data-language-selector>
      <button
        type="button"
        className={styles.button}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="flex items-center">
          {showIcon && <Globe className="w-4 h-4 mr-2 text-blue-600" />}
          <div className="text-left">
            <div className="font-medium text-gray-900 text-sm">
              {variant === 'settings' || variant === 'vertical' ? currentLanguage.nativeName : currentLanguage.name}
            </div>
            {variant === 'settings' || variant === 'vertical' ? (
              <div className="text-xs text-gray-500">{currentLanguage.name}</div>
            ) : null}
          </div>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className="py-1" role="menu" aria-orientation="vertical">
            {LANGUAGES.map((language) => (
              <button
                key={language.code}
                className={`${styles.item} ${
                  language.code === i18n.language ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-l-4 border-blue-500' : 'text-gray-700'
                }`}
                role="menuitem"
                onClick={() => {
                  handleLanguageChange(language.code);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{language.name}</div>
                    <div className="text-xs text-gray-500">{language.nativeName}</div>
                  </div>
                  {language.code === i18n.language && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;