'use client';

import React from 'react';

export interface OrderItem {
  product_id: number;
  name: string;
  name_en?: string;
  name_ar?: string;
  image: string;
  quantity: number;
  original_price: number;
  final_price?: number;
}

export interface OrderSnapshot {
  id: number;
  order_number: string;
  order_status: string;
  payment_status: string;
  final_amount: number;
  shipping_fee: number;
  total_coupon_discount: number;
  currency: string;
  created_at: string;
  shipping_address?: {
    contact_name: string;
    phone: string;
    full_address: string;
  };
  items: OrderItem[];
}

export interface EnhancedPaymentResultCardProps {
  type: 'success' | 'fail';
  paymentMethod: 'paypal' | 'stripe' | 'alipay';
  orderInfo?: OrderSnapshot | null;
  errorCode?: string;
  errorMessage?: {
    zh: string;
    en: string;
    ar: string;
  };
  source?: 'quick-order' | 'cart';
  onViewOrder?: () => void;
  onContinueShopping?: () => void;
  onRetry?: () => void;
  onChangePayment?: () => void;
}

export const EnhancedPaymentMethodInfo = {
  paypal: {
    name: 'PayPal',
    icon: '🅿️',
    color: '#003087',
  },
  stripe: {
    name: 'Stripe',
    icon: '💳',
    color: '#635BFF',
  },
  alipay: {
    name: '支付宝',
    icon: '¥',
    color: '#1677FF',
  },
};

const formatCurrency = (amount: number, currency: string) => {
  const symbols: Record<string, string> = {
    USD: '$',
    CNY: '¥',
    AED: 'AED ',
  };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${amount.toFixed(2)}`;
};

export const EnhancedPaymentResultCard: React.FC<EnhancedPaymentResultCardProps> = ({
  type,
  paymentMethod,
  orderInfo,
  errorMessage,
  source = 'quick-order',
  onViewOrder,
  onContinueShopping,
  onRetry,
  onChangePayment,
}) => {
  const paymentInfo = EnhancedPaymentMethodInfo[paymentMethod];

  const getReturnPath = () => {
    return source === 'cart' ? '/cart' : '/quick-order';
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.href = getReturnPath();
    }
  };

  const handleChangePayment = () => {
    if (onChangePayment) {
      onChangePayment();
    } else {
      window.location.href = getReturnPath();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8 relative overflow-hidden border border-gray-200">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-pink-500 to-amber-400"></div>

        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100">
            <span className="text-xl">{paymentInfo.icon}</span>
            <span className="text-sm font-medium text-gray-800">{paymentInfo.name}</span>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          {type === 'success' ? (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center animate-bounce">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        <div className="text-center mb-6">
          <h2 className={`text-2xl font-bold mb-2 ${type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {type === 'success' ? (
              <span>🎉 恭喜！{paymentInfo.name} 支付已成功</span>
            ) : (
              <span>😔 抱歉！{paymentInfo.name} 支付未完成</span>
            )}
          </h2>
          <p className="text-gray-500 text-sm">
            {type === 'success' ? '您的订单已确认' : '请检查支付信息后重试'}
          </p>
        </div>

        <div className="border-t border-gray-200 my-6"></div>

        {orderInfo && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">📦 订单号</span>
              <span className="font-mono text-gray-800 font-medium">{orderInfo.order_number}</span>
            </div>

            {orderInfo.items && orderInfo.items.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🏺</span>
                  <span className="font-semibold text-gray-800">订单商品</span>
                </div>
                {orderInfo.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-lg">🏺</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">x{item.quantity}</p>
                    </div>
                    <span className="text-sm text-gray-800 font-medium">
                      {formatCurrency(item.original_price * item.quantity, orderInfo.currency || 'USD')}
                    </span>
                  </div>
                ))}
                <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center">
                  <span className="text-sm text-gray-500">共 {orderInfo.items.length} 件</span>
                  <span className="font-bold text-pink-600">
                    {formatCurrency(orderInfo.final_amount, orderInfo.currency || 'USD')}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">💰 支付金额</span>
              <span className="font-bold text-lg text-gray-800">
                {formatCurrency(orderInfo.final_amount, orderInfo.currency || 'USD')}
              </span>
            </div>

            {orderInfo.shipping_fee > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">📦 运费</span>
                <span className="text-gray-800">{formatCurrency(orderInfo.shipping_fee, orderInfo.currency || 'USD')}</span>
              </div>
            )}

            {orderInfo.total_coupon_discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">🎟️ 优惠券</span>
                <span className="text-green-600">-{formatCurrency(orderInfo.total_coupon_discount, orderInfo.currency || 'USD')}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">💳 支付方式</span>
              <span className="text-gray-800">
                {paymentInfo.icon} {paymentInfo.name}
              </span>
            </div>

            {type === 'success' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">✅ 状态</span>
                <span className="text-green-600 font-medium">已支付</span>
              </div>
            )}
          </div>
        )}

        {type === 'fail' && errorMessage && (
          <div className="bg-red-50 rounded-lg p-4 mb-6 border border-red-100">
            <div className="flex items-start gap-3">
              <span className="text-2xl">❌</span>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 mb-2">失败原因</h3>
                <p className="text-red-700 text-sm leading-relaxed">{errorMessage.zh}</p>
                {errorMessage.en && errorMessage.en !== errorMessage.zh && (
                  <p className="text-red-600 text-sm mt-1 italic">{errorMessage.en}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {type === 'success' && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <h3 className="font-semibold text-blue-800 mb-1">温馨提示</h3>
                <p className="text-blue-700 text-sm leading-relaxed">
                  您的订单已确认，我们将在 1-3 个工作日内发货。
                </p>
              </div>
            </div>
          </div>
        )}

        {type === 'fail' && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">可能的解决方案</h3>
                <ul className="text-gray-500 text-sm space-y-1">
                  <li>• 检查银行卡余额是否充足</li>
                  <li>• 确认银行卡是否在有效期内</li>
                  <li>• 尝试更换其他支付方式</li>
                  <li>• 稍后重新尝试支付</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 my-6"></div>

        <div className="space-y-3">
          {type === 'success' ? (
            <>
              <button
                onClick={onViewOrder}
                className="w-full py-3 px-4 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                📋 查看订单
              </button>
              <button
                onClick={onContinueShopping}
                className="w-full py-3 px-4 bg-white border-2 border-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                🛍️ 继续购物
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRetry}
                className="w-full py-3 px-4 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                🔄 重新支付
              </button>
              <button
                onClick={handleChangePayment}
                className="w-full py-3 px-4 bg-white border-2 border-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                💳 更换支付方式
              </button>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            {type === 'success'
              ? '感谢您的购买，祝您购物愉快！'
              : '您可以随时返回订单页面重新尝试支付'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPaymentResultCard;
