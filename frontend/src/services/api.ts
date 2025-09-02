// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterAdminData {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
  company_code: string;
  company_email?: string;
  company_phone?: string;
  company_address?: string;
  company_website?: string;
}

export interface RegisterStaffData {
  email: string;
  password: string;
  full_name: string;
  company_code: string;
  phone?: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    user_id: string;
    email: string;
    full_name: string;
    roles: string[];
    company_id: string;
    is_active: boolean;
  };
  company: {
    company_id: string;
    company_name: string;
    company_code: string;
  };
}

// Facebook Types
export interface FacebookOAuthUrl {
  oauth_url: string;
  state: string;
}

export interface FacebookConnectionStatus {
  is_connected: boolean;
  connected_by?: string;
  connected_at?: string;
  facebook_user_name?: string;
  pages_count?: number;
  last_sync?: string;
  sync_status?: string;
  error_message?: string;
}

export interface FacebookPage {
  page_id: string;
  company_id: string;
  facebook_page_id: string;
  name: string;
  category?: string;
  category_list?: Array<{ id: string; name: string }>;
  access_token: string;
  is_active: boolean;
  last_sync?: string;
  sync_status: string;
  picture_url?: string;
  picture_cloudflare_url?: string;
  picture_cloudflare_key?: string;
  tasks?: string[];
  imported_by: string;
  imported_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FacebookSyncResult {
  pages_synced: number;
  pages_total: number;
  sync_status: string;
  error_message?: string;
  failed_pages?: string[];
}

// API service
const ApiService = {
  // Authentication
  auth: {
    // Login
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Login failed');
        }

        return await response.json();
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },

    // Register Admin (create new company)
    registerAdmin: async (data: RegisterAdminData): Promise<AuthResponse> => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/register/admin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Admin registration failed');
        }

        return await response.json();
      } catch (error) {
        console.error('Admin registration error:', error);
        throw error;
      }
    },

    // Register Staff (join existing company)
    registerStaff: async (data: RegisterStaffData): Promise<{ message: string }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/register/staff`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Staff registration failed');
        }

        return await response.json();
      } catch (error) {
        console.error('Staff registration error:', error);
        throw error;
      }
    },

    // Logout
    logout: async (token: string): Promise<{ message: string }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Logout failed');
        }

        return await response.json();
      } catch (error) {
        console.error('Logout error:', error);
        throw error;
      }
    },

    // Get user profile
    getProfile: async (token: string): Promise<any> => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get profile');
        }

        return await response.json();
      } catch (error) {
        console.error('Get profile error:', error);
        throw error;
      }
    },
  },

  // Facebook Integration
  facebook: {
    // Get Facebook OAuth URL
    getOAuthUrl: async (token: string): Promise<FacebookOAuthUrl> => {
      try {
        const response = await fetch(`${API_BASE_URL}/facebook/oauth-url`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get OAuth URL');
        }

        return await response.json();
      } catch (error) {
        console.error('Get OAuth URL error:', error);
        throw error;
      }
    },

    // Connect Facebook account
    connect: async (token: string, code: string, state?: string): Promise<FacebookConnectionStatus> => {
      try {
        const response = await fetch(`${API_BASE_URL}/facebook/connect`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to connect Facebook');
        }

        return await response.json();
      } catch (error) {
        console.error('Facebook connect error:', error);
        throw error;
      }
    },

    // Get Facebook connection status
    getStatus: async (token: string): Promise<FacebookConnectionStatus> => {
      try {
        const response = await fetch(`${API_BASE_URL}/facebook/status`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get Facebook status');
        }

        return await response.json();
      } catch (error) {
        console.error('Get Facebook status error:', error);
        throw error;
      }
    },

    // Get Facebook pages
    getPages: async (token: string): Promise<FacebookPage[]> => {
      try {
        const response = await fetch(`${API_BASE_URL}/facebook/pages`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get Facebook pages');
        }

        return await response.json();
      } catch (error) {
        console.error('Get Facebook pages error:', error);
        throw error;
      }
    },

    // Sync Facebook pages
    sync: async (token: string): Promise<FacebookSyncResult> => {
      try {
        const response = await fetch(`${API_BASE_URL}/facebook/sync`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to sync Facebook pages');
        }

        return await response.json();
      } catch (error) {
        console.error('Facebook sync error:', error);
        throw error;
      }
    },

    // Disconnect Facebook
    disconnect: async (token: string): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/facebook/disconnect`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to disconnect Facebook');
        }

        return await response.json();
      } catch (error) {
        console.error('Facebook disconnect error:', error);
        throw error;
      }
    },
  },
};

export default ApiService;
