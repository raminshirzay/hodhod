import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface User {
  id: number;
  username: string;
  email: string;
  avatar: string;
  role: string;
  twinEnabled: boolean;
  phoneNumber?: string;
  bio?: string;
  status?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, phoneNumber?: string, bio?: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (profileData: Partial<User>) => Promise<boolean>;
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

// Enhanced API configuration for Bolt.new
const API_BASE_URL = '/api';
const API_TIMEOUT = 15000; // 15 seconds

// Enhanced fetch with timeout and better error handling
const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    console.log(`🌐 Making request to: ${url}`);
    console.log(`📤 Request options:`, options);
    
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
    
    console.log(`📥 Response status: ${response.status}`);
    console.log(`📥 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`❌ Fetch error for ${url}:`, error);
    
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
      console.log('🔐 Verifying token...');
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      console.log('✅ Verify response status:', response.status);

      if (response.ok) {
        const responseText = await response.text();
        console.log('📄 Response text length:', responseText.length);
        
        if (!responseText) {
          console.error('❌ Empty response from server');
          localStorage.removeItem('hodhod_token');
          return;
        }

        try {
          const data = JSON.parse(responseText);
          console.log('✅ Token verification successful:', data);
          
          if (data.success && data.user) {
            setUser(data.user);
          } else {
            console.log('❌ Invalid response format:', data);
            localStorage.removeItem('hodhod_token');
          }
        } catch (parseError) {
          console.error('❌ Failed to parse response:', parseError);
          console.error('❌ Response text was:', responseText);
          localStorage.removeItem('hodhod_token');
        }
      } else {
        console.log('❌ Token verification failed with status:', response.status);
        localStorage.removeItem('hodhod_token');
        if (response.status === 401) {
          toast.error('Session expired. Please login again.');
        }
      }
    } catch (error: any) {
      console.error('❌ Token verification failed:', error);
      localStorage.removeItem('hodhod_token');
      if (error.message.includes('timeout')) {
        toast.error('Connection timeout. Please check your internet connection.');
      } else {
        toast.error('Connection failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('=== LOGIN ATTEMPT ===');
      console.log('Email/Username:', email);
      console.log('API URL:', `${API_BASE_URL}/auth/login`);
      
      // First, test server connectivity
      try {
        const healthResponse = await fetchWithTimeout(`${API_BASE_URL}/../health`);
        console.log('✅ Server health check:', healthResponse.status);
      } catch (healthError) {
        console.log('⚠️ Health check failed, proceeding anyway:', healthError);
      }

      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      console.log('✅ Login response status:', response.status);

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
          success: data.success,
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

      if (data.success && data.token && data.user) {
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
    } catch (error: any) {
      console.error('❌ Login error:', error);
      if (error.message.includes('timeout')) {
        toast.error('Request timeout - please try again');
      } else if (error.message.includes('fetch')) {
        toast.error('Network error - please check your connection');
      } else {
        toast.error('Login failed - please try again');
      }
      return false;
    }
  };

  const register = async (username: string, email: string, password: string, phoneNumber?: string, bio?: string): Promise<boolean> => {
    try {
      console.log('=== REGISTRATION ATTEMPT ===');
      console.log('Username:', username, 'Email:', email);
      console.log('API URL:', `${API_BASE_URL}/auth/register`);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password, phoneNumber, bio })
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
          success: data.success,
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

      if (data.success && data.token && data.user) {
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
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      if (error.message.includes('timeout')) {
        toast.error('Request timeout - please try again');
      } else if (error.message.includes('fetch')) {
        toast.error('Network error - please check your connection');
      } else {
        toast.error('Registration failed - please try again');
      }
      return false;
    }
  };

  const updateProfile = async (profileData: Partial<User>): Promise<boolean> => {
    try {
      const token = localStorage.getItem('hodhod_token');
      if (!token) {
        toast.error('Please login first');
        return false;
      }

      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          toast.success('Profile updated successfully');
          return true;
        }
      }
      
      toast.error('Failed to update profile');
      return false;
    } catch (error) {
      console.error('❌ Profile update error:', error);
      toast.error('Failed to update profile');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('hodhod_token');
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};