import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, Activity } from 'lucide-react';
import { formatDateTime } from '../../utils/dateUtils';

interface BusinessTimelineEvent {
  id: string | number;
  eventType: string;
  title: string;
  description: string;
  eventDate: string;
  transactionCount?: number;
  dailyRevenue?: number;
}

interface BusinessTimeline {
  businessId: string | number;
  businessName: string;
  registeredAt: string;
  events: BusinessTimelineEvent[];
}

interface BusinessTimelineProps {
  timeline: BusinessTimeline | null;
  loading: boolean;
  businessId: string | number;
}

const BusinessTimeline: React.FC<BusinessTimelineProps> = ({
  timeline,
  loading,
  businessId
}) => {
  const { t } = useTranslation();
  
  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader className="h-6 w-6 text-blue-500 animate-spin" />
      </div>
    );
  }
  
  if (!timeline || timeline.businessId != businessId) {
    return (
      <div className="p-4 text-center text-gray-500">
        {t('Timeline data not available')}
      </div>
    );
  }
  
  return (
    <div className="px-6 py-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {t('Business Timeline')}
      </h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-9 top-0 bottom-0 w-0.5 bg-blue-100"></div>
        
        {/* Timeline events */}
        <div className="space-y-6">
          {timeline.events.map((event, index) => (
            <div key={event.id} className="flex items-start">
              {/* Timeline dot */}
              <div className="relative flex-shrink-0 h-5 w-5">
                <div className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full bg-blue-500"></div>
              </div>
              
              {/* Timeline content */}
              <div className="ml-6 bg-white rounded-md border border-gray-200 shadow-sm p-4 w-full">
                <div className="flex justify-between">
                  <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                  <span className="text-xs text-gray-500">{formatDateTime(event.eventDate)}</span>
                </div>
                
                <p className="mt-1 text-sm text-gray-600">{event.description}</p>
                
                {/* Transaction details if available */}
                {event.eventType === 'TRANSACTIONS' && event.transactionCount && (
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <Activity className="mr-1 h-4 w-4 text-green-500" />
                    <span>
                      {event.transactionCount} transactions, {event.dailyRevenue ? 
                        `$${event.dailyRevenue.toLocaleString()}` : '$0'} revenue
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BusinessTimeline;
