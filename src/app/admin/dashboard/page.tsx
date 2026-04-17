"use client";

import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();

  const menuItems = [
    {
      title: 'Products',
      description: 'Manage your products',
      link: '/admin/products',
      icon: '📦'
    },
    {
      title: 'Categories',
      description: 'Manage product categories',
      link: '/admin/categories',
      icon: '🏷️'
    },
    {
      title: 'Promotions',
      description: 'Manage promotions and discounts',
      link: '/admin/promotions',
      icon: '🎉'
    },
    {
      title: 'Users',
      description: 'Manage user accounts',
      link: '/admin/users',
      icon: '👥'
    },
    {
      title: 'About Us',
      description: 'Edit about page information',
      link: '/admin/about',
      icon: 'ℹ️'
    },
    {
      title: 'Contact Us',
      description: 'Edit contact page information',
      link: '/admin/contact',
      icon: '📞'
    },
    {
      title: 'Activities',
      description: 'Manage lucky draw activities',
      link: '/admin/activities',
      icon: '🎁'
    },
    {
      title: 'Home Modules',
      description: 'Manage home page modules',
      link: '/admin/home-modules',
      icon: '🏠'
    },
    {
      title: 'Translations',
      description: 'Manage translations',
      link: '/admin/translations',
      icon: '🌐'
    }
  ];

  return (
    <div className="py-12 px-4 bg-[#FDF2F8] middle-east-pattern min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold font-['Noto_Naskh_Arabic'] text-[#831843]">Admin Dashboard</h1>
          <button 
            onClick={() => router.push('/')}
            className="text-white px-4 py-2 rounded-lg font-['Noto_Sans_Arabic'] font-medium transition-all duration-300"
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: '1px solid var(--btn-primary-border)'
            }}
          >
            View Store
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {menuItems.map((item, index) => (
            <div
              key={index}
              onClick={() => router.push(item.link)}
              className="glass-effect p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105 border border-[#DB2777]/20"
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <h2 className="text-xl font-semibold mb-2 font-['Noto_Naskh_Arabic'] text-[#831843]">{item.title}</h2>
              <p className="font-['Noto_Sans_Arabic'] text-[#831843]/70">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
