import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  textClassName?: string;
  imageSrc?: string;
}

const sizeToPixels: Record<NonNullable<AppLogoProps['size']>, number> = {
  sm: 24,
  md: 28,
  lg: 32
};

export const AppLogo: React.FC<AppLogoProps> = ({
  className,
  size = 'md',
  showText = true,
  textClassName,
  imageSrc
}) => {
  const dimension = sizeToPixels[size];

  return (
    <div className={`flex items-center ${className || ''}`.trim()}>
      <img
        src={imageSrc || '/svg%20logo%20vcarda.svg'}
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          if (!img) return;
          // Fallback chain: encoded filename -> public copy -> favicon
          if (!img.dataset.fallback || img.dataset.fallback === 'encoded') {
            img.dataset.fallback = 'public';
            img.src = '/vcarda.svg';
            return;
          }
          if (img.dataset.fallback === 'public') {
            img.dataset.fallback = 'favicon';
            img.src = '/favicon.svg';
            return;
          }
        }}
        alt="Vcarda logo"
        className="block"
        style={{ width: dimension, height: dimension }}
      />
      {showText && (
        <span className={`ml-2 font-bold text-black ${textClassName || ''}`.trim()}>
          Vcarda
        </span>
      )}
    </div>
  );
};

export default AppLogo;


