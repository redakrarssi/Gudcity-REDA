import { useState, useEffect, useCallback, useRef } from 'react';
import type { AdminAnalytics } from '../types/analytics';

interface UseAnalyticsOptions {
  period?: 'day' | 'week' | 'month' | 'year';
  currency?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseAnalyticsReturn {
  data: AdminAnalytics | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  dataSource: 'database' | 'mock' | null;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const {
    period = 'month',
    currency = 'USD',
    autoRefresh = true,
    refreshInterval = 30000 // 30 seconds default
  } = options;

  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'database' | 'mock' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchAnalytics = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      
      const params = new URLSearchParams({
        period,
        currency
      });

      const response = await fetch(`/api/analytics/admin?${params}`, {
        signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const analyticsData = await response.json();
      
      if (signal?.aborted) return;

      setData(analyticsData);
      setLastUpdated(new Date());
      setDataSource(analyticsData.dataSource || 'mock');
      setLoading(false);
    } catch (err) {
      if (signal?.aborted) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(errorMessage);
      setLoading(false);
      console.error('Error fetching analytics:', err);
    }
  }, [period, currency]);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await fetchAnalytics();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchAnalytics, isRefreshing]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, refresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Abort ongoing requests when dependencies change
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    fetchAnalytics(abortControllerRef.current.signal);
  }, [period, currency]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    dataSource,
    refresh,
    isRefreshing
  };
}