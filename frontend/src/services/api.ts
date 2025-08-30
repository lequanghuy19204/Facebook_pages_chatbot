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
};

export default ApiService;
