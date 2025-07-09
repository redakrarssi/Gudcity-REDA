import React from 'react';

interface IconBellProps {
  className?: string;
  showNotification?: boolean;
}

export const IconBell: React.FC<IconBellProps> = ({ 
  className = 'w-5 h-5',
  showNotification = false 
}) => {
  return (
    <div className="relative">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {showNotification && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"></span>
      )}
    </div>
  );
}; 