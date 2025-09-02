import type { CurrencyCode, CurrencyState, Currency } from '../types/currency';
import { SUPPORTED_CURRENCIES } from '../types/currency';

// Mock exchange rates relative to USD
const MOCK_EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1.0,     // Base currency
  EUR: 0.85,    // 1 USD = 0.85 EUR
  GBP: 0.73,    // 1 USD = 0.73 GBP
  AED: 3.67,    // 1 USD = 3.67 AED
  JPY: 109.25,  // 1 USD = 109.25 JPY
  CNY: 6.45     // 1 USD = 6.45 CNY
};

export class CurrencyService {
  private static state: CurrencyState = {
    baseCurrency: 'USD',
    currencies: Object.entries(SUPPORTED_CURRENCIES).reduce((acc, [code, currency]) => {
      acc[code as CurrencyCode] = {
        ...currency,
        rate: MOCK_EXCHANGE_RATES[code as CurrencyCode]
      };
      return acc;
    }, {} as Record<CurrencyCode, Currency>)
  };

  static initialize() {
    // In a real app, this would fetch current exchange rates from an API
    console.log('CurrencyService initialized with mock data');
  }

  static convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
    if (from === to) return amount;

    const fromRate = MOCK_EXCHANGE_RATES[from];
    const toRate = MOCK_EXCHANGE_RATES[to];

    // Convert from source currency to USD (base), then to target currency
    const amountInUSD = amount / fromRate;
    const amountInTarget = amountInUSD * toRate;

    return Number(amountInTarget.toFixed(2));
  }

  static format(amount: number, currency: CurrencyCode): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  }

  // Alias for format method to match usage in components
  static formatAmount(amount: number, currency: CurrencyCode): string {
    return this.format(amount, currency);
  }

  static getDefaultCurrencyForLocale(locale: string): CurrencyCode {
    // Simple mapping of locales to default currencies
    const localeMap: Record<string, CurrencyCode> = {
      'en-US': 'USD',
      'en-GB': 'GBP',
      'en-AE': 'AED',
      'ja': 'JPY',
      'zh': 'CNY',
      'de': 'EUR',
      'fr': 'EUR',
      'it': 'EUR',
      'es': 'EUR'
    };

    // Default to USD if locale not found
    return localeMap[locale] || 'USD';
  }
} 