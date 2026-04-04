'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ImageModal from '@/components/ImageModal';
import Link from 'next/link';

interface ReviewProduct {
  id: number;
  name: string;
  image: string;
  price: number;
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  images: string[];
  created_at: string;
  user_name: string;
  product_name: string;
  product_name_en: string;
  product_name_ar: string;
  product: ReviewProduct | null;
}

export default function ReviewsPage() {
  const { i18n } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [i18n.language]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reviews?lang=${i18n.language}`);
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (images: string[], index: number) => {
    setCurrentImages(images);
    setCurrentImageIndex(index);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handlePrev = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : currentImages.length - 1));
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev < currentImages.length - 1 ? prev + 1 : 0));
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="text-yellow-400">★</span>);
    }

    if (hasHalfStar) {
      stars.push(<span key="half" className="text-yellow-400">☆</span>);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="text-gray-300">★</span>);
    }

    return stars;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const t = {
    title: i18n.language === 'zh' ? '客户评价' : i18n.language === 'ar' ? 'آراء العملاء' : 'Customer Reviews',
    loading: i18n.language === 'zh' ? '加载中...' : i18n.language === 'ar' ? 'جاري التحميل...' : 'Loading...',
    noReviews: i18n.language === 'zh' ? '暂无评价' : i18n.language === 'ar' ? 'لا توجد تقييمات' : 'No reviews yet',
    clickToEnlarge: i18n.language === 'zh' ? '点击图片查看大图' : i18n.language === 'ar' ? 'انقر لتكبير الصورة' : 'Click to enlarge',
    anonymous: i18n.language === 'zh' ? '匿名用户' : i18n.language === 'ar' ? 'مستخدم مجهول' : 'Anonymous',
    product: i18n.language === 'zh' ? '产品' : i18n.language === 'ar' ? 'المنتج' : 'Product'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">{t.title}</h1>
        
        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">{t.noReviews}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-lg">{renderStars(review.rating)}</div>
                    <span className="text-sm text-gray-600">{Number(review.rating).toFixed(1)}</span>
                  </div>
                  <span className="text-sm text-gray-500">{formatDate(review.created_at)}</span>
                </div>

                <p className="text-gray-700 mb-4 leading-relaxed">{review.comment}</p>

                {review.images && review.images.length > 0 && (
                  <div className="mb-4">
                    <div className="flex gap-2 flex-wrap">
                      {review.images.map((image, index) => (
                        <div
                          key={index}
                          className="relative w-20 h-20 cursor-pointer group"
                          onClick={() => openModal(review.images, index)}
                        >
                          <img
                            src={image}
                            alt={`Review ${index + 1}`}
                            className="w-full h-full object-cover rounded-md border border-gray-200 group-hover:border-amazon-orange transition-colors"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-md flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                              />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{t.clickToEnlarge}</p>
                  </div>
                )}

                {review.product && (
                    <Link
                      href={`/products/${review.product.id}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <img
                        src={review.product.image}
                        alt={review.product.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{review.product.name}</p>
                        <p className="text-sm text-amazon-orange font-bold">¥{Number(review.product.price).toFixed(2)}</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="text-sm font-medium text-gray-900">
                    — {review.user_name || t.anonymous}
                  </div>
                  {review.product_name && (
                    <div className="text-sm text-gray-600">
                      {t.product}：{i18n.language === 'en' ? review.product_name_en : i18n.language === 'ar' ? review.product_name_ar : review.product_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <ImageModal
          images={currentImages}
          currentIndex={currentImageIndex}
          onClose={closeModal}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
