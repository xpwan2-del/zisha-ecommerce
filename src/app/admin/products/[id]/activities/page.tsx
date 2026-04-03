"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

interface ActivityCategory {
  id: number;
  name: string;
  name_en: string;
  name_ar: string;
  icon: string;
  color: string;
  status: string;
}

interface Product {
  id: number;
  name: string;
  name_en: string;
  name_ar: string;
  price: number;
  original_price: number;
  stock: number;
  category_id: string;
  image: string;
  images: string[];
  description: string;
  features: string[];
  is_limited: boolean;
  discount: number;
  activities: ActivityCategory[];
}

export default function ProductActivities() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [allCategories, setAllCategories] = useState<ActivityCategory[]>([]);
  const [productActivities, setProductActivities] = useState<ActivityCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchProductData();
      fetchAllCategories();
    }
  }, [id]);

  const fetchProductData = async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/product-activities?product_id=${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product activities');
      }
      const data = await response.json();
      setProductActivities(data);
      
      // Fetch product details
      const productResponse = await fetch(`/api/products/${id}`);
      if (productResponse.ok) {
        const productData = await productResponse.json();
        setProduct(productData);
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
      setError('Failed to load product data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllCategories = async () => {
    try {
      const response = await fetch('/api/activity-categories');
      if (!response.ok) {
        throw new Error('Failed to fetch activity categories');
      }
      const data = await response.json();
      setAllCategories(data.filter((category: ActivityCategory) => category.status === 'active'));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddActivity = async (activityCategoryId: number) => {
    try {
      const response = await fetch('/api/product-activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ product_id: parseInt(id!), activity_category_id: activityCategoryId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add activity');
      }
      
      fetchProductData();
    } catch (error) {
      console.error('Error adding activity:', error);
      setError('Failed to add activity');
    }
  };

  const handleRemoveActivity = async (activityCategoryId: number) => {
    try {
      const response = await fetch(`/api/product-activities?product_id=${id}&activity_category_id=${activityCategoryId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove activity');
      }
      
      fetchProductData();
    } catch (error) {
      console.error('Error removing activity:', error);
      setError('Failed to remove activity');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amazon-orange"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg">
          {error}
        </div>
        <button 
          onClick={() => router.back()}
          className="bg-amazon-orange hover:bg-amazon-light-orange text-amazon-dark font-medium py-2 px-4 rounded transition-colors duration-200"
        >
          {t('admin.activities.back') || 'Back'}
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6">
        <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg">
          {t('admin.activities.product_not_found') || 'Product not found'}
        </div>
        <button 
          onClick={() => router.back()}
          className="bg-amazon-orange hover:bg-amazon-light-orange text-amazon-dark font-medium py-2 px-4 rounded transition-colors duration-200"
        >
          {t('admin.activities.back') || 'Back'}
        </button>
      </div>
    );
  }

  const availableCategories = allCategories.filter(
    category => !productActivities.some(pa => pa.id === category.id)
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-amazon-dark dark:text-white">
          {t('admin.activities.product_activities') || 'Product Activities'}
        </h1>
        <button 
          onClick={() => router.back()}
          className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded transition-colors duration-200"
        >
          {t('admin.activities.back') || 'Back'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center space-x-4">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-20 h-20 object-cover rounded-md"
            />
            <div>
              <h2 className="text-xl font-bold text-amazon-dark dark:text-white">{product.name}</h2>
              <p className="text-gray-600 dark:text-gray-400">{product.name_en}</p>
              <p className="text-gray-600 dark:text-gray-400">{product.name_ar}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Activities */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-medium text-amazon-dark dark:text-white">
              {t('admin.activities.current_activities') || 'Current Activities'}
            </h3>
          </div>
          <div className="p-6">
            {productActivities.length > 0 ? (
              <div className="space-y-3">
                {productActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${activity.color}20`, color: activity.color }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {activity.icon === 'fire' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />}
                          {activity.icon === 'star' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />}
                          {activity.icon === 'trophy' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                          {activity.icon === 'crown' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />}
                          {activity.icon === 'alert-circle' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.733-1.964-.733-2.732 0L3.34 16c-.77.733.192 3 1.732 3z" />}
                          {activity.icon === 'gift' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />}
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{activity.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{activity.name_en}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveActivity(activity.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                {t('admin.activities.no_activities') || 'No activities added to this product'}
              </p>
            )}
          </div>
        </div>

        {/* Available Activities */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-medium text-amazon-dark dark:text-white">
              {t('admin.activities.available_activities') || 'Available Activities'}
            </h3>
          </div>
          <div className="p-6">
            {availableCategories.length > 0 ? (
              <div className="space-y-3">
                {availableCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${category.color}20`, color: category.color }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {category.icon === 'fire' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />}
                          {category.icon === 'star' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />}
                          {category.icon === 'trophy' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                          {category.icon === 'crown' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />}
                          {category.icon === 'alert-circle' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.733-1.964-.733-2.732 0L3.34 16c-.77.733.192 3 1.732 3z" />}
                          {category.icon === 'gift' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />}
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{category.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{category.name_en}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddActivity(category.id)}
                      className="text-amazon-blue hover:text-amazon-dark"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                {t('admin.activities.no_available_activities') || 'No available activities'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}