"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: number;
  name: string;
  price: number;
  price_usd?: number;
  price_cny?: number;
  price_aed?: number;
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

const setGuestCartToCookie = (cart: any[]) => {
  if (typeof document === 'undefined') return;
  const cookieValue = encodeURIComponent(JSON.stringify(cart));
  document.cookie = `cart_guest=${cookieValue}; path=/; max-age=${30 * 24 * 60 * 60}`;
};

const clearGuestCartCookie = () => {
  if (typeof document === 'undefined') return;
  document.cookie = 'cart_guest=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
};

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, checkAuth } = useAuth();
  const router = useRouter();
  const previousAuthStateRef = useRef<boolean | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    const guestCart = getGuestCartFromCookie();
    if (guestCart && Array.isArray(guestCart)) {
      return guestCart;
    }
    return [];
  });
  const [totalAmount, setTotalAmount] = useState<number>(0);

  const fetchServerCart = useCallback(async () => {
    const response = await fetch('/api/cart', {
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      items: data.data?.items || [],
      totalAmount: data.data?.total_usd || 0,
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setGuestCartToCookie(cart);
    }
  }, [cart, isAuthenticated]);

  useEffect(() => {
    const syncCart = async () => {
      if (!isAuthenticated || !user) {
        previousAuthStateRef.current = false;
        setCart([]);
        setTotalAmount(0);
        return;
      }

      const justLoggedIn = previousAuthStateRef.current === false || previousAuthStateRef.current === null;
      previousAuthStateRef.current = true;
      const guestCart = getGuestCartFromCookie();

      if (justLoggedIn && guestCart && guestCart.length > 0) {
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

      try {
        const serverCart = await fetchServerCart();
        if (!serverCart) {
          return;
        }
        setCart(serverCart.items);
        setTotalAmount(serverCart.totalAmount);
      } catch (error) {
        console.error('Failed to fetch cart:', error);
      }
    };

    syncCart();
  }, [fetchServerCart, isAuthenticated, user]);

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

        const serverCart = await fetchServerCart();
        if (serverCart) {
          setCart(serverCart.items);
          setTotalAmount(serverCart.totalAmount);
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
    setTotalAmount(0);

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
        const serverCart = await fetchServerCart();
        if (serverCart) {
          setCart(serverCart.items);
          setTotalAmount(serverCart.totalAmount);
        }
      } catch (error) {
        console.error('Failed to refresh cart:', error);
      }
    }
  };

  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);

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
