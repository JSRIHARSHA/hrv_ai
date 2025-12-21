import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { mockUsers } from '../data/constants';
import { authAPI } from '../services/apiService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Don't validate token on mount - let API calls handle it
        // This allows the app to work even if backend is temporarily down
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Check if we should use localStorage-only mode
    // Debug: Log the API URL to see if it's being read
    console.log('🔍 DEBUG - REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    console.log('🔍 DEBUG - REACT_APP_USE_LOCALSTORAGE_ONLY:', process.env.REACT_APP_USE_LOCALSTORAGE_ONLY);
    
    const useLocalStorageOnly = process.env.REACT_APP_USE_LOCALSTORAGE_ONLY === 'true' || 
                                !process.env.REACT_APP_API_URL;
    
    console.log('🔍 DEBUG - useLocalStorageOnly:', useLocalStorageOnly);
    
    if (useLocalStorageOnly) {
      console.log('Using localStorage-only mode (API disabled)');
      // Use mock users directly
      const foundUser = mockUsers.find(u => u.email === email && u.isActive);
      
      if (foundUser && password === 'password123') {
        console.log('Mock login successful');
        setUser(foundUser);
        localStorage.setItem('user', JSON.stringify(foundUser));
        setIsLoading(false);
        return true;
      }
      
      console.log('Login failed - user not found or incorrect password');
      setIsLoading(false);
      return false;
    }
    
    try {
      // Try API login first
      console.log('Attempting API login...');
      const response = await authAPI.login(email, password);
      console.log('API login response:', response);
      
      if (response && response.user && response.token) {
        console.log('Login successful, setting user:', response.user);
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('token', response.token);
        setIsLoading(false);
        return true;
      } else {
        console.warn('API login response missing user or token:', response);
      }
    } catch (error: any) {
      console.log('API login failed, error details:', error);
      console.log('Error response:', error.response?.data);
      console.log('Error status:', error.response?.status);
      
      // Fallback to mock if:
      // 1. Network error (no response) - backend is down
      // 2. Not a 401 error (401 means wrong credentials, don't fallback for that)
      const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED';
      const isNotAuthError = error.response?.status !== 401;
      
      if (isNetworkError || isNotAuthError) {
        console.log('Falling back to mock login...');
        // Fallback to mock login if API is not available
        const foundUser = mockUsers.find(u => u.email === email && u.isActive);
        
        if (foundUser && password === 'password123') {
          console.log('Mock login successful');
          setUser(foundUser);
          localStorage.setItem('user', JSON.stringify(foundUser));
          setIsLoading(false);
          return true;
        }
      }
    }
    
    console.log('Login failed');
    setIsLoading(false);
    return false;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.log('API logout failed:', error);
    }
    
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
