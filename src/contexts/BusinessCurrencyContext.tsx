import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BusinessSettingsService } from '../services/businessSettingsService';
import { useAuth } from './AuthContext';

// Supported currencies with their symbols
export const CURRENCY_SYMBOLS: Record<string, string> = {
  // MENA Currencies
  'AED': 'د.إ',
  'BHD': '.د.ب',
  'DZD': 'DA',
  'EGP': '£',
  'IQD': 'ع.د',
  'JOD': 'د.أ',
  'KWD': 'د.ك',
  'LBP': 'ل.ل',
  'LYD': 'ل.د',
  'MAD': 'DH',
  'OMR': 'ر.ع.',
  'QAR': 'ر.ق',
  'SAR': 'ر.س',
  'SYP': 'ل.س',
  'TND': 'د.ت',
  'YER': 'ر.ي',
  
  // European Currencies
  'EUR': '€',
  'GBP': '£',
  'CHF': 'CHF',
  'CZK': 'Kč',
  'DKK': 'kr',
  'HUF': 'Ft',
  'NOK': 'kr',
  'PLN': 'zł',
  'RON': 'lei',
  'SEK': 'kr',
  'TRY': '₺',
  
  // International
  'USD': '$'
};

interface BusinessCurrencyContextType {
  currency: string;
  currencySymbol: string;
  loading: boolean;
  formatAmount: (amount: number) => string;
  updateCurrency: (newCurrency: string) => Promise<void>;
  refreshCurrency: () => Promise<void>;
}

const BusinessCurrencyContext = createContext<BusinessCurrencyContextType | undefined>(undefined);

interface BusinessCurrencyProviderProps {
  children: ReactNode;
}

export const BusinessCurrencyProvider: React.FC<BusinessCurrencyProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<string>('EUR'); // Default to EUR instead of USD
  const [loading, setLoading] = useState(true);

  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  const formatAmount = (amount: number): string => {
    // Use Intl.NumberFormat for proper currency formatting
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      // Fallback to symbol + amount if currency is not supported by Intl
      const symbol = CURRENCY_SYMBOLS[currency] || currency;
      return `${symbol}${amount.toFixed(2)}`;
    }
  };

  const loadBusinessCurrency = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Loading business currency for user ID:', user.id);
      
      // For staff users, get currency from their business owner
      let businessId = user.id;
      if (user.role === 'staff' && user.business_owner_id) {
        console.log('👥 Staff user detected, using business owner ID:', user.business_owner_id);
        businessId = user.business_owner_id;
      }
      
      const businessSettings = await BusinessSettingsService.getBusinessSettings(businessId);
      
      if (businessSettings?.currency) {
        console.log('💰 Setting currency from business settings:', businessSettings.currency);
        setCurrency(businessSettings.currency);
      } else {
        console.log('💰 No currency in settings, using default EUR');
        setCurrency('EUR'); // Default to EUR
      }
    } catch (error) {
      console.error('❌ Error loading business currency:', error);
      setCurrency('EUR'); // Fallback to EUR
    } finally {
      setLoading(false);
    }
  };

  const updateCurrency = async (newCurrency: string) => {
    if (!user?.id) {
      throw new Error('No user ID available');
    }

    // Staff users cannot change currency - it's inherited from business owner
    if (user.role === 'staff') {
      throw new Error('Staff users cannot change business currency. Currency is inherited from the business owner.');
    }

    try {
      console.log('🔄 Updating business currency to:', newCurrency);
      
      const updatedSettings = await BusinessSettingsService.updateBusinessSettings(user.id, {
        currency: newCurrency
      });

      if (updatedSettings) {
        setCurrency(newCurrency);
        console.log('✅ Currency updated successfully to:', newCurrency);
      } else {
        throw new Error('Failed to update currency settings');
      }
    } catch (error) {
      console.error('❌ Error updating currency:', error);
      throw error;
    }
  };

  const refreshCurrency = async () => {
    setLoading(true);
    await loadBusinessCurrency();
  };

  useEffect(() => {
    if (user?.id) {
      loadBusinessCurrency();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  return (
    <BusinessCurrencyContext.Provider
      value={{
        currency,
        currencySymbol,
        loading,
        formatAmount,
        updateCurrency,
        refreshCurrency,
      }}
    >
      {children}
    </BusinessCurrencyContext.Provider>
  );
};

export const useBusinessCurrency = (): BusinessCurrencyContextType => {
  const context = useContext(BusinessCurrencyContext);
  if (context === undefined) {
    throw new Error('useBusinessCurrency must be used within a BusinessCurrencyProvider');
  }
  return context;
};
