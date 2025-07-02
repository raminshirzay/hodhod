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
      console.log('Verifying token...');
      const response = await fetch('http://localhost:3001/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Verify response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Token verification successful:', data);
        setUser(data.user);
      } else {
        console.log('Token verification failed');
        localStorage.removeItem('hodhod_token');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('hodhod_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('=== LOGIN ATTEMPT ===');
      console.log('Email:', email);
      console.log('Making request to: http://localhost:3001/api/auth/login');
      
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      console.log('Login response status:', response.status);
      console.log('Login response headers:', response.headers);

      if (!response.ok) {
        console.error('Login failed with status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          toast.error(errorData.message || 'Login failed');
        } catch {
          toast.error('Login failed - server error');
        }
        return false;
      }

      const responseText = await response.text();
      console.log('Login response text:', responseText);

      if (!responseText) {
        console.error('Empty response from server');
        toast.error('Empty response from server');
        return false;
      }

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed login response:', data);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        console.error('Response text was:', responseText);
        toast.error('Invalid response from server');
        return false;
      }

      if (data.token && data.user) {
        localStorage.setItem('hodhod_token', data.token);
        setUser(data.user);
        toast.success('Welcome back!');
        console.log('Login successful for user:', data.user.username);
        return true;
      } else {
        console.error('Missing token or user in response:', data);
        toast.error(data.message || 'Login failed');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error - please check if server is running');
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      console.log('=== REGISTRATION ATTEMPT ===');
      console.log('Username:', username, 'Email:', email);
      console.log('Making request to: http://localhost:3001/api/auth/register');
      
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      console.log('Register response status:', response.status);

      if (!response.ok) {
        console.error('Registration failed with status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          toast.error(errorData.message || 'Registration failed');
        } catch {
          toast.error('Registration failed - server error');
        }
        return false;
      }

      const responseText = await response.text();
      console.log('Register response text:', responseText);

      if (!responseText) {
        console.error('Empty response from server');
        toast.error('Empty response from server');
        return false;
      }

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed register response:', data);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        console.error('Response text was:', responseText);
        toast.error('Invalid response from server');
        return false;
      }

      if (data.token && data.user) {
        localStorage.setItem('hodhod_token', data.token);
        setUser(data.user);
        toast.success('Welcome to Hodhod!');
        console.log('Registration successful for user:', data.user.username);
        return true;
      } else {
        console.error('Missing token or user in response:', data);
        toast.error(data.message || 'Registration failed');
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Network error - please check if server is running');
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