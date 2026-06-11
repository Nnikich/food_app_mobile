import { apiClient } from '../utils/apiClient';
import { Recipe, AppState } from '../types';

export interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
  requiresVerification?: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    createdAt: string;
    subscriptionType?: string;
  };
}

// Auth API
export const authApi = {
    register: async (email: string, password: string, confirmPassword?: string): Promise<ApiResponse> => {
        return apiClient.post('/api/auth/register', { email, password, confirmPassword });
    },
    login: async (email: string, password: string): Promise<ApiResponse> => {
        return apiClient.post('/api/auth/login', { email, password });
    },
    verify: async (email: string, code: string): Promise<ApiResponse> => {
        return apiClient.post('/api/auth/verify', { email, code });
    },
    resendCode: async (email: string): Promise<ApiResponse> => {
        return apiClient.post('/api/auth/resend-code', { email });
    },
    getMe: async (): Promise<ApiResponse> => {
        return apiClient.get('/api/auth/me');
    }
};

// Recipes API
export const recipesApi = {
    getAll: async (): Promise<ApiResponse<Recipe[]>> => {
        return apiClient.get('/api/recipes');
    },
    getById: async (id: string): Promise<ApiResponse<Recipe>> => {
        return apiClient.get(`/api/recipes/${id}`);
    },
    seed: async (): Promise<ApiResponse> => {
        return apiClient.post('/api/recipes/seed');
    }
};

// User State API
export const userStateApi = {
    get: async (userId: string): Promise<ApiResponse<Partial<AppState>>> => {
        return apiClient.get(`/api/user-state/${userId}`);
    },
    save: async (userId: string, stateData: Partial<AppState>): Promise<ApiResponse> => {
        return apiClient.post(`/api/user-state/${userId}`, stateData);
    }
};
