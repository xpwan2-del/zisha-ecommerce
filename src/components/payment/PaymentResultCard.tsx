'use client';

import React from 'react';

export interface PaymentResultCardProps {
  type: 'success' | 'fail';
  paymentMethod: 'paypal' | 'stripe' | 'alipay';
  orderNumber?: string;
  amount?: number;
  currency?: string;
  errorCode?: string;
  errorMessage?: {
    zh: string;
    en: string;
    ar: string;
  };
  productName?: string;
  onRetry?: () => void;
  onChangePayment?: () => void;
  onViewOrder?: () => void;
  onContinueShopping?: () => void;
}

export const PaymentMethodInfo = {
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

export const PaymentResultCard: React.FC<PaymentResultCardProps> = ({
  type,
  paymentMethod,
  orderNumber,
  amount,
  currency = 'USD',
  errorCode,
  errorMessage,
  productName,
  onRetry,
  onChangePayment,
  onViewOrder,
  onContinueShopping,
}) => {
  const paymentInfo = PaymentMethodInfo[paymentMethod];

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[var(--card)] rounded-2xl shadow-xl p-8 relative overflow-hidden border border-[var(--border)]">
        {/* 顶部装饰线 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--secondary)] via-[var(--primary)] to-[var(--secondary)]"></div>

        {/* 支付方式标识 */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--background-alt)]">
            <span className="text-xl">{paymentInfo.icon}</span>
            <span className="text-sm font-medium text-[var(--text)]">{paymentInfo.name}</span>
          </div>
        </div>

        {/* 状态图标 */}
        <div className="flex justify-center mb-6">
          {type === 'success' ? (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center animate-bounce">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center animate-shake">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* 标题 */}
        <div className="text-center mb-6">
          <h2 className={`text-2xl font-bold mb-2 ${type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {type === 'success' ? (
              <>
                🎉{' '}
                {paymentMethod === 'alipay'
                  ? '恭喜！支付宝支付已成功'
                  : paymentMethod === 'stripe'
                  ? '恭喜！Stripe 支付已成功'
                  : '恭喜！PayPal 支付已成功'}
              </>
            ) : (
              <>
                😔{' '}
                {paymentMethod === 'alipay'
                  ? '抱歉！支付宝支付未完成'
                  : paymentMethod === 'stripe'
                  ? '抱歉！Stripe 支付未完成'
                  : '抱歉！PayPal 支付未完成'}
              </>
            )}
          </h2>
          <p className="text-gray-500 text-sm">
            {type === 'success' ? '您的订单已确认' : '请检查支付信息后重试'}
          </p>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-[var(--border)] my-6"></div>

        {/* 订单信息 */}
        {orderNumber && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">📦 订单号</span>
              <span className="font-mono text-[var(--text)] font-medium">{orderNumber}</span>
            </div>

            {productName && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">🏷️ 商品</span>
                <span className="text-[var(--text)] truncate ml-4">{productName}</span>
              </div>
            )}

            {amount !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">💰 支付金额</span>
                <span className="font-bold text-lg text-[var(--text)]">{formatCurrency(amount, currency)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">💳 支付方式</span>
              <span className="text-[var(--text)]">
                {paymentInfo.icon} {paymentInfo.name}
              </span>
            </div>

            {type === 'success' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">✅ 状态</span>
                <span className="text-green-600 font-medium">已支付</span>
              </div>
            )}
          </div>
        )}

        {/* 错误信息 */}
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

        {/* 温馨提示 */}
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

        {/* 可能的原因（失败时） */}
        {type === 'fail' && (
          <div className="bg-[var(--background-alt)] rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-semibold text-[var(--text)] mb-2">可能的解决方案</h3>
                <ul className="text-[var(--text-muted)] text-sm space-y-1">
                  <li>• 检查银行卡余额是否充足</li>
                  <li>• 确认银行卡是否在有效期内</li>
                  <li>• 尝试更换其他支付方式</li>
                  <li>• 稍后重新尝试支付</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 分隔线 */}
        <div className="border-t border-[var(--border)] my-6"></div>

        {/* 按钮组 */}
        <div className="space-y-3">
          {type === 'success' ? (
            <>
              <button
                onClick={onViewOrder}
                className="w-full py-3 px-4 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg"
              >
                📋 查看订单
              </button>
              <button
                onClick={onContinueShopping}
                className="w-full py-3 px-4 bg-[var(--card)] border-2 border-[var(--border)] text-[var(--text)] rounded-lg font-medium hover:bg-[var(--background-alt)] transition-all"
              >
                🛍️ 继续购物
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRetry}
                className="w-full py-3 px-4 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg"
              >
                🔄 重新支付
              </button>
              <button
                onClick={onChangePayment}
                className="w-full py-3 px-4 bg-[var(--card)] border-2 border-[var(--border)] text-[var(--text)] rounded-lg font-medium hover:bg-[var(--background-alt)] transition-all"
              >
                💳 更换支付方式
              </button>
            </>
          )}
        </div>

        {/* 底部提示 */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            {type === 'success'
              ? '感谢您的购买，祝您购物愉快！'
              : '您可以随时返回订单页面重新尝试支付'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentResultCard;
