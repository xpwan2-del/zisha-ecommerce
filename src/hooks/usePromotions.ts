import { useState, useEffect } from 'react';

export interface Promotion {
  id: number;
  name: string;
  name_en: string;
  name_ar: string;
  type: string;
  discount_percent: number;
  status: number;
  icon: string;
  color: string;
}

export function usePromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/promotions');
        const result = await response.json();

        if (result.success) {
          setPromotions(Array.isArray(result.data) ? result.data : []);
        } else {
          setError('获取促销失败');
        }
      } catch (err) {
        setError('网络错误');
        console.error('Failed to fetch promotions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  return { promotions, isLoading, error };
}