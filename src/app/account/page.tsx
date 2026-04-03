"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function AccountPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);
  
  if (!user) {
    return null;
  }
  
  const handleLogout = () => {
    logout();
    router.push('/login');
  };
  
  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">{t('account.title')}</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-gray-500 dark:text-gray-400">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold">{user.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                <div className="mt-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${user.level === 'regular' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : 
                    user.level === 'silver' ? 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200' :
                    user.level === 'gold' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-gray-800 text-white'}`}>
                    {t(`account.level_${user.level}`)}
                  </span>
                </div>
              </div>
              
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center px-4 py-2 text-left rounded-lg ${activeTab === 'profile' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t('account.profile')}
                </button>
                
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center px-4 py-2 text-left rounded-lg ${activeTab === 'orders' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  {t('account.orders')}
                </button>
                
                <button
                  onClick={() => setActiveTab('custom-orders')}
                  className={`w-full flex items-center px-4 py-2 text-left rounded-lg ${activeTab === 'custom-orders' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {t('account.custom_orders')}
                </button>
                
                <button
                  onClick={() => setActiveTab('referral')}
                  className={`w-full flex items-center px-4 py-2 text-left rounded-lg ${activeTab === 'referral' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {t('account.referral')}
                </button>
                
                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`w-full flex items-center px-4 py-2 text-left rounded-lg ${activeTab === 'addresses' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('account.addresses')}
                </button>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-2 text-left rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {t('account.logout')}
                </button>
              </nav>
            </div>
          </div>
          
          {/* Main content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">{t('account.profile')}</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('account.name')}</label>
                        <input
                          type="text"
                          value={user.name}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                          disabled
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('account.email')}</label>
                        <input
                          type="email"
                          value={user.email}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                          disabled
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('account.phone')}</label>
                        <input
                          type="tel"
                          value={user.phone || ''}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                          disabled
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('account.level')}</label>
                        <input
                          type="text"
                          value={t(`account.level_${user.level}`)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                          disabled
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('account.points')}</label>
                        <input
                          type="number"
                          value={user.points}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                          disabled
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('account.total_spent')}</label>
                        <input
                          type="text"
                          value={`${user.total_spent} AED`}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                          disabled
                        />
                      </div>
                    </div>
                    
                    <div>
                      <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                        {t('account.edit_profile')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">{t('account.orders')}</h2>
                  <div className="space-y-4">
                    {[1, 2, 3].map((order) => (
                      <div key={order} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="font-semibold">{t('account.order_number', { number: `ORD-${Date.now() + order}` })}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('account.order_date', { date: '2024-01-1' + order })}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${order === 1 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : order === 2 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {order === 1 ? t('account.status_completed') : order === 2 ? t('account.status_pending') : t('account.status_cancelled')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm">{t('account.items', { count: 2 })}</p>
                          <p className="font-semibold">{350 + order * 100} AED</p>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                            {t('account.view_order')}
                          </button>
                          {order === 2 && (
                            <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90">
                              {t('account.pay_now')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Custom Orders Tab */}
              {activeTab === 'custom-orders' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">{t('account.custom_orders')}</h2>
                  <div className="space-y-4">
                    {[1, 2].map((order) => (
                      <div key={order} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="font-semibold">{t('account.custom_order_number', { number: `CUST-${Date.now() + order}` })}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('account.order_date', { date: '2024-01-1' + order })}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${order === 1 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'}`}>
                            {order === 1 ? t('account.status_producing') : t('account.status_designing')}
                          </span>
                        </div>
                        <div className="mb-4">
                          <p className="text-sm font-medium">{t('account.customization')}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{t('account.teapot_type')}: 石瓢</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{t('account.material')}: 紫泥</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{t('account.capacity')}: 200ml</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm">{t('account.estimated_delivery', { date: '2024-02-1' + order })}</p>
                          <p className="font-semibold">450 AED</p>
                        </div>
                        <div className="mt-4">
                          <button className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                            {t('account.track_order')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Referral Tab */}
              {activeTab === 'referral' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">{t('account.referral')}</h2>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4">{t('account.referral_program')}</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">{t('account.referral_description')}</p>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('account.your_referral_code')}</label>
                      <div className="flex">
                        <input
                          type="text"
                          value={user.referral_code}
                          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-l-lg"
                          disabled
                        />
                        <button className="px-4 py-2 bg-primary text-white rounded-r-lg hover:bg-primary/90">
                          {t('account.copy')}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('account.referral_link')}</label>
                      <input
                        type="text"
                        value={`${window.location.origin}/register?ref=${user.referral_code}`}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                        disabled
                      />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">{t('account.referral_stats')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-primary">5</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('account.referred_users')}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-primary">3</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('account.successful_orders')}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-primary">250</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('account.earned_points')}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3">{t('account.recent_referrals')}</h4>
                      <div className="space-y-3">
                        {[1, 2, 3].map((referral) => (
                          <div key={referral} className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div>
                              <p className="font-medium">User {referral}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{t('account.joined_date', { date: '2024-01-1' + referral })}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${referral === 1 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                              {referral === 1 ? t('account.status_completed') : t('account.status_pending')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Addresses Tab */}
              {activeTab === 'addresses' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">{t('account.addresses')}</h2>
                  <div className="space-y-4">
                    {[1, 2].map((address) => (
                      <div key={address} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 relative">
                        {address === 1 && (
                          <div className="absolute top-4 right-4">
                            <span className="px-2 py-1 bg-primary text-white text-xs rounded">{t('account.default')}</span>
                          </div>
                        )}
                        <h3 className="font-semibold mb-2">{user.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('account.phone')}: {user.phone || '123-456-7890'}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('account.address')}: Dubai, UAE</p>
                        <div className="mt-4 flex gap-2">
                          <button className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                            {t('account.edit')}
                          </button>
                          {address !== 1 && (
                            <button className="px-4 py-2 border border-primary text-primary rounded-lg text-sm hover:bg-primary/5">
                              {t('account.set_default')}
                            </button>
                          )}
                          <button className="px-4 py-2 border border-red-300 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/20">
                            {t('account.delete')}
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <button className="w-full py-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {t('account.add_address')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}