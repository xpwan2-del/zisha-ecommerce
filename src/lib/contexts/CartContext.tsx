"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  currency?: string;
}

interface AddToCartResult {
  success: boolean;
  error?: string;
  message?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Omit<CartItem, 'quantity'>) => Promise<AddToCartResult>;
  removeFromCart: (id: number) => Promise<void>;
  updateQuantity: (id: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  totalItems: number;
  totalAmount: number;
  debug: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

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

// 辅助函数：保存访客购物车到 Cookie
const setGuestCartToCookie = (cart: any[]) => {
  if (typeof document === 'undefined') return;
  const cookieValue = encodeURIComponent(JSON.stringify(cart));
  document.cookie = `cart_guest=${cookieValue}; path=/; max-age=${30 * 24 * 60 * 60}`;
};

// 辅助函数：清除访客购物车 Cookie
const clearGuestCartCookie = () => {
  if (typeof document === 'undefined') return;
  document.cookie = 'cart_guest=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
};

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, checkAuth } = useAuth();
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>(() => {
    // 初始状态：访客从 Cookie 读取，已登录用户从 API 获取
    if (!isAuthenticated) {
      const guestCart = getGuestCartFromCookie();
      if (guestCart && Array.isArray(guestCart)) {
        return guestCart;
      }
    }
    return [];
  });

  // 访客购物车：Cart 变化时同步到 Cookie
  useEffect(() => {
    if (!isAuthenticated) {
      setGuestCartToCookie(cart);
    }
  }, [cart, isAuthenticated]);

  // 已登录用户从 API 获取最新数据
  useEffect(() => {
    if (isAuthenticated && user) {
      fetch('/api/cart', {
        credentials: 'include',
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.items) {
          setCart(data.data.items);
        }
      })
      .catch(err => console.error('Failed to fetch cart:', err));
    }
  }, [isAuthenticated, user]);

  // 处理登录状态变化时的购物车同步
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const handleAuthChange = async () => {
      if (isAuthenticated && user) {
        // 用户刚登录，合并访客购物车
        const guestCart = getGuestCartFromCookie();
        if (guestCart && guestCart.length > 0) {
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

            // 合并后刷新购物车
            const response = await fetch('/api/cart', {
              credentials: 'include',
            });
            if (response.ok) {
              const data = await response.json();
              setCart(data.data?.items || []);
            }
          } catch (error) {
            console.error('Failed to merge guest cart:', error);
          }
        } else {
          // 无访客购物车，直接获取用户购物车
          try {
            const response = await fetch('/api/cart', {
              credentials: 'include',
            });
            if (response.ok) {
              const data = await response.json();
              setCart(data.data?.items || []);
            }
          } catch (error) {
            console.error('Failed to refresh cart:', error);
          }
        }
      } else {
        // 用户登出，清空购物车
        setCart([]);
      }
    };

    handleAuthChange();
  }, [isAuthenticated, user]);

  const addToCart = async (product: Omit<CartItem, 'quantity'>): Promise<AddToCartResult> => {
    const isAuth = await checkAuth();

    if (!isAuth) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return { success: false, error: 'NOT_LOGGED_IN', message: 'Please login first' };
    }

    if (isAuth && user) {
      try {
        const response = await fetch('/api/cart', {
          credentials: 'include',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product_id: product.id,
            quantity: 1
          }),
        });

        const result = await response.json();

        if (!result.success) {
          return {
            success: false,
            error: result.error_code || 'ADD_TO_CART_FAILED',
            message: result.message || 'Failed to add to cart'
          };
        }

        const cartResponse = await fetch('/api/cart', {
          credentials: 'include',
        });
        if (cartResponse.ok) {
          const cartData = await cartResponse.json();
          setCart(cartData.data?.items || []);
        }

        return { success: true };
      } catch (error) {
        console.error('Failed to sync cart with server:', error);
        return { success: false, error: 'NETWORK_ERROR', message: 'Network error' };
      }
    }

    return { success: false, error: 'UNKNOWN', message: 'Unknown error' };
  };

  const removeFromCart = async (id: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));

    if (isAuthenticated && user) {
      try {
        await fetch('/api/cart?product_id=' + id, {
          credentials: 'include',
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to sync cart with server:', error);
      }
    }
  };

  const updateQuantity = async (id: number, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(id);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );

    if (isAuthenticated && user) {
      try {
        await fetch('/api/cart', {
          credentials: 'include',
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: id, quantity: quantity }),
        });
      } catch (error) {
        console.error('Failed to sync cart with server:', error);
      }
    }
  };

  const clearCart = async () => {
    setCart([]);

    if (isAuthenticated && user) {
      try {
        await fetch('/api/cart?clear=true', {
          credentials: 'include',
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to sync cart with server:', error);
      }
    }
  };

  const refreshCart = async () => {
    if (isAuthenticated && user) {
      try {
        const response = await fetch('/api/cart', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setCart(data.data?.items || []);
        }
      } catch (error) {
        console.error('Failed to refresh cart:', error);
      }
    }
  };

  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const totalAmount = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  const debug = () => {
    const guestCart = getGuestCartFromCookie();
    console.log('Cart debug info:');
    console.log('Cart items:', cart);
    console.log('Total items:', totalItems);
    console.log('Total amount:', totalAmount);
    console.log('Guest cart in Cookie:', guestCart);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart,
        totalItems,
        totalAmount,
        debug,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
