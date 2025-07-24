import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  Loader,
  Info
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
    deleteNotification,
    deleteAllNotifications
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'notifications' | 'approvals'>('notifications');
  const [processingApprovals, setProcessingApprovals] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [successMessages, setSuccessMessages] = useState<Record<string, string>>({});
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Clear any error messages when the notification center is closed
  useEffect(() => {
    if (!showNotificationCenter) {
      setErrorMessage(null);
      setErrorCode(null);
      setSuccessMessages({});
    }
  }, [showNotificationCenter]);

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'POINTS_ADDED':
        return (
          <div className="bg-green-100 dark:bg-green-900 p-1.5 rounded-full">
            <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
        );
      case 'PROMO_CODE':
        return (
          <div className="bg-purple-100 dark:bg-purple-900 p-1.5 rounded-full">
            <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
        );
      case 'ENROLLMENT':
      case 'ENROLLMENT_REQUEST':
        return (
          <div className="bg-blue-100 dark:bg-blue-900 p-1.5 rounded-full">
            <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
        );
      case 'ERROR':
        return (
          <div className="bg-red-100 dark:bg-red-900 p-1.5 rounded-full">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
        );
      default:
        return (
          <div className="bg-gray-100 dark:bg-gray-900 p-1.5 rounded-full">
            <Info className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
        );
    }
  };

  const handleClearAll = async () => {
    setIsDeleting(true);
    try {
      await deleteAllNotifications();
      // Deletion handling is done in the context
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
    <AnimatePresence>
      {showNotificationCenter && (
        <>
            {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={toggleNotificationCenter}
          />
          
            {/* Notification center */}
          <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold flex items-center">
                  <Bell className="mr-2" /> Notifications
                </h2>
              <button
                onClick={toggleNotificationCenter}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Close notifications"
              >
                  <X />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('notifications')}
                  className={`flex-1 py-3 text-center font-medium ${
                  activeTab === 'notifications'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                  className={`flex-1 py-3 text-center font-medium ${
                  activeTab === 'approvals'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                  Approvals ({approvalRequests.length})
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                {activeTab === 'notifications' ? (
                  <>
                  {notifications.length === 0 ? (
                      <div className="text-center p-6 text-gray-500 dark:text-gray-400">
                        <Bell className="mx-auto mb-3 w-12 h-12 opacity-30" />
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                      <div>
                        {/* Clear All button */}
                        <div className="flex justify-end mb-4">
                          <button
                            onClick={handleClearAll}
                            disabled={isDeleting || notifications.length === 0}
                            className={`flex items-center py-1 px-3 text-sm rounded-md
                              ${isDeleting
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
                              }`}
                          >
                            {isDeleting ? (
                              <>
                                <Loader className="w-3 h-3 mr-2 animate-spin" />
                                Clearing...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-3 h-3 mr-2" />
                                Clear All
                              </>
                            )}
                          </button>
                        </div>
                        
                        {/* Notifications list */}
                      <div className="space-y-2">
                        {notifications.map(notification => (
                      <div
                        key={notification.id}
                              className="p-4 rounded-lg shadow-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0">
                                    {getNotificationIcon(notification.type)}
                          </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">
                              {notification.title}
                                    {!notification.isRead && (
                                      <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-600"></span>
                                    )}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">
                              {notification.message}
                            </p>
                                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                {formatRelativeTime(notification.createdAt)}
                                  </div>
                                </div>
                              </div>
                              <div className="ml-2">
                                <button
                                  onClick={() => deleteNotification(notification.id)}
                                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                                  aria-label="Delete notification"
                                >
                                  <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                  {approvalRequests.length === 0 ? (
                      <div className="text-center p-6 text-gray-500 dark:text-gray-400">
                        <ThumbsUp className="mx-auto mb-3 w-12 h-12 opacity-30" />
                      <p>No pending approvals</p>
                    </div>
                  ) : (
                      <div className="space-y-3">
                        {approvalRequests.map(approval => (
                      <div
                        key={approval.id}
                            className={`p-4 rounded-lg shadow bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 ${
                              successMessages[approval.id] ? 'border-green-300 dark:border-green-700' : ''
                            }`}
                          >
                            {/* Success message if present */}
                            {successMessages[approval.id] && (
                              <div className="mb-3 p-2 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-sm rounded flex items-center">
                                <Check className="mr-2 w-4 h-4" />
                                {successMessages[approval.id]}
                              </div>
                            )}
                            
                            {/* Error message if present and matches this approval */}
                            {errorMessage && errorCode === approval.id && (
                              <div className="mb-3 p-2 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 text-sm rounded flex items-center">
                                <AlertTriangle className="mr-2 w-4 h-4" />
                                {errorMessage}
                          </div>
                            )}
                            
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
                            
                              {/* Approval actions */}
                        <div className="mt-3 flex space-x-2">
                          <button
                            onClick={async () => {
                              if (processingApprovals[approval.id]) return;
                              setProcessingApprovals(prev => ({ ...prev, [approval.id]: true }));
                              setErrorMessage(null);
                              setErrorCode(null);
                              try {
                                await respondToApproval(approval.id, true);
                                      setSuccessMessages(prev => ({ 
                                        ...prev, 
                                        [approval.id]: `Successfully enrolled in ${approval.data?.programName || 'the program'}` 
                                      }));
                                      
                                      // Close the notification center after a short delay to show feedback
                                      setTimeout(() => {
                                        toggleNotificationCenter();
                                      }, 5000);
                              } catch (error: any) {
                                console.error('Error approving request:', error);
                                setErrorMessage(error?.message || 'The enrollment process was interrupted');
                                      setErrorCode(approval.id);
                              } finally {
                                setProcessingApprovals(prev => ({ ...prev, [approval.id]: false }));
                              }
                            }}
                                  disabled={processingApprovals[approval.id] || !!successMessages[approval.id]}
                            className={`flex-1 flex items-center justify-center px-4 py-2 ${
                              processingApprovals[approval.id] 
                                ? 'bg-blue-400 cursor-not-allowed' 
                                      : successMessages[approval.id]
                                        ? 'bg-green-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                            } text-white text-sm font-medium rounded-md`}
                          >
                            {processingApprovals[approval.id] ? (
                                    <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                      Processing
                                    </span>
                                  ) : successMessages[approval.id] ? (
                                    <span className="flex items-center">
                                      <Check className="mr-1" size={16} />
                                      Approved
                                    </span>
                                  ) : (
                                    <span className="flex items-center">
                                      <ThumbsUp className="mr-1" size={16} />
                                      Approve
                                    </span>
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
                                      setSuccessMessages(prev => ({ 
                                        ...prev, 
                                        [approval.id]: `Declined enrollment in ${approval.data?.programName || 'the program'}` 
                                      }));
                                      
                                      // Close the notification center after a short delay
                                      setTimeout(() => {
                                        toggleNotificationCenter();
                                      }, 5000);
                              } catch (error: any) {
                                console.error('Error declining request:', error);
                                setErrorMessage(error?.message || 'The enrollment process was interrupted');
                                      setErrorCode(approval.id);
                              } finally {
                                setProcessingApprovals(prev => ({ ...prev, [approval.id]: false }));
                              }
                            }}
                                  disabled={processingApprovals[approval.id] || !!successMessages[approval.id]}
                            className={`flex-1 flex items-center justify-center px-4 py-2 ${
                              processingApprovals[approval.id]
                                ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                                      : successMessages[approval.id]
                                        ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                                : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                            } text-sm font-medium rounded-md`}
                          >
                            {processingApprovals[approval.id] ? (
                                    <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                      Processing
                                    </span>
                                  ) : successMessages[approval.id] ? (
                                    <span className="flex items-center">
                                      <X className="mr-1" size={16} />
                                      Declined
                                    </span>
                                  ) : (
                                    <span className="flex items-center">
                                      <ThumbsDown className="mr-1" size={16} />
                                      Decline
                                    </span>
                            )}
                          </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                  )}
                  </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
};

export default GlobalNotificationCenter;