import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { UserQrCodeService } from '../services/userQrCodeService';
import { StandardQrCodeData } from '../utils/standardQrCodeGenerator';
import { Clock } from 'lucide-react';
import crypto from 'crypto';

interface QRCardProps {
  userId: string;
  userName: string;
}

export const QRCard: React.FC<QRCardProps> = ({ userId, userName }) => {
  const { t } = useTranslation();
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uniqueCode, setUniqueCode] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  
  // Ensure we have a valid display name
  const displayName = userName && userName !== 'Customer User' 
    ? userName 
    : t('user.defaultName', 'Customer');

  useEffect(() => {
    const fetchOrCreateQrCode = async () => {
      try {
        // Get or create the customer's QR code
        const qrCode = await UserQrCodeService.getOrCreateCustomerQrCode({
          id: parseInt(userId),
          name: userName,
          email: '',  // Email is not needed here
          role: 'customer',
          user_type: 'customer'
        });
        
        if (qrCode) {
          // If we have a QR code URL from the database, use it directly
          // Instead of setting the data URL as the QR code content, create proper standardized content
          const standardData: StandardQrCodeData = {
            type: 'CUSTOMER_CARD',
            qrUniqueId: crypto.randomUUID(),
            timestamp: Date.now(),
            version: '1.0',
            customerId: userId,
            customerName: displayName
          };
          // Set the QR code data as a JSON string
          setQrData(JSON.stringify(standardData));
          setUniqueCode('••••••');  // This would come from the database in a real implementation
          
          // Get QR code details including expiration date
          const qrDetails = await UserQrCodeService.getQrCodeDetails(userId);
          if (qrDetails && qrDetails.expirationDate) {
            const expDate = new Date(qrDetails.expirationDate);
            setExpirationDate(expDate.toLocaleDateString());
            
            // Check if expiring within 7 days
            const now = new Date();
            const daysDifference = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            setIsExpiringSoon(daysDifference <= 7 && daysDifference > 0);
          }
        } else {
          // Fallback to generating a QR code on the fly with the standardized format
          const standardData: StandardQrCodeData = {
            type: 'CUSTOMER_CARD',
            qrUniqueId: crypto.randomUUID(),
            timestamp: Date.now(),
            version: '1.0',
            customerId: userId,
            customerName: displayName
          };
          setQrData(JSON.stringify(standardData));
          
          // Set default expiration date (30 days from now)
          const defaultExpDate = new Date();
          defaultExpDate.setDate(defaultExpDate.getDate() + 30);
          setExpirationDate(defaultExpDate.toLocaleDateString());
        }
      } catch (err) {
        console.error('Error getting QR code:', err);
        setError('Could not load your QR code');
        
        // Fallback to generated QR code with standardized format
        const standardData: StandardQrCodeData = {
          type: 'CUSTOMER_CARD',
          qrUniqueId: crypto.randomUUID(),
          timestamp: Date.now(),
          version: '1.0',
          customerId: userId,
          customerName: displayName
        };
        setQrData(JSON.stringify(standardData));
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchOrCreateQrCode();
    }
  }, [userId, userName, displayName]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm mx-auto">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 w-64 bg-gray-200 rounded-md"></div>
          <div className="h-4 w-24 bg-gray-200 rounded mt-4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('QRCard error:', error);
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{displayName}</h2>
        <p className="text-sm text-gray-500">{t('qrCard.showToCollect', 'Show this code to collect points')}</p>
      </div>
      
      <div className="flex justify-center p-4 bg-white rounded-lg">
        <QRCodeSVG
          value={qrData || ''}
          size={250}
          level="H"
          includeMargin={true}
          className="mx-auto"
          bgColor={"#ffffff"}
          fgColor={"#000000"}
        />
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">ID: {userId}</p>
        {uniqueCode && (
          <p className="text-xs font-semibold text-blue-600 mt-1">
            {t('qrCard.verificationCode', 'Verification Code')}: {uniqueCode}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {t('qrCard.updated', 'Updated')}: {new Date().toLocaleString()}
        </p>
        {expirationDate && (
          <div className={`mt-2 flex items-center justify-center ${isExpiringSoon ? 'text-orange-500' : 'text-gray-500'}`}>
            <Clock className="h-3 w-3 mr-1" />
            <p className="text-xs font-medium">
              {isExpiringSoon 
                ? t('qrCard.expiresSoon', 'Expires Soon: {{date}}', { date: expirationDate })
                : t('qrCard.expires', 'Expires: {{date}}', { date: expirationDate })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};