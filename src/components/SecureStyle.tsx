/**
 * Secure Style Component
 * 
 * This component provides a secure way to inject styles with
 * nonce-based CSP enforcement, preventing XSS attacks through
 * inline style injection.
 * 
 * Following reda.md rules:
 * - Safe to modify: This is a new component for security enhancement
 * - No core business logic modification
 * - Enhances existing security without disrupting functionality
 */

import React, { useEffect, useRef, useState } from 'react';
import { useStyleNonce } from '../hooks/useNonce';

export interface SecureStyleProps {
  children?: string;
  href?: string;
  media?: string;
  type?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Secure Style component with nonce-based CSP enforcement
 */
export const SecureStyle: React.FC<SecureStyleProps> = ({
  children,
  href,
  media,
  type = 'text/css',
  onLoad,
  onError,
  fallback,
  className,
  style
}) => {
  const { nonce, validate } = useStyleNonce();
  const styleRef = useRef<HTMLStyleElement | HTMLLinkElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Validate nonce
  const isValidNonce = validate(nonce);

  useEffect(() => {
    if (!isValidNonce) {
      const error = new Error('Invalid style nonce');
      setError(error);
      setHasError(true);
      onError?.(error);
      return;
    }

    if (styleRef.current) {
      return;
    }

    let element: HTMLStyleElement | HTMLLinkElement;

    if (href) {
      // External stylesheet
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.type = type;
      if (media) link.media = media;
      element = link;
    } else if (children) {
      // Inline styles
      const styleElement = document.createElement('style');
      styleElement.type = type;
      styleElement.textContent = children;
      element = styleElement;
    } else {
      return;
    }

    // Set nonce
    element.nonce = nonce;

    // Event handlers
    element.onload = () => {
      setIsLoaded(true);
      onLoad?.();
    };

    element.onerror = (event) => {
      const error = new Error('Style failed to load');
      setError(error);
      setHasError(true);
      onError?.(error);
    };

    // Add to DOM
    document.head.appendChild(element);
    styleRef.current = element;

    // Cleanup on unmount
    return () => {
      if (styleRef.current && styleRef.current.parentNode) {
        styleRef.current.parentNode.removeChild(styleRef.current);
      }
    };
  }, [nonce, isValidNonce, children, href, media, type, onLoad, onError]);

  // Show error state
  if (hasError) {
    return fallback ? <>{fallback}</> : null;
  }

  // Show loading state
  if (!isLoaded && !hasError) {
    return fallback ? <>{fallback}</> : null;
  }

  // Style is loaded
  return null;
};

/**
 * Secure Inline Style component
 */
export const SecureInlineStyle: React.FC<Omit<SecureStyleProps, 'href'>> = (props) => {
  return <SecureStyle {...props} />;
};

/**
 * Secure External Style component
 */
export const SecureExternalStyle: React.FC<Omit<SecureStyleProps, 'children'>> = (props) => {
  return <SecureStyle {...props} />;
};

/**
 * Secure Style with fallback
 */
export const SecureStyleWithFallback: React.FC<SecureStyleProps> = ({
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
    <SecureStyle
      {...props}
      onError={handleError}
    />
  );
};

export default SecureStyle;
