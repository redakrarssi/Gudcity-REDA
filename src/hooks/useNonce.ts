/**
 * React Hook for Nonce Management
 * 
 * This hook provides easy integration of nonce-based CSP enforcement
 * in React components, ensuring secure script and style execution.
 * 
 * Following reda.md rules:
 * - Safe to modify: This is a new utility hook for security enhancement
 * - No core business logic modification
 * - Enhances existing security without disrupting functionality
 */

import { useMemo, useCallback, useEffect } from 'react';
import { 
  nonceManager, 
  generateScriptNonce, 
  generateStyleNonce,
  validateScriptNonce,
  validateStyleNonce,
  getNonceStats
} from '../utils/nonceManager';

export interface UseNonceOptions {
  requestId?: string;
  autoCleanup?: boolean;
  cleanupInterval?: number;
}

/**
 * Hook for nonce management in React components
 */
export const useNonce = (options: UseNonceOptions = {}) => {
  const { requestId, autoCleanup = true, cleanupInterval = 60000 } = options;

  // Generate nonces for this component
  const scriptNonce = useMemo(() => {
    return generateScriptNonce(requestId);
  }, [requestId]);

  const styleNonce = useMemo(() => {
    return generateStyleNonce(requestId);
  }, [requestId]);

  // Validation functions
  const validateScript = useCallback((nonce: string) => {
    return validateScriptNonce(nonce);
  }, []);

  const validateStyle = useCallback((nonce: string) => {
    return validateStyleNonce(nonce);
  }, []);

  // Get nonce statistics
  const stats = useMemo(() => {
    return getNonceStats();
  }, []);

  // Auto cleanup effect
  useEffect(() => {
    if (!autoCleanup) return;

    const interval = setInterval(() => {
      nonceManager.cleanup();
    }, cleanupInterval);

    return () => clearInterval(interval);
  }, [autoCleanup, cleanupInterval]);

  return {
    scriptNonce,
    styleNonce,
    validateScript,
    validateStyle,
    stats
  };
};

/**
 * Hook for script nonce management
 */
export const useScriptNonce = (requestId?: string) => {
  const { scriptNonce, validateScript } = useNonce({ requestId });

  return {
    nonce: scriptNonce,
    validate: validateScript
  };
};

/**
 * Hook for style nonce management
 */
export const useStyleNonce = (requestId?: string) => {
  const { styleNonce, validateStyle } = useNonce({ requestId });

  return {
    nonce: styleNonce,
    validate: validateStyle
  };
};

/**
 * Hook for nonce statistics
 */
export const useNonceStats = () => {
  const stats = useMemo(() => {
    return getNonceStats();
  }, []);

  return stats;
};

/**
 * Hook for nonce cleanup
 */
export const useNonceCleanup = (interval: number = 60000) => {
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      nonceManager.cleanup();
    }, interval);

    return () => clearInterval(cleanupInterval);
  }, [interval]);
};

export default useNonce;
