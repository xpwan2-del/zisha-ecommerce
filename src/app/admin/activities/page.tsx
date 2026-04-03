"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ActivityCategory {
  id: number;
  name: string;
  name_en: string;
  name_ar: string;
  icon: string;
  color: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ActivityFormData {
  name: string;
  name_en: string;
  name_ar: string;
  icon: string;
  color: string;
  status: string;
}

export default function ActivityCategories() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ActivityCategory | null>(null);
  const [formData, setFormData] = useState<ActivityFormData>({
    name: '',
    name_en: '',
    name_ar: '',
    icon: 'fire',
    color: '#FF5733',
    status: 'active'
  });

  const icons = [
    { value: 'fire', label: 'Fire' },
    { value: 'star', label: 'Star' },
    { value: 'trophy', label: 'Trophy' },
    { value: 'crown', label: 'Crown' },
    { value: 'alert-circle', label: 'Alert' },
    { value: 'gift', label: 'Gift' },
    { value: 'heart', label: 'Heart' },
    { value: 'trending-up', label: 'Trending' },
    { value: 'clock', label: 'Clock' },
    { value: 'tag', label: 'Tag' },
    { value: 'truck', label: 'Truck' },
    { value: 'gift', label: 'Gift' }
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/activity-categories');
      if (!response.ok) {
        throw new Error('Failed to fetch activity categories');
      }
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load activity categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const url = editingCategory ? '/api/activity-categories' : '/api/activity-categories';
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingCategory ? { ...formData, id: editingCategory.id } : formData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save activity category');
      }
      
      setIsModalOpen(false);
      setEditingCategory(null);
      setFormData({
        name: '',
        name_en: '',
        name_ar: '',
        icon: 'fire',
        color: '#FF5733',
        status: 'active'
      });
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      setError('Failed to save activity category');
    }
  };

  const handleEdit = (category: ActivityCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      name_en: category.name_en,
      name_ar: category.name_ar,
      icon: category.icon,
      color: category.color,
      status: category.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this activity category?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/activity-categories?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete activity category');
      }
      
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Failed to delete activity category');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amazon-orange"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-amazon-dark dark:text-white">
          {t('admin.activities.title') || 'Activity Categories'}
        </h1>
        <button 
          onClick={() => {
            setEditingCategory(null);
            setFormData({
              name: '',
              name_en: '',
              name_ar: '',
              icon: 'fire',
              color: '#FF5733',
              status: 'active'
            });
            setIsModalOpen(true);
          }}
          className="bg-amazon-orange hover:bg-amazon-light-orange text-amazon-dark font-medium py-2 px-4 rounded transition-colors duration-200"
        >
          {t('admin.activities.add') || 'Add Activity Category'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('admin.activities.name') || 'Name'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('admin.activities.icon') || 'Icon'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('admin.activities.color') || 'Color'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('admin.activities.status') || 'Status'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('admin.activities.actions') || 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{category.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{category.name_en}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{category.name_ar}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{category.icon}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }}></div>
                      <span className="ml-2 text-sm text-gray-900 dark:text-white">{category.color}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${category.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                      {category.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => handleEdit(category)}
                      className="text-amazon-blue hover:text-amazon-dark mr-3"
                    >
                      {t('admin.activities.edit') || 'Edit'}
                    </button>
                    <button 
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      {t('admin.activities.delete') || 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-amazon-dark dark:text-white mb-4">
              {editingCategory ? (t('admin.activities.edit') || 'Edit') : (t('admin.activities.add') || 'Add')} {t('admin.activities.category') || 'Category'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.activities.name') || 'Name'} (中文)
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-amazon-blue focus:border-amazon-blue dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label htmlFor="name_en" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.activities.name_en') || 'Name'} (English)
                </label>
                <input
                  type="text"
                  id="name_en"
                  name="name_en"
                  value={formData.name_en}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-amazon-blue focus:border-amazon-blue dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label htmlFor="name_ar" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.activities.name_ar') || 'Name'} (Arabic)
                </label>
                <input
                  type="text"
                  id="name_ar"
                  name="name_ar"
                  value={formData.name_ar}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-amazon-blue focus:border-amazon-blue dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label htmlFor="icon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.activities.icon') || 'Icon'}
                </label>
                <select
                  id="icon"
                  name="icon"
                  value={formData.icon}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-amazon-blue focus:border-amazon-blue dark:bg-gray-700 dark:text-white"
                >
                  {icons.map(icon => (
                    <option key={icon.value} value={icon.value}>
                      {icon.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.activities.color') || 'Color'}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    id="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    required
                    className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    id="colorText"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-amazon-blue focus:border-amazon-blue dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.activities.status') || 'Status'}
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-amazon-blue focus:border-amazon-blue dark:bg-gray-700 dark:text-white"
                >
                  <option value="active">{t('admin.activities.active') || 'Active'}</option>
                  <option value="inactive">{t('admin.activities.inactive') || 'Inactive'}</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amazon-blue"
                >
                  {t('admin.activities.cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amazon-orange hover:bg-amazon-light-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amazon-orange"
                >
                  {t('admin.activities.save') || 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}