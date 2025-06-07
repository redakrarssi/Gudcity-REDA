import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import env from '../utils/env';

const DatabaseConnectionAlert: React.FC = () => {
  const [showAlert, setShowAlert] = useState<boolean>(false);

  useEffect(() => {
    // Check if database connection is configured
    const hasDbConnection = !!env.DATABASE_URL;
    setShowAlert(!hasDbConnection);
  }, []);

  if (!showAlert) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 fixed bottom-0 right-0 m-4 max-w-md z-50 shadow-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-amber-800">
            Database Connection Not Configured
          </h3>
          <p className="mt-2 text-sm text-amber-700">
            The application is running in mock data mode. You can login with these demo accounts:
          </p>
          <ul className="mt-1 text-xs text-amber-700 list-disc ml-6">
            <li><strong>Admin:</strong> admin@gudcity.com / password</li>
            <li><strong>Customer:</strong> customer@example.com / password</li>
            <li><strong>Business:</strong> business@example.com / password</li>
          </ul>
          <p className="mt-2 text-xs text-amber-700">
            To connect to a real database, configure the VITE_DATABASE_URL environment variable.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DatabaseConnectionAlert; 