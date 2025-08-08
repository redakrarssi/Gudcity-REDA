import React from 'react';
import { Shield, AlertCircle, Mail, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SuspendedProps {
  reason: 'banned' | 'restricted';
  message?: string;
}

const Suspended: React.FC<SuspendedProps> = ({ reason, message }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear all auth data
    localStorage.removeItem('token');
    localStorage.removeItem('authUserId');
    localStorage.removeItem('authUserData');
    localStorage.removeItem('authLastLogin');
    localStorage.removeItem('authSessionActive');
    
    // Navigate to login
    navigate('/login');
  };

  const getStatusInfo = () => {
    if (reason === 'banned') {
      return {
        title: 'Account Suspended',
        icon: <Shield className="w-16 h-16 text-red-500" />,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        description: 'Your account has been suspended due to a violation of our terms of service.',
        defaultMessage: 'Your account access has been temporarily suspended. Please contact our support team for assistance.'
      };
    } else {
      return {
        title: 'Account Restricted',
        icon: <AlertCircle className="w-16 h-16 text-yellow-500" />,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        description: 'Your account has restricted access due to policy violations.',
        defaultMessage: 'Your account has limited functionality. Some features may be unavailable.'
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          {statusInfo.icon}
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {statusInfo.title}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className={`${statusInfo.bgColor} ${statusInfo.borderColor} border rounded-lg shadow-lg p-6`}>
          <div className="text-center">
            <p className={`text-lg font-medium ${statusInfo.textColor} mb-4`}>
              {statusInfo.description}
            </p>
            
            <div className="bg-white rounded-md p-4 border border-gray-200 mb-6">
              <p className="text-gray-700 text-sm leading-relaxed">
                {message || statusInfo.defaultMessage}
              </p>
            </div>

            {reason === 'banned' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2 text-blue-600 mb-4">
                  <Mail className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    Contact Support: support@gudcity.com
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Login
                </button>
              </div>
            )}

            {reason === 'restricted' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  You can continue using the platform with limited functionality.
                  Contact support if you believe this is an error.
                </p>
                
                <div className="flex items-center justify-center space-x-2 text-blue-600 mb-4">
                  <Mail className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    Support: support@gudcity.com
                  </span>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => navigate(-1)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                  >
                    Go Back
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
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

export default Suspended;
