"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  level: string;
  points: number;
  total_spent: number;
  referral_code: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  console.log('========== [AuthProvider] ==========');
  console.log('1. AuthProvider initialized');
  
  // Initialize user from localStorage synchronously to avoid race conditions
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  
  console.log('2. Initial user state:', user);
  console.log('3. Initial isLoading state:', isLoading);
  console.log('4. Pathname:', pathname);
  console.log('5. localStorage access_token:', !!localStorage.getItem('access_token'));
  console.log('6. localStorage refresh_token:', !!localStorage.getItem('refresh_token'));
  console.log('7. localStorage user:', !!localStorage.getItem('user'));

  // Check auth status and refresh token if needed
  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    console.log('========== [checkAuthStatus] ==========');
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const storedUser = localStorage.getItem('user');
    
    console.log('1. Access token exists:', !!accessToken);
    console.log('2. Refresh token exists:', !!refreshToken);
    console.log('3. User in localStorage:', !!storedUser);
    console.log('4. Current user state:', user);
    
    if (!accessToken || !refreshToken || !storedUser) {
      console.log('5. [NO TOKEN] No access or refresh token found, user is not logged in');
      setUser(null);
      setIsLoading(false);
      console.log('========== [checkAuthStatus END - NOT LOGGED IN] ==========');
      return false;
    }

    try {
      console.log('5. [HAS TOKENS] Checking if token is valid...');
      // Check if token is valid
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log('6. /api/auth/me response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('7. Token is valid, response data:', data);
        
        if (!data || !data.user) {
          console.log('8. [ERROR] Invalid user data format');
          setUser(null);
          setIsLoading(false);
          console.log('========== [checkAuthStatus END - LOGGED OUT] ==========');
          return false;
        }
        
        // Ensure user data matches User interface
        const userData = {
          id: String(data.user.id),
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone,
          role: data.user.role,
          level: data.user.level || '普通',
          points: data.user.points || 0,
          total_spent: data.user.total_spent || 0,
          referral_code: data.user.referral_code || ''
        };
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsLoading(false);
        console.log('8. User data set:', userData);
        console.log('9. Login status: LOGGED IN');
        console.log('========== [checkAuthStatus END - LOGGED IN] ==========');
        return true;
      } else if (response.status === 401) {
        console.log('7. Token is invalid, trying to refresh...');
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        console.log('8. /api/auth/refresh response status:', refreshResponse.status);

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          console.log('9. Token refreshed successfully, response data:', refreshData);

          if (!refreshData || !refreshData.access_token) {
            console.log('10. [ERROR] Invalid refresh data format, but keeping user state');
            setIsLoading(false);
            const currentUser = localStorage.getItem('user');
            console.log('========== [checkAuthStatus END - KEEPING STATE] ==========');
            return !!currentUser;
          }

          const storedUser = localStorage.getItem('user');
          if (!storedUser) {
            console.log('10. [ERROR] No user data in localStorage, but keeping user state');
            setIsLoading(false);
            console.log('========== [checkAuthStatus END - KEEPING STATE] ==========');
            return false;
          }

          const userData = JSON.parse(storedUser);
          localStorage.setItem('access_token', refreshData.access_token);
          setUser(userData);
          setIsLoading(false);
          console.log('10. User data set:', userData);
          console.log('11. Login status: LOGGED IN (token refreshed)');
          console.log('========== [checkAuthStatus END - LOGGED IN] ==========');
          return true;
        } else {
          console.log('9. [ERROR] Refresh token failed, but keeping user state');
          setIsLoading(false);
          const currentUser = localStorage.getItem('user');
          console.log('10. Keeping current user state, login status:', !!currentUser ? 'LOGGED IN' : 'LOGGED OUT');
          console.log('========== [checkAuthStatus END - KEEPING STATE] ==========');
          return !!currentUser;
        }
      } else {
        console.log('7. [ERROR] Unexpected response status:', response.status);
        // Don't clear user on unexpected status, keep current state
        setIsLoading(false);
        console.log('8. Login status: UNKNOWN (keeping current state)');
        console.log('========== [checkAuthStatus END - KEEPING CURRENT STATE] ==========');
        return !!user || !!storedUser;
      }
    } catch (error) {
      console.error('========== [checkAuthStatus END - ERROR] ==========');
      console.error('Error checking auth status:', error);
      // Don't clear tokens on network errors, just set loading to false
      setIsLoading(false);
      // If we have user data in localStorage, use it
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log('8. User data loaded from localStorage:', userData);
        console.log('9. Login status: LOGGED IN (from localStorage)');
      } else {
        console.log('8. No user data in localStorage');
        console.log('9. Login status: LOGGED OUT');
      }
      const isLoggedIn = !!user || !!storedUser;
      console.log('10. Final login status:', isLoggedIn ? 'LOGGED IN' : 'LOGGED OUT');
      console.log('========== [checkAuthStatus END - ERROR] ==========');
      return isLoggedIn;
    }
  }, []);

  // Load user from localStorage on mount
  useEffect(() => {
    console.log('========== [Mount Effect] ==========');
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      console.log('1. Stored user exists:', !!storedUser);
      console.log('2. Access token exists:', !!accessToken);
      console.log('3. Refresh token exists:', !!refreshToken);

      if (storedUser && accessToken && refreshToken) {
        console.log('4. Loading user from localStorage...');
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsLoading(false);
        console.log('5. User loaded, isLoading set to false');
        // After loading user, check if token is still valid
        console.log('6. Checking if token is still valid...');
        checkAuthStatus();
      } else {
        console.log('4. No tokens in localStorage');
        setUser(null);
        setIsLoading(false);
      }
    } else {
      console.log('4. Server-side rendering - skipping localStorage access');
      setIsLoading(false);
    }

    console.log('========== [Mount Effect END] ==========');
  }, []);

  // Set user immediately when tokens are set in localStorage
  useEffect(() => {
    console.log('========== [Token Change Effect] ==========');
    const checkTokens = () => {
      if (typeof window === 'undefined') return;
      
      const storedUser = localStorage.getItem('user');
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      console.log('1. Checking tokens in localStorage...');
      console.log('2. Stored user exists:', !!storedUser);
      console.log('3. Access token exists:', !!accessToken);
      console.log('4. Refresh token exists:', !!refreshToken);
      
      if (storedUser && accessToken && refreshToken) {
        console.log('5. Tokens exist, loading user from localStorage...');
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsLoading(false);
      }
    };
    
    // Check immediately
    checkTokens();
    
    // Set up storage event listener to detect changes from other tabs
    window.addEventListener('storage', checkTokens);
    
    return () => {
      window.removeEventListener('storage', checkTokens);
    };
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    console.log('========== [Save User Effect] ==========');
    console.log('1. User state changed:', user);
    if (user) {
      console.log('2. Saving user to localStorage');
      localStorage.setItem('user', JSON.stringify(user));
      console.log('3. User saved to localStorage:', localStorage.getItem('user'));
    } else {
      console.log('2. Removing user from localStorage');
      localStorage.removeItem('user');
      // Do not remove tokens here - they will be removed in logout function
      console.log('3. User removed from localStorage');
    }
    console.log('4. Access token in localStorage:', localStorage.getItem('access_token'));
    console.log('5. Refresh token in localStorage:', localStorage.getItem('refresh_token'));
    console.log('========== [Save User Effect END] ==========');
  }, [user]);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    console.log('========== [checkAuth] ==========');
    console.log('1. Current user:', user);
    console.log('2. Is authenticated before check:', !!user);
    
    // Check if token exists in localStorage
    const accessToken = localStorage.getItem('access_token');
    console.log('3. Access token in localStorage:', !!accessToken);
    
    if (!user || !accessToken) {
      console.log('4. [NO USER or NO TOKEN] Calling checkAuthStatus()...');
      const result = await checkAuthStatus();
      console.log('5. checkAuthStatus result:', result);
      console.log('6. Current user after checkAuthStatus:', user);
      console.log('========== [checkAuth END] ==========');
      return result;
    }
    
    const result = !!user;
    console.log('4. [USER EXISTS] checkAuth result:', result);
    console.log('========== [checkAuth END] ==========');
    return result;
  }, [user, checkAuthStatus]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid email or password');
      }
      
      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      // Ensure user data matches User interface
      const userData = {
        id: String(data.user.id),
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,
        role: data.user.role,
        level: data.user.level || '普通',
        points: data.user.points || 0,
        total_spent: data.user.total_spent || 0,
        referral_code: data.user.referral_code || ''
      };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      // Merge guest cart with user cart
      const guestCart = localStorage.getItem('cart_guest');
      if (guestCart && data.user) {
        try {
          await fetch('/api/cart/merge', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.access_token}`,
            },
            body: JSON.stringify({ guest_cart: JSON.parse(guestCart) }),
          });
          localStorage.removeItem('cart_guest');
        } catch (error) {
          console.error('Failed to merge guest cart:', error);
        }
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
      
      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      // Ensure user data matches User interface
      const userData = {
        id: String(data.user.id),
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,
        role: data.user.role,
        level: data.user.level || '普通',
        points: data.user.points || 0,
        total_spent: data.user.total_spent || 0,
        referral_code: data.user.referral_code || ''
      };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      // Merge guest cart with user cart
      const guestCart = localStorage.getItem('cart_guest');
      if (guestCart && data.user) {
        try {
          await fetch('/api/cart/merge', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.access_token}`,
            },
            body: JSON.stringify({ guest_cart: JSON.parse(guestCart) }),
          });
          localStorage.removeItem('cart_guest');
        } catch (error) {
          console.error('Failed to merge guest cart:', error);
        }
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      // 清空购物车相关数据
      const userId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}').id : null;
      if (userId) {
        localStorage.removeItem(`cart_${userId}`);
      }
      localStorage.removeItem('cart_guest');
    }
  };



  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}