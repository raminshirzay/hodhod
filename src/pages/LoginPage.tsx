import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle, Lock, Mail, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, login } = useAuth();

  if (user) {
    return <Navigate to="/messenger" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const success = await login(email, password);
    if (success) {
      // Navigation will happen automatically due to user state change
    }
    
    setIsLoading(false);
  };

  const handleAdminLogin = () => {
    setEmail('admin');
    setPassword('123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1F3934] to-[#2D4A3E] p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <MessageCircle className="h-12 w-12 text-[#F3C883]" />
          </div>
          <h2 className="text-3xl font-bold text-white">Welcome back to Hodhod</h2>
          <p className="mt-2 text-gray-300">Sign in to your account</p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-2xl relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F3C883] focus:border-transparent focus:z-10 sm:text-sm"
                  placeholder="Email address or Username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-2xl relative block w-full pl-10 pr-12 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F3C883] focus:border-transparent focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-2xl text-[#1F3934] bg-[#F3C883] hover:bg-[#E6B970] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F3C883] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-gray-300">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#F3C883] hover:text-[#E6B970] font-medium">
                Sign up
              </Link>
            </p>
          </div>

          <div className="text-center space-y-2">
            <div className="border-t border-gray-600 pt-4">
              <p className="text-sm text-gray-400 mb-2">Quick Login:</p>
              <button
                type="button"
                onClick={handleAdminLogin}
                className="bg-gray-700 text-white px-4 py-2 rounded-xl hover:bg-gray-600 transition-colors text-sm"
              >
                Admin Login (admin / 123)
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};