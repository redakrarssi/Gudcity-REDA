import React from 'react';
import { Shield, Mail, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BannedProps {
  message?: string;
}

const Banned: React.FC<BannedProps> = ({ message }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authUserId');
    localStorage.removeItem('authUserData');
    localStorage.removeItem('authLastLogin');
    localStorage.removeItem('authSessionActive');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Shield className="w-16 h-16 text-red-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Account Suspended
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <p className="text-lg font-medium text-red-800 mb-4">
              Your account has been suspended and access is blocked.
            </p>
            <div className="bg-white rounded-md p-4 border border-gray-200 mb-6">
              <p className="text-gray-700 text-sm leading-relaxed">
                {message || 'Please contact our support team for assistance if you believe this is an error.'}
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2 text-blue-600 mb-4">
                <Mail className="w-5 h-5" />
                <span className="text-sm font-medium">Contact Support: support@gudcity.com</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Login
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          If you believe this is an error, please contact our support team.
        </p>
      </div>
    </div>
  );
};

export default Banned;
