export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'AED' | 'JPY' | 'CNY';

export interface Currency {
  code: CurrencyCode;
  name: string;
  symbol: string;
  rate?: number;
  regions: string[];
}

export interface CurrencyState {
  baseCurrency: CurrencyCode;
  currencies: Record<CurrencyCode, Currency>;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, Omit<Currency, 'rate'>> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    regions: ['US', 'DEFAULT']
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    regions: ['EU', 'DE', 'FR', 'IT', 'ES']
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    regions: ['GB']
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    regions: ['AE']
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    regions: ['JP']
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    regions: ['CN']
  }
}; 