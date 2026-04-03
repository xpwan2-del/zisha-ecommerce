"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { convertCurrency, formatCurrency } from '@/lib/utils/currency';
import { useCart } from '@/lib/contexts/CartContext';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function CartPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const { cart, removeFromCart, updateQuantity, clearCart, totalItems, totalAmount } = useCart();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  
  const applyCoupon = async () => {
    if (!couponCode) return;
    
    try {
      const response = await fetch(`/api/coupons?code=${couponCode}`);
      const data = await response.json();
      
      if (response.ok) {
        setCoupon(data);
        setCouponError('');
      } else {
        setCouponError(data.error || 'Invalid coupon');
        setCoupon(null);
      }
    } catch (error) {
      setCouponError('Failed to apply coupon');
      setCoupon(null);
    }
  };
  
  const calculateDiscount = () => {
    if (!coupon) return 0;
    
    const subtotal = totalAmount;
    
    if (coupon.minimum_spend && subtotal < coupon.minimum_spend) {
      return 0;
    }
    
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = (subtotal * coupon.discount_value) / 100;
    } else {
      discount = coupon.discount_value;
    }
    
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }
    
    return discount;
  };
  
  const handleCheckout = async () => {
    if (!user) {
      router.push('/login?redirect=/cart');
      return;
    }
    
    setIsLoading(true);
    try {
      // Here you would typically create an order
      // For now, we'll just clear the cart and redirect to success
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
      <div className="py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-2xl font-bold mb-4">{t('cart.empty')}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{t('cart.empty_description')}</p>
            <button
              onClick={() => router.push('/products')}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              {t('cart.shop_now')}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">{t('cart.title')}</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">{t('cart.items')}</h2>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
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
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{item.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(convertCurrency(item.price, 'aed', currency), currency)}</p>
                    </div>
                    
                    <div className="ml-4 flex items-center">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-l-md hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-12 text-center border-y border-gray-300 dark:border-gray-600 py-1"
                        min="1"
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-r-md hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="ml-4">
                      <p className="font-semibold">{formatCurrency(convertCurrency(item.price * item.quantity, 'aed', currency), currency)}</p>
                    </div>
                    
                    <div className="ml-4">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
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
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('cart.continue_shopping')}
                </button>
                <button
                  onClick={clearCart}
                  className="px-4 py-2 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  {t('cart.clear_cart')}
                </button>
              </div>
            </div>
          </div>
          
          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">{t('cart.order_summary')}</h2>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('cart.subtotal')}</span>
                  <span>{formatCurrency(convertCurrency(totalAmount, 'aed', currency), currency)}</span>
                </div>
                
                {coupon && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount ({coupon.code})</span>
                    <span>-{formatCurrency(convertCurrency(calculateDiscount(), 'aed', currency), currency)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('cart.shipping')}</span>
                  <span>{totalAmount > 100 ? 'Free' : formatCurrency(convertCurrency(15, 'aed', currency), currency)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('cart.tax')}</span>
                  <span>{formatCurrency(convertCurrency((totalAmount - calculateDiscount()) * 0.05, 'aed', currency), currency)}</span>
                </div>
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between font-semibold text-lg">
                  <span>{t('cart.total')}</span>
                  <span>{formatCurrency(convertCurrency(totalAmount - calculateDiscount() + (totalAmount > 100 ? 0 : 15) + ((totalAmount - calculateDiscount()) * 0.05), 'aed', currency), currency)}</span>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={handleCheckout}
                    disabled={isLoading}
                    className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
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
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v11a3 3 0 106 0V6a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-15a2 2 0 012-2h2a2 2 0 012 2v12a1 1 0 110 2h-2a1 1 0 01-1-1v-1H6V5z" clipRule="evenodd" />
                    </svg>
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V19c0 .27.16.59.67.5C17.14 18.16 20 14.42 20 10A10 10 0 0010 0z" />
                    </svg>
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.03 2.97a.75.75 0 00-1.06 0l-7.5 7.5a.75.75 0 001.06 1.06L10 4.06l6.47 6.47a.75.75 0 101.06-1.06l-7.5-7.5z" />
                      <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0z" />
                    </svg>
                  </div>
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                    {t('cart.secure_checkout')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Discount code */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="font-medium mb-4">{t('cart.discount')}</h3>
              {couponError && (
                <div className="text-red-600 dark:text-red-400 text-sm mb-2">{couponError}</div>
              )}
              {coupon && (
                <div className="text-green-600 dark:text-green-400 text-sm mb-2">
                  Coupon applied successfully!
                </div>
              )}
              <div className="flex">
                <input
                  type="text"
                  placeholder={t('cart.enter_code')}
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-l-lg"
                />
                <button 
                  onClick={applyCoupon}
                  className="px-4 py-2 bg-primary text-white rounded-r-lg hover:bg-primary/90"
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