"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/lib/contexts/CartContext';

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { clearCart } = useCart();
  const [orderType, setOrderType] = useState<'order' | 'lucky-draw'>('order');
  
  useEffect(() => {
    // 从URL参数中获取订单类型
    const type = searchParams.get('type');
    if (type === 'lucky-draw') {
      setOrderType('lucky-draw');
    }
    
    // 普通订单清空购物车
    if (type === 'order') {
      clearCart();
    }
  }, [searchParams, clearCart]);
  
  return (
    <div className="py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          {orderType === 'order' ? (
            <>
              <h1 className="text-2xl font-bold mb-4">{t('checkout.success.title')}</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{t('checkout.success.description')}</p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('checkout.success.order_number')}: ORD-{Date.now()}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('checkout.success.email')}</p>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-4">一元购参与成功</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                您已成功参与一元购活动，我们将在活动结束后通过邮件通知您中奖结果。
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">活动编号: LUCKY-{Date.now()}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">参与时间: {new Date().toLocaleString()}</p>
              </div>
            </>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              {t('checkout.success.continue_shopping')}
            </button>
            <button
              onClick={() => router.push(orderType === 'order' ? '/account' : '/lucky-draws')}
              className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {orderType === 'order' ? t('checkout.success.view_order') : '查看一元购活动'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}