import React, { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertCircle, Camera, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoyaltyCardService from '../services/loyaltyCardService';
import QrCodeService from '../services/qrCodeService';

interface ScanResult {
  type: string;
  data: any;
  timestamp: string;
  raw: string;
}

interface QRScannerProps {
  onScan?: (result: ScanResult) => void;
  businessId?: number | string;
  programId?: number | string;
  pointsToAward?: number;
}

export const QRScanner: React.FC<QRScannerProps> = ({ 
  onScan, 
  businessId,
  programId, 
  pointsToAward = 10 // Default to 10 points if not specified
}) => {
  const { t } = useTranslation();
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [processingCard, setProcessingCard] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize scanner
  useEffect(() => {
    const html5QrCode = new Html5Qrcode('qr-reader');
    setScanner(html5QrCode);

    return () => {
      if (scanning && html5QrCode) {
        try {
          html5QrCode.stop();
        } catch (err) {
          console.error('Error stopping scanner:', err);
        }
      }
    };
  }, []);

  const onScanSuccess = async (decodedText: string, result: any) => {
    if (!scanner || !businessId) return;
    
    try {
      setError(null);
      
      let parsedData: any;
      
      try {
        // Try to parse the QR code data as JSON
        parsedData = JSON.parse(decodedText);
      } catch (e) {
        // If it's not JSON, treat as plain text
        parsedData = { text: decodedText };
      }
      
      // Determine the type of QR code
      let type = 'unknown';
      let scanType: 'CUSTOMER_CARD' | 'PROMO_CODE' | 'LOYALTY_CARD' | null = null;
      
      if (parsedData.type === 'customer_card') {
        type = 'customer_card';
        scanType = 'CUSTOMER_CARD';
      } else if (parsedData.type === 'promo_code') {
        type = 'promo_code';
        scanType = 'PROMO_CODE';
      } else if (parsedData.cardId) {
        type = 'loyalty_card';
        scanType = 'LOYALTY_CARD';
      }
      
      const scanResult: ScanResult = {
        type,
        data: parsedData,
        timestamp: new Date().toISOString(),
        raw: decodedText
      };
      
      // Set last result
      setLastResult(scanResult);
      
      // Log the scan to the database (regardless of whether processing succeeds)
      if (scanType) {
        QrCodeService.logScan(
          scanType,
          businessId,
          parsedData,
          false, // Initially set to false, will update if processing succeeds
          {
            customerId: type === 'customer_card' ? parsedData.customerId : undefined,
            programId: programId || (type === 'loyalty_card' ? parsedData.programId : undefined),
            promoCodeId: type === 'promo_code' ? parsedData.code : undefined
          }
        );
      }
      
      // If this is a customer card and we have a business ID, try to process it
      if (type === 'customer_card' && parsedData.customerId) {
        await processCustomerCard(parsedData);
      }
      
      // Call onScan callback if provided
      if (onScan) {
        onScan(scanResult);
      }
    } catch (err) {
      console.error('Error processing scan:', err);
      setError('Failed to process QR code. Please try again.');
    }
  };

  const processCustomerCard = async (cardData: any) => {
    if (!businessId || !cardData.customerId) {
      return;
    }
    
    try {
      setProcessingCard(true);
      
      // Get customer ID from user ID
      const customerId = await LoyaltyCardService.getCustomerIdByUserId(cardData.customerId);
      
      if (customerId) {
        // Get customer's cards
        const cards = await LoyaltyCardService.getCustomerCards(customerId);
        
        // Find card for this business
        const businessIdNum = typeof businessId === 'string' ? parseInt(businessId) : businessId;
        
        // If programId is provided, find the card for that specific program
        let card;
        if (programId) {
          const programIdNum = typeof programId === 'string' ? parseInt(programId) : programId;
          card = cards.find(c => c.business_id === businessIdNum && c.program_id === programIdNum);
        } else {
          // Otherwise, just find any card for this business
          card = cards.find(c => c.business_id === businessIdNum);
        }
        
        if (card) {
          // Points to award - use the passed in value or default
          const pointsAwarded = pointsToAward || 10;
          
          // Card exists, add activity
          const success = await LoyaltyCardService.addCardActivity(
            card.id,
            'EARN_POINTS',
            pointsAwarded,
            'Points from QR scan',
            `QR-SCAN-${Date.now()}`
          );
          
          if (success) {
            // Update the scan log to mark as successful
            await QrCodeService.logScan(
              'CUSTOMER_CARD',
              businessId,
              cardData,
              true,
              {
                customerId,
                pointsAwarded,
                programId: card.program_id
              }
            );
            
            setSuccessMessage(`Successfully added ${pointsAwarded} points to ${cardData.name || 'customer'}'s card!`);
            
            // Clear success message after 3 seconds
            setTimeout(() => {
              setSuccessMessage(null);
            }, 3000);
          } else {
            const errorMsg = 'Failed to add points to the card';
            setError(errorMsg);
            
            // Log the error
            await QrCodeService.logScan(
              'CUSTOMER_CARD',
              businessId,
              cardData,
              false,
              {
                customerId,
                errorMessage: errorMsg
              }
            );
          }
        } else {
          const errorMsg = programId 
            ? 'No loyalty card found for this customer with the selected program' 
            : 'No loyalty card found for this customer with your business';
          setError(errorMsg);
          
          // Log the error
          await QrCodeService.logScan(
            'CUSTOMER_CARD',
            businessId,
            cardData,
            false,
            {
              customerId,
              errorMessage: errorMsg
            }
          );
        }
      } else {
        const errorMsg = 'No customer found for this QR code';
        setError(errorMsg);
        
        // Log the error
        await QrCodeService.logScan(
          'CUSTOMER_CARD',
          businessId,
          cardData,
          false,
          {
            errorMessage: errorMsg
          }
        );
      }
    } catch (err) {
      console.error('Error processing customer card:', err);
      const errorMsg = 'Failed to process customer card';
      setError(errorMsg);
      
      // Log the error
      await QrCodeService.logScan(
        'CUSTOMER_CARD',
        businessId,
        cardData,
        false,
        {
          errorMessage: errorMsg
        }
      );
    } finally {
      setProcessingCard(false);
    }
  };

  const startScanning = () => {
    if (!scanner) return;
    
    setError(null);
    setSuccessMessage(null);
    setLastResult(null);
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    scanner
      .start(
        { facingMode: 'environment' } as unknown as string, 
        config,
        onScanSuccess
      )
      .then(() => {
        setScanning(true);
      })
      .catch((err) => {
        console.error('Error starting scanner:', err);
        setError('Failed to start camera. Please ensure camera permissions are granted.');
      });
  };

  const stopScanning = () => {
    if (!scanner) return;
    
    scanner
      .stop()
      .then(() => {
        setScanning(false);
      })
      .catch((err) => {
        console.error('Error stopping scanner:', err);
      });
  };

  return (
    <div className="qr-scanner-container">
      {/* Scanner container */}
      <div 
        id="qr-reader" 
        className="relative w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-md"
        style={{ minHeight: '300px' }}
      ></div>
      
      {/* Controls */}
      <div className="mt-4 flex justify-center space-x-4">
        {!scanning ? (
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            onClick={startScanning}
          >
            <Camera className="w-5 h-5 mr-2" />
            {t('Start Scanning')}
          </button>
        ) : (
          <button 
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
            onClick={stopScanning}
          >
            <AlertCircle className="w-5 h-5 mr-2" />
            {t('Stop Scanning')}
          </button>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {/* Success message */}
      {successMessage && (
        <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg animate-fadeIn">
          <div className="flex items-center">
            <Check className="w-5 h-5 mr-2" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}
      
      {/* Last scan result */}
      {lastResult && !error && !successMessage && (
        <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg animate-fadeIn">
          <p className="font-medium">QR Code Scanned:</p>
          <p className="text-sm mt-1">
            {lastResult.type === 'customer_card' 
              ? `Customer ID: ${lastResult.data.customerId}` 
              : lastResult.type === 'promo_code' 
                ? `Promo code: ${lastResult.data.code}` 
                : `Data: ${JSON.stringify(lastResult.data).substring(0, 50)}...`}
          </p>
          {processingCard && (
            <p className="text-sm mt-1">Processing card...</p>
          )}
        </div>
      )}
    </div>
  );
};