"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';

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

/**
 * 从API响应中提取用户数据
 * @description 兼容新旧响应格式：{ success: true, data: { user } } 或 { user }
 */
function extractUserFromResponse(data: any): User | null {
  if (!data) return null;
  // 新格式：{ success: true, data: { user: {...} } }
  if (data.data?.user) return data.data.user;
  // 旧格式：{ user: {...} }
  if (data.user) return data.user;
  return null;
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

// 辅助函数：从 Cookie 获取访客购物车
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

// 辅助函数：清除访客购物车 Cookie
const clearGuestCartCookie = () => {
  if (typeof document === 'undefined') return;
  document.cookie = 'cart_guest=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth status - 直接调用后端 API 验证（方案 B：不再用 JS 检查 Cookie）
  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const user = extractUserFromResponse(data);
        if (!user) {
          setUser(null);
          setIsLoading(false);
          return false;
        }

        const userData = {
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
        setUser(userData);
        setIsLoading(false);
        return true;
      } else if (response.status === 401) {
        // Token 过期，尝试刷新
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          // 刷新成功，重新获取用户信息
          const meResponse = await fetch('/api/auth/me', {
            credentials: 'include',
          });
          if (meResponse.ok) {
            const meData = await meResponse.json();
            const user = extractUserFromResponse(meData);
            if (user) {
              const userData = {
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
              setUser(userData);
              setIsLoading(false);
              return true;
            }
          }
        }
        // 刷新失败
        setUser(null);
        setIsLoading(false);
        return false;
      } else {
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('checkAuthStatus error:', error);
      setIsLoading(false);
      return false;
    }
  }, []);

  // Mount Effect - 初始化时直接调用 API 验证
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // checkAuth - 供其他组件调用检查登录状态
  const checkAuth = useCallback(async (): Promise<boolean> => {
    if (!user) {
      return await checkAuthStatus();
    }
    return true;
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
      const user = extractUserFromResponse(data);

      if (!user) {
        throw new Error('Failed to parse user data');
      }

      const userData = {
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
      setUser(userData);

      // 合并访客购物车（通过 Cookie）
      const guestCart = getGuestCartFromCookie();
      if (guestCart && user) {
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
      setUser(userData);

      // 合并访客购物车（通过 Cookie）
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
