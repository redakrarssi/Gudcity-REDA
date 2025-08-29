import React from 'react';
import { useTranslation } from 'react-i18next';

interface ComingSoonProps {
  feature?: string;
  description?: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export const ComingSoon: React.FC<ComingSoonProps> = ({
  feature = 'Nearby Rewards',
  description = 'We will be celebrating the launch of our new site very soon!',
  className = '',
  size = 'medium'
}) => {
  const { t } = useTranslation();

  const sizeClasses = {
    small: 'py-8 px-6',
    medium: 'py-12 px-8',
    large: 'py-16 px-12'
  };

  const titleSizes = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-4xl'
  };

  const descriptionSizes = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  // Animated confetti-like decorations
  const decorations = [
    { type: 'line', color: 'bg-yellow-400', rotation: 'rotate-45', position: 'top-8 left-12', size: 'w-6 h-1' },
    { type: 'line', color: 'bg-cyan-400', rotation: 'rotate-12', position: 'top-16 right-16', size: 'w-4 h-1' },
    { type: 'line', color: 'bg-pink-400', rotation: '-rotate-45', position: 'top-20 left-20', size: 'w-5 h-1' },
    { type: 'line', color: 'bg-orange-400', rotation: 'rotate-90', position: 'top-12 right-24', size: 'w-3 h-1' },
    { type: 'line', color: 'bg-purple-400', rotation: 'rotate-[135deg]', position: 'top-24 right-12', size: 'w-4 h-1' },
    { type: 'line', color: 'bg-green-400', rotation: '-rotate-12', position: 'bottom-16 left-16', size: 'w-5 h-1' },
    { type: 'line', color: 'bg-blue-400', rotation: 'rotate-45', position: 'bottom-20 right-20', size: 'w-4 h-1' },
    { type: 'line', color: 'bg-red-400', rotation: '-rotate-45', position: 'bottom-12 left-24', size: 'w-3 h-1' },
    { type: 'line', color: 'bg-indigo-400', rotation: 'rotate-12', position: 'bottom-24 right-16', size: 'w-6 h-1' },
    { type: 'plus', color: 'text-yellow-400', position: 'top-32 left-32', size: 'text-lg' },
    { type: 'plus', color: 'text-green-400', position: 'top-40 right-40', size: 'text-sm' },
    { type: 'plus', color: 'text-purple-400', position: 'bottom-32 left-40', size: 'text-base' },
    { type: 'plus', color: 'text-pink-400', position: 'bottom-40 right-32', size: 'text-lg' },
    { type: 'dot', color: 'bg-cyan-400', position: 'top-44 left-44', size: 'w-2 h-2' },
    { type: 'dot', color: 'bg-orange-400', position: 'top-36 right-36', size: 'w-1.5 h-1.5' },
    { type: 'dot', color: 'bg-blue-400', position: 'bottom-44 left-36', size: 'w-2 h-2' },
    { type: 'dot', color: 'bg-red-400', position: 'bottom-36 right-44', size: 'w-1.5 h-1.5' },
    { type: 'x', color: 'text-indigo-400', position: 'top-48 right-48', size: 'text-sm' },
    { type: 'x', color: 'text-pink-400', position: 'bottom-48 left-48', size: 'text-lg' }
  ];

  return (
    <div className={`relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 overflow-hidden ${sizeClasses[size]} ${className}`}>
      {/* Animated decorations */}
      {decorations.map((decoration, index) => (
        <div
          key={index}
          className={`absolute ${decoration.position} ${decoration.rotation} animate-pulse`}
          style={{ animationDelay: `${index * 0.2}s`, animationDuration: '2s' }}
        >
          {decoration.type === 'line' && (
            <div className={`${decoration.color} ${decoration.size} rounded-full opacity-70`}></div>
          )}
          {decoration.type === 'plus' && (
            <div className={`${decoration.color} ${decoration.size} opacity-70 font-bold`}>+</div>
          )}
          {decoration.type === 'dot' && (
            <div className={`${decoration.color} ${decoration.size} rounded-full opacity-70`}></div>
          )}
          {decoration.type === 'x' && (
            <div className={`${decoration.color} ${decoration.size} opacity-70 font-bold`}>×</div>
          )}
        </div>
      ))}

      {/* Main content */}
      <div className="relative z-10 text-center">
        <div className="mb-6">
          <h2 className={`font-black text-gray-800 mb-4 tracking-tight ${titleSizes[size]}`}>
            COMING
          </h2>
          <h2 className={`font-black text-gray-800 -mt-4 tracking-tight ${titleSizes[size]}`}>
            SOON
          </h2>
        </div>
        
        <div className="space-y-4">
          <p className={`text-gray-600 font-medium ${descriptionSizes[size]} max-w-md mx-auto`}>
            {t(description)}
          </p>
          
          {size !== 'small' && (
            <div className="inline-flex items-center bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors cursor-pointer">
              {t('NOTIFY ME')}
            </div>
          )}
        </div>
      </div>

      {/* Bottom signature */}
      {size !== 'small' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <p className="text-xs text-gray-400 flex items-center">
            © 2024 by "Coming Soon" • Proudly created with{' '}
            <span className="ml-1 text-red-400">♥</span>
          </p>
          <div className="flex justify-center space-x-2 mt-1">
            <div className="w-4 h-4 bg-gray-400 rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">f</span>
            </div>
            <div className="w-4 h-4 bg-gray-400 rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">w</span>
            </div>
            <div className="w-4 h-4 bg-gray-400 rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">@</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComingSoon;
