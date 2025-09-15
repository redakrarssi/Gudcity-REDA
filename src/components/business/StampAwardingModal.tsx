import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, RefreshCw, User, X, Award } from 'lucide-react';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import type { LoyaltyCardQrCodeData, CustomerQrCodeData } from '../../types/qrCode';
import { guaranteedAwardPoints } from '../../utils/directPointsAwardService';

interface StampAwardingModalProps {
  onClose: () => void;
  scanData: LoyaltyCardQrCodeData | CustomerQrCodeData | null;
  businessId: string;
  onSuccess?: () => void;
}

export const StampAwardingModal: React.FC<StampAwardingModalProps> = ({
  onClose,
  scanData,
  businessId,
  onSuccess
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [programs, setPrograms] = useState<Array<{id: string; name: string}>>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState<boolean>(false);
  const [hasAwarded, setHasAwarded] = useState<boolean>(false);

  const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (requestTimeoutRef.current) clearTimeout(requestTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Fetch customer name and enrolled STAMPS programs
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!scanData || !scanData.customerId) return;
      try {
        const response = await fetch(`/api/customers/${scanData.customerId}`);
        if (response.ok) {
          const customerData = await response.json();
          setCustomerName(customerData?.name || `Customer #${scanData.customerId}`);
        } else {
          setCustomerName(`Customer #${scanData.customerId}`);
        }
      } catch {
        setCustomerName(`Customer #${scanData.customerId}`);
      }
    };

    const fetchStampPrograms = async () => {
      if (!scanData?.customerId || !businessId) return;
      setIsLoadingPrograms(true);
      try {
        const enrolled = await LoyaltyProgramService.getCustomerEnrolledProgramsForBusiness(
          String(scanData.customerId),
          String(businessId)
        );
        const stampsOnly = (enrolled || []).filter(p => p.type === 'STAMPS');
        const formatted = stampsOnly.map(p => ({ id: p.id, name: p.name }));
        setPrograms(formatted);
        if (formatted.length > 0) setSelectedProgramId(prev => prev || formatted[0].id);
        if (formatted.length === 0) setError(t('No stamp programs found for this customer'));
      } catch (e) {
        setError(t('Failed to load stamp programs'));
      } finally {
        setIsLoadingPrograms(false);
      }
    };

    fetchCustomerData();
    fetchStampPrograms();
  }, [scanData, businessId, t]);

  const handleAwardStamp = async () => {
    if (hasAwarded) return; // Enforce single stamp per transaction
    if (!selectedProgramId) {
      setError(t('Please select a program'));
      return;
    }
    if (!scanData?.customerId) {
      setError(t('Customer ID is missing'));
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      const result = await guaranteedAwardPoints({
        customerId: scanData.customerId,
        programId: selectedProgramId,
        points: 1,
        description: 'Stamp awarded via QR scanner',
        source: 'QR_STAMP',
        businessId
      });

      if (result.success) {
        setSuccess(t('Successfully awarded 1 stamp to {{name}}', { name: customerName }));
        setHasAwarded(true);
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['customerPoints', scanData.customerId] });
        queryClient.invalidateQueries({ queryKey: ['loyaltyCards', scanData.customerId] });
        if (onSuccess) onSuccess();
        requestTimeoutRef.current = setTimeout(() => onClose(), 1800);
      } else {
        setError(result.error || t('Failed to award stamp. Please try again.'));
      }
    } catch (err: any) {
      setError(err?.message || t('Error awarding stamp'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-4 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center">
            <Award className="mr-2" size={20} />
            {t('Award Stamp')}
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Customer Info */}
          <div className="mb-6 bg-green-50 p-4 rounded-lg flex items-center">
            <div className="bg-green-100 p-2 rounded-full mr-3">
              <User size={24} className="text-green-700" />
            </div>
            <div>
              <div className="font-medium">{customerName}</div>
              <div className="text-sm text-gray-500">{t('Customer ID')}: {scanData?.customerId}</div>
            </div>
          </div>

          {/* Program Selection (STAMPS only) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('Select Stamp Program')}
            </label>
            {isLoadingPrograms ? (
              <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
            ) : programs.length === 0 ? (
              <div className="text-center py-3 text-red-500 bg-red-50 rounded-md">
                <AlertCircle className="inline-block mr-1" size={16} />
                {t('No stamp programs found for this customer')}
              </div>
            ) : (
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={isProcessing || hasAwarded}
              >
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Stamp Info (always 1 per transaction) */}
          <div className="mb-4">
            <div className="w-full p-3 border border-green-200 rounded-md bg-green-50 text-green-800 flex items-center">
              <CheckCircle className="mr-2" size={16} />
              {t('Limit: 1 stamp per transaction')}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-start">
              <AlertCircle className="mt-0.5 mr-2 flex-shrink-0" size={16} />
              <div>{error}</div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 flex items-start">
              <CheckCircle className="mt-0.5 mr-2 flex-shrink-0" size={16} />
              <div>{success}</div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleAwardStamp}
              disabled={isProcessing || !selectedProgramId || programs.length === 0 || hasAwarded}
              className={`flex-1 py-3 rounded-md flex justify-center items-center font-medium ${
                isProcessing || !selectedProgramId || programs.length === 0 || hasAwarded
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="animate-spin mr-2" size={16} />
                  {t('Processing...')}
                </>
              ) : (
                <>
                  <Award className="mr-2" size={16} />
                  {t('Award 1 Stamp')}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {t('Cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


