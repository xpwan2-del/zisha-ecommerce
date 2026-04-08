"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  currency?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Omit<CartItem, 'quantity'>) => Promise<void>;
  removeFromCart: (id: number) => Promise<void>;
  updateQuantity: (id: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  totalAmount: number;
  debug: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, checkAuth } = useAuth();
  
  const getCartKey = () => {
    return isAuthenticated && user ? `cart_${user.id}` : 'cart_guest';
  };

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const cartKey = getCartKey();
      const storedCart = localStorage.getItem(cartKey);
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        if (Array.isArray(parsedCart)) {
          return parsedCart;
        }
      }
    } catch (error) {
      const cartKey = getCartKey();
      localStorage.removeItem(cartKey);
    }
    return [];
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    const cartKey = getCartKey();
    localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, isAuthenticated, user]);

  // Handle cart synchronization when user logs in/out
  useEffect(() => {
    const handleAuthChange = async () => {
      if (isAuthenticated && user) {
        // User logged in, merge guest cart if exists
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
              
              // Refresh cart from server
              const cartKey = getCartKey();
              const response = await fetch('/api/cart', {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              });
              if (response.ok) {
                const data = await response.json();
                setCart(data.cart || []);
              }
            }
          } catch (error) {
            console.error('Failed to merge guest cart:', error);
          }
        } else {
          // No guest cart, refresh from server
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
                setCart(data.cart || []);
              }
            }
          } catch (error) {
            console.error('Failed to refresh cart:', error);
          }
        }
      } else {
        // User logged out, clear cart
        // AuthProvider's logout function should have already cleared localStorage
        // but we'll double-check and ensure cart is empty
        setCart([]);
        // Also clear any remaining cart data in localStorage
        localStorage.removeItem('cart_guest');
        const userId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}').id : null;
        if (userId) {
          localStorage.removeItem(`cart_${userId}`);
        }
      }
    };

    handleAuthChange();
  }, [isAuthenticated, user]);

  const addToCart = async (product: Omit<CartItem, 'quantity'>) => {
    console.log('========== [addToCart] ==========');
    console.log('1. addToCart called with product:', product);
    console.log('2. Current isAuthenticated:', isAuthenticated);
    console.log('3. Current user:', user);
    
    // Check if user is authenticated
    console.log('4. Calling checkAuth()...');
    const isAuth = await checkAuth();
    console.log('5. checkAuth() result:', isAuth);
    
    // Version: 2 - Force rebuild
    if (!isAuth) {
      console.log('6. [NOT LOGGED IN] User not authenticated, redirecting to login');
      console.log('7. Redirecting to: /login?redirect=' + encodeURIComponent(window.location.pathname));
      console.log('========== [addToCart END - REDIRECTING] ==========');
      // Redirect to login page with redirect back to current page
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    
    console.log('8. [LOGGED IN] User is authenticated, proceeding to add to cart');
    
    // Sync cart with server first
    console.log('9. Syncing cart with server...');
    if (isAuth && user) {
      try {
        const accessToken = localStorage.getItem('access_token');
        console.log('10. Access token exists:', !!accessToken);
        if (accessToken) {
          console.log('11. Calling /api/cart/add...');
          const response = await fetch('/api/cart/add', {
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
          console.log('12. /api/cart/add response status:', response.status);
          const result = await response.json();
          console.log('13. /api/cart/add response:', result);
          
          // Refresh cart from server to ensure local state matches server
          console.log('14. Refreshing cart from server...');
          const cartResponse = await fetch('/api/cart', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          if (cartResponse.ok) {
            const cartData = await cartResponse.json();
            console.log('15. Cart data from server:', cartData);
            setCart(cartData.cart || []);
          }
        }
      } catch (error) {
        console.error('16. Failed to sync cart with server:', error);
      }
    }
    
    console.log('========== [addToCart END - SUCCESS] ==========');
  };

  const removeFromCart = async (id: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
    
    // Sync with server
    if (isAuthenticated && user) {
      try {
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
          await fetch('/api/cart/remove', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ product_id: id }),
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
          await fetch('/api/cart/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ product_id: id, quantity }),
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
          await fetch('/api/cart/clear', {
            method: 'POST',
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