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
    }
  ];

  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button 
            onClick={() => router.push('/')}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
          >
            View Store
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {menuItems.map((item, index) => (
            <div
              key={index}
              onClick={() => router.push(item.link)}
              className="bg-white dark:bg-dark/80 p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105 border border-gray-200 dark:border-gray-700"
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
              <p className="text-gray-600 dark:text-gray-300">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
