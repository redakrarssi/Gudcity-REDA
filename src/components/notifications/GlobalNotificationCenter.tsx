import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Bell, 
  Check, 
  ThumbsUp, 
  ThumbsDown, 
  AlertCircle, 
  Clock,
  Gift,
  Tag,
  Award,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { EnrollmentErrorCode } from '../../utils/enrollmentErrorReporter';

/**
 * Global notification center component that displays as a drawer/modal
 * Shows both notifications and pending approval requests
 */
const GlobalNotificationCenter: React.FC = () => {
  const { 
    showNotificationCenter, 
    toggleNotificationCenter, 
    notifications,
    approvalRequests,
    markAsRead,
    respondToApproval,
    deleteNotification
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'notifications' | 'approvals'>('notifications');
  const [processingApprovals, setProcessingApprovals] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Format date to relative time (e.g. "2 hours ago")
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return 'just now';
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    } else if (diffDay < 30) {
      return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    if (type.includes('POINTS_ADDED')) {
      return <Gift className="h-5 w-5 text-green-500" />;
    } else if (type.includes('POINTS_DEDUCTED')) {
      return <Gift className="h-5 w-5 text-orange-500" />;
    } else if (type.includes('ENROLLMENT')) {
      return <Award className="h-5 w-5 text-blue-500" />;
    } else if (type.includes('PROMO')) {
      return <Tag className="h-5 w-5 text-purple-500" />;
    } else {
      return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <AnimatePresence>
      {showNotificationCenter && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={toggleNotificationCenter}
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 30 }}
            className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
              <button
                onClick={toggleNotificationCenter}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex-1 py-2 px-4 text-center ${
                  activeTab === 'notifications'
                    ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`flex-1 py-2 px-4 text-center ${
                  activeTab === 'approvals'
                    ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Approvals {approvalRequests.length > 0 && `(${approvalRequests.length})`}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-2">
              {activeTab === 'notifications' && (
                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        onClick={() => {
                          if (!notification.isRead) markAsRead(notification.id);
                        }}
                        className={`p-3 rounded-lg cursor-pointer ${
                          notification.isRead
                            ? 'bg-white dark:bg-gray-800'
                            : 'bg-blue-50 dark:bg-blue-900/20'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center mt-1">
                              {notification.businessName && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                                  {notification.businessName}
                                </span>
                              )}
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatRelativeTime(notification.createdAt)}
                              </span>
                            </div>
                          </div>
                          {!notification.isRead && (
                            <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 flex-shrink-0"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'approvals' && (
                <div className="space-y-3">
                  {approvalRequests.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                      <Check className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No pending approvals</p>
                    </div>
                  ) : (
                    approvalRequests.map(approval => (
                      <div
                        key={approval.id}
                        className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {approval.requestType === 'ENROLLMENT' ? (
                              <Award className="h-5 w-5 text-blue-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-orange-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {approval.requestType === 'ENROLLMENT'
                                ? 'Program Enrollment Request'
                                : 'Points Deduction Request'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {approval.requestType === 'ENROLLMENT'
                                ? `${approval.businessName} wants to enroll you in ${approval.data?.programName || 'a program'}.`
                                : `${approval.businessName} wants to deduct ${approval.data?.points || ''} points.`}
                            </p>
                            
                            {/* Display benefits if available */}
                            {approval.data?.benefits && (
                              <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                                <p className="font-medium">Benefits:</p>
                                <ul className="list-disc list-inside pl-2 mt-1">
                                  {approval.data.benefits.map((benefit: string, i: number) => (
                                    <li key={i}>{benefit}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Display reason if available */}
                            {approval.data?.reason && (
                              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                                <span className="font-medium">Reason: </span>
                                {approval.data.reason}
                              </p>
                            )}
                            
                            <div className="flex items-center space-x-2 mt-2">
                              <Clock className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatRelativeTime(approval.requestedAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex space-x-2">
                          <button
                            onClick={async () => {
                              if (processingApprovals[approval.id]) return;
                              setProcessingApprovals(prev => ({ ...prev, [approval.id]: true }));
                              setErrorMessage(null);
                              setErrorCode(null);
                              try {
                                await respondToApproval(approval.id, true);
                              } catch (error: any) {
                                console.error('Error approving request:', error);
                                setErrorMessage(error?.message || 'The enrollment process was interrupted');
                                setErrorCode(error?.code || EnrollmentErrorCode.TRANSACTION_FAILED);
                              } finally {
                                setProcessingApprovals(prev => ({ ...prev, [approval.id]: false }));
                              }
                            }}
                            disabled={processingApprovals[approval.id]}
                            className={`flex-1 flex items-center justify-center px-4 py-2 ${
                              processingApprovals[approval.id] 
                                ? 'bg-blue-400 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700'
                            } text-white text-sm font-medium rounded-md`}
                          >
                            {processingApprovals[approval.id] ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                              </>
                            ) : (
                              <>
                                <ThumbsUp className="h-4 w-4 mr-1" /> Approve
                              </>
                            )}
                          </button>
                          <button
                            onClick={async () => {
                              if (processingApprovals[approval.id]) return;
                              setProcessingApprovals(prev => ({ ...prev, [approval.id]: true }));
                              setErrorMessage(null);
                              setErrorCode(null);
                              try {
                                await respondToApproval(approval.id, false);
                              } catch (error: any) {
                                console.error('Error declining request:', error);
                                setErrorMessage(error?.message || 'The enrollment process was interrupted');
                                setErrorCode(error?.code || EnrollmentErrorCode.TRANSACTION_FAILED);
                              } finally {
                                setProcessingApprovals(prev => ({ ...prev, [approval.id]: false }));
                              }
                            }}
                            disabled={processingApprovals[approval.id]}
                            className={`flex-1 flex items-center justify-center px-4 py-2 ${
                              processingApprovals[approval.id]
                                ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                                : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                            } text-sm font-medium rounded-md`}
                          >
                            {processingApprovals[approval.id] ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                              </>
                            ) : (
                              <>
                                <ThumbsDown className="h-4 w-4 mr-1" /> Decline
                              </>
                            )}
                          </button>
                        </div>

                        {/* Error message display */}
                        {errorMessage && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                            <div className="flex items-start">
                              <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-red-800">
                                  Error: {errorCode === EnrollmentErrorCode.TRANSACTION_FAILED ? 
                                    'The enrollment process was interrupted' : 
                                    'Failed to process your request'}
                                </p>
                                <p className="text-sm text-red-700 mt-1">
                                  {errorMessage}
                                </p>
                                <p className="text-xs text-red-600 mt-2">
                                  Error code: {errorCode}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GlobalNotificationCenter;