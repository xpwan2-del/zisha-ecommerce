"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const { user, isLoading, checkAuth, isAuthenticated } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        // First check if user is already authenticated
        if (isAuthenticated && user) {
          console.log('User is already authenticated, staying on account page');
          return;
        }
        
        // If not authenticated, check auth status with server
        console.log('Checking auth status...');
        const isLoggedIn = await checkAuth();
        console.log('Auth check result:', isLoggedIn);
        
        if (!isLoggedIn) {
          console.log('Not logged in, redirecting to login');
          router.push('/login');
        }
      } catch (err) {
        console.error('Authentication error:', err);
        setError('验证登录状态失败');
        router.push('/login');
      }
    };

    verifyAuth();
  }, [checkAuth, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-center text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-red-500 mb-4">❌ {error}</div>
          <button 
            onClick={() => router.push('/login')}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-red-500 mb-4">❌ 未登录</div>
          <button 
            onClick={() => router.push('/login')}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-2xl font-semibold text-gray-900">账户信息</h1>
          </div>
          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">个人信息</h2>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    姓名
                  </label>
                  <div className="mt-1 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                    {user.name}
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    邮箱
                  </label>
                  <div className="mt-1 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                    {user.email}
                  </div>
                </div>
                
                {user.phone && (
                  <div className="sm:col-span-3">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      电话
                    </label>
                    <div className="mt-1 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                      {user.phone}
                    </div>
                  </div>
                )}
                
                <div className="sm:col-span-3">
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    角色
                  </label>
                  <div className="mt-1 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                    {user.role}
                  </div>
                </div>
                
                <div className="sm:col-span-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4 mt-8">账户信息</h2>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
                    会员等级
                  </label>
                  <div className="mt-1 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                    {user.level || '普通'}
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-1">
                    积分
                  </label>
                  <div className="mt-1 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                    {user.points || 0}
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="total_spent" className="block text-sm font-medium text-gray-700 mb-1">
                    总消费
                  </label>
                  <div className="mt-1 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                    {user.total_spent || 0} AED
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="referral_code" className="block text-sm font-medium text-gray-700 mb-1">
                    推荐码
                  </label>
                  <div className="mt-1 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                    {user.referral_code || '无'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
