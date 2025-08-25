const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  accountType: 'admin' | 'staff';
  companyName?: string;
  companyCode?: string;
}

export interface UserInfo {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  roles: string[];
  isActive: boolean;
  lastLogin?: string;
}

export interface CompanyInfo {
  companyId: string;
  companyName: string;
  companyCode: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  isActive: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  user?: UserInfo;
  company?: CompanyInfo;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

class ApiService {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    // Try to get token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }
  }

  private async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for refresh token
      ...options,
    };

    // Add authorization header if token exists
    if (this.accessToken) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${this.accessToken}`,
      };
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // Handle token refresh if access token expired
      if (response.status === 401 && endpoint !== '/auth/refresh') {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the original request with new token
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${this.accessToken}`,
          };
          const retryResponse = await fetch(url, config);
          return await retryResponse.json();
        }
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw new Error('Network error occurred');
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data: AuthResponse = await response.json();
        if (data.success && data.accessToken) {
          this.setAccessToken(data.accessToken);
          return true;
        }
      }

      // Refresh failed, clear tokens
      this.clearTokens();
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }

  setAccessToken(token: string) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  clearTokens() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success && response.accessToken) {
      this.setAccessToken(response.accessToken);
    }

    return response;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success && response.accessToken) {
      this.setAccessToken(response.accessToken);
    }

    return response;
  }

  async logout(): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/logout', {
      method: 'POST',
    });

    this.clearTokens();
    return response;
  }

  async getCurrentUser(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/me');
  }

  // User management endpoints
  async getUsers(): Promise<ApiResponse<UserInfo[]>> {
    return this.request<ApiResponse<UserInfo[]>>('/users');
  }

  async getPendingUsers(): Promise<ApiResponse<UserInfo[]>> {
    return this.request<ApiResponse<UserInfo[]>>('/users/pending');
  }

  async approveUser(userId: string): Promise<ApiResponse<UserInfo>> {
    return this.request<ApiResponse<UserInfo>>(`/users/${userId}/approve`, {
      method: 'PUT',
    });
  }

  async updateUserRoles(userId: string, roles: string[]): Promise<ApiResponse<UserInfo>> {
    return this.request<ApiResponse<UserInfo>>(`/users/${userId}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roles }),
    });
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<ApiResponse<UserInfo>> {
    return this.request<ApiResponse<UserInfo>>(`/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
  }

  // Health check
  async healthCheck(): Promise<string> {
    return this.request<string>('/auth/health');
  }
}

export const apiService = new ApiService();
export default apiService;
