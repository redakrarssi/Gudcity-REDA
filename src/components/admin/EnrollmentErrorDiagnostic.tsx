import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { UserRole } from '../../services/userService';

interface EnrollmentError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
  customerId?: string;
  programId?: string;
}

const EnrollmentErrorDiagnostic: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedError, setSelectedError] = useState<EnrollmentError | null>(null);
  
  // Fetch enrollment errors
  const { data, isLoading, error } = useQuery({
    queryKey: ['enrollmentErrors'],
    queryFn: async () => {
      const response = await axios.get('/api/debug/enrollment-errors');
      return response.data;
    },
    enabled: !!user && user.role === 'admin',
    refetchInterval: 30000 // Refetch every 30 seconds
  });
  
  // Clear errors mutation
  const clearErrorsMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/debug/clear-enrollment-errors');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollmentErrors'] });
      setSelectedError(null);
    }
  });
  
  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Handle clear errors
  const handleClearErrors = () => {
    if (confirm('Are you sure you want to clear all enrollment error logs?')) {
      clearErrorsMutation.mutate();
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['enrollmentErrors'] });
  };
  
  if (user?.role !== 'admin') {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        <AlertCircle className="inline-block mr-2" size={18} />
        This page is only accessible to administrators.
      </div>
    );
  }
  
  if (isLoading) {
    return <div className="p-4">Loading error logs...</div>;
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        <AlertCircle className="inline-block mr-2" size={18} />
        Failed to load enrollment errors.
      </div>
    );
  }
  
  const errors = data?.errors || [];
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Enrollment Error Diagnostic</h2>
        <div className="space-x-2">
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center"
            disabled={isLoading}
          >
            <RefreshCw className="mr-1" size={16} />
            Refresh
          </button>
          <button
            onClick={handleClearErrors}
            className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center"
            disabled={clearErrorsMutation.isPending}
          >
            <Trash2 className="mr-1" size={16} />
            Clear Logs
          </button>
        </div>
      </div>
      
      {errors.length === 0 ? (
        <div className="p-4 bg-gray-50 text-gray-500 rounded-md text-center">
          No enrollment errors found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 border rounded-md overflow-hidden">
            <div className="bg-gray-50 p-3 border-b">
              <h3 className="font-medium">Error List ({errors.length})</h3>
            </div>
            <div className="overflow-auto max-h-[600px]">
              {errors.map((error: EnrollmentError, index: number) => (
                <div
                  key={index}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedError === error ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedError(error)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        error.code.includes('ERR_TRANSACTION') ? 'bg-red-500' :
                        error.code.includes('ERR_DATABASE') ? 'bg-orange-500' :
                        'bg-yellow-500'
                      }`} />
                    </div>
                    <div className="ml-2">
                      <div className="font-medium text-sm">{error.code}</div>
                      <div className="text-xs text-gray-500 truncate">{error.message}</div>
                      <div className="text-xs text-gray-400">{formatTimestamp(error.timestamp)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="md:col-span-2 border rounded-md">
            {selectedError ? (
              <div className="p-4">
                <h3 className="font-bold mb-2">{selectedError.code}</h3>
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-500">Message</div>
                  <div className="p-2 bg-gray-50 rounded">{selectedError.message}</div>
                </div>
                
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-500">Timestamp</div>
                  <div className="p-2 bg-gray-50 rounded">{formatTimestamp(selectedError.timestamp)}</div>
                </div>
                
                {selectedError.requestId && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-500">Request ID</div>
                    <div className="p-2 bg-gray-50 rounded">{selectedError.requestId}</div>
                  </div>
                )}
                
                {selectedError.customerId && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-500">Customer ID</div>
                    <div className="p-2 bg-gray-50 rounded">{selectedError.customerId}</div>
                  </div>
                )}
                
                {selectedError.programId && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-500">Program ID</div>
                    <div className="p-2 bg-gray-50 rounded">{selectedError.programId}</div>
                  </div>
                )}
                
                {selectedError.details && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-500">Details</div>
                    <pre className="p-2 bg-gray-50 rounded overflow-auto text-xs">
                      {JSON.stringify(selectedError.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                Select an error to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrollmentErrorDiagnostic; 