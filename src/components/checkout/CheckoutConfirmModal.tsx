"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/utils/currency';

interface Product {
  id: number;
  name: string;
  image?: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  specifications?: string;
}

interface Address {
  contactName: string;
  phone: string;
  fullAddress: string;
}

interface CouponInfo {
  code: string;
  name: string;
  discount: number;
}

interface CheckoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  products: Product[];
  address: Address;
  priceSummary: {
    originalTotal: number;
    productDiscount: number;
    couponDiscount: number;
    shippingFee: number;
    total: number;
  };
  coupons?: CouponInfo[];
  paymentMethod: 'stripe' | 'paypal' | 'mock';
  onPaymentMethodChange: (method: 'stripe' | 'paypal' | 'mock') => void;
  currency: string;
  displayCurrency: string;
  isLoading?: boolean;
}

export default function CheckoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  products,
  address,
  priceSummary,
  coupons = [],
  paymentMethod,
  onPaymentMethodChange,
  currency,
  displayCurrency,
  isLoading = false
}: CheckoutConfirmModalProps) {
  const { t } = useTranslation();
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);

  if (!isOpen) return null;

  const formatPrice = (amount: number) => formatCurrency(amount, currency);

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'stripe':
        return 'Credit/Debit Card';
      case 'paypal':
        return 'PayPal';
      case 'mock':
        return '模拟支付';
      default:
        return method;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
          <h2 className="text-xl font-semibold font-['Noto_Naskh_Arabic'] text-[var(--primary)]">
            {t('checkout.confirm_order', '确认订单信息')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              {t('checkout.products', '商品信息')}
            </h3>
            <div className="space-y-3">
              {products.map((product) => (
                <div key={product.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 flex-shrink-0 bg-gray-200 rounded-lg overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-[var(--text)] truncate">{product.name}</h4>
                    {product.specifications && (
                      <p className="text-xs text-gray-500 mt-0.5">{product.specifications}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-gray-500">x{product.quantity}</span>
                      <div className="text-right">
                        <p className="font-medium text-[var(--primary)]">{formatPrice(product.price * product.quantity)}</p>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <p className="text-xs text-gray-400 line-through">{formatPrice(product.originalPrice * product.quantity)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t('checkout.shipping_address', '收货地址')}
            </h3>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-[var(--text)]">{address.contactName} {address.phone}</p>
              <p className="text-sm text-gray-500 mt-1">{address.fullAddress}</p>
            </div>
          </div>

          {coupons.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {t('checkout.coupons', '优惠券')}
              </h3>
              <div className="space-y-2">
                {coupons.map((coupon, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-700">{coupon.name}</p>
                      <p className="text-xs text-green-600">{coupon.code}</p>
                    </div>
                    <span className="font-medium text-green-700">-{formatPrice(coupon.discount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('checkout.price_details', '价格明细')}
            </h3>
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('checkout.original_total', '商品总价')}</span>
                <span className="text-gray-400 line-through">{formatPrice(priceSummary.originalTotal)}</span>
              </div>
              {priceSummary.productDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('checkout.product_discount', '促销优惠')}</span>
                  <span className="text-red-500">-{formatPrice(priceSummary.productDiscount)}</span>
                </div>
              )}
              {priceSummary.couponDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('checkout.coupon_discount', '优惠券优惠')}</span>
                  <span className="text-red-500">-{formatPrice(priceSummary.couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('checkout.shipping', '运费')}</span>
                <span className="text-gray-700">
                  {priceSummary.shippingFee === 0 ? t('checkout.free', '免费') : formatPrice(priceSummary.shippingFee)}
                </span>
              </div>
              <div className="pt-2 mt-2 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="font-semibold text-[var(--text)]">{t('checkout.total', '应付总额')}</span>
                  <span className="font-bold text-xl text-[var(--primary)]">{formatPrice(priceSummary.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {t('checkout.payment_method', '支付方式')}
            </h3>
            <div
              className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setShowPaymentMethods(!showPaymentMethods)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--text)]">{getPaymentMethodLabel(paymentMethod)}</span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${showPaymentMethods ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {showPaymentMethods && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  {[
                    { value: 'stripe', label: 'Credit/Debit Card', desc: 'Visa, Mastercard, American Express' },
                    { value: 'paypal', label: 'PayPal', desc: 'Pay with your PayPal account' },
                    { value: 'mock', label: '模拟支付', desc: '测试使用，模拟支付成功' }
                  ].map((method) => (
                    <div
                      key={method.value}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        paymentMethod === method.value ? 'bg-white ring-2 ring-[var(--primary)]' : 'bg-white/50 hover:bg-white'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPaymentMethodChange(method.value as 'stripe' | 'paypal' | 'mock');
                        setShowPaymentMethods(false);
                      }}
                    >
                      <input
                        type="radio"
                        checked={paymentMethod === method.value}
                        onChange={() => {}}
                        className="w-4 h-4 text-[var(--primary)]"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text)]">{method.label}</p>
                        <p className="text-xs text-gray-500">{method.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 flex gap-3 px-6 py-4 bg-white border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('checkout.cancel', '取消')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 rounded-lg font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)'
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t('checkout.processing', '处理中...')}
              </span>
            ) : (
              t('checkout.confirm_pay', '确认支付', { amount: formatPrice(priceSummary.total).replace(/[^0-9.]/g, '') })
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
