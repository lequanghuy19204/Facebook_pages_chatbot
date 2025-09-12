const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';


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


export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff',
  MANAGE_USER = 'manage_user',
  MANAGE_PRODUCTS = 'manage_products',
  MANAGE_CHATBOT = 'manage_chatbot'
}


export interface User {
  id: string;
  full_name: string;
  email: string;
  roles: string[];
  is_active: boolean;
  facebook_pages: number;
  total_facebook_pages: number;
  last_login: Date | null;
  created_at: Date;
  avatar: string | null;
  is_online: boolean;
  facebook_pages_access?: string[];
  phone?: string;
}

export interface PendingUser {
  id: string;
  full_name: string;
  email: string;
  company_code: string;
  created_at: Date;
  requested_role: string;
}

export interface UserStats {
  totalUsers: number;
  maxUsers: number;
  activeUsers: number;
  pendingUsers: number;
  adminUsers: number;
  facebookUsers: number;
  inactiveUsers: number;
  onlineUsers: number;
  offlineUsers: number;
}

export interface UsersResponse {
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  stats: UserStats;
}


export interface CompanyInfo {
  company_id: string;
  company_name: string;
  company_code: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  settings: {
    timezone: string;
    language: string;
    currency: string;
    max_users: number;
    current_users: number;
  };
  facebook?: {
    is_connected: boolean;
    connected_by?: string;
    connected_at?: string;
    facebook_user_name?: string;
    last_sync?: string;
    sync_status?: string;
    pages_count?: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateCompanyDto {
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  settings?: {
    max_users?: number;
  };
}

const ApiService = {
  
  auth: {
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

  users: {
    changePassword: async (token: string, data: { new_password: string }): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/change-password`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to change password');
        }

        return await response.json();
      } catch (error) {
        console.error('Change password error:', error);
        throw error;
      }
    },

    updateProfile: async (token: string, data: { full_name?: string; phone?: string }): Promise<any> => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update profile');
        }

        return await response.json();
      } catch (error) {
        console.error('Update profile error:', error);
        throw error;
      }
    },

    uploadAvatar: async (token: string, formData: FormData): Promise<any> => {
      try {
        const response = await fetch(`${API_BASE_URL}/storage/upload/image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to upload avatar');
        }

        const result = await response.json();
        return {
          avatar_url: result.data.publicUrl
        };
      } catch (error) {
        console.error('Upload avatar error:', error);
        throw error;
      }
    },
    
    sendHeartbeat: async (token: string): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/heartbeat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to send heartbeat');
        }

        return await response.json();
      } catch (error) {
        console.error('Heartbeat error:', error);
        throw error;
      }
    },

    
    getUsers: async (token: string, params?: any): Promise<UsersResponse> => {
      try {
        
        const queryParams = params ? new URLSearchParams(params).toString() : '';
        const url = `${API_BASE_URL}/users${queryParams ? `?${queryParams}` : ''}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get users');
        }

        const data = await response.json();
        
        
        const users = data.users.map((user: any) => ({
          ...user,
          last_login: user.last_login ? new Date(user.last_login) : null,
          created_at: new Date(user.created_at),
        }));

        return {
          ...data,
          users,
        };
      } catch (error) {
        console.error('Get users error:', error);
        throw error;
      }
    },

    
    getPendingUsers: async (token: string): Promise<PendingUser[]> => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/pending`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get pending users');
        }

        const data = await response.json();
        
        
        return data.map((user: any) => ({
          ...user,
          created_at: new Date(user.created_at),
        }));
      } catch (error) {
        console.error('Get pending users error:', error);
        throw error;
      }
    },

    
    approveUser: async (token: string, userId: string): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/approve`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to approve user');
        }

        return await response.json();
      } catch (error) {
        console.error('Approve user error:', error);
        throw error;
      }
    },

    
    rejectUser: async (token: string, userId: string): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/reject`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to reject user');
        }

        return await response.json();
      } catch (error) {
        console.error('Reject user error:', error);
        throw error;
      }
    },

    
    updateUserRoles: async (
      token: string, 
      userId: string, 
      roles: string[]
    ): Promise<{ success: boolean; message: string; roles: string[] }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/roles`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roles }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update user roles');
        }

        return await response.json();
      } catch (error) {
        console.error('Update user roles error:', error);
        throw error;
      }
    },

    
    toggleUserStatus: async (
      token: string, 
      userId: string, 
      isActive: boolean
    ): Promise<{ success: boolean; message: string; is_active: boolean }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_active: isActive }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to toggle user status');
        }

        return await response.json();
      } catch (error) {
        console.error('Toggle user status error:', error);
        throw error;
      }
    },

    
    updateFacebookPagesAccess: async (
      token: string, 
      userId: string, 
      pageIds: string[]
    ): Promise<{ success: boolean; message: string; facebook_pages_access: string[] }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/facebook-pages`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page_ids: pageIds }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update Facebook pages access');
        }

        return await response.json();
      } catch (error) {
        console.error('Update Facebook pages access error:', error);
        throw error;
      }
    },
  },

  
  company: {
    
    getInfo: async (token: string): Promise<CompanyInfo> => {
      try {
        const response = await fetch(`${API_BASE_URL}/company`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Không thể lấy thông tin công ty');
        }

        return await response.json();
      } catch (error) {
        console.error('Get company info error:', error);
        throw error;
      }
    },

    
    update: async (token: string, data: UpdateCompanyDto): Promise<{success: boolean; message: string; company: CompanyInfo}> => {
      try {
        const response = await fetch(`${API_BASE_URL}/company`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Không thể cập nhật thông tin công ty');
        }

        return await response.json();
      } catch (error) {
        console.error('Update company error:', error);
        throw error;
      }
    },
  },

  
  facebook: {
    
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
