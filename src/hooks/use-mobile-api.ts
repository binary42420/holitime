'use client';

import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://holitime-369017734615.us-central1.run.app';
const IS_MOBILE = process.env.NEXT_PUBLIC_IS_MOBILE === 'true';

interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

class MobileApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    // Try to get token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      defaultHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    const defaultOptions: RequestInit = {
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          this.setToken(null);
          throw new Error('Authentication required');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.setToken(null);
    }
  }

  async getMe() {
    return this.request<any>('/api/auth/me');
  }

  // Shifts methods
  async getShifts() {
    return this.request<any[]>('/api/shifts');
  }

  async getTodaysShifts() {
    return this.request<any[]>('/api/shifts/today');
  }

  async getShift(id: string) {
    return this.request<any>(`/api/shifts/${id}`);
  }

  async clockIn(shiftId: string, assignmentId: string) {
    return this.request(`/api/shifts/${shiftId}/assigned/${assignmentId}/clock`, {
      method: 'POST',
      body: JSON.stringify({ action: 'clock_in' }),
    });
  }

  async clockOut(shiftId: string, assignmentId: string) {
    return this.request(`/api/shifts/${shiftId}/assigned/${assignmentId}/clock`, {
      method: 'POST',
      body: JSON.stringify({ action: 'clock_out' }),
    });
  }

  // Jobs methods
  async getJobs() {
    return this.request<any[]>('/api/jobs');
  }

  async getJob(id: string) {
    return this.request<any>(`/api/jobs/${id}`);
  }

  // Clients methods
  async getClients() {
    return this.request<any[]>('/api/clients');
  }

  // Timesheets methods
  async getTimesheets() {
    return this.request<any[]>('/api/timesheets');
  }

  async getPendingTimesheets() {
    return this.request<any[]>('/api/timesheets/pending');
  }
}

// Singleton instance
export const mobileApi = new MobileApiClient();

// Custom hook for API calls
export function useMobileApi<T>(
  endpoint: string | null,
  options?: RequestInit
): ApiResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!endpoint);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!endpoint) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await mobileApi.request<T>(endpoint, options);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, JSON.stringify(options)]);

  return { data, loading, error };
}

// Auth hook
export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await mobileApi.getMe();
        setUser(userData);
      } catch (err) {
        setUser(null);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await mobileApi.login(email, password);
      setUser(response.user);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await mobileApi.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };
}
