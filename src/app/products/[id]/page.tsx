"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import ImageModal from "@/components/ImageModal";

export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, i18n } = useTranslation();
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeMediaIndex, setActiveMediaIndex] = useState(1);
  const [activities, setActivities] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchProduct();
    fetchActivities();
    fetchRelatedProducts();
    fetchReviews();
  }, [id, i18n.language]);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/products/${id}`);
      const data = await response.json();
      
      if (data && !data.error) {
        setProduct(data);
      } else {
        setProduct(null);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      setProduct(null);
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/product-activities?product_id=${id}`);
      const data = await response.json();
      setActivities(data);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      setActivities([]);
    }
  };

  const fetchRelatedProducts = async () => {
    try {
      const response = await fetch('/api/products?category=all&limit=8');
      const data = await response.json();
      
      if (data && data.products) {
        const products = data.products.filter((p: any) => p.id != parseInt(id)).slice(0, 4);
        setRelatedProducts(products);
      }
    } catch (error) {
      console.error('Failed to fetch related products:', error);
      setRelatedProducts([]);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/reviews?product_id=${id}&lang=${i18n.language}`);
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      setReviews([]);
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

  const getStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? "text-yellow-400" : "text-gray-300"}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/2">
              <div className="aspect-square bg-gray-200 rounded-md animate-pulse"></div>
            </div>
            <div className="lg:w-1/2">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>
              <div className="h-12 bg-gray-200 rounded w-1/3 mb-6 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>
              <div className="h-40 bg-gray-200 rounded mb-6 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{t("products.no_products", "产品未找到")}</h1>
            <Link href="/" className="text-amazon-orange hover:underline">
              {t("footer.links.home", "返回首页")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const productName = i18n.language === "zh" 
    ? product.name 
    : i18n.language === "ar" 
      ? product.name_ar 
      : product.name_en 
      || product.name 
      || "Product";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 左侧图片区域 */}
          <div className="lg:w-1/2">
            <div className="bg-white rounded-md shadow-sm overflow-hidden mb-4 relative">
              {/* 活动标签 */}
              {activities.length > 0 && (
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  {activities.map((activity: any) => (
                    <div
                      key={activity.id}
                      className="flex items-center bg-white/90 backdrop-blur-sm shadow-md px-3 py-1 rounded-full"
                      style={{ borderLeft: `4px solid ${activity.color}` }}
                    >
                      <span className="mr-1">{activity.icon}</span>
                      <span className="text-sm font-medium">{activity.name}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* 主媒体展示 */}
              <div className="aspect-square relative bg-white">
                {/* 视频播放 */}
                {activeMediaIndex === 0 && product.video ? (
                  <div className="w-full h-full relative">
                    <video
                      src={product.video}
                      controls
                      muted
                      className="w-full h-full object-cover"
                      poster={product.image}
                    />
                  </div>
                ) : (
                  <img
                    src={activeMediaIndex > 0 && product.images && product.images[activeMediaIndex - 1] 
                      ? product.images[activeMediaIndex - 1] 
                      : product.image
                    }
                    alt={productName}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
            
            {/* 缩略图 */}
            <div className="grid grid-cols-6 gap-2">
              {/* 视频缩略图 */}
              {product.video && (
                <div 
                  key="video" 
                  className={`aspect-square bg-white rounded-md shadow-sm overflow-hidden cursor-pointer relative ${activeMediaIndex === 0 ? 'ring-2 ring-amazon-orange' : ''}`}
                  onClick={() => setActiveMediaIndex(0)}
                >
                  <img
                    src={product.image}
                    alt="Video"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                  </div>
                  <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                    {t("products.description", "视频")}
                  </div>
                </div>
              )}
              
              {/* 图片缩略图 */}
              {Array.isArray(product.images) && product.images.map((img: string, index: number) => (
                <div 
                  key={index} 
                  className={`aspect-square bg-white rounded-md shadow-sm overflow-hidden cursor-pointer ${activeMediaIndex === index + 1 ? 'ring-2 ring-amazon-orange' : ''}`}
                  onClick={() => setActiveMediaIndex(index + 1)}
                >
                  <img
                    src={img}
                    alt={`${productName} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 右侧产品信息 */}
          <div className="lg:w-1/2">
            <div className="bg-white rounded-md shadow-sm p-6">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {product.bestSeller && (
                  <span className="bg-amazon-orange text-white text-xs font-bold px-2 py-1 rounded">
                    {t("products.limited_offer", "畅销")}
                  </span>
                )}
                {product.discount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    {t("products.limited_offer", "限时特惠")}
                  </span>
                )}
                {product.fastDelivery && (
                  <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
                    {t("products.free_shipping", "快速配送")}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {productName}
              </h1>

              <div className="flex items-center mb-4">
                {getStars(product.rating)}
                <span className="text-sm text-gray-500 ml-2">
                  {product.rating} ({product.reviewCount} {t("products.reviews", "评价")})
                </span>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-amazon-orange">
                    ¥{product.price}
                  </span>
                  {product.originalPrice && (
                    <span className="text-lg text-gray-500 line-through ml-3">
                      ¥{product.originalPrice}
                    </span>
                  )}
                  {product.discount > 0 && product.original_price && product.price && (
                    <span className="text-red-500 font-bold ml-3">
                      {t("products.discount", "省")}¥{product.original_price - product.price}
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <span className="w-24">{t("products.stock", "库存状态")}:</span>
                  <span className="text-green-600 font-medium">
                    {product.inStock ? t("products.in_stock", "有货") : t("products.out_of_stock", "缺货")}
                  </span>
                </div>
                {product.fastDelivery && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-24">{t("products.shipping_info", "配送")}:</span>
                    <span className="font-medium">{t("products.free_shipping", "快速配送")}</span>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">{t("products.quantity", "数量")}</h3>
                <div className="flex items-center">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded-l-md"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-16 px-3 py-1 border-t border-b text-center"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded-r-md"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <button className="flex-1 bg-amazon-orange hover:bg-amazon-light-orange text-white font-medium py-3 px-4 rounded transition-colors duration-200">
                  {t("products.add_to_cart", "加入购物车")}
                </button>
                <button className="flex-1 bg-amazon-blue hover:bg-amazon-dark-blue text-white font-medium py-3 px-4 rounded transition-colors duration-200">
                  {t("products.buy_now", "立即购买")}
                </button>
              </div>

              {/* 配送信息 */}
              <div className="mb-6 p-4 bg-gray-50 rounded-md">
                <h3 className="text-sm font-medium text-gray-900 mb-2">{t("products.shipping_info", "配送信息")}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{t("products.free_shipping", "免费配送：订单满299元")}</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{t("products.shipping_eta", "预计送达时间：3-5个工作日")}</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-orange-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>{t("products.7day_return", "7天无理由退换")}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">{t("products.specifications", "产品信息")}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  {product.brand && (
                    <div className="flex">
                      <span className="w-24 font-medium">{t("products.brand", "品牌")}:</span>
                      <span>{product.brand}</span>
                    </div>
                  )}
                  {product.material && (
                    <div className="flex">
                      <span className="w-24 font-medium">{t("products.materials", "材质")}:</span>
                      <span>{product.material}</span>
                    </div>
                  )}
                  {product.capacity && (
                    <div className="flex">
                      <span className="w-24 font-medium">{t("products.capacity", "容量")}:</span>
                      <span>{product.capacity}</span>
                    </div>
                  )}
                  {product.origin && (
                    <div className="flex">
                      <span className="w-24 font-medium">{t("products.origin", "产地")}:</span>
                      <span>{product.origin}</span>
                    </div>
                  )}
                  {product.weight && (
                    <div className="flex">
                      <span className="w-24 font-medium">{t("products.weight", "重量")}:</span>
                      <span>{product.weight}</span>
                    </div>
                  )}
                  {product.size && (
                    <div className="flex">
                      <span className="w-24 font-medium">{t("products.size", "尺寸")}:</span>
                      <span>{product.size}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 产品描述 */}
        <div className="mt-8 bg-white rounded-md shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t("products.description", "产品描述")}</h2>
          <div className="text-gray-600 space-y-4">
            <p>{product.description}</p>
            {product.features && (
              <div>
                <h3 className="font-medium mb-2">{t("products.features", "产品特点")}:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {product.features.map((feature: string, index: number) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* 评价 */}
        <div className="mt-8 bg-white rounded-md shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t("products.reviews", "顾客评价")}</h2>
          <div className="space-y-6">
            {reviews.length === 0 ? (
              <p className="text-gray-500 text-center py-4">{t("products.no_reviews", "暂无评价")}</p>
            ) : (
              reviews.map((review, index) => (
                <div key={review.id || index} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-center mb-2">
                    {getStars(review.rating)}
                    <span className="text-sm text-gray-500 ml-2">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{review.comment}</p>
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {review.images.map((img: string, imgIndex: number) => (
                        <div
                          key={imgIndex}
                          className="relative w-16 h-16 cursor-pointer group"
                          onClick={() => openModal(review.images, imgIndex)}
                        >
                          <img
                            src={img}
                            alt={`Review ${imgIndex + 1}`}
                            className="w-full h-full object-cover rounded-md border border-gray-200 group-hover:border-amazon-orange transition-colors"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-md flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
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
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    — {review.user_name || t("products.anonymous", "匿名用户")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 相关产品推荐 */}
        <div className="mt-8 bg-white rounded-md shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t("products.related", "你可能也喜欢")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {relatedProducts.map((relatedProduct: any) => (
              <Link key={relatedProduct.id} href={`/products/${relatedProduct.id}`} className="group">
                <div className="aspect-square bg-gray-100 rounded-md overflow-hidden mb-2">
                  <img
                    src={relatedProduct.image}
                    alt={i18n.language === "zh" ? relatedProduct.name : i18n.language === "ar" ? relatedProduct.name_ar : relatedProduct.name_en || relatedProduct.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-amazon-orange transition-colors">
                  {i18n.language === "zh" ? relatedProduct.name : i18n.language === "ar" ? relatedProduct.name_ar : relatedProduct.name_en || relatedProduct.name}
                </h3>
                <div className="mt-1 flex items-center">
                  <span className="text-amazon-orange font-medium text-sm">¥{relatedProduct.price}</span>
                  {relatedProduct.original_price && relatedProduct.original_price > relatedProduct.price && (
                    <span className="text-xs text-gray-500 line-through ml-1">¥{relatedProduct.original_price}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
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
