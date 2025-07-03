import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface User {
  id: number;
  username: string;
  email: string;
  avatar: string;
  role: string;
  twinEnabled: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Enhanced API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_TIMEOUT = 10000; // 10 seconds

// Enhanced fetch with timeout and better error handling
const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - server may be down');
    }
    throw error;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hodhod_token');
    if (token) {
      verifyToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      console.log('🔄 Verifying token...');
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      console.log('✅ Verify response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Token verification successful:', data);
        setUser(data.user);
      } else {
        console.log('❌ Token verification failed');
        localStorage.removeItem('hodhod_token');
        if (response.status === 401) {
          toast.error('Session expired. Please login again.');
        }
      }
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      localStorage.removeItem('hodhod_token');
      toast.error('Connection failed. Please check if server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('=== LOGIN ATTEMPT ===');
      console.log('Email:', email);
      console.log('API URL:', `${API_BASE_URL}/api/auth/login`);
      
      // First, test server connectivity
      try {
        const healthResponse = await fetchWithTimeout(`${API_BASE_URL}/api/health`);
        console.log('✅ Server health check:', healthResponse.status);
      } catch (healthError) {
        console.error('❌ Server health check failed:', healthError);
        toast.error('Cannot connect to server. Please ensure the server is running on port 3001.');
        return false;
      }

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      console.log('✅ Login response status:', response.status);
      console.log('✅ Login response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Login failed with status:', response.status);
        console.error('❌ Error response:', errorText);
        
        let errorMessage = 'Login failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `Server error (${response.status})`;
        }
        
        toast.error(errorMessage);
        return false;
      }

      const responseText = await response.text();
      console.log('✅ Login response text length:', responseText.length);

      if (!responseText) {
        console.error('❌ Empty response from server');
        toast.error('Empty response from server');
        return false;
      }

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ Parsed login response:', { 
          hasToken: !!data.token, 
          hasUser: !!data.user,
          username: data.user?.username 
        });
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        console.error('❌ Response text was:', responseText);
        toast.error('Invalid response from server');
        return false;
      }

      if (data.token && data.user) {
        localStorage.setItem('hodhod_token', data.token);
        setUser(data.user);
        toast.success(`Welcome back, ${data.user.username}!`);
        console.log('✅ Login successful for user:', data.user.username);
        return true;
      } else {
        console.error('❌ Missing token or user in response:', data);
        toast.error(data.message || 'Login failed - invalid response');
        return false;
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      if (error.message.includes('timeout')) {
        toast.error('Request timeout - server may be overloaded');
      } else if (error.message.includes('fetch')) {
        toast.error('Network error - please check if server is running on port 3001');
      } else {
        toast.error('Login failed - please try again');
      }
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      console.log('=== REGISTRATION ATTEMPT ===');
      console.log('Username:', username, 'Email:', email);
      console.log('API URL:', `${API_BASE_URL}/api/auth/register`);
      
      // First, test server connectivity
      try {
        const healthResponse = await fetchWithTimeout(`${API_BASE_URL}/api/health`);
        console.log('✅ Server health check:', healthResponse.status);
      } catch (healthError) {
        console.error('❌ Server health check failed:', healthError);
        toast.error('Cannot connect to server. Please ensure the server is running on port 3001.');
        return false;
      }

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password })
      });

      console.log('✅ Register response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Registration failed with status:', response.status);
        console.error('❌ Error response:', errorText);
        
        let errorMessage = 'Registration failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `Server error (${response.status})`;
        }
        
        toast.error(errorMessage);
        return false;
      }

      const responseText = await response.text();
      console.log('✅ Register response text length:', responseText.length);

      if (!responseText) {
        console.error('❌ Empty response from server');
        toast.error('Empty response from server');
        return false;
      }

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ Parsed register response:', { 
          hasToken: !!data.token, 
          hasUser: !!data.user,
          username: data.user?.username 
        });
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        console.error('❌ Response text was:', responseText);
        toast.error('Invalid response from server');
        return false;
      }

      if (data.token && data.user) {
        localStorage.setItem('hodhod_token', data.token);
        setUser(data.user);
        toast.success(`Welcome to Hodhod, ${data.user.username}!`);
        console.log('✅ Registration successful for user:', data.user.username);
        return true;
      } else {
        console.error('❌ Missing token or user in response:', data);
        toast.error(data.message || 'Registration failed - invalid response');
        return false;
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      if (error.message.includes('timeout')) {
        toast.error('Request timeout - server may be overloaded');
      } else if (error.message.includes('fetch')) {
        toast.error('Network error - please check if server is running on port 3001');
      } else {
        toast.error('Registration failed - please try again');
      }
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('hodhod_token');
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};