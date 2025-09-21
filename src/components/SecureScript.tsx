/**
 * Secure Script Component
 * 
 * This component provides a secure way to execute scripts with
 * nonce-based CSP enforcement, preventing XSS attacks through
 * inline script injection.
 * 
 * Following reda.md rules:
 * - Safe to modify: This is a new component for security enhancement
 * - No core business logic modification
 * - Enhances existing security without disrupting functionality
 */

import React, { useEffect, useRef, useState } from 'react';
import { useScriptNonce } from '../hooks/useNonce';

export interface SecureScriptProps {
  src?: string;
  children?: string;
  type?: string;
  async?: boolean;
  defer?: boolean;
  crossOrigin?: 'anonymous' | 'use-credentials';
  integrity?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onExecute?: () => void;
  fallback?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Secure Script component with nonce-based CSP enforcement
 */
export const SecureScript: React.FC<SecureScriptProps> = ({
  src,
  children,
  type = 'text/javascript',
  async = false,
  defer = false,
  crossOrigin,
  integrity,
  onLoad,
  onError,
  onExecute,
  fallback,
  className,
  style
}) => {
  const { nonce, validate } = useScriptNonce();
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Validate nonce
  const isValidNonce = validate(nonce);

  useEffect(() => {
    if (!isValidNonce) {
      const error = new Error('Invalid script nonce');
      setError(error);
      setHasError(true);
      onError?.(error);
      return;
    }

    if (scriptRef.current) {
      return;
    }

    const script = document.createElement('script');
    script.type = type;
    script.nonce = nonce;

    if (src) {
      script.src = src;
    } else if (children) {
      script.textContent = children;
    }

    if (async) script.async = true;
    if (defer) script.defer = true;
    if (crossOrigin) script.crossOrigin = crossOrigin;
    if (integrity) script.integrity = integrity;

    // Event handlers
    script.onload = () => {
      setIsLoaded(true);
      onLoad?.();
      onExecute?.();
    };

    script.onerror = (event) => {
      const error = new Error('Script failed to load');
      setError(error);
      setHasError(true);
      onError?.(error);
    };

    // Add to DOM
    document.head.appendChild(script);
    scriptRef.current = script;

    // Cleanup on unmount
    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
    };
  }, [nonce, isValidNonce, src, children, type, async, defer, crossOrigin, integrity, onLoad, onError, onExecute]);

  // Show error state
  if (hasError) {
    return fallback ? <>{fallback}</> : null;
  }

  // Show loading state
  if (!isLoaded && !hasError) {
    return fallback ? <>{fallback}</> : null;
  }

  // Script is loaded and executing
  return null;
};

/**
 * Secure Inline Script component
 */
export const SecureInlineScript: React.FC<Omit<SecureScriptProps, 'src'>> = (props) => {
  return <SecureScript {...props} />;
};

/**
 * Secure External Script component
 */
export const SecureExternalScript: React.FC<Omit<SecureScriptProps, 'children'>> = (props) => {
  return <SecureScript {...props} />;
};

/**
 * Secure Script with fallback
 */
export const SecureScriptWithFallback: React.FC<SecureScriptProps> = ({
  fallback,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  const handleError = (error: Error) => {
    setHasError(true);
    props.onError?.(error);
  };

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <SecureScript
      {...props}
      onError={handleError}
    />
  );
};

export default SecureScript;