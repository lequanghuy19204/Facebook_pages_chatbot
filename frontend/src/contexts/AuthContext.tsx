"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { apiService, UserInfo, CompanyInfo } from '@/services/api';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  company: CompanyInfo | null;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: UserInfo; company: CompanyInfo } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    email: string,
    password: string,
    confirmPassword: string,
    fullName: string,
    accountType: 'admin' | 'staff',
    companyName?: string,
    companyCode?: string
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  company: null,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        company: action.payload.company,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        company: null,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        company: null,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          dispatch({ type: 'AUTH_FAILURE', payload: 'No token found' });
          return;
        }

        dispatch({ type: 'AUTH_START' });
        const response = await apiService.getCurrentUser();

        if (response.success && response.user && response.company) {
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: {
              user: response.user,
              company: response.company,
            },
          });
        } else {
          dispatch({ type: 'AUTH_FAILURE', payload: 'Invalid session' });
        }
      } catch {
        dispatch({ type: 'AUTH_FAILURE', payload: 'Authentication check failed' });
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'AUTH_START' });

      const response = await apiService.login({ email, password });

      if (response.success && response.user && response.company) {
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: response.user,
            company: response.company,
          },
        });
        return true;
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: response.message || 'Login failed' });
        return false;
      }
    } catch {
      dispatch({ type: 'AUTH_FAILURE', payload: 'Network error occurred' });
      return false;
    }
  };

  const register = async (
    email: string,
    password: string,
    confirmPassword: string,
    fullName: string,
    accountType: 'admin' | 'staff',
    companyName?: string,
    companyCode?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      dispatch({ type: 'AUTH_START' });

      const response = await apiService.register({
        email,
        password,
        confirmPassword,
        fullName,
        accountType,
        companyName,
        companyCode,
      });

      if (response.success) {
        // For admin registration with immediate login
        if (response.user && response.company && response.accessToken) {
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: {
              user: response.user,
              company: response.company,
            },
          });
        } else {
          // For staff registration (pending approval)
          dispatch({ type: 'LOGOUT' });
        }

        return { success: true, message: response.message };
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: response.message });
        return { success: false, message: response.message };
      }
    } catch {
      const message = 'Network error occurred';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      return { success: false, message };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
