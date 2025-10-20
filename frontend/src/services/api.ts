const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;


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
    phone?: string;
    avatar_cloudflare_url?: string;
    avatar_cloudflare_key?: string;
    merged_pages_filter?: string[];
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
  picture?: string; // URL gốc từ Facebook
  picture_url?: string; // URL trên MinIO
  picture_key?: string; // Key trên MinIO
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
  avatar_cloudflare_url?: string;
  avatar_cloudflare_key?: string;
  is_online: boolean;
  facebook_pages_access?: string[];
  merged_pages_filter?: string[];
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


export interface Product {
  product_id: string;
  company_id: string;
  name: string;
  code: string;
  price: number;
  currency: string;
  colors: string[];
  brand?: string;
  notes?: string;
  images: ProductImage[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface ProductImage {
  image_id: string;
  cloudflare_url: string;
  cloudflare_key: string;
  display_order: number;
  alt_text?: string;
  created_at: string;
  created_by: string;
}

export interface CreateProductDto {
  name: string;
  code: string;
  price: number;
  currency?: string;
  colors: string[];
  brand?: string;
  notes?: string;
}

export interface UpdateProductDto {
  name?: string;
  code?: string;
  price?: number;
  currency?: string;
  colors?: string[];
  brand?: string;
  notes?: string;
  is_active?: boolean;
}

export interface AddProductImageDto {
  cloudflare_url: string;
  cloudflare_key: string;
  display_order: number;
  alt_text?: string;
}

export interface ProductQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  brand?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  is_active?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  stats: ProductStats;
}

export interface ProductStats {
  total_products: number;
  active_products: number;
  inactive_products: number;
  products_with_images: number;
  products_without_images: number;
}

// ===== FACEBOOK MESSAGING INTERFACES =====

export interface FacebookConversation {
  conversation_id: string;
  company_id: string;
  facebook_page_id: string;
  customer_id: string;
  
  // CUSTOMER INFO (Denormalized)
  customer_name?: string;
  customer_first_name?: string;
  customer_profile_pic?: string;
  customer_profile_pic_url?: string;
  customer_profile_pic_key?: string;
  customer_phone?: string;
  
  // PAGE INFO (Denormalized)
  page_name?: string;
  page_picture?: string;
  page_picture_url?: string;
  page_picture_key?: string;
  
  facebook_thread_id?: string;
  source: 'messenger' | 'comment';
  
  // POST INFO (for comment source)
  post_id?: string;
  comment_id?: string;
  post_content?: string;
  post_permalink_url?: string;
  post_photos?: string[];
  post_photos_minio?: Array<{
    facebook_url: string;
    minio_url: string;
    minio_key: string;
  }>;
  post_status_type?: string;
  post_created_time?: Date;
  post_updated_time?: Date;
  
  status: 'open' | 'closed' | 'archived';
  current_handler: 'chatbot' | 'human';
  assigned_to?: string;
  needs_attention: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[];
  assigned_at?: Date;
  
  // LAST MESSAGE
  last_message_text?: string;
  last_message_at?: Date;
  last_message_from?: 'customer' | 'chatbot' | 'staff';
  
  // READ STATUS
  is_read: boolean;
  read_by_user_id?: string;
  read_by_user_name?: string;
  read_at?: Date;
  
  // STATS
  total_messages: number;
  unread_customer_messages: number;
  
  // ESCALATION
  escalated_from_bot: boolean;
  escalation_reason?: 'no_answer' | 'customer_request' | 'complex_query';
  escalated_at?: Date;
  
  // RETURN TO BOT
  returned_to_bot_count: number;
  last_returned_to_bot_at?: Date;
  last_returned_by?: string;
  
