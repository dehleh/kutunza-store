import axios, { AxiosInstance, AxiosError } from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_KEY = import.meta.env.VITE_API_KEY || '';
const STORE_ID = import.meta.env.VITE_STORE_ID || '';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-Store-ID': STORE_ID,
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config: any) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: any) => response,
      (error: AxiosError) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private handleError(error: AxiosError) {
    if (!error.response) {
      toast.error('Network error - working offline');
      return;
    }

    const status = error.response.status;
    const message = (error.response.data as any)?.error || 'An error occurred';

    switch (status) {
      case 401:
        toast.error('Authentication failed');
        this.clearToken();
        window.location.href = '/login';
        break;
      case 403:
        toast.error('Access denied');
        break;
      case 404:
        toast.error('Resource not found');
        break;
      case 429:
        toast.error('Too many requests - please slow down');
        break;
      case 500:
        toast.error('Server error - please try again');
        break;
      default:
        toast.error(message);
    }
  }

  // Auth endpoints
  async login(username: string, password: string) {
    const response = await this.client.post('/api/auth/login', {
      username,
      password,
      storeId: STORE_ID,
    });
    return response.data;
  }

  async validateSession(token: string) {
    const response = await this.client.get('/api/auth/validate', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  // Products
  async getProducts(params?: { categoryId?: string; search?: string; isActive?: boolean }) {
    const response = await this.client.get('/api/products', { params });
    return response.data;
  }

  async getProduct(id: string) {
    const response = await this.client.get(`/api/products/${id}`);
    return response.data;
  }

  async createProduct(data: any) {
    const response = await this.client.post('/api/products', data);
    return response.data;
  }

  async updateProduct(id: string, data: any) {
    const response = await this.client.put(`/api/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: string) {
    const response = await this.client.delete(`/api/products/${id}`);
    return response.data;
  }

  // Categories
  async getCategories(isActive?: boolean) {
    const response = await this.client.get('/api/categories', {
      params: { isActive },
    });
    return response.data;
  }

  async createCategory(data: any) {
    const response = await this.client.post('/api/categories', data);
    return response.data;
  }

  async updateCategory(id: string, data: any) {
    const response = await this.client.put(`/api/categories/${id}`, data);
    return response.data;
  }

  // Sales
  async createSale(data: any) {
    const response = await this.client.post('/api/sales', data);
    return response.data;
  }

  async getSales(params?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    sessionId?: string;
  }) {
    const response = await this.client.get('/api/sales', { params });
    return response.data;
  }

  async getSale(id: string) {
    const response = await this.client.get(`/api/sales/${id}`);
    return response.data;
  }

  // Sessions
  async createSession(data: { openingCash: number }) {
    const response = await this.client.post('/api/sessions', data);
    return response.data;
  }

  async getActiveSession() {
    const response = await this.client.get('/api/sessions/active');
    return response.data;
  }

  async closeSession(sessionId: string, data: { closingCash: number }) {
    const response = await this.client.post(`/api/sessions/${sessionId}/close`, data);
    return response.data;
  }

  // Sync
  async syncPush(changes: any[]) {
    const response = await this.client.post('/api/sync/push', {
      storeId: STORE_ID,
      changes,
    });
    return response.data;
  }

  async syncPull(lastSyncTimestamp?: string) {
    const response = await this.client.get('/api/sync/pull', {
      params: {
        storeId: STORE_ID,
        lastSyncTimestamp,
      },
    });
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiClient = new ApiClient();
