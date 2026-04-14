"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AccountPage() {
  const { user, isLoading, logout, checkAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

  useEffect(() => {
    console.log('[AccountPage] Mounted, user:', user, 'isLoading:', isLoading);
    // Check auth status on page load
    const verifyAuth = async () => {
      await checkAuth();
    };
    verifyAuth();
  }, [checkAuth]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card p-8 rounded-lg shadow-lg border border-border">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-center text-text">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card p-8 rounded-lg shadow-lg border border-border">
          <div className="text-accent mb-4">❌ 未登录</div>
          <button 
            onClick={() => router.push('/login')}
            className="w-full bg-accent text-white py-2 px-4 rounded hover:bg-accent transition-colors"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* 左侧导航栏 */}
          <div className="md:w-64 flex-shrink-0">
            {/* 个人信息卡片 */}
            <div className="bg-card rounded-lg shadow-lg border border-border p-6 mb-6">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-dark flex items-center justify-center mb-4">
                  <span className="text-accent text-2xl font-semibold">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <h3 className="text-lg font-semibold text-dark mb-1">{user.name}</h3>
                <p className="text-text-muted text-sm mb-3">{user.email}</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-accent text-white text-xs px-2 py-1 rounded">
                    {user.level || '普通'}
                  </span>
                  <span className="text-text-muted text-xs">{user.points || 0} 积分</span>
                </div>
              </div>
            </div>

            {/* 导航菜单 */}
            <div className="bg-card rounded-lg shadow-lg border border-border p-4">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-md transition-colors ${activeTab === 'overview' ? 'bg-accent text-white' : 'text-text hover:bg-background-alt'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  账户概览
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-md transition-colors ${activeTab === 'orders' ? 'bg-accent text-white' : 'text-text hover:bg-background-alt'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  订单管理
                </button>
                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-md transition-colors ${activeTab === 'addresses' ? 'bg-accent text-white' : 'text-text hover:bg-background-alt'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  地址管理
                </button>
                <button
                  onClick={() => setActiveTab('favorites')}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-md transition-colors ${activeTab === 'favorites' ? 'bg-accent text-white' : 'text-text hover:bg-background-alt'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  收藏夹
                </button>
                <button
                  onClick={() => setActiveTab('coupons')}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-md transition-colors ${activeTab === 'coupons' ? 'bg-accent text-white' : 'text-text hover:bg-background-alt'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  优惠券
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-md transition-colors ${activeTab === 'messages' ? 'bg-accent text-white' : 'text-text hover:bg-background-alt'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  消息中心
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-md transition-colors ${activeTab === 'settings' ? 'bg-accent text-white' : 'text-text hover:bg-background-alt'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  个人设置
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-3 text-left rounded-md transition-colors text-text hover:bg-background-alt mt-6"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  退出登录
                </button>
              </nav>
            </div>
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1">
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-2xl font-semibold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>账户概览</h2>
                  
                  {/* 个人信息 */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-dark mb-4">个人信息</h3>
                    <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">姓名</label>
                        <div className="bg-background p-3 rounded border border-border">{user.name}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">邮箱</label>
                        <div className="bg-background p-3 rounded border border-border">{user.email}</div>
                      </div>
                      {user.phone && (
                        <div>
                          <label className="block text-sm font-medium text-text-muted mb-1">电话</label>
                          <div className="bg-background p-3 rounded border border-border">{user.phone}</div>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">角色</label>
                        <div className="bg-background p-3 rounded border border-border">{user.role}</div>
                      </div>
                    </div>
                  </div>

                  {/* 账户信息 */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-dark mb-4">账户信息</h3>
                    <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">会员等级</label>
                        <div className="bg-background p-3 rounded border border-border">
                          <span className="bg-accent text-white text-xs px-2 py-1 rounded">
                            {user.level || '普通'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">积分</label>
                        <div className="bg-background p-3 rounded border border-border">{user.points || 0}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">总消费</label>
                        <div className="bg-background p-3 rounded border border-border">{user.total_spent || 0} AED</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">推荐码</label>
                        <div className="bg-background p-3 rounded border border-border">{user.referral_code || '无'}</div>
                      </div>
                    </div>
                  </div>

                  {/* 最近订单 */}
                  <div>
                    <h3 className="text-lg font-medium text-dark mb-4">最近订单</h3>
                    <div className="bg-background p-4 rounded border border-border">
                      <p className="text-text-muted text-center">暂无订单记录</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <div>
                  <h2 className="text-2xl font-semibold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>订单管理</h2>
                  <div className="bg-background p-4 rounded border border-border">
                    <p className="text-text-muted text-center">暂无订单记录</p>
                  </div>
                </div>
              )}

              {activeTab === 'addresses' && (
                <div>
                  <h2 className="text-2xl font-semibold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>地址管理</h2>
                  <div className="bg-background p-4 rounded border border-border">
                    <p className="text-text-muted text-center">暂无地址记录</p>
                  </div>
                </div>
              )}

              {activeTab === 'favorites' && (
                <div>
                  <h2 className="text-2xl font-semibold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>收藏夹</h2>
                  <div className="bg-background p-4 rounded border border-border">
                    <p className="text-text-muted text-center">暂无收藏记录</p>
                  </div>
                </div>
              )}

              {activeTab === 'coupons' && (
                <div>
                  <h2 className="text-2xl font-semibold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>优惠券</h2>
                  <div className="bg-background p-4 rounded border border-border">
                    <p className="text-text-muted text-center">暂无优惠券</p>
                  </div>
                </div>
              )}

              {activeTab === 'messages' && (
                <div>
                  <h2 className="text-2xl font-semibold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>消息中心</h2>
                  <div className="bg-background p-4 rounded border border-border">
                    <p className="text-text-muted text-center">暂无消息</p>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <h2 className="text-2xl font-semibold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>个人设置</h2>
                  <div className="bg-background p-4 rounded border border-border">
                    <p className="text-text-muted text-center">设置功能正在开发中</p>
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
