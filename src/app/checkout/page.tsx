"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { convertCurrency, formatCurrency } from '@/lib/utils/currency';
import { useCart } from '@/lib/contexts/CartContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';

export default function CheckoutPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const { cart, clearCart, totalAmount } = useCart();
  const { user } = useAuth();
  
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  if (!user) {
    router.push('/login?redirect=/checkout');
    return null;
  }
  
  if (cart.length === 0) {
    router.push('/cart');
    return null;
  }
  
  const handlePayment = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/payments/${paymentMethod}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalAmount,
          items: cart,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (paymentMethod === 'stripe') {
          const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
          if (stripe) {
            await (stripe as any).redirectToCheckout({ sessionId: data.id });
          }
        } else {
          window.location.href = data.url;
        }
      } else {
        setError(data.error || 'Payment creation failed');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">{t('checkout.title')}</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          {/* Shipping address */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">{t('checkout.shipping_address')}</h2>
          </div>
          
          <div className="px-6 py-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('checkout.name')}</label>
                  <input
                    type="text"
                    value={user.name}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('checkout.email')}</label>
                  <input
                    type="email"
                    value={user.email}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                    disabled
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('checkout.address')}</label>
                <input
                  type="text"
                  placeholder={t('checkout.enter_address')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('checkout.city')}</label>
                  <input
                    type="text"
                    placeholder={t('checkout.enter_city')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('checkout.country')}</label>
                  <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg">
                    <option value="ae">United Arab Emirates</option>
                    <option value="us">United States</option>
                    <option value="cn">China</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Payment method */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">{t('checkout.payment_method')}</h2>
          </div>
          
          <div className="px-6 py-6">
            <div className="space-y-4">
              <div className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => setPaymentMethod('stripe')}>
                <input
                  type="radio"
                  name="payment"
                  value="stripe"
                  checked={paymentMethod === 'stripe'}
                  onChange={() => setPaymentMethod('stripe')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                />
                <div className="ml-4 flex-1">
                  <h3 className="font-medium">Credit / Debit Card</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pay with Visa, Mastercard, American Express, etc.</p>
                </div>
                <div className="flex space-x-2">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H5v-2h14v2zm0-6H5V8h14v4z" />
                  </svg>
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 10H5v-2h14v2zm0-4H5V8h14v2z" />
                  </svg>
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H5v-2h14v2zm0-4H5V8h14v2z" />
                  </svg>
                </div>
              </div>
              
              <div className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => setPaymentMethod('paypal')}>
                <input
                  type="radio"
                  name="payment"
                  value="paypal"
                  checked={paymentMethod === 'paypal'}
                  onChange={() => setPaymentMethod('paypal')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                />
                <div className="ml-4 flex-1">
                  <h3 className="font-medium">PayPal</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pay with your PayPal account</p>
                </div>
                <svg className="w-12 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.605 4.61a8.502 8.502 0 0 1 1.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 0 0-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 2.162c2.907 0 5.467.986 7.293 2.64a9.768 9.768 0 0 1-1.693 1.21c-1.983-1.05-4.086-1.674-6.367-1.771a22.213 22.213 0 0 0-.847 1.82c-3.251.16-6.143 1.641-7.69 3.844a8.581 8.581 0 0 1 4.923-1.293c.238-.477.495-.943.769-1.399zM2.01 12.318a8.482 8.482 0 0 1 4.939-2.52c-.084.307-.163.62-.235.933-.418 1.723-.638 3.625-.638 5.608 0 1.019.108 2.016.31 2.982-1.184-.069-2.269-.544-3.182-1.342a8.588 8.588 0 0 1 1.806-3.661zM12 21.838c-2.907 0-5.467-.986-7.293-2.64a9.768 9.768 0 0 1 1.693-1.21c1.983 1.05 4.086 1.674 6.367 1.771a22.23 22.23 0 0 0 .847-1.82c3.251-.16 6.143-1.641 7.69-3.844a8.581 8.581 0 0 1-4.923 1.293c-.238.477-.495.943-.769 1.399zm9.99-1.52a8.482 8.482 0 0 1-4.939 2.52c.084-.307.163-.62.235-.933.418-1.723.638-3.625.638-5.608 0-1.019-.108-2.016-.31-2.982 1.184.069 2.269.544 3.182 1.342a8.588 8.588 0 0 1-1.806 3.661z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Order summary */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">{t('checkout.order_summary')}</h2>
          </div>
          
          <div className="px-6 py-6">
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <img
                      src={item.image || '/placeholder.jpg'}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg mr-4"
                    />
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.quantity} × {formatCurrency(convertCurrency(item.price, 'aed', currency), currency)}</p>
                    </div>
                  </div>
                  <p className="font-medium">{formatCurrency(convertCurrency(item.price * item.quantity, 'aed', currency), currency)}</p>
                </div>
              ))}
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('checkout.subtotal')}</span>
                  <span>{formatCurrency(convertCurrency(totalAmount, 'aed', currency), currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('checkout.shipping')}</span>
                  <span>{totalAmount > 100 ? 'Free' : formatCurrency(convertCurrency(15, 'aed', currency), currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('checkout.tax')}</span>
                  <span>{formatCurrency(convertCurrency(totalAmount * 0.05, 'aed', currency), currency)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>{t('checkout.total')}</span>
                  <span>{formatCurrency(convertCurrency(totalAmount + (totalAmount > 100 ? 0 : 15) + (totalAmount * 0.05), 'aed', currency), currency)}</span>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
                  {error}
                </div>
              )}
              
              <button
                onClick={handlePayment}
                disabled={isLoading}
                className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {t('checkout.processing')}
                  </div>
                ) : (
                  t('checkout.pay_now', { amount: formatCurrency(convertCurrency(totalAmount + (totalAmount > 100 ? 0 : 15) + (totalAmount * 0.05), 'aed', currency), currency).replace(/[^0-9.]/g, '') })
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}