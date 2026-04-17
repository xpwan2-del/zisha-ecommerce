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

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, checkAuth } = useAuth();
  const router = useRouter();
  
  const getCartKey = () => {
    return isAuthenticated && user ? `cart_${user.id}` : 'cart_guest';
  };

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      // Guest 用户从 localStorage 读取
      if (!isAuthenticated) {
        const storedCart = localStorage.getItem('cart_guest');
        if (storedCart) {
          const parsedCart = JSON.parse(storedCart);
          if (Array.isArray(parsedCart)) {
            return parsedCart;
          }
        }
      }
      // 已登录用户：返回空数组，等 API 获取最新数据
      return [];
    } catch (error) {
      if (!isAuthenticated) {
        localStorage.removeItem('cart_guest');
      }
    }
    return [];
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    const cartKey = getCartKey();
    localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, isAuthenticated, user]);

  // 已登录用户立即从 API 获取最新数据
  useEffect(() => {
    if (isAuthenticated && user) {
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        fetch('/api/cart', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data?.items) {
            setCart(data.data.items);
          }
        })
        .catch(err => console.error('Failed to fetch cart:', err));
      }
    }
  }, [isAuthenticated, user]);

  // Handle cart synchronization when user logs in/out
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const handleAuthChange = async () => {
      if (isAuthenticated && user) {
        const guestCart = localStorage.getItem('cart_guest');
        if (guestCart) {
          try {
            const accessToken = localStorage.getItem('access_token');
            if (accessToken) {
              await fetch('/api/cart/merge', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ guest_cart: JSON.parse(guestCart) }),
              });
              localStorage.removeItem('cart_guest');

              const response = await fetch('/api/cart', {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              });
              if (response.ok) {
                const data = await response.json();
                setCart(data.data?.items || []);
              }
            }
          } catch (error) {
            console.error('Failed to merge guest cart:', error);
          }
        } else {
          try {
            const accessToken = localStorage.getItem('access_token');
            if (accessToken) {
              const response = await fetch('/api/cart', {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              });
              if (response.ok) {
                const data = await response.json();
                setCart(data.data?.items || []);
              }
            }
          } catch (error) {
            console.error('Failed to refresh cart:', error);
          }
        }
      } else {
        setCart([]);
        localStorage.removeItem('cart_guest');
        const userId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}').id : null;
        if (userId) {
          localStorage.removeItem(`cart_${userId}`);
        }
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
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
          const response = await fetch('/api/cart', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
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
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          if (cartResponse.ok) {
            const cartData = await cartResponse.json();
            setCart(cartData.data?.items || []);
          }

          return { success: true };
        }
      } catch (error) {
        console.error('Failed to sync cart with server:', error);
        return { success: false, error: 'NETWORK_ERROR', message: 'Network error' };
      }
    }

    return { success: false, error: 'UNKNOWN', message: 'Unknown error' };
  };

  const removeFromCart = async (id: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
    
    // Sync with server
    if (isAuthenticated && user) {
      try {
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
          await fetch('/api/cart?product_id=' + id, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
          });
        }
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
    
    // Sync with server
    if (isAuthenticated && user) {
      try {
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
          await fetch('/api/cart', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ id: id, quantity: quantity }),
          });
        }
      } catch (error) {
        console.error('Failed to sync cart with server:', error);
      }
    }
  };

  const clearCart = async () => {
    setCart([]);

    // Sync with server
    if (isAuthenticated && user) {
      try {
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
          await fetch('/api/cart?clear=true', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
        }
      } catch (error) {
        console.error('Failed to sync cart with server:', error);
      }
    }
  };

  const refreshCart = async () => {
    if (isAuthenticated && user) {
      try {
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
          const response = await fetch('/api/cart', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setCart(data.data?.items || []);
          }
        }
      } catch (error) {
        console.error('Failed to refresh cart:', error);
      }
    }
  };

  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const totalAmount = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  const debug = () => {
    const cartKey = getCartKey();
    console.log('Cart debug info:');
    console.log('Cart items:', cart);
    console.log('Total items:', totalItems);
    console.log('Total amount:', totalAmount);
    console.log('Cart key:', cartKey);
    console.log('Cart in localStorage:', localStorage.getItem(cartKey));
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