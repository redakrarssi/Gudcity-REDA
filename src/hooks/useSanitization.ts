/**
 * React Hook for Input Sanitization
 * 
 * This hook provides easy integration of sanitization into React components,
 * following the principle of "sanitize early, sanitize often" while
 * maintaining good performance through memoization.
 * 
 * Following reda.md rules:
 * - Safe to modify: This is a new utility hook for security enhancement
 * - No core business logic modification
 * - Enhances existing security without disrupting functionality
 */

import { useMemo, useCallback } from 'react';
import { 
  InputSanitizer, 
  SANITIZATION_CONFIGS, 
  sanitizeText, 
  sanitizeHtml, 
  sanitizeForDisplay,
  sanitizeForDatabase,
  sanitizeUrl,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeJson,
  validateInput,
  sanitizeProps,
  sanitizeFormData
} from '../utils/sanitizer';

export interface UseSanitizationOptions {
  level?: 'strict' | 'moderate' | 'permissive';
  maxLength?: number;
  allowHtml?: boolean;
  allowScripts?: boolean;
  allowStyles?: boolean;
  allowDataAttributes?: boolean;
  allowedTags?: string[];
  allowedAttributes?: string[];
}

/**
 * Hook for input sanitization with customizable options
 */
export const useSanitization = (options: UseSanitizationOptions = {}) => {
  const sanitizer = useMemo(() => {
    const config = {
      ...SANITIZATION_CONFIGS[options.level || 'moderate'],
      ...options
    };
    
    return new InputSanitizer(config);
  }, [options.level, options.maxLength, options.allowHtml, options.allowScripts, options.allowStyles, options.allowDataAttributes, options.allowedTags, options.allowedAttributes]);

  // Memoized sanitization functions
  const sanitizeTextInput = useCallback((input: string) => {
    return sanitizer.sanitizeText(input);
  }, [sanitizer]);

  const sanitizeHtmlInput = useCallback((input: string) => {
    return sanitizer.sanitizeHtml(input);
  }, [sanitizer]);

  const sanitizeDisplayInput = useCallback((input: string) => {
    return sanitizer.sanitizeForDisplay(input);
  }, [sanitizer]);

  const sanitizeDatabaseInput = useCallback((input: string) => {
    return sanitizer.sanitizeForDatabase(input);
  }, [sanitizer]);

  const sanitizeUrlInput = useCallback((input: string) => {
    return sanitizer.sanitizeUrl(input);
  }, [sanitizer]);

  const sanitizeEmailInput = useCallback((input: string) => {
    return sanitizer.sanitizeEmail(input);
  }, [sanitizer]);

  const sanitizeNumberInput = useCallback((input: string | number, min?: number, max?: number) => {
    return sanitizer.sanitizeNumber(input, min, max);
  }, [sanitizer]);

  const sanitizeJsonInput = useCallback((input: string) => {
    return sanitizer.sanitizeJson(input);
  }, [sanitizer]);

  const validateInputThreats = useCallback((input: string) => {
    return sanitizer.validateInput(input);
  }, [sanitizer]);

  const sanitizeObjectProps = useCallback((props: Record<string, any>) => {
    return sanitizer.sanitizeObject(props);
  }, [sanitizer]);

  return {
    sanitizer,
    sanitizeText: sanitizeTextInput,
    sanitizeHtml: sanitizeHtmlInput,
    sanitizeForDisplay: sanitizeDisplayInput,
    sanitizeForDatabase: sanitizeDatabaseInput,
    sanitizeUrl: sanitizeUrlInput,
    sanitizeEmail: sanitizeEmailInput,
    sanitizeNumber: sanitizeNumberInput,
    sanitizeJson: sanitizeJsonInput,
    validateInput: validateInputThreats,
    sanitizeProps: sanitizeObjectProps,
    getStats: () => sanitizer.getSanitizationStats()
  };
};

