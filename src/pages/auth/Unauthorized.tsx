import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Unauthorized = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldOff className="h-12 w-12 text-red-600" />
          </div>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t('Access Denied')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('You do not have permission to access this resource.')}
          </p>
          
          {user && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-700">
                {t('Logged in as')}: <span className="font-semibold">{user.name}</span> 
                <br />
                {t('Role')}: <span className="font-semibold">{user.role}</span>
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-8 flex flex-col gap-3">
          <Link
            to="/"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('Back to Homepage')}
          </Link>
          
          {user && user.role === 'admin' && (
            <Link
              to="/admin/dashboard"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('Go to Admin Dashboard')}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Unauthorized; 