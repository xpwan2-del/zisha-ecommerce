"use client";

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function CancelPage() {
  const router = useRouter();
  const { t } = useTranslation();
  
  return (
    <div className="py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-4">{t('checkout.cancel.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('checkout.cancel.description')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/cart')}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              {t('checkout.cancel.return_cart')}
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t('checkout.cancel.shop_home')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}