/**
 * Hook for form sanitization with automatic validation
 */
export const useFormSanitization = (formData: Record<string, any>) => {
  const { sanitizeForDatabase, validateInput } = useSanitization({ level: 'strict' });

  const sanitizedFormData = useMemo(() => {
    return sanitizeFormData(formData);
  }, [formData]);

  const validationResults = useMemo(() => {
    const results: Record<string, { isValid: boolean; threats: string[] }> = {};
    
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string') {
        results[key] = validateInput(value);
      }
    }
    
    return results;
  }, [formData, validateInput]);

  const hasThreats = useMemo(() => {
    return Object.values(validationResults).some(result => !result.isValid);
  }, [validationResults]);

  const threatSummary = useMemo(() => {
    const allThreats: string[] = [];
    Object.values(validationResults).forEach(result => {
      allThreats.push(...result.threats);
    });
    return allThreats;
  }, [validationResults]);

  return {
    sanitizedFormData,
    validationResults,
    hasThreats,
    threatSummary,
    isValid: !hasThreats
  };
};

/**
 * Hook for component props sanitization
 */
export const usePropsSanitization = (props: Record<string, any>) => {
  const { sanitizeProps } = useSanitization({ level: 'moderate' });

  const sanitizedProps = useMemo(() => {
    return sanitizeProps(props);
  }, [props, sanitizeProps]);

  return sanitizedProps;
};

/**
 * Hook for URL sanitization with validation
 */
export const useUrlSanitization = (url: string) => {
  const { sanitizeUrl, validateInput } = useSanitization({ level: 'strict' });

  const sanitizedUrl = useMemo(() => {
    return sanitizeUrl(url);
  }, [url]);

  const isValid = useMemo(() => {
    return sanitizedUrl !== '' && !validateInput(url).threats.length;
  }, [sanitizedUrl, url, validateInput]);

  return {
    sanitizedUrl,
    isValid,
    originalUrl: url
  };
};

/**
 * Hook for email sanitization with validation
 */
export const useEmailSanitization = (email: string) => {
  const { sanitizeEmail, validateInput } = useSanitization({ level: 'strict' });

  const sanitizedEmail = useMemo(() => {
    return sanitizeEmail(email);
  }, [email]);

  const isValid = useMemo(() => {
    return sanitizedEmail !== '' && !validateInput(email).threats.length;
  }, [sanitizedEmail, email, validateInput]);

  return {
    sanitizedEmail,
    isValid,
    originalEmail: email
  };
};

/**
 * Hook for number sanitization with range validation
 */
export const useNumberSanitization = (value: string | number, min?: number, max?: number) => {
  const { sanitizeNumber } = useSanitization({ level: 'strict' });

  const sanitizedNumber = useMemo(() => {
    return sanitizeNumber(value, min, max);
  }, [value, min, max]);

  const isValid = useMemo(() => {
    return sanitizedNumber !== null;
  }, [sanitizedNumber]);

  return {
    sanitizedNumber,
    isValid,
    originalValue: value
  };
};

/**
 * Hook for JSON sanitization with validation
 */
export const useJsonSanitization = (jsonString: string) => {
  const { sanitizeJson, validateInput } = useSanitization({ level: 'strict' });

  const sanitizedJson = useMemo(() => {
    return sanitizeJson(jsonString);
  }, [jsonString]);

  const isValid = useMemo(() => {
    return sanitizedJson !== null && !validateInput(jsonString).threats.length;
  }, [sanitizedJson, jsonString, validateInput]);

  return {
    sanitizedJson,
    isValid,
    originalJson: jsonString
  };
};

// Convenience hooks for common use cases
export const useStrictSanitization = () => useSanitization({ level: 'strict' });
export const useModerateSanitization = () => useSanitization({ level: 'moderate' });
export const usePermissiveSanitization = () => useSanitization({ level: 'permissive' });

export default useSanitization;