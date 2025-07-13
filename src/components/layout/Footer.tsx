import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} GudCity. All rights reserved.
          </p>
          <div className="text-sm text-gray-500">
            <span className="px-1">Privacy Policy</span>
            <span className="px-1">|</span>
            <span className="px-1">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 