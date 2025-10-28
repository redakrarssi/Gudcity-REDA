import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Star, MessageCircle, TrendingUp, Filter, Calendar } from 'lucide-react';
import { feedbackService, FeedbackStats, FeedbackData } from '../../services/feedbackService';

interface FeedbackAnalyzerProps {
  businessId: string | number;
}

export const FeedbackAnalyzer: React.FC<FeedbackAnalyzerProps> = ({ businessId }) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackData | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981'];

  useEffect(() => {
    loadFeedbackStats();
  }, [businessId, period]);

  const loadFeedbackStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const stats = await feedbackService.getBusinessFeedback(businessId, period);
      setFeedbackStats(stats);
    } catch (err) {
      setError('Failed to load feedback data. Please try again later.');
      console.error('Error loading feedback stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitResponse = async (feedbackId: string | number) => {
    if (!responseText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await feedbackService.respondToFeedback(feedbackId, responseText);
      setResponseText('');
      setSelectedFeedback(null);
      // Refresh data
      loadFeedbackStats();
    } catch (err) {
      console.error('Error responding to feedback:', err);
      setError('Failed to submit response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRatingWithStars = (rating: number) => {
    return (
      <div className="flex items-center">
        <span className="mr-1">{rating.toFixed(1)}</span>
        <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-600">
        <p className="text-center">{error}</p>
        <button 
          onClick={loadFeedbackStats}
          className="mt-2 mx-auto block px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
        >
          {t('Try Again')}
        </button>
      </div>
    );
  }

  if (!feedbackStats) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-gray-600 text-center">
        <p>{t('No feedback data available yet.')}</p>
      </div>
    );
  }

  const ratingDistributionData = Object.entries(feedbackStats.ratingDistribution).map(([rating, count]) => ({
    name: `${rating} ${t('Star')}${count !== 1 ? 's' : ''}`,
    value: count,
    rating: parseInt(rating)
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 md:mb-0">
          {t('Customer Satisfaction')}
        </h2>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-gray-500 mr-2" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'week' | 'month' | 'year')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">{t('Last Week')}</option>
              <option value="month">{t('Last Month')}</option>
              <option value="year">{t('Last Year')}</option>
            </select>
          </div>
          
          <button
            onClick={loadFeedbackStats}
            className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <TrendingUp className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Overall rating card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 rounded-xl p-6 flex flex-col items-center justify-center">
          <p className="text-blue-600 text-lg font-medium mb-2">{t('Average Rating')}</p>
          <div className="flex items-center mb-2">
            <span className="text-4xl font-bold text-blue-800 mr-2">
              {feedbackStats.averageRating.toFixed(1)}
            </span>
            <Star className="w-8 h-8 text-yellow-400" fill="currentColor" />
          </div>
          <p className="text-blue-600 text-sm">
            {t('From {{total}} ratings', { total: feedbackStats.totalFeedback })}
          </p>
        </div>
        
        <div className="md:col-span-2 bg-white border border-gray-100 rounded-xl p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-4">{t('Rating Distribution')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ratingDistributionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip 
                formatter={(value) => [`${value} ${t('ratings')}`, '']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {ratingDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.rating - 1]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent feedback */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-800 mb-4">{t('Recent Feedback')}</h3>
        
        <div className="space-y-4">
          {feedbackStats.recentFeedback.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('No feedback received yet')}</p>
          ) : (
            feedbackStats.recentFeedback.map((feedback) => (
              <div 
                key={String(feedback.transactionId)} 
                className="bg-gray-50 rounded-lg p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i}
                          className="w-5 h-5 mr-1" 
                          fill={i < feedback.rating ? '#FBBF24' : 'none'} 
                          stroke={i < feedback.rating ? '#FBBF24' : '#9CA3AF'}
                        />
                      ))}
                      <span className="text-gray-500 text-sm ml-2">
                        {new Date(feedback.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {feedback.comment && (
                      <p className="text-gray-700 mb-2">{feedback.comment}</p>
                    )}
                    
                    <div className="text-sm text-gray-500">
                      {t('Transaction Type')}: {feedback.transactionType.charAt(0).toUpperCase() + feedback.transactionType.slice(1)}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSelectedFeedback(feedback)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Response form */}
                {selectedFeedback?.transactionId === feedback.transactionId && (
                  <div className="mt-4 bg-white rounded-lg p-4 border border-blue-100 animate-fadeIn">
                    <h4 className="font-medium text-gray-800 mb-2">{t('Respond to Feedback')}</h4>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder={t('Type your response here...')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 h-24 resize-none"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedFeedback(null);
                          setResponseText('');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        {t('Cancel')}
                      </button>
                      <button
                        onClick={() => handleSubmitResponse(feedback.transactionId!)}
                        disabled={!responseText.trim() || isSubmitting}
                        className={`px-4 py-2 rounded-md text-white ${
                          !responseText.trim() || isSubmitting
                            ? 'bg-blue-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {isSubmitting ? t('Sending...') : t('Send Response')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}; 