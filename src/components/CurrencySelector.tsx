import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CurrencyCode } from '../types/currency';

interface CurrencySelectorProps {
  selectedCurrency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({ 
  selectedCurrency, 
  onCurrencyChange 
}) => {
  const { t } = useTranslation();
  
  const currencies: CurrencyCode[] = [
    'USD',
    'EUR',
    'GBP',
    'AED',
    'JPY',
    'CNY'
  ];

  return (
    <select
      value={selectedCurrency}
      onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={t('Select currency')}
    >
      {currencies.map((currency) => (
        <option key={currency} value={currency}>
          {currency}
        </option>
      ))}
    </select>
  );
}; 