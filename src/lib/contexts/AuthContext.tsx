"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
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

function extractUserFromResponse(data: any): User | null {
  if (!data) return null;
  if (data.data?.user) return data.data.user;
  if (data.user) return data.user;
  return null;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  checkAuth: () => Promise<boolean>;
  isNavigating: boolean;
  setIsNavigating: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getGuestCartFromCookie = (): any[] | null => {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'cart_guest') {
      try {
        return JSON.parse(decodeURIComponent(value));
      } catch {
        return [];
      }
    }
  }
  return null;
};

const clearGuestCartCookie = () => {
  if (typeof document === 'undefined') return;
  document.cookie = 'cart_guest=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
};

function normalizeUser(user: User | null): User | null {
  if (!user) {
    return null;
  }

  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    level: user.level || '普通',
    points: user.points || 0,
    total_spent: user.total_spent || 0,
    referral_code: user.referral_code || ''
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const checkAuthPromiseRef = useRef<Promise<boolean> | null>(null);
  const hasResolvedInitialAuthRef = useRef(false);

  const applyUserState = useCallback((nextUser: User | null) => {
    const normalized = normalizeUser(nextUser);
    setUser(normalized);
    setStatus(normalized ? 'authenticated' : 'unauthenticated');
    setIsLoading(false);
  }, []);

  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    if (checkAuthPromiseRef.current) {
      return checkAuthPromiseRef.current;
    }

    setIsLoading(true);

    checkAuthPromiseRef.current = (async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.authenticated === false) {
            applyUserState(null);
            return false;
          }
          const nextUser = extractUserFromResponse(data);
          applyUserState(nextUser);
          return Boolean(nextUser);
        }

        if (response.status === 401) {
          const errorData = await response.json().catch(() => null);

          if (errorData?.error === 'AUTH_TOKEN_INVALID') {
            const refreshResponse = await fetch('/api/auth/refresh', {
              method: 'POST',
              credentials: 'include',
            });

            if (refreshResponse.ok) {
              const meResponse = await fetch('/api/auth/me', {
                credentials: 'include',
              });

              if (meResponse.ok) {
                const meData = await meResponse.json();
                const nextUser = extractUserFromResponse(meData);
                applyUserState(nextUser);
                return Boolean(nextUser);
              }
            }
          }
        }

        applyUserState(null);
        return false;
      } catch (error) {
        console.error('checkAuthStatus error:', error);
        applyUserState(null);
        return false;
      } finally {
        setIsLoading(false);
        hasResolvedInitialAuthRef.current = true;
        checkAuthPromiseRef.current = null;
      }
    })();

    return checkAuthPromiseRef.current;
  }, [applyUserState]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // 路由变化时自动重置导航加载状态
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    if (user) {
      return true;
    }

    if (checkAuthPromiseRef.current) {
      return checkAuthPromiseRef.current;
    }

    if (!hasResolvedInitialAuthRef.current) {
      return checkAuthStatus();
    }

    return false;
  }, [checkAuthStatus, user]);

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
      const nextUser = extractUserFromResponse(data);

      if (!nextUser) {
        throw new Error('Failed to parse user data');
      }

      applyUserState(nextUser);
      hasResolvedInitialAuthRef.current = true;

      const guestCart = getGuestCartFromCookie();
      if (guestCart && nextUser) {
        try {
          await fetch('/api/cart/merge', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ guest_cart: guestCart }),
          });
          clearGuestCartCookie();
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

  const register = async (name: string, email: string, password: string, phone?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, phone }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();
      const nextUser = data.user ? normalizeUser(data.user) : null;

      if (!nextUser) {
        throw new Error('Failed to parse user data');
      }

      applyUserState(nextUser);
      hasResolvedInitialAuthRef.current = true;

      const guestCart = getGuestCartFromCookie();
      if (guestCart && data.user) {
        try {
          await fetch('/api/cart/merge', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ guest_cart: guestCart }),
          });
          clearGuestCartCookie();
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
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setStatus('unauthenticated');
      hasResolvedInitialAuthRef.current = true;
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        status,
        login,
        register,
        logout,
        isAuthenticated,
        checkAuth,
        isNavigating,
        setIsNavigating,
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
