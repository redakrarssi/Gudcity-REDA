import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  User,
  Calendar,
  MapPin,
  Phone,
  DollarSign,
  Briefcase,
  Tag,
  Users,
  Activity,
  Mail,
  ExternalLink,
  BarChart2
} from 'lucide-react';
import { formatDate, formatDateTime, formatRegistrationDuration, calculateMonthsRegistered } from '../../utils/dateUtils';
import BusinessTimeline from './BusinessTimeline';

interface Business {
  id: number | string;
  userId: number | string;
  name: string;
  owner: string;
  email: string;
  phone: string;
  address: string;
  type: string;
  status: string;
  currency: string;
  registeredAt: string;
  lastLogin?: string;
  programCount: number;
  customerCount: number;
  promotionCount: number;
  programs: any[];
  promotions: any[];
  recentLogins: any[];
}

interface BusinessTimelineEvent {
  id: string | number;
  eventType: string;
  title: string;
  description: string;
  eventDate: string;
}

interface BusinessTimeline {
  businessId: string | number;
  businessName: string;
  registeredAt: string;
  events: BusinessTimelineEvent[];
}

interface BusinessDetailsProps {
  business: Business;
  timeline: BusinessTimeline | null;
  timelineLoading: boolean;
  businessId: string | number;
}

const BusinessDetails: React.FC<BusinessDetailsProps> = ({
  business,
  timeline,
  timelineLoading,
  businessId
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-gray-50 border-t border-b border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-4">
        {/* Business details column */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t('Business Details')}
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-start">
              <User className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {t('Owner')}
                </div>
                <div className="text-sm text-gray-500">
                  {business.owner}
                </div>
              </div>
            </div>
            
            <div className="flex items-start">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {t('Email')}
                </div>
                <div className="text-sm text-gray-500">
                  {business.email}
                </div>
              </div>
            </div>
            
            <div className="flex items-start">
              <Phone className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {t('Phone')}
                </div>
                <div className="text-sm text-gray-500">
                  {business.phone}
                </div>
              </div>
            </div>
            
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {t('Address')}
                </div>
                <div className="text-sm text-gray-500">
                  {business.address}
                </div>
              </div>
            </div>
            
            <div className="flex items-start">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {t('Registered')}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(business.registeredAt)}
                  <div className="text-xs text-gray-400">
                    {formatRegistrationDuration(business.registeredAt)}
                  </div>
                  <div className="text-xs text-blue-600 font-medium">
                    {calculateMonthsRegistered(business.registeredAt)} months registered
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-start">
              <DollarSign className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {t('Currency')}
                </div>
                <div className="text-sm text-gray-500">
                  {business.currency}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Programs & Customers column */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t('Programs & Customers')}
          </h3>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Briefcase className="h-4 w-4 mr-1 text-blue-500" />
              {t('Loyalty Programs')}
              <span className="ml-1 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded">
                {business.programCount}
              </span>
            </h4>
            
            {business.programs && business.programs.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {business.programs.slice(0, 5).map((program: any) => (
                  <div key={program.id} className="bg-gray-50 p-2 rounded text-sm">
                    <div className="font-medium text-gray-700">{program.name}</div>
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>{formatDate(program.created_at)}</span>
                      <span className={`px-1 py-0.5 rounded text-xs ${
                        program.status === 'active' ? 'bg-green-100 text-green-800' : 
                        program.status === 'inactive' ? 'bg-gray-100 text-gray-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {program.status}
                      </span>
                    </div>
                  </div>
                ))}
                {business.programs.length > 5 && (
                  <div className="text-xs text-center text-blue-600">
                    {t('And {count} more programs', { count: business.programs.length - 5 })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                {t('No loyalty programs found')}
              </div>
            )}
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Users className="h-4 w-4 mr-1 text-green-500" />
              {t('Customers')}
              <span className="ml-1 bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded">
                {business.customerCount}
              </span>
            </h4>
            
            <div className="text-sm text-gray-600">
              {t('{count} customers enrolled in loyalty programs', { count: business.customerCount })}
            </div>
            
            <div className="mt-2 flex justify-end">
              <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                {t('View Details')}
                <ExternalLink className="h-3 w-3 ml-1" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Promotions & Activity column */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t('Promotions & Activity')}
          </h3>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Tag className="h-4 w-4 mr-1 text-purple-500" />
              {t('Promotions')}
              <span className="ml-1 bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded">
                {business.promotionCount}
              </span>
            </h4>
            
            {business.promotions && business.promotions.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {business.promotions.slice(0, 3).map((promo: any) => (
                  <div key={promo.id} className="bg-gray-50 p-2 rounded text-sm">
                    <div className="font-medium text-gray-700">{promo.code}</div>
                    <div className="text-xs text-gray-500">
                      {promo.description || t('No description')}
                    </div>
                  </div>
                ))}
                {business.promotions.length > 3 && (
                  <div className="text-xs text-center text-blue-600">
                    {t('And {count} more promotions', { count: business.promotions.length - 3 })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                {t('No promotions found')}
              </div>
            )}
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Activity className="h-4 w-4 mr-1 text-blue-500" />
              {t('Recent Activity')}
            </h4>
            
            {business.lastLogin ? (
              <div className="text-sm text-gray-600">
                {t('Last login: {date}', { date: formatDateTime(business.lastLogin) })}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                {t('No recent activity')}
              </div>
            )}
            
            <div className="mt-2 flex justify-end">
              <Link to={`/admin/businesses/${business.id}/analytics`} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                {t('View Analytics')}
                <BarChart2 className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Timeline section */}
      <div className="border-t border-gray-200">
        <BusinessTimeline 
          timeline={timeline} 
          loading={timelineLoading}
          businessId={businessId}
        />
      </div>
    </div>
  );
};

export default BusinessDetails;