  created_at: Date;
  updated_at: Date;
}

export interface FacebookCustomer {
  customer_id: string;
  company_id: string;
  facebook_page_id: string;
  facebook_user_id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  profile_pic?: string;
  profile_pic_url?: string;
  profile_pic_key?: string;
  locale?: string;
  timezone?: number;
  email?: string;
  phone?: string;
  address?: string;
  height?: number;
  weight?: number;
  purchased_products?: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    purchase_date: Date;
    notes?: string;
    images?: string[];
  }>;
  customer_notes?: string;
  tags: string[];
  status: 'active' | 'blocked' | 'archived';
  first_contact_at: Date;
  last_interaction_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface FacebookMessage {
  message_id: string;
  company_id: string;
  facebook_page_id: string;
  customer_id: string;
  conversation_id: string;
  facebook_message_id?: string;
  parent_message_id?: string;
  
  message_type: 'text' | 'image' | 'file' | 'comment' | 'quick_reply' | 'postback';
  text: string;
  attachments?: Array<{
    type: 'image' | 'video' | 'audio' | 'file';
    facebook_url: string;
    minio_url?: string;
    minio_key?: string;
    filename: string;
  }>;
  
  sender_type: 'customer' | 'chatbot' | 'staff';
  sender_id: string;
  sender_name?: string;
  
  is_escalation_trigger: boolean;
  escalation_reason?: 'bot_cannot_answer' | 'customer_request';
  shortcut_used?: string;
  
  delivery_status: 'sent' | 'delivered' | 'read' | 'failed';
  
  sent_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface GetConversationsQuery {
  page?: number;
  limit?: number;
  status?: 'open' | 'closed' | 'archived';
  current_handler?: 'chatbot' | 'human';
  assigned_to?: string;
  needs_attention?: boolean;
  source?: 'messenger' | 'comment';
  search?: string;
  tags?: string[];
}

export interface ConversationsResponse {
  success: boolean;
  data: FacebookConversation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface GetMessagesQuery {
  page?: number;
  limit?: number;
  sender_type?: 'customer' | 'chatbot' | 'staff';
}

export interface MessagesResponse {
  success: boolean;
  data: FacebookMessage[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ===== TAGS INTERFACES =====

export interface FacebookTag {
  tag_id: string;
  company_id: string;
  facebook_page_ids: string[]; // Tag có thể thuộc nhiều pages
  tag_name: string;
  tag_color: string; // Hex color code
  usage_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTagDto {
  tag_name: string;
  tag_color: string;
  facebook_page_ids: string[];
}

export interface UpdateTagDto {
  tag_name?: string;
  tag_color?: string;
  facebook_page_ids?: string[];
}

export interface QueryTagsDto {
  page?: number;
  limit?: number;
  search?: string;
  facebook_page_id?: string;
}

export interface TagsResponse {
  success: boolean;
  data: FacebookTag[];
  total: number;
}

// ===== CHATBOT INTERFACES =====

export interface AIChatbotSettings {
  setting_id?: string;
  company_id: string;
  ai_provider: string;
  ai_model: string;
  api_key: string;
  is_active: boolean;
  temperature: number;
  max_tokens: number;
  response_delay: number;
  fallback_enabled: boolean;
  system_prompt: string;
  enabled_facebook_page_ids: string[];
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAISettingsDto {
  ai_provider: string;
  ai_model: string;
  api_key: string;
  is_active?: boolean;
  temperature?: number;
  max_tokens?: number;
  response_delay?: number;
  fallback_enabled?: boolean;
  system_prompt: string;
  enabled_facebook_page_ids?: string[];
}

export interface UpdateAISettingsDto {
  ai_provider?: string;
  ai_model?: string;
  api_key?: string;
  is_active?: boolean;
  temperature?: number;
  max_tokens?: number;
  response_delay?: number;
  fallback_enabled?: boolean;
  system_prompt?: string;
  enabled_facebook_page_ids?: string[];
}

export interface TestConnectionDto {
  ai_provider: string;
  api_key: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}

export interface AITrainingDocument {
  document_id: string;
  company_id: string;
  category: string;
  question: string;
  answer: string;
  prompt?: string;
  images: string[];
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTrainingDocumentDto {
  category: string;
  question: string;
  answer: string;
  prompt?: string;
  images?: string[];
}

export interface UpdateTrainingDocumentDto {
  category?: string;
  question?: string;
  answer?: string;
  prompt?: string;
  images?: string[];
}

export interface QueryTrainingDocumentsDto {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TrainingDocumentsResponse {
  documents: AITrainingDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
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
        
        const uploadResponse = await fetch(`${API_BASE_URL}/storage/upload/image?folder=avatars`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.message || 'Failed to upload avatar');
        }

        const uploadResult = await uploadResponse.json();
        
        
        const updateResponse = await fetch(`${API_BASE_URL}/users/avatar`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            avatar_cloudflare_url: uploadResult.data.publicUrl,
            avatar_cloudflare_key: uploadResult.data.key
          }),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.message || 'Failed to update avatar');
        }

        const updateResult = await updateResponse.json();
        return {
          avatar_cloudflare_url: uploadResult.data.publicUrl,
          avatar_cloudflare_key: uploadResult.data.key,
          user: updateResult.user
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
      facebookPageIds: string[]
    ): Promise<{ success: boolean; message: string; facebook_pages_access: string[] }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/facebook-pages`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ facebook_page_ids: facebookPageIds }),
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

    // Update merged pages filter (UI preference for dashboard display)
    updateMergedPagesFilter: async (
      token: string,
      facebookPageIds: string[]
    ): Promise<{ success: boolean; message: string; merged_pages_filter: string[] }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/merged-pages-filter`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ facebook_page_ids: facebookPageIds }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update merged pages filter');
        }

        return await response.json();
      } catch (error) {
        console.error('Update merged pages filter error:', error);
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

  
  products: {
    
    getProducts: async (token: string, query?: ProductQueryDto): Promise<ProductsResponse> => {
      try {
        const queryParams = new URLSearchParams();
        if (query) {
          Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              queryParams.append(key, value.toString());
            }
          });
        }

        const response = await fetch(`${API_BASE_URL}/products?${queryParams}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch products');
        }

        return await response.json();
      } catch (error) {
        console.error('Get products error:', error);
        throw error;
      }
    },

    
    getProduct: async (token: string, productId: string): Promise<Product> => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch product');
        }

        return await response.json();
      } catch (error) {
        console.error('Get product error:', error);
        throw error;
      }
    },

    
    createProduct: async (token: string, productData: CreateProductDto): Promise<Product> => {
      try {
        const response = await fetch(`${API_BASE_URL}/products`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create product');
        }

        return await response.json();
      } catch (error) {
        console.error('Create product error:', error);
        throw error;
      }
    },

    
    updateProduct: async (token: string, productId: string, productData: UpdateProductDto): Promise<Product> => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update product');
        }

        return await response.json();
      } catch (error) {
        console.error('Update product error:', error);
        throw error;
      }
    },

    
    deleteProduct: async (token: string, productId: string): Promise<void> => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete product');
        }
      } catch (error) {
        console.error('Delete product error:', error);
        throw error;
      }
    },

    
    getBrands: async (token: string): Promise<string[]> => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/brands`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch brands');
        }

        return await response.json();
      } catch (error) {
        console.error('Get brands error:', error);
        throw error;
      }
    },

    
    getStats: async (token: string): Promise<ProductStats> => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/stats`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch product stats');
        }

        return await response.json();
      } catch (error) {
        console.error('Get product stats error:', error);
        throw error;
      }
    },

    
    uploadImage: async (token: string, file: File, folder?: string): Promise<{key: string; publicUrl: string}> => {
      try {
        const formData = new FormData();
        formData.append('image', file);

        const queryParams = folder ? `?folder=${encodeURIComponent(folder)}` : '';
        const response = await fetch(`${API_BASE_URL}/storage/upload/image${queryParams}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to upload image');
        }

