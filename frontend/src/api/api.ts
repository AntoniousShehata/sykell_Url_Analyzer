const API_BASE_URL = 'http://localhost:8080/api';

export interface UrlData {
  id: number;
  user_id: number;
  url: string;
  html_version: string;
  title: string;
  h1_count: number;
  h2_count: number;
  h3_count: number;
  internal_links: number;
  external_links: number;
  broken_links: number;
  has_login_form: boolean;
  status: 'queued' | 'running' | 'completed' | 'error';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface BrokenLink {
  id: number;
  url_id: number;
  link_url: string;
  status_code?: number;
  error_message?: string;
  created_at: string;
}

export interface UrlWithBrokenLinks extends UrlData {
  broken_links_details: BrokenLink[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  details?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UrlStats {
  total_urls: number;
  queued_urls: number;
  running_urls: number;
  completed_urls: number;
  error_urls: number;
  total_broken_links: number;
}

// Token management
let authToken: string | null = localStorage.getItem('auth_token');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

export const getAuthToken = () => authToken;

export const isAuthenticated = () => !!authToken;

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid
    setAuthToken(null);
    throw new Error('Authentication required');
  }

  return response;
};

// Authentication endpoints
export const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
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
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result: AuthResponse = await response.json();
    setAuthToken(result.token);
    return result;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

export const register = async (userData: RegisterRequest): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result: AuthResponse = await response.json();
    setAuthToken(result.token);
    return result;
  } catch (error) {
    console.error('Error registering:', error);
    throw error;
  }
};

export const logout = () => {
  setAuthToken(null);
};

export const getProfile = async (): Promise<User> => {
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/profile`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse<User> = await response.json();
    return result.data!;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

// URL management endpoints
export const fetchUrls = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
} = {}): Promise<{ data: UrlData[]; pagination: any }> => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);

    const url = `${API_BASE_URL}/urls${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await makeAuthenticatedRequest(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse<UrlData[]> = await response.json();
    return {
      data: result.data || [],
      pagination: result.pagination || { page: 1, limit: 10, total: 0, pages: 0 }
    };
  } catch (error) {
    console.error('Error fetching URLs:', error);
    throw error;
  }
};

export const addUrl = async (url: string): Promise<UrlData> => {
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/urls`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse<UrlData> = await response.json();
    return result.data!;
  } catch (error) {
    console.error('Error adding URL:', error);
    throw error;
  }
};

export const getUrlById = async (id: number): Promise<UrlWithBrokenLinks> => {
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/urls/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse<UrlWithBrokenLinks> = await response.json();
    return result.data!;
  } catch (error) {
    console.error('Error fetching URL:', error);
    throw error;
  }
};

export const deleteUrl = async (id: number): Promise<void> => {
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/urls/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting URL:', error);
    throw error;
  }
};

export const reanalyzeUrl = async (id: number): Promise<void> => {
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/urls/${id}/reanalyze`, {
      method: 'PUT',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error reanalyzing URL:', error);
    throw error;
  }
};

// Bulk operations
export const bulkDeleteUrls = async (ids: number[]): Promise<{ deleted_count: number }> => {
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/urls/bulk`, {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error bulk deleting URLs:', error);
    throw error;
  }
};

export const bulkReanalyzeUrls = async (ids: number[]): Promise<{ queued_count: number }> => {
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/urls/bulk/reanalyze`, {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error bulk reanalyzing URLs:', error);
    throw error;
  }
};

// Statistics
export const getStats = async (): Promise<UrlStats> => {
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/stats`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse<UrlStats> = await response.json();
    return result.data!;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};

// Health check
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};
