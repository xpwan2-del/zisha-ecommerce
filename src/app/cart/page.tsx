"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/utils/currency';
import { useCart } from '@/lib/contexts/CartContext';
import { useAuth } from '@/lib/contexts/AuthContext';

interface Coupon {
  code: string;
  discount_type: string;
  discount_value: number;
  minimum_spend?: number;
  max_discount?: number;
  is_active: boolean;
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartData {
  cart: CartItem[];
  subtotal: number;
  coupon: Coupon | null;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  totalItems: number;
}

export default function CartPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const { cart, removeFromCart, updateQuantity, clearCart, totalItems, debug } = useCart();
  const { user } = useAuth();
  
  // 调用 debug 函数来调试购物车状态
  debug();
  
  console.log('Cart in CartPage:', cart);
  console.log('Total items in CartPage:', totalItems);
  
  const [isLoading, setIsLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [cartData, setCartData] = useState<CartData>({
    cart: cart,
    subtotal: 0,
    coupon: null,
    discount: 0,
    shipping: 0,
    tax: 0,
    total: 0,
    totalItems: totalItems
  });
  const [couponError, setCouponError] = useState('');
  
  // 从后端获取购物车数据
  const fetchCartData = async () => {
    try {
      const cartJson = JSON.stringify(cart);
      const response = await fetch(`/api/cart?cart=${encodeURIComponent(cartJson)}&coupon=${couponCode}`);
      if (response.ok) {
        const data = await response.json();
        setCartData(data);
        setCouponError('');
      } else {
        const data = await response.json();
        setCouponError(data.error || 'Failed to fetch cart data');
      }
    } catch (error) {
      console.error('Error fetching cart data:', error);
      setCouponError('Failed to fetch cart data');
    }
  };
  
  // 当购物车或优惠券代码变化时，重新获取数据
  useEffect(() => {
    fetchCartData();
  }, [cart, couponCode]);
  
  const applyCoupon = () => {
    // 优惠券代码变化会触发 useEffect 重新获取数据
  };
  
  const handleCheckout = async () => {
    if (!user) {
      router.push('/login?redirect=/cart');
      return;
    }
    
    setIsLoading(true);
    try {
      // 调用后端 API 清空购物车
      await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'clear' })
      });
      
      // 清空本地购物车
      clearCart();
      router.push('/checkout/success');
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (cart.length === 0) {
    return (
      <div className="py-12 px-4 bg-[#FDF2F8] middle-east-pattern">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-white/80 glass-effect rounded-lg shadow-md p-8 border border-[#DB2777]/20">
            <svg className="w-16 h-16 text-[#831843]/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-2xl font-bold mb-4 font-['Noto_Naskh_Arabic'] text-[#831843]">{t('cart.empty')}</h2>
            <p className="text-[#831843]/70 mb-6 font-['Noto_Sans_Arabic']">{t('cart.empty_description')}</p>
            <button
              onClick={() => router.push('/products')}
              className="px-6 py-3 bg-[#CA8A04] text-white rounded-lg hover:bg-[#B47C03] transition-colors font-['Noto_Sans_Arabic']"
            >
              {t('cart.shop_now')}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="py-12 px-4 bg-[#FDF2F8] middle-east-pattern">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center font-['Noto_Naskh_Arabic'] text-[#831843]">{t('cart.title')}</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 glass-effect rounded-lg shadow-md border border-[#DB2777]/20">
              <div className="px-6 py-4 border-b border-[#DB2777]/20">
                <h2 className="text-lg font-semibold font-['Noto_Naskh_Arabic'] text-[#831843]">{t('cart.items')}</h2>
              </div>
              
              <div className="divide-y divide-[#DB2777]/10">
                {cart.map((item) => (
                  <div key={item.id} className="px-6 py-4 flex items-center">
                    <div className="flex-shrink-0">
                      <img
                        src={item.image || '/placeholder.jpg'}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    </div>
                    
                    <div className="ml-4 flex-1">
                      <h3 className="font-medium font-['Noto_Naskh_Arabic'] text-[#831843]">{item.name}</h3>
                      <p className="text-sm font-['Noto_Sans_Arabic'] text-[#831843]/70">{formatCurrency(item.price, currency)}</p>
                    </div>
                    
                    <div className="ml-4 flex items-center">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-1 border border-[#DB2777]/30 rounded-l-md hover:bg-[#DB2777]/10 font-['Noto_Sans_Arabic']"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-12 text-center border-y border-[#DB2777]/30 py-1 font-['Noto_Sans_Arabic'] text-[#831843]"
                        min="1"
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 border border-[#DB2777]/30 rounded-r-md hover:bg-[#DB2777]/10 font-['Noto_Sans_Arabic']"
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="ml-4">
                      <p className="font-semibold font-['Noto_Naskh_Arabic'] text-[#831843]">{formatCurrency(item.price * item.quantity, currency)}</p>
                    </div>
                    
                    <div className="ml-4">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-[#DB2777] hover:text-[#831843]"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="px-6 py-4 flex justify-between">
                <button
                  onClick={() => router.push('/products')}
                  className="px-4 py-2 border border-[#DB2777]/30 rounded-lg hover:bg-[#DB2777]/10 font-['Noto_Sans_Arabic'] text-[#831843]"
                >
                  {t('cart.continue_shopping')}
                </button>
                <button
                  onClick={clearCart}
                  className="px-4 py-2 text-[#DB2777] border border-[#DB2777]/30 rounded-lg hover:bg-[#DB2777]/10 font-['Noto_Sans_Arabic']"
                >
                  {t('cart.clear_cart')}
                </button>
              </div>
            </div>
          </div>
          
          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 glass-effect rounded-lg shadow-md border border-[#DB2777]/20">
              <div className="px-6 py-4 border-b border-[#DB2777]/20">
                <h2 className="text-lg font-semibold font-['Noto_Naskh_Arabic'] text-[#831843]">{t('cart.order_summary')}</h2>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                <div className="flex justify-between">
                  <span className="font-['Noto_Sans_Arabic'] text-[#831843]/70">{t('cart.subtotal')}</span>
                  <span className="font-['Noto_Sans_Arabic'] text-[#831843]">{formatCurrency(cartData.subtotal, currency)}</span>
                </div>
                
                {cartData.coupon && (
                  <div className="flex justify-between text-green-600 font-['Noto_Sans_Arabic']">
                    <span>Discount ({cartData.coupon.code})</span>
                    <span>-{formatCurrency(cartData.discount, currency)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="font-['Noto_Sans_Arabic'] text-[#831843]/70">{t('cart.shipping')}</span>
                  <span className="font-['Noto_Sans_Arabic'] text-[#831843]">{cartData.shipping === 0 ? 'Free' : formatCurrency(cartData.shipping, currency)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-['Noto_Sans_Arabic'] text-[#831843]/70">{t('cart.tax')}</span>
                  <span className="font-['Noto_Sans_Arabic'] text-[#831843]">{formatCurrency(cartData.tax, currency)}</span>
                </div>
                
                <div className="pt-4 border-t border-[#DB2777]/20 flex justify-between font-semibold text-lg font-['Noto_Naskh_Arabic'] text-[#831843]">
                  <span>{t('cart.total')}</span>
                  <span>{formatCurrency(cartData.total, currency)}</span>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={handleCheckout}
                    disabled={isLoading}
                    className="w-full py-3 bg-[#CA8A04] text-white rounded-lg hover:bg-[#B47C03] transition-colors disabled:opacity-50 font-['Noto_Sans_Arabic']"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        {t('cart.processing')}
                      </div>
                    ) : (
                      t('cart.checkout')
                    )}
                  </button>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5 text-[#831843]/50" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v11a3 3 0 106 0V6a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-15a2 2 0 012-2h2a2 2 0 012 2v12a1 1 0 110 2h-2a1 1 0 01-1-1v-1H6V5z" clipRule="evenodd" />
                    </svg>
                    <svg className="w-5 h-5 text-[#831843]/50" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V19c0 .27.16.59.67.5C17.14 18.16 20 14.42 20 10A10 10 0 0010 0z" />
                    </svg>
                    <svg className="w-5 h-5 text-[#831843]/50" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.03 2.97a.75.75 0 00-1.06 0l-7.5 7.5a.75.75 0 001.06 1.06L10 4.06l6.47 6.47a.75.75 0 101.06-1.06l-7.5-7.5z" />
                      <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0z" />
                    </svg>
                  </div>
                  <p className="text-xs text-center font-['Noto_Sans_Arabic'] text-[#831843]/70 mt-2">
                    {t('cart.secure_checkout')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Discount code */}
            <div className="mt-6 bg-white/80 glass-effect rounded-lg shadow-md p-6 border border-[#DB2777]/20">
              <h3 className="font-medium mb-4 font-['Noto_Naskh_Arabic'] text-[#831843]">{t('cart.discount')}</h3>
              {couponError && (
                <div className="text-[#DB2777] text-sm mb-2 font-['Noto_Sans_Arabic']">{couponError}</div>
              )}
              {cartData.coupon && (
                <div className="text-green-600 text-sm mb-2 font-['Noto_Sans_Arabic']">
                  Coupon applied successfully!
                </div>
              )}
              <div className="flex">
                <input
                  type="text"
                  placeholder={t('cart.enter_code')}
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 px-4 py-2 border border-[#DB2777]/30 rounded-l-lg font-['Noto_Sans_Arabic'] text-[#831843] bg-white/90"
                />
                <button 
                  onClick={applyCoupon}
                  className="px-4 py-2 bg-[#CA8A04] text-white rounded-r-lg hover:bg-[#B47C03] font-['Noto_Sans_Arabic']"
                >
                  {t('cart.apply')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}