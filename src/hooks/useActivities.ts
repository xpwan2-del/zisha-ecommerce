import { useState, useEffect } from 'react';

export interface ActivityCategory {
  id: number;
  name: string;
  name_en: string;
  name_ar: string;
  icon: string;
  color: string;
  status: number;
}

export function useActivities() {
  const [activities, setActivities] = useState<ActivityCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/activity-categories');
        const result = await response.json();

        if (result.success) {
          setActivities(Array.isArray(result.data) ? result.data : []);
        } else {
          setError('获取活动分类失败');
        }
      } catch (err) {
        setError('网络错误');
        console.error('Failed to fetch activities:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, []);

  return { activities, isLoading, error };
}