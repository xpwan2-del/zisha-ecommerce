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
    <div className="min-h-screen bg-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 面包屑导航 */}
        <div className="mb-8">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link href="/" className="text-primary hover:text-accent transition-colors">
                  {t("footer.links.home", "首页")}
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <Link href="/products" className="text-primary hover:text-accent transition-colors">
                    {t("products.title", "产品")}
                  </Link>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-dark font-medium">{productName}</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* 左侧图片区域 */}
          <div className="lg:w-1/2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6 relative">
              {/* 主媒体展示 */}
              <div className="aspect-square relative bg-white cursor-pointer" onClick={() => openModal(product.images || [product.image], activeMediaIndex > 0 ? activeMediaIndex - 1 : 0)}>
                {/* 视频播放 */}
                {activeMediaIndex === 0 && product.video ? (
                  <div className="w-full h-full relative">
                    <video
                      src={product.video}
                      controls
                      muted
                      className="w-full h-full object-cover rounded-lg"
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
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                )}
              </div>
            </div>
            
            {/* 缩略图 */}
            <div className="grid grid-cols-6 gap-3">
              {/* 视频缩略图 */}
              {product.video && (
                <div 
                  key="video" 
                  className={`aspect-square bg-white rounded-md shadow-sm overflow-hidden cursor-pointer relative transition-all duration-300 hover:shadow-md ${activeMediaIndex === 0 ? 'ring-2 ring-accent' : ''}`}
                  onClick={() => setActiveMediaIndex(0)}
                >
                  <img
                    src={product.image}
                    alt="Video"
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
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
                  className={`aspect-square bg-white rounded-md shadow-sm overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-md ${activeMediaIndex === index + 1 ? 'ring-2 ring-accent' : ''}`}
                  onClick={() => setActiveMediaIndex(index + 1)}
                >
                  <img
                    src={img}
                    alt={`${productName} ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 右侧产品信息 */}
          <div className="lg:w-1/2">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                {activities.length > 0 && activities.map((activity: any) => (
                  <span
                    key={activity.id}
                    className="text-white text-xs font-bold px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: activity.id === 28 ? '#FF0000' : activity.color || '#CD853F' }}
                  >
                    {activity.icon} {activity.name}
                  </span>
                ))}
                {product.bestSeller && (
                  <span className="bg-amazon-orange text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    {t("products.limited_offer", "畅销")}
                  </span>
                )}
                {product.discount > 0 && !activities.find(a => a.id === 28) && (
                  <span className="bg-accent text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    {t("products.limited_offer", "限时特惠")}
                  </span>
                )}
                {product.fastDelivery && (
                  <span className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    {t("products.free_shipping", "快速配送")}
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>
                {productName}
              </h1>

              <div className="flex items-center mb-6">
                {getStars(product.rating)}
                <span className="text-sm text-gray-600 ml-3">
                  {product.rating} ({product.reviewCount} {t("products.reviews", "评价")})
                </span>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-amazon-orange">
                    ¥{product.price}
                  </span>
                  {product.originalPrice && (
                    <span className="text-lg text-gray-500 line-through ml-4">
                      ¥{product.originalPrice}
                    </span>
                  )}
                  {product.discount > 0 && product.original_price > 0 && product.original_price > product.price && (
                    <span className="text-accent font-bold ml-4">
                      {t("products.discount", "省")}¥{product.original_price - product.price}
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center text-sm text-gray-700 mb-3">
                  <span className="w-28 font-medium">{t("products.stock", "库存状态")}:</span>
                  <span className="text-green-600 font-medium">
                    {product.inStock ? t("products.in_stock", "有货") : t("products.out_of_stock", "缺货")}
                  </span>
                </div>
                {product.fastDelivery && (
                  <div className="flex items-center text-sm text-gray-700">
                    <span className="w-28 font-medium">{t("products.shipping_info", "配送")}:</span>
                    <span className="font-medium">{t("products.free_shipping", "快速配送")}</span>
                  </div>
                )}
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-medium text-dark mb-3">{t("products.quantity", "数量")}</h3>
                <div className="flex items-center">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="bg-secondary hover:bg-accent text-dark px-4 py-2 rounded-l-md transition-colors duration-200"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-20 px-4 py-2 border-t border-b text-center border-secondary"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="bg-secondary hover:bg-accent text-dark px-4 py-2 rounded-r-md transition-colors duration-200"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button className="flex-1 bg-amazon-orange hover:bg-amazon-light-orange text-white font-medium py-4 px-6 rounded-md transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg">
                  {t("products.add_to_cart", "加入购物车")}
                </button>
                <button className="flex-1 bg-primary hover:bg-dark text-white font-medium py-4 px-6 rounded-md transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg">
                  {t("products.buy_now", "立即购买")}
                </button>
              </div>

              {/* 配送信息 */}
              <div className="mb-8 p-5 bg-light rounded-lg">
                <h3 className="text-sm font-medium text-dark mb-4">{t("products.shipping_info", "配送信息")}</h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{t("products.free_shipping", "免费配送：订单满299元")}</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{t("products.shipping_eta", "预计送达时间：3-5个工作日")}</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-accent mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>{t("products.7day_return", "7天无理由退换")}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-secondary/30 pt-6">
                <h3 className="text-sm font-medium text-dark mb-4">{t("products.specifications", "产品信息")}</h3>
                <div className="space-y-3 text-sm text-gray-700">
                  {product.brand && (
                    <div className="flex">
                      <span className="w-28 font-medium">{t("products.brand", "品牌")}:</span>
                      <span>{product.brand}</span>
                    </div>
                  )}
                  {product.material && (
                    <div className="flex">
                      <span className="w-28 font-medium">{t("products.materials", "材质")}:</span>
                      <span>{product.material}</span>
                    </div>
                  )}
                  {product.capacity && (
                    <div className="flex">
                      <span className="w-28 font-medium">{t("products.capacity", "容量")}:</span>
                      <span>{product.capacity}</span>
                    </div>
                  )}
                  {product.origin && (
                    <div className="flex">
                      <span className="w-28 font-medium">{t("products.origin", "产地")}:</span>
                      <span>{product.origin}</span>
                    </div>
                  )}
                  {product.weight && (
                    <div className="flex">
                      <span className="w-28 font-medium">{t("products.weight", "重量")}:</span>
                      <span>{product.weight}</span>
                    </div>
                  )}
                  {product.size && (
                    <div className="flex">
                      <span className="w-28 font-medium">{t("products.size", "尺寸")}:</span>
                      <span>{product.size}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 产品描述 */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>{t("products.description", "产品描述")}</h2>
          <div className="text-gray-700 space-y-6 leading-relaxed">
            <p>{product.description}</p>
            {product.features && (
              <div>
                <h3 className="font-medium text-dark mb-3">{t("products.features", "产品特点")}:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  {product.features.map((feature: string, index: number) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* 评价 */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>{t("products.reviews", "顾客评价")}</h2>
          <div className="space-y-8">
            {reviews.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t("products.no_reviews", "暂无评价")}</p>
            ) : (
              reviews.map((review, index) => (
                <div key={review.id || index} className="border-b border-secondary/20 pb-6 last:border-0">
                  <div className="flex items-center mb-3">
                    {getStars(review.rating)}
                    <span className="text-sm text-gray-500 ml-3">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm mb-4">{review.comment}</p>
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-3 flex-wrap mb-4">
                      {review.images.map((img: string, imgIndex: number) => (
                        <div
                          key={imgIndex}
                          className="relative w-20 h-20 cursor-pointer group"
                          onClick={() => openModal(review.images, imgIndex)}
                        >
                          <img
                            src={img}
                            alt={`Review ${imgIndex + 1}`}
                            className="w-full h-full object-cover rounded-md border border-secondary/30 group-hover:border-accent transition-colors"
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
                  )}
                  {review.product && (
                    <Link
                      href={`/products/${review.product.id}`}
                      className="flex items-center gap-4 p-4 bg-light rounded-lg hover:bg-secondary/20 transition-colors mt-4"
                    >
                      <img
                        src={review.product.image}
                        alt={review.product.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark truncate">{review.product.name}</p>
                        <p className="text-sm text-amazon-orange font-bold">¥{Number(review.product.price).toFixed(2)}</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                  <div className="text-xs text-gray-500 mt-3">
                    — {review.user_name || t("products.anonymous", "匿名用户")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 相关产品推荐 */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>{t("products.related", "你可能也喜欢")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {relatedProducts.map((relatedProduct: any) => (
              <Link key={relatedProduct.id} href={`/products/${relatedProduct.id}`} className="group">
                <div className="aspect-square bg-light rounded-md overflow-hidden mb-3 shadow-sm transition-all duration-300 group-hover:shadow-md">
                  <img
                    src={relatedProduct.image}
                    alt={i18n.language === "zh" ? relatedProduct.name : i18n.language === "ar" ? relatedProduct.name_ar : relatedProduct.name_en || relatedProduct.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <h3 className="text-sm font-medium text-dark line-clamp-2 group-hover:text-accent transition-colors">
                  {i18n.language === "zh" ? relatedProduct.name : i18n.language === "ar" ? relatedProduct.name_ar : relatedProduct.name_en || relatedProduct.name}
                </h3>
                <div className="mt-2 flex items-center">
                  <span className="text-amazon-orange font-medium text-sm">¥{relatedProduct.price}</span>
                  {relatedProduct.original_price && relatedProduct.original_price > relatedProduct.price && (
                    <span className="text-xs text-gray-500 line-through ml-2">¥{relatedProduct.original_price}</span>
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
