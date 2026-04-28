import { useState, useEffect } from 'react';

export interface Category {
  id: number;
  name: string;
  name_en: string;
  name_ar: string;
  slug: string;
  description: string;
  description_en: string;
  description_ar: string;
  image: string;
  priority: number;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/categories');
        const result = await response.json();

        if (result.success) {
          setCategories(Array.isArray(result.data) ? result.data : []);
        } else {
          setError('获取分类失败');
        }
      } catch (err) {
        setError('网络错误');
        console.error('Failed to fetch categories:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const getCategoryName = (category: Category, lang: string = 'zh') => {
    switch (lang) {
      case 'en':
        return category.name_en || category.name;
      case 'ar':
        return category.name_ar || category.name;
      default:
        return category.name;
    }
  };

  return { categories, isLoading, error, getCategoryName };
}