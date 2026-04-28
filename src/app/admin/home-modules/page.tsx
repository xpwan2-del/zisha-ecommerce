"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface HomeModule {
  id: number;
  type: 'hero' | 'activity';
  title: string;
  title_en: string;
  title_ar: string;
  description: string;
  description_en: string;
  description_ar: string;
  image: string;
  link?: string;
  is_active: boolean;
  order: number;
  button_text?: string;
  button_text_en?: string;
  button_text_ar?: string;
  button_link?: string;
  secondary_button_text?: string;
  secondary_button_text_en?: string;
  secondary_button_text_ar?: string;
  secondary_button_link?: string;
}

interface ModuleFormData {
  type: 'hero' | 'activity';
  title: string;
  title_en: string;
  title_ar: string;
  description: string;
  description_en: string;
  description_ar: string;
  image: string;
  link?: string;
  is_active: boolean;
  order: number;
  button_text?: string;
  button_text_en?: string;
  button_text_ar?: string;
  button_link?: string;
  secondary_button_text?: string;
  secondary_button_text_en?: string;
  secondary_button_text_ar?: string;
  secondary_button_link?: string;
}

export default function HomeModulesManagement() {
  const { t, i18n } = useTranslation();
  const [modules, setModules] = useState<HomeModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<HomeModule | null>(null);
  const [formData, setFormData] = useState<ModuleFormData>({
    type: 'activity',
    title: '',
    title_en: '',
    title_ar: '',
    description: '',
    description_en: '',
    description_ar: '',
    image: '',
    link: '',
    is_active: true,
    order: 0,
    button_text: '',
    button_text_en: '',
    button_text_ar: '',
    button_link: '',
    secondary_button_text: '',
    secondary_button_text_en: '',
    secondary_button_text_ar: '',
    secondary_button_link: ''
  });

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/home-modules');
      if (!response.ok) {
        throw new Error('Failed to fetch home modules');
      }
      const data = await response.json();
      setModules(data);
    } catch (error) {
      console.error('Error fetching modules:', error);
      // 使用默认数据
      setModules([
        {
          id: 1,
          type: 'hero',
          title: '正宗紫砂陶艺',
          title_en: 'Authentic Zisha Pottery',
          title_ar: 'فخار زيشا الأصلي',
          description: '体验传统中国茶文化的艺术，我们的正宗紫砂陶艺由拥有数百年传承的大师工匠手工制作。',
          description_en: 'Experience the art of traditional Chinese tea culture. Our authentic Zisha pottery is handcrafted by master artisans with centuries of heritage.',
          description_ar: 'استمتع بفن ثقافة الشاي الصينية التقليدية. فخار زيشا الأصلي لدينا مصنوع يدويًا بواسطة حرفيين منقطعين ذوي تراث قرون.',
          image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20zisha%20teapot%20collection%20on%20wooden%20table%20with%20traditional%20chinese%20tea%20set%20elegant%20professional%20photography%20dark%20wood%20background&image_size=landscape_16_9',
          is_active: true,
          order: 0,
          button_text: '立即购买',
          button_text_en: 'Shop Now',
          button_text_ar: 'تسوق الآن',
          button_link: '/products',
          secondary_button_text: '探索系列',
          secondary_button_text_en: 'Explore Collection',
          secondary_button_text_ar: 'استكشف المجموعة',
          secondary_button_link: '/customize'
        },
        {
          id: 2,
          type: 'activity',
          title: '1元购活动',
          title_en: '1 Yuan Sale',
          title_ar: 'بيع 1 يوان',
          description: '精选紫砂壶，限时1元购',
          description_en: 'Selected Zisha teapots, limited time 1 Yuan sale',
          description_ar: 'فخار زيشا مختار، بيع 1 يوان لفترة محدودة',
          image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20promotion%20banner%201%20yuan%20sale%20chinese%20style%20elegant%20design&image_size=landscape_16_9',
          link: '/deals?type=1yuan',
          is_active: true,
          order: 1
        },
        {
          id: 3,
          type: 'activity',
          title: '今日特价',
          title_en: 'Daily Special',
          title_ar: 'عرض يومي',
          description: '每日精选，限时折扣',
          description_en: 'Daily selection, limited time discount',
          description_ar: 'اختيار يومي، خصم لفترة محدودة',
          image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20daily%20special%20offer%20banner%20chinese%20style%20elegant%20design&image_size=landscape_16_9',
          link: '/deals?type=daily',
          is_active: true,
          order: 2
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      const url = editingModule ? '/api/home-modules' : '/api/home-modules';
      const method = editingModule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingModule ? { ...formData, id: editingModule.id } : formData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save home module');
      }
      
      setIsModalOpen(false);
      setEditingModule(null);
      setFormData({
        type: 'activity',
        title: '',
        title_en: '',
        title_ar: '',
        description: '',
        description_en: '',
        description_ar: '',
        image: '',
        link: '',
        is_active: true,
        order: 0,
        button_text: '',
        button_text_en: '',
        button_text_ar: '',
        button_link: '',
        secondary_button_text: '',
        secondary_button_text_en: '',
        secondary_button_text_ar: '',
        secondary_button_link: ''
      });
      fetchModules();
    } catch (error) {
      console.error('Error saving module:', error);
      setError('Failed to save home module');
    }
  };

  const handleEdit = (module: HomeModule) => {
    setEditingModule(module);
    setFormData({
      type: module.type,
      title: module.title,
      title_en: module.title_en,
      title_ar: module.title_ar,
      description: module.description,
      description_en: module.description_en,
      description_ar: module.description_ar,
      image: module.image,
      link: module.link || '',
      is_active: module.is_active,
      order: module.order,
      button_text: module.button_text || '',
      button_text_en: module.button_text_en || '',
      button_text_ar: module.button_text_ar || '',
      button_link: module.button_link || '',
      secondary_button_text: module.secondary_button_text || '',
      secondary_button_text_en: module.secondary_button_text_en || '',
      secondary_button_text_ar: module.secondary_button_text_ar || '',
      secondary_button_link: module.secondary_button_link || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this module?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/home-modules?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete home module');
      }
      
      fetchModules();
    } catch (error) {
      console.error('Error deleting module:', error);
      setError('Failed to delete home module');
    }
  };

  const getModuleTitle = (module: HomeModule) => {
    const locale = i18n.language;
    if (locale === 'zh') return module.title;
    if (locale === 'en') return module.title_en;
    if (locale === 'ar') return module.title_ar;
    return module.title;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">
          {t('admin.home_modules.title') || 'Home Page Modules'}
        </h1>
        <button 
          onClick={() => {
            setEditingModule(null);
            setFormData({
              type: 'activity',
              title: '',
              title_en: '',
              title_ar: '',
              description: '',
              description_en: '',
              description_ar: '',
              image: '',
              link: '',
              is_active: true,
              order: 0,
              button_text: '',
              button_text_en: '',
              button_text_ar: '',
              button_link: '',
              secondary_button_text: '',
              secondary_button_text_en: '',
              secondary_button_text_ar: '',
              secondary_button_link: ''
            });
            setIsModalOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
        >
          {t('admin.home_modules.add') || 'Add Module'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.home_modules.order') || 'Order'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.home_modules.type') || 'Type'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.home_modules.title') || 'Title'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.home_modules.image') || 'Image'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.home_modules.status') || 'Status'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.home_modules.actions') || 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modules.sort((a, b) => a.order - b.order).map((module) => (
                <tr key={module.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium">
                      {module.order}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      module.type === 'hero' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {module.type === 'hero' ? 'Hero' : 'Activity'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{getModuleTitle(module)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <img 
                      src={module.image} 
                      alt={module.title} 
                      className="w-12 h-12 object-cover rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      module.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {module.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => handleEdit(module)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      {t('admin.home_modules.edit') || 'Edit'}
                    </button>
                    <button 
                      onClick={() => handleDelete(module.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      {t('admin.home_modules.delete') || 'Delete'}
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
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-primary mb-4">
              {editingModule ? (t('admin.home_modules.edit') || 'Edit') : (t('admin.home_modules.add') || 'Add')} {t('admin.home_modules.module') || 'Module'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.home_modules.type') || 'Type'}
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="hero">{t('admin.home_modules.hero') || 'Hero Banner'}</option>
                  <option value="activity">{t('admin.home_modules.activity') || 'Activity Banner'}</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="order" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.home_modules.order') || 'Order'}
                </label>
                <input
                  type="number"
                  id="order"
                  name="order"
                  value={formData.order}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.home_modules.title') || 'Title'} (中文)
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="title_en" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.home_modules.title') || 'Title'} (English)
                  </label>
                  <input
                    type="text"
                    id="title_en"
                    name="title_en"
                    value={formData.title_en}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="title_ar" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.home_modules.title') || 'Title'} (Arabic)
                  </label>
                  <input
                    type="text"
                    id="title_ar"
                    name="title_ar"
                    value={formData.title_ar}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.home_modules.description') || 'Description'} (中文)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="description_en" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.home_modules.description') || 'Description'} (English)
                  </label>
                  <textarea
                    id="description_en"
                    name="description_en"
                    value={formData.description_en}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="description_ar" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.home_modules.description') || 'Description'} (Arabic)
                  </label>
                  <textarea
                    id="description_ar"
                    name="description_ar"
                    value={formData.description_ar}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.home_modules.image') || 'Image URL'}
                </label>
                <input
                  type="text"
                  id="image"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              
              {formData.type === 'activity' && (
                <div>
                  <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.home_modules.link') || 'Link URL'}
                  </label>
                  <input
                    type="text"
                    id="link"
                    name="link"
                    value={formData.link}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              )}
              
              {formData.type === 'hero' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="button_text" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('admin.home_modules.button_text') || 'Button Text'} (中文)
                      </label>
                      <input
                        type="text"
                        id="button_text"
                        name="button_text"
                        value={formData.button_text}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <div>
                      <label htmlFor="button_text_en" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('admin.home_modules.button_text') || 'Button Text'} (English)
                      </label>
                      <input
                        type="text"
                        id="button_text_en"
                        name="button_text_en"
                        value={formData.button_text_en}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <div>
                      <label htmlFor="button_text_ar" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('admin.home_modules.button_text') || 'Button Text'} (Arabic)
                      </label>
                      <input
                        type="text"
                        id="button_text_ar"
                        name="button_text_ar"
                        value={formData.button_text_ar}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="button_link" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.home_modules.button_link') || 'Button Link'}
                    </label>
                    <input
                      type="text"
                      id="button_link"
                      name="button_link"
                      value={formData.button_link}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="secondary_button_text" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('admin.home_modules.secondary_button_text') || 'Secondary Button Text'} (中文)
                      </label>
                      <input
                        type="text"
                        id="secondary_button_text"
                        name="secondary_button_text"
                        value={formData.secondary_button_text}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <div>
                      <label htmlFor="secondary_button_text_en" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('admin.home_modules.secondary_button_text') || 'Secondary Button Text'} (English)
                      </label>
                      <input
                        type="text"
                        id="secondary_button_text_en"
                        name="secondary_button_text_en"
                        value={formData.secondary_button_text_en}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <div>
                      <label htmlFor="secondary_button_text_ar" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('admin.home_modules.secondary_button_text') || 'Secondary Button Text'} (Arabic)
                      </label>
                      <input
                        type="text"
                        id="secondary_button_text_ar"
                        name="secondary_button_text_ar"
                        value={formData.secondary_button_text_ar}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="secondary_button_link" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.home_modules.secondary_button_link') || 'Secondary Button Link'}
                    </label>
                    <input
                      type="text"
                      id="secondary_button_link"
                      name="secondary_button_link"
                      value={formData.secondary_button_link}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                </>
              )}
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is_active">{t('admin.home_modules.active') || 'Active'}</label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {t('admin.home_modules.cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {t('admin.home_modules.save') || 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
