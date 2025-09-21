/**
 * Safe HTML Component
 * 
 * This component provides a secure way to render HTML content without
 * using dangerous innerHTML. It uses sanitization to prevent XSS attacks
 * while maintaining the ability to display formatted content.
 * 
 * Following reda.md rules:
 * - Safe to modify: This is a new component for security enhancement
 * - No core business logic modification
 * - Enhances existing security without disrupting functionality
 */

import React, { useMemo } from 'react';
import { useSanitization } from '../hooks/useSanitization';
import { SanitizationConfig } from '../utils/sanitizer';

export interface SafeHtmlProps {
  content: string;
  sanitizationLevel?: 'strict' | 'moderate' | 'permissive';
  maxLength?: number;
  allowHtml?: boolean;
  allowScripts?: boolean;
  allowStyles?: boolean;
  allowDataAttributes?: boolean;
  allowedTags?: string[];
  allowedAttributes?: string[];
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
  onSanitizationComplete?: (sanitizedContent: string, threats: string[]) => void;
}

/**
 * Safe HTML component that sanitizes content before rendering
 */
export const SafeHtml: React.FC<SafeHtmlProps> = ({
  content,
  sanitizationLevel = 'moderate',
  maxLength,
  allowHtml,
  allowScripts,
  allowStyles,
  allowDataAttributes,
  allowedTags,
  allowedAttributes,
  className,
  style,
  fallback,
  onSanitizationComplete
}) => {
  const sanitizationOptions = useMemo(() => ({
    level: sanitizationLevel,
    maxLength,
    allowHtml,
    allowScripts,
    allowStyles,
    allowDataAttributes,
    allowedTags,
    allowedAttributes
  }), [sanitizationLevel, maxLength, allowHtml, allowScripts, allowStyles, allowDataAttributes, allowedTags, allowedAttributes]);

  const { sanitizeForDisplay, validateInput } = useSanitization(sanitizationOptions);

  const sanitizedContent = useMemo(() => {
    if (!content || typeof content !== 'string') {
      return '';
    }

    const sanitized = sanitizeForDisplay(content);
    const validation = validateInput(content);
    
    // Notify parent component about sanitization results
    if (onSanitizationComplete) {
      onSanitizationComplete(sanitized, validation.threats);
    }

    return sanitized;
  }, [content, sanitizeForDisplay, validateInput, onSanitizationComplete]);

  // If content is empty after sanitization, show fallback
  if (!sanitizedContent && fallback) {
    return <>{fallback}</>;
  }

  // If no HTML is allowed, render as plain text
  if (!allowHtml) {
    return (
      <span className={className} style={style}>
        {sanitizedContent}
      </span>
    );
  }

  // Render sanitized HTML content
  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};

/**
 * Safe HTML component for strict sanitization (text only)
 */
export const SafeText: React.FC<Omit<SafeHtmlProps, 'allowHtml' | 'allowScripts' | 'allowStyles' | 'allowDataAttributes' | 'allowedTags' | 'allowedAttributes'>> = (props) => {
  return (
    <SafeHtml
      {...props}
      sanitizationLevel="strict"
      allowHtml={false}
      allowScripts={false}
      allowStyles={false}
      allowDataAttributes={false}
      allowedTags={[]}
      allowedAttributes={[]}
    />
  );
};

/**
 * Safe HTML component for moderate sanitization (basic HTML allowed)
 */
export const SafeHtmlModerate: React.FC<Omit<SafeHtmlProps, 'sanitizationLevel'>> = (props) => {
  return (
    <SafeHtml
      {...props}
      sanitizationLevel="moderate"
    />
  );
};

/**
 * Safe HTML component for permissive sanitization (rich HTML allowed)
 */
export const SafeHtmlPermissive: React.FC<Omit<SafeHtmlProps, 'sanitizationLevel'>> = (props) => {
  return (
    <SafeHtml
      {...props}
      sanitizationLevel="permissive"
    />
  );
};

/**
 * Safe HTML component with custom sanitization configuration
 */
export const SafeHtmlCustom: React.FC<SafeHtmlProps & { config: SanitizationConfig }> = ({
  config,
  content,
  className,
  style,
  fallback,
  onSanitizationComplete
}) => {
  const { sanitizeForDisplay, validateInput } = useSanitization(config);

  const sanitizedContent = useMemo(() => {
    if (!content || typeof content !== 'string') {
      return '';
    }

    const sanitized = sanitizeForDisplay(content);
    const validation = validateInput(content);
    
    if (onSanitizationComplete) {
      onSanitizationComplete(sanitized, validation.threats);
    }

    return sanitized;
  }, [content, sanitizeForDisplay, validateInput, onSanitizationComplete]);

  if (!sanitizedContent && fallback) {
    return <>{fallback}</>;
  }

  if (!config.allowHtml) {
    return (
      <span className={className} style={style}>
        {sanitizedContent}
      </span>
    );
  }

  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};

export default SafeHtml;
