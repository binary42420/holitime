// Mobile API client that connects to deployed backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://holitime-369017734615.us-central1.run.app';

export class MobileApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth methods
  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  // Shifts methods
  async getShifts() {
    return this.request('/api/shifts');
  }

  async getTodaysShifts() {
    return this.request('/api/shifts/today');
  }

  async getShift(id: string) {
    return this.request(`/api/shifts/${id}`);
  }

  // Add more methods as needed
}

export const mobileApi = new MobileApiClient();
