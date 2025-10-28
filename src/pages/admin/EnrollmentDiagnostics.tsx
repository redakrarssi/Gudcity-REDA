import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import EnrollmentErrorDiagnostic from '../../components/admin/EnrollmentErrorDiagnostic';

const EnrollmentDiagnosticsPage: React.FC = () => {
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Enrollment System Diagnostics</h1>
        <p className="mb-6 text-gray-600">
          This page provides diagnostic tools for troubleshooting enrollment-related issues.
          It shows detailed error logs and helps identify the root cause of enrollment failures.
        </p>
        
        <EnrollmentErrorDiagnostic />
      </div>
    </AdminLayout>
  );
};

export default EnrollmentDiagnosticsPage; 