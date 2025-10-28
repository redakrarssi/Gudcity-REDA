import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  textClassName?: string;
  imageSrc?: string;
  heightPx?: number;
}

const sizeToPixels: Record<NonNullable<AppLogoProps['size']>, number> = {
  sm: 28,
  md: 40,
  lg: 56
};

export const AppLogo: React.FC<AppLogoProps> = ({
  className,
  size = 'md',
  showText = true,
  textClassName,
  imageSrc,
  heightPx
}) => {
  const dimension = heightPx ?? sizeToPixels[size];

  return (
    <div className={`flex items-center ${className || ''}`.trim()}>
      <img
        src={imageSrc || '/favicon.svg'}
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          if (!img) return;
          // Fallback to the original SVG file if favicon fails
          if (!img.dataset.fallback) {
            img.dataset.fallback = 'original';
            img.src = '/svg%20logo%20vcarda.svg';
            return;
          }
        }}
        alt="Vcarda logo"
        className="block object-contain"
        style={{ height: dimension, width: 'auto' }}
      />
      {showText && (
        <span className={`ms-2 font-bold text-black ${textClassName || ''}`.trim()}>
          Vcarda
        </span>
      )}
    </div>
  );
};

export default AppLogo;


