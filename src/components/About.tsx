"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export function About() {
  const { t } = useTranslation();
  const [about, setAbout] = useState({
    title: 'About Us',
    description: 'Learn about our zisha pottery craftsmanship',
    images: [
      'https://image.pollinations.ai/prompt/zisha%20pottery%20craftsman%20working%20on%20teapot?width=400&height=300&seed=about1',
      'https://image.pollinations.ai/prompt/zisha%20teapots%20display%20in%20shop?width=400&height=300&seed=about2',
      'https://image.pollinations.ai/prompt/traditional%20chinese%20tea%20ceremony?width=400&height=300&seed=about3'
    ],
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    content: 'Our zisha pottery is handcrafted by skilled artisans using traditional techniques that have been passed down for generations. Each piece is unique and carries the essence of Chinese culture and craftsmanship.'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    fetchAbout();
  }, []);

  const fetchAbout = async () => {
    try {
      const response = await fetch('/api/about');
      if (response.ok) {
        const data = await response.json();
        setAbout(data);
      }
    } catch (error) {
      console.error('Error fetching about:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section id="about" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="about" className="py-16 px-4 bg-light/50 dark:bg-dark/50">
      <div className="max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">{about.title}</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">{about.description}</p>
        </div>

        {/* Video Section */}
        {about.videoUrl && (
          <div className="mb-16">
            <div className="relative rounded-xl overflow-hidden shadow-lg">
              <iframe
                width="100%"
                height="400"
                src={about.videoUrl}
                title="About Us Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full object-cover"
              ></iframe>
            </div>
          </div>
        )}

        {/* Image Carousel */}
        {about.images && about.images.length > 0 && (
          <div className="mb-16">
            <div className="relative rounded-xl overflow-hidden shadow-lg">
              <img 
                src={about.images[activeImage]} 
                alt={`About us - ${activeImage + 1}`} 
                className="w-full h-96 object-cover transition-opacity duration-500"
              />
              {/* Image Indicators */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {about.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImage(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${activeImage === index ? 'bg-primary w-6' : 'bg-white/70'}`}
                  ></button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-bold mb-6">Our Story</h3>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              {about.content}
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              We are dedicated to preserving the traditional art of zisha pottery while bringing it to modern tea enthusiasts around the world. Each piece is carefully crafted by our skilled artisans, who have honed their craft over many years.
            </p>
            <button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-full font-medium transition-all duration-300 transform hover:scale-105">
              {t('hero.cta')}
            </button>
          </div>
          <div className="space-y-6">
            {/* Feature Cards */}
            <div className="bg-white dark:bg-dark/80 p-6 rounded-lg shadow-md">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-2">Authentic Craftsmanship</h4>
                  <p className="text-gray-600 dark:text-gray-300">Each teapot is handcrafted by skilled artisans using traditional techniques.</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-dark/80 p-6 rounded-lg shadow-md">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-2">Quality Materials</h4>
                  <p className="text-gray-600 dark:text-gray-300">We use only the finest Yixing clay sourced from traditional mines.</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-dark/80 p-6 rounded-lg shadow-md">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-2">Customer Satisfaction</h4>
                  <p className="text-gray-600 dark:text-gray-300">We strive to provide the best products and service to our customers.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
