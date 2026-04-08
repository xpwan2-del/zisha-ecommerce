"use client";

import { useState, useEffect } from 'react';
import { HomeModules } from '@/components/HomeModules';
import { Categories } from '@/components/Categories';
import { FeaturedProducts } from '@/components/FeaturedProducts';

export default function Home() {
  const [homeData, setHomeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const response = await fetch('/api/home');
        if (response.ok) {
          const data = await response.json();
          setHomeData(data);
        } else {
          throw new Error('Failed to fetch home data');
        }
      } catch (err) {
        setError('Failed to load home data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" role="status"></div>
      </div>
    );
  }

  if (error || !homeData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">{error || 'Failed to load home data'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#450A0A]">
      <HomeModules data={homeData} />
      <Categories data={homeData} />
      <FeaturedProducts data={homeData} />
    </div>
  );
}