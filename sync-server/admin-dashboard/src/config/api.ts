// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const API_KEY = import.meta.env.VITE_API_KEY || '';

// API Client
import axios from 'axios';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
});

// API Types
export interface HealthResponse {
  status: string;
  timestamp: string;
  database: {
    connected: boolean;
    latency: string;
    error?: string;
  };
  environment: string;
}

export interface AnalyticsResponse {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalSales: number;
    totalTransactions: number;
    averageSale: number;
  };
  topProducts: Array<{
    productId: string;
    _sum: {
      quantity: number;
      total: number;
    };
  }>;
}

// API Functions
export const checkHealth = async (): Promise<HealthResponse> => {
  const { data } = await api.get('/health');
  return data;
};

export const getAnalytics = async (
  storeId: string,
  startDate?: string,
  endDate?: string
): Promise<AnalyticsResponse> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const { data } = await api.get(`/api/analytics/${storeId}?${params}`);
  return data;
};
