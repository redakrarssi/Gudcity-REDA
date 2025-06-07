import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface ThemeToggleProps {
  variant?: 'icon' | 'button' | 'switch';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'icon',
  className = ''
}) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isDark 
            ? 'text-yellow-400 hover:bg-gray-700' 
            : 'text-gray-600 hover:bg-gray-100'
        } ${className}`}
        aria-label={isDark ? t('Switch to light mode') : t('Switch to dark mode')}
      >
        {isDark ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </button>
    );
  }

  // Button variant
  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        className={`px-3 py-2 rounded-md flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isDark 
            ? 'bg-gray-700 text-gray-100 hover:bg-gray-600' 
            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
        } ${className}`}
        aria-label={isDark ? t('Switch to light mode') : t('Switch to dark mode')}
      >
        {isDark ? (
          <>
            <Sun className="w-4 h-4 mr-2" />
            <span>{t('Light Mode')}</span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 mr-2" />
            <span>{t('Dark Mode')}</span>
          </>
        )}
      </button>
    );
  }

  // Switch variant
  return (
    <div className={`flex items-center ${className}`}>
      <span className={`mr-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </span>
      <button
        role="switch"
        aria-checked={isDark}
        onClick={toggleTheme}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isDark ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span className="sr-only">
          {isDark ? t('Switch to light mode') : t('Switch to dark mode')}
        </span>
        <span
          className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
            isDark ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

export default ThemeToggle; 