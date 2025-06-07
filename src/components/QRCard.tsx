import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';

interface QRCardProps {
  userId: string;
  userName: string;
}

export const QRCard: React.FC<QRCardProps> = ({ userId, userName }) => {
  const { t } = useTranslation();
  
  // Ensure we have a valid display name
  const displayName = userName && userName !== 'Customer User' 
    ? userName 
    : t('user.defaultName', 'Customer');
  
  // Log for debugging
  console.log('QRCard received props:', { userId, userName, displayName });
  
  // Create a QR code with more information for better scanning
  const qrData = JSON.stringify({
    type: 'customer_card',
    customerId: userId,
    name: displayName,
    timestamp: new Date().toISOString(),
    app: 'GudCity Loyalty'
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{displayName}</h2>
        <p className="text-sm text-gray-500">{t('qrCard.showToCollect', 'Show this code to collect points')}</p>
      </div>
      
      <div className="flex justify-center p-4 bg-white rounded-lg">
        <QRCodeSVG
          value={qrData}
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
        <p className="text-xs text-gray-400 mt-1">{t('qrCard.updated', 'Updated')}: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};