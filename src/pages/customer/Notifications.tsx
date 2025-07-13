import React from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import NotificationList from '../../components/customer/NotificationList';
import { Bell, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PointsNotificationHandler from '../../components/notifications/PointsNotificationHandler';

const CustomerNotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const goBack = () => {
    navigate(-1);
  };
  
  return (
    <CustomerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={goBack} 
              className="mr-3 p-2 rounded-full hover:bg-gray-100"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-semibold flex items-center">
              <Bell className="mr-2 text-blue-600" size={24} />
              {t('Notifications')}
            </h1>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <NotificationList showHeader={false} />
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerNotificationsPage; 