'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AboutData {
  title: string;
  title_en: string;
  title_ar: string;
  description: string;
  description_en: string;
  description_ar: string;
  content: string;
  content_en: string;
  content_ar: string;
  images: string[];
  video_url: string;
}

export default function AboutPage() {
  const { i18n } = useTranslation();
  const [about, setAbout] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAbout();
  }, [i18n.language]);

  const fetchAbout = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/about?lang=${i18n.language}`);
      const data = await response.json();
      setAbout(data);
    } catch (error) {
      console.error('Error fetching about:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!about) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">No data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-6">{about.title}</h1>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="mb-4 text-gray-700 leading-relaxed">{about.content}</p>
        </div>
      </div>
    </div>
  );
}
