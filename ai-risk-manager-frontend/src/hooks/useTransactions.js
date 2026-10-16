import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

const getApiKey = () => localStorage.getItem('rm_active_api_key');

export const useTransactionStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.get('/v1/transactions/stats', {
        headers: { 'X-API-Key': getApiKey() }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch transaction stats:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

export const useTransactionList = (filters = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.get('/v1/transactions', {
        headers: { 'X-API-Key': getApiKey() },
        params: {
          page: filters.page || 1,
          limit: filters.limit || 20,
          decision: filters.decision || undefined,
          from_date: filters.from_date || undefined,
          to_date: filters.to_date || undefined,
          search: filters.search || undefined,
        },
      });
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filters.page, filters.limit, filters.decision, filters.from_date, filters.to_date, filters.search]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { data, loading, error, refetch: fetchTransactions };
};
