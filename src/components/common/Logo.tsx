import React from 'react';

export interface LogoProps {
  /** Overall size control for the icon height in pixels */
  size?: number;
  /** Whether to show the wordmark text next to the icon */
  showText?: boolean;
  /** Tailwind className passthrough */
  className?: string;
  /** Tailwind class for the wordmark text color */
  textClassName?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * Brand Logo component combining a geometric SVG mark with a clean wordmark.
 * The SVG uses currentColor to adapt to light/dark modes via text color classes.
 */
export const Logo: React.FC<LogoProps> = ({
  size = 28,
  showText = true,
  className = '',
  textClassName,
  ariaLabel = 'Vcarda',
}) => {
  return (
    <div className={`flex items-center ${className}`} aria-label={ariaLabel} role="img">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Background circle with subtle gradient */}
        <defs>
          <linearGradient id="vcardaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="28" fill="url(#vcardaGradient)" />
        {/* Stylized V and C shapes */}
        <path
          d="M16 24l8 16 8-16"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M48 40a12 12 0 10-6-22"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>
      {showText && (
        <span className={`ml-2 text-lg font-extrabold tracking-tight ${textClassName ?? 'text-blue-600 dark:text-blue-400'}`}>
          Vcarda
        </span>
      )}
    </div>
  );
};

export default Logo;


