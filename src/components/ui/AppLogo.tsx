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
        src={imageSrc || '/vcarda.svg'}
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          if (img && img.src.indexOf('/favicon.svg') === -1) {
            img.src = '/favicon.svg';
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