        const result = await response.json();
        return {
          key: result.data.key,
          publicUrl: result.data.publicUrl
        };
      } catch (error) {
        console.error('Upload image error:', error);
        throw error;
      }
    },

    
    addProductImage: async (token: string, productId: string, imageData: AddProductImageDto): Promise<Product> => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}/images`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(imageData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to add product image');
        }

        return await response.json();
      } catch (error) {
        console.error('Add product image error:', error);
        throw error;
      }
    },

    
    updateProductImage: async (token: string, productId: string, imageId: string, imageData: {display_order?: number; alt_text?: string}): Promise<Product> => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}/images/${imageId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...imageData,
            image_id: imageId
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update product image');
        }

        return await response.json();
      } catch (error) {
        console.error('Update product image error:', error);
        throw error;
      }
    },

    
    deleteProductImage: async (token: string, productId: string, imageId: string): Promise<Product> => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}/images/${imageId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete product image');
        }

        return await response.json();
      } catch (error) {
        console.error('Delete product image error:', error);
        throw error;
      }
    },
  },

  // ===== MESSAGING API =====
  messaging: {
    // Get conversations list
    getConversations: async (
      token: string, 
      params?: {
        status?: string;
        handler?: string;
        needsAttention?: boolean;
        isRead?: boolean;
        assignedTo?: string;
        source?: string;
        facebookPageId?: string;
        facebookPageIds?: string[];
        hasPhone?: boolean;
        startDate?: string;
        endDate?: string;
        search?: string;
        page?: number;
        limit?: number;
      }
    ): Promise<{
      conversations: any[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
      };
    }> => {
      try {
        const queryParams = new URLSearchParams();
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              // Xử lý array facebookPageIds
              if (key === 'facebookPageIds' && Array.isArray(value)) {
                value.forEach(facebookPageId => {
                  queryParams.append('facebookPageIds', facebookPageId);
                });
              } else {
                queryParams.append(key, String(value));
              }
            }
          });
        }

        const response = await fetch(
          `${API_BASE_URL}/facebook-messaging/conversations?${queryParams}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to get conversations');
        }

        const data = await response.json();
        return {
          conversations: data.data,
          pagination: data.pagination,
        };
      } catch (error) {
        console.error('Get conversations error:', error);
        throw error;
      }
    },

    // Get single conversation
    getConversation: async (token: string, conversationId: string): Promise<any> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/facebook-messaging/conversations/${conversationId}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to get conversation');
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Get conversation error:', error);
        throw error;
      }
    },

    // Get messages for a conversation
    getMessages: async (
      token: string, 
      conversationId: string,
      page?: number,
      limit?: number
    ): Promise<{
      messages: FacebookMessage[];
      total: number;
    }> => {
      try {
        const queryParams = new URLSearchParams();
        if (page) queryParams.append('page', String(page));
        if (limit) queryParams.append('limit', String(limit));

        const response = await fetch(
          `${API_BASE_URL}/facebook-messaging/conversations/${conversationId}/messages?${queryParams}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get messages');
        }

        const result = await response.json();
        console.log('Messages API response:', result);
        
        return result.data;
      } catch (error) {
        console.error('Get messages error:', error);
        throw error;
      }
    },

    // Get messages before a certain timestamp (for infinite scroll)
    getMessagesBefore: async (
      token: string,
      conversationId: string,
      beforeCursor: string,
      limit: number = 30
    ): Promise<{
      messages: FacebookMessage[];
      total: number;
    }> => {
      try {
        const queryParams = new URLSearchParams();
        queryParams.append('before', beforeCursor);
        queryParams.append('limit', String(limit));

        const response = await fetch(
          `${API_BASE_URL}/facebook-messaging/conversations/${conversationId}/messages?${queryParams}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get messages');
        }

        const result = await response.json();
        return result.data;
      } catch (error) {
        console.error('Get messages before error:', error);
        throw error;
      }
    },

    // Update conversation
    updateConversation: async (
      token: string,
      conversationId: string,
      updateData: {
        status?: string;
        currentHandler?: string;
        assignedTo?: string;
        needsAttention?: boolean;
        priority?: string;
      }
    ): Promise<any> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/facebook-messaging/conversations/${conversationId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to update conversation');
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Update conversation error:', error);
        throw error;
      }
    },

    // Upload file for messaging
    uploadMessageFile: async (token: string, file: File): Promise<{minio_url: string; minio_key: string}> => {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(
          `${API_BASE_URL}/storage/upload/file?folder=messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error('Failed to upload file');
        }

        const result = await response.json();
        return {
          minio_url: result.data.publicUrl,
          minio_key: result.data.key,
        };
      } catch (error) {
        console.error('Upload message file error:', error);
        throw error;
      }
    },

    // Reply to conversation
    replyToConversation: async (
      token: string,
      conversationId: string,
      messageData: {
        text: string;
        messageType?: string;
        attachments?: any[];
      }
    ): Promise<any> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/facebook-messaging/conversations/${conversationId}/reply`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageData),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Reply to conversation error:', error);
        throw error;
      }
    },

    // Reply to comment (public)
    replyToComment: async (
      token: string,
      conversationId: string,
      messageData: {
        text: string;
        messageType?: string;
        attachments?: any[];
      }
    ): Promise<any> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/facebook-messaging/conversations/${conversationId}/reply-comment`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageData),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to reply comment');
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Reply to comment error:', error);
        throw error;
      }
    },

    // Send private message from comment
    sendPrivateMessage: async (
      token: string,
      conversationId: string,
      messageData: {
        text: string;
        messageType?: string;
        attachments?: any[];
      }
    ): Promise<any> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/facebook-messaging/conversations/${conversationId}/send-private-message`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageData),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to send private message');
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Send private message error:', error);
        throw error;
      }
    },

    // Mark conversation as read
    markAsRead: async (
      token: string, 
      conversationId: string,
      userId?: string,
      userName?: string
    ): Promise<void> => {
      try {
        const body: any = {};
        if (userId) body.user_id = userId;
        if (userName) body.user_name = userName;

        const response = await fetch(
          `${API_BASE_URL}/facebook-messaging/conversations/${conversationId}/mark-read`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
          }
        );

        if (!response.ok) {
          throw new Error('Failed to mark as read');
        }
      } catch (error) {
        console.error('Mark as read error:', error);
        throw error;
      }
    },

    // Mark conversation as unread
    markAsUnread: async (token: string, conversationId: string, userId?: string, userName?: string): Promise<void> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/facebook-messaging/conversations/${conversationId}/mark-unread`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: userId,
              user_name: userName,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to mark as unread');
        }
      } catch (error) {
        console.error('Mark as unread error:', error);
        throw error;
      }
    },

    // Assign conversation
    assignConversation: async (
      token: string,
      conversationId: string,
      assignedTo: string
    ): Promise<any> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/facebook-messaging/conversations/${conversationId}/assign`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ assignedTo }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to assign conversation');
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Assign conversation error:', error);
        throw error;
      }
    },

    // Return conversation to bot
    returnToBot: async (token: string, conversationId: string): Promise<any> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/facebook-messaging/conversations/${conversationId}/return-to-bot`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to return to bot');
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Return to bot error:', error);
        throw error;
      }
    },

    // Get customers
    getCustomers: async (token: string, params?: any): Promise<any[]> => {
      try {
        const queryParams = new URLSearchParams(params);
        const response = await fetch(
          `${API_BASE_URL}/facebook-messaging/customers?${queryParams}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to get customers');
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Get customers error:', error);
        throw error;
      }
    },

    // Get single customer
    getCustomer: async (token: string, customerId: string): Promise<any> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/facebook-messaging/customers/${customerId}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to get customer');
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Get customer error:', error);
        throw error;
      }
    },

    // Update customer
    updateCustomer: async (token: string, customerId: string, updateData: any): Promise<any> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/facebook-messaging/customers/${customerId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to update customer');
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Update customer error:', error);
        throw error;
      }
    },
  },

  // ===== TAGS API =====
  tags: {
    // Get all tags
    getTags: async (token: string, params?: QueryTagsDto): Promise<TagsResponse> => {
      try {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);
        if (params?.facebook_page_id) queryParams.append('facebook_page_id', params.facebook_page_id);

        const url = `${API_BASE_URL}/tags${queryParams.toString() ? `?${queryParams}` : ''}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get tags');
        }

        return await response.json();
      } catch (error) {
        console.error('Get tags error:', error);
        throw error;
      }
    },

    // Get single tag
    getTag: async (token: string, tagId: string): Promise<FacebookTag> => {
      try {
        const response = await fetch(`${API_BASE_URL}/tags/${tagId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get tag');
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Get tag error:', error);
        throw error;
      }
    },

    // Create new tag
    createTag: async (token: string, tagData: CreateTagDto): Promise<FacebookTag> => {
      try {
        const response = await fetch(`${API_BASE_URL}/tags`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tagData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create tag');
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Create tag error:', error);
        throw error;
      }
    },

    // Update tag
    updateTag: async (token: string, tagId: string, tagData: UpdateTagDto): Promise<FacebookTag> => {
      try {
        const response = await fetch(`${API_BASE_URL}/tags/${tagId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tagData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update tag');
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Update tag error:', error);
        throw error;
      }
    },

    // Delete tag
    deleteTag: async (token: string, tagId: string): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/tags/${tagId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete tag');
        }

        return await response.json();
      } catch (error) {
        console.error('Delete tag error:', error);
        throw error;
      }
    },

    // Get tags by page
    getTagsByPage: async (token: string, pageId: string): Promise<FacebookTag[]> => {
      try {
        const response = await fetch(`${API_BASE_URL}/tags/page/${pageId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get tags by page');
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error('Get tags by page error:', error);
        throw error;
      }
    },

    // Assign tags to conversation
    assignTagsToConversation: async (
      token: string,
      conversationId: string,
      tagIds: string[]
    ): Promise<{ success: boolean; data: any }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/tags/conversations/${conversationId}/tags`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tag_ids: tagIds }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to assign tags');
        }

        return await response.json();
      } catch (error) {
        console.error('Assign tags error:', error);
        throw error;
      }
    },

    // Remove tag from conversation
    removeTagFromConversation: async (
      token: string,
      conversationId: string,
      tagId: string
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/tags/conversations/${conversationId}/tags/${tagId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to remove tag');
        }

        return await response.json();
      } catch (error) {
        console.error('Remove tag error:', error);
        throw error;
      }
    },
  },

  // ===== CHATBOT API =====
  chatbot: {
    // AI Settings
    getAISettings: async (token: string): Promise<AIChatbotSettings> => {
      try {
        const response = await fetch(`${API_BASE_URL}/chatbot/ai-settings`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get AI settings');
        }

        return await response.json();
      } catch (error) {
        console.error('Get AI settings error:', error);
        throw error;
      }
    },

    createAISettings: async (
      token: string,
      data: CreateAISettingsDto
    ): Promise<AIChatbotSettings> => {
      try {
        const response = await fetch(`${API_BASE_URL}/chatbot/ai-settings`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create AI settings');
        }

        return await response.json();
      } catch (error) {
        console.error('Create AI settings error:', error);
        throw error;
      }
    },

    updateAISettings: async (
      token: string,
      data: UpdateAISettingsDto
    ): Promise<AIChatbotSettings> => {
      try {
        const response = await fetch(`${API_BASE_URL}/chatbot/ai-settings`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update AI settings');
        }

        return await response.json();
      } catch (error) {
        console.error('Update AI settings error:', error);
        throw error;
      }
    },

    testConnection: async (
      token: string,
      data: TestConnectionDto
    ): Promise<TestConnectionResponse> => {
      try {
        const response = await fetch(`${API_BASE_URL}/chatbot/ai-settings/test-connection`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Connection test failed');
        }

        return await response.json();
      } catch (error) {
        console.error('Test connection error:', error);
        throw error;
      }
    },

    // Training Documents
    getTrainingDocuments: async (
      token: string,
      query?: QueryTrainingDocumentsDto
    ): Promise<TrainingDocumentsResponse> => {
      try {
        const queryParams = new URLSearchParams();
        if (query?.category) queryParams.append('category', query.category);
        if (query?.search) queryParams.append('search', query.search);
        if (query?.page) queryParams.append('page', query.page.toString());
        if (query?.limit) queryParams.append('limit', query.limit.toString());

        const url = `${API_BASE_URL}/chatbot/training-documents${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get training documents');
        }

        return await response.json();
      } catch (error) {
        console.error('Get training documents error:', error);
        throw error;
      }
    },

    getTrainingDocumentById: async (
      token: string,
      documentId: string
    ): Promise<AITrainingDocument> => {
      try {
        const response = await fetch(`${API_BASE_URL}/chatbot/training-documents/${documentId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get training document');
        }

        return await response.json();
      } catch (error) {
        console.error('Get training document error:', error);
        throw error;
      }
    },

    createTrainingDocument: async (
      token: string,
      data: CreateTrainingDocumentDto
    ): Promise<AITrainingDocument> => {
      try {
        const response = await fetch(`${API_BASE_URL}/chatbot/training-documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create training document');
        }

        return await response.json();
      } catch (error) {
        console.error('Create training document error:', error);
        throw error;
      }
    },

    updateTrainingDocument: async (
      token: string,
      documentId: string,
      data: UpdateTrainingDocumentDto
    ): Promise<AITrainingDocument> => {
      try {
        const response = await fetch(`${API_BASE_URL}/chatbot/training-documents/${documentId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update training document');
        }

        return await response.json();
      } catch (error) {
        console.error('Update training document error:', error);
        throw error;
      }
    },

    deleteTrainingDocument: async (
      token: string,
      documentId: string
    ): Promise<{ message: string }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/chatbot/training-documents/${documentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete training document');
        }

        return await response.json();
      } catch (error) {
        console.error('Delete training document error:', error);
        throw error;
      }
    },
  },
};
export default ApiService;
