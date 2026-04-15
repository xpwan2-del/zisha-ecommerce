"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useCurrency } from "@/lib/contexts/CurrencyContext";
import { convertCurrency, formatCurrency } from "@/lib/utils/currency";
import ImageModal from "@/components/ImageModal";

export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { currency } = useCurrency();
  
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeMediaIndex, setActiveMediaIndex] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'specs'>('description');
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

  useEffect(() => {
    fetchProduct();
    fetchRelatedProducts();
    fetchReviews();
    if (isAuthenticated && user) {
      checkFavoriteStatus();
    }
  }, [id, i18n.language, isAuthenticated, user]);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) {
        setProduct(null);
        setIsLoading(false);
        return;
      }
      const data = await response.json();
      if (data && !data.error) {
        setProduct(data.data || data);
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
  
  const fetchRelatedProducts = async () => {
    try {
      const response = await fetch('/api/products?category=all&limit=8');
      if (!response.ok) {
        setRelatedProducts([]);
        return;
      }
      const data = await response.json();
      const productsData = data.data?.products || data.products || [];
      if (productsData.length > 0) {
        const products = productsData.filter((p: any) => p.id != parseInt(id)).slice(0, 4);
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
      if (!response.ok) {
        setReviews([]);
        return;
      }
      const data = await response.json();
      setReviews(data.data || []);
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

  const closeModal = () => setModalOpen(false);
  const handlePrev = () => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : currentImages.length - 1));
  const handleNext = () => setCurrentImageIndex((prev) => (prev < currentImages.length - 1 ? prev + 1 : 0));

  const handleAddToCart = async () => {
    if (!product) return;
    setIsAddingToCart(true);
    setCartMessage(null);
    try {
      if (isAuthenticated && user) {
        const accessToken = localStorage.getItem('access_token');
        const response = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify({ product_id: product.id, quantity })
        });
        const data = await response.json();
        if (response.ok) setCartMessage({ type: 'success', text: t('cart.added_success', '已添加到购物车') });
        else setCartMessage({ type: 'error', text: data.error || t('cart.add_failed', '添加失败') });
      } else {
        const guestCart = JSON.parse(localStorage.getItem('cart_guest') || '[]');
        const existingIndex = guestCart.findIndex((item: any) => item.id === product.id);
        if (existingIndex >= 0) guestCart[existingIndex].quantity += quantity;
        else guestCart.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity });
        localStorage.setItem('cart_guest', JSON.stringify(guestCart));
        setCartMessage({ type: 'success', text: t('cart.added_guest', '已添加到购物车，登录后合并到账号') });
      }
    } catch (error) {
      setCartMessage({ type: 'error', text: t('cart.add_failed', '添加失败') });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (isAuthenticated && user) router.push('/checkout');
    else router.push('/login?redirect=/checkout');
  };

  const checkFavoriteStatus = async () => {
    if (!product?.id || !isAuthenticated) return;
    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`/api/favorites?product_id=${product.id}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      const data = await response.json();
      if (data.success && data.data?.isFavorited) setIsFavorited(true);
    } catch (error) {
      console.error('Failed to check favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!isAuthenticated || !user || !product?.id) {
      router.push('/login?redirect=/products/' + product.id);
      return;
    }
    setIsFavoriteLoading(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      if (isFavorited) {
        await fetch(`/api/favorites?product_id=${product.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` } });
        setIsFavorited(false);
      } else {
        await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` }, body: JSON.stringify({ product_id: product.id }) });
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const getStars = (rating: number) => {
    const safeRating = rating ?? 0;
    return Array.from({ length: 5 }, (_, i) => (
      <svg key={i} className={`w-4 h-4 ${i < Math.floor(safeRating) ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  if (isLoading) return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/2"><div className="aspect-square rounded-md animate-pulse" style={{ backgroundColor: 'var(--border)' }}></div></div>
          <div className="lg:w-1/2">
            <div className="h-8 rounded w-3/4 mb-4 animate-pulse" style={{ backgroundColor: 'var(--border)' }}></div>
            <div className="h-6 rounded w-1/2 mb-4 animate-pulse" style={{ backgroundColor: 'var(--border)' }}></div>
            <div className="h-12 rounded w-1/3 mb-6 animate-pulse" style={{ backgroundColor: 'var(--border)' }}></div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)' }}>{t("products.no_products", "产品未找到")}</h1>
          <Link href="/" style={{ color: 'var(--accent)' }}>{t("footer.links.home", "返回首页")}</Link>
        </div>
      </div>
    </div>
  );

  const productName = i18n.language === "zh" ? product.name : i18n.language === "ar" ? product.name_ar : product.name_en || product.name || "Product";

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 面包屑导航 */}
        <nav className="mb-6 flex items-center text-sm" style={{ color: 'var(--text-muted)' }}>
          <Link href="/" className="hover:opacity-80" style={{ color: 'var(--text)' }}>{t("footer.links.home", "首页")}</Link>
          <span className="mx-2">/</span>
          <Link href="/products" className="hover:opacity-80" style={{ color: 'var(--text)' }}>{t("products.title", "产品")}</Link>
          <span className="mx-2">/</span>
          <span style={{ color: 'var(--text)' }}>{productName}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* 左侧图片区域 */}
          <div className="lg:w-1/2">
            <div className="bg-white rounded-lg border overflow-hidden mb-4 relative" style={{ borderColor: 'var(--border)' }}>
              <div className="aspect-square relative bg-white cursor-pointer" onClick={() => openModal(product.images || [product.image], activeMediaIndex > 0 ? activeMediaIndex - 1 : 0)}>
                {activeMediaIndex === 0 && product.video ? (
                  <video src={product.video} controls muted className="w-full h-full object-cover rounded-lg" poster={product.image} />
                ) : (
                  <img src={activeMediaIndex > 0 && product.images && product.images[activeMediaIndex - 1] ? product.images[activeMediaIndex - 1] : product.image} alt={productName} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                )}
              </div>
            </div>
            {/* 缩略图 */}
            <div className="grid grid-cols-6 gap-2">
              {product.video && (
                <div className={`aspect-square bg-white rounded-md border cursor-pointer relative ${activeMediaIndex === 0 ? 'ring-2' : ''}`} style={{ borderColor: activeMediaIndex === 0 ? 'var(--accent)' : 'var(--border)' }} onClick={() => setActiveMediaIndex(0)}>
                  <img src={product.image} alt="Video" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                  </div>
                </div>
              )}
              {Array.isArray(product.images) && product.images.map((img: string, index: number) => (
                <div key={index} className={`aspect-square bg-white rounded-md border cursor-pointer ${activeMediaIndex === index + 1 ? 'ring-2' : ''}`} style={{ borderColor: activeMediaIndex === index + 1 ? 'var(--accent)' : 'var(--border)' }} onClick={() => setActiveMediaIndex(index + 1)}>
                  <img src={img} alt={`${productName} ${index + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* 右侧产品信息 */}
          <div className="lg:w-1/2">
            <div className="bg-white rounded-lg border p-6" style={{ borderColor: 'var(--border)' }}>
              {/* 活动标签 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {/* 活动标签 (activities) - 产品活动标签 */}
                {(product.activities || []).length > 0 && (product.activities || []).map((activity: any) => (
                  <span key={activity.id} className="text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: activity.color || 'var(--accent)' }}>
                    {activity.icon_url ? <img src={activity.icon_url} className="w-3 h-3" alt="" /> : null}
                    {activity.name}
                  </span>
                ))}
                {/* 促销活动标签 (promotion) - 最大折扣的促销 */}
                {(product.promotion && product.promotion.discount_percent > 0) && (
                  <span className="text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: product.promotion.color || 'var(--accent)' }}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                    </svg>
                    {product.promotion.name || t("products.discount", "限时特惠")} - {product.promotion.discount_percent}%
                  </span>
                )}
                {/* 其他促销活动标签 (promotions数组) - 排除"今日特惠"和"特惠商品" */}
                {(product.promotions || []).map((promo: any) => {
                  if (promo.name === '今日特惠' || promo.name === '特惠商品') return null;
                  if (product.promotion && promo.id === product.promotion.id) return null;
                  return (
                    <span key={promo.id} className="text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: promo.color || 'var(--accent)' }}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                      </svg>
                      {promo.name}
                    </span>
                  );
                })}
                {product.is_limited && (
                  <span className="text-white text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--secondary)' }}>
                    {t("products.limited", "限量")}
                  </span>
                )}
              </div>

              {/* 标题和收藏 */}
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--heading-font)' }}>{productName}</h1>
                <button onClick={toggleFavorite} disabled={isFavoriteLoading} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  {isFavoriteLoading ? (
                    <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 6 1.373 6 3v1a8 8 0 100 16v1C6 22.627 5.373 22 4.627 22H3a1 1 0 01-1-1v-1a8 8 0 018-8z"></path></svg>
                  ) : isFavorited ? (
                    <svg className="w-6 h-6" style={{ color: 'var(--color-red)' }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  ) : (
                    <svg className="w-6 h-6" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.682l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                  )}
                </button>
              </div>

              {/* 评分 */}
              <div className="flex items-center mb-4">
                <div className="flex">{getStars(product.rating || 4.5)}</div>
                <span className="text-sm ml-2" style={{ color: 'var(--text-muted)' }}>({product.review_count ?? 0} {t("products.reviews", "评价")})</span>
              </div>

              {/* 价格 */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
                    {formatCurrency(convertCurrency(
                      (product.promotion && product.promotion.promotion_price) ? product.promotion.promotion_price : (product.price ?? 0), 
                      'aed', currency || 'aed'), currency || 'aed')}
                  </span>
                  {(product.promotion && product.promotion.promotion_price && product.promotion.original_price > product.promotion.promotion_price) && (
                    <span className="text-lg line-through opacity-60">{formatCurrency(convertCurrency(product.promotion.original_price ?? 0, 'aed', currency || 'aed'), currency || 'aed')}</span>
                  )}
                  {!product.promotion?.promotion_price && product.original_price > 0 && product.original_price > product.price && (
                    <span className="text-lg line-through opacity-60">{formatCurrency(convertCurrency(product.original_price ?? 0, 'aed', currency || 'aed'), currency || 'aed')}</span>
                  )}
                </div>
                {(product.promotion && product.promotion.promotion_price && product.promotion.original_price > product.promotion.promotion_price) && (
                  <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{t("products.save", "省")} {formatCurrency(convertCurrency((product.promotion.original_price - product.promotion.promotion_price), 'aed', currency || 'aed'), currency || 'aed')}</span>
                )}
              </div>

              {/* 折扣计算过程 - 红字显示 */}
              {product.promotions && product.promotions.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="text-sm font-medium text-red-600">
                    促销叠加计算：
                    {(() => {
                      const promos = product.promotions || [];
                      const exclusive = promos.find((p: any) => p.can_stack === 1);
                      let formula = '';
                      let totalDiscount = 0;

                      if (exclusive) {
                        formula = `${exclusive.discount_percent}% (独占)`;
                        totalDiscount = exclusive.discount_percent;
                      } else {
                        // 按priority从小到大排序后叠加
                        const sortedPromos = [...promos].sort((a: any, b: any) => a.priority - b.priority);
                        const parts: string[] = [];
                        sortedPromos.forEach((p: any) => {
                          parts.push(`(1-${p.discount_percent}%)`);
                        });
                        const multiplier = sortedPromos.reduce((acc: number, p: any) => acc * (1 - p.discount_percent / 100), 1);
                        totalDiscount = Math.round((1 - multiplier) * 100);
                        formula = parts.join(' × ') + ` = ${totalDiscount}%`;
                      }

                      return (
                        <div className="font-bold">最终折扣：{totalDiscount}% OFF ({formula})</div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* 库存和配送 */}
              <div className="mb-6 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-muted)' }}>{t("products.stock", "库存")}:</span>
                  <span style={{ color: product.stock > 0 ? 'var(--color-green)' : 'var(--color-red)' }}>{product.stock > 0 ? `${product.stock} ${t("products.in_stock", "件有货")}` : t("products.out_of_stock", "缺货")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-muted)' }}>{t("products.shipping", "配送")}:</span>
                  <span style={{ color: 'var(--text)' }}>{t("products.free_shipping", "免费配送")}</span>
                </div>
              </div>

              {/* 数量选择 */}
              <div className="mb-6">
                <span className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>{t("products.quantity", "数量")}</span>
                <div className="flex items-center">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-2 rounded-l-md border transition-colors" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}>-</button>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} min="1" className="w-16 px-2 py-2 text-center border-t border-b" style={{ borderColor: 'var(--border)', color: 'var(--text)', backgroundColor: 'var(--card)' }} />
                  <button onClick={() => setQuantity(quantity + 1)} className="px-4 py-2 rounded-r-md border transition-colors" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}>+</button>
                </div>
              </div>

              {/* 按钮 */}
              {cartMessage && (
                <div className={`mb-4 p-2 rounded text-sm ${cartMessage.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`} style={{ color: cartMessage.type === 'success' ? 'var(--color-green)' : 'var(--color-red)' }}>{cartMessage.text}</div>
              )}
              <div className="flex gap-3">
                <button onClick={handleAddToCart} disabled={isAddingToCart || product.stock <= 0} className="flex-1 py-3 rounded-md font-medium transition-all hover:opacity-90" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  {isAddingToCart ? t('cart.adding', '添加中...') : t("products.add_to_cart", "加入购物车")}
                </button>
                <button onClick={handleBuyNow} disabled={product.stock <= 0} className="flex-1 py-3 rounded-md font-medium text-white transition-all hover:opacity-90" style={{ backgroundColor: 'var(--accent)' }}>
                  {t("products.buy_now", "立即购买")}
                </button>
              </div>

              {/* 服务信息 */}
              <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: 'var(--color-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span style={{ color: 'var(--text)' }}>{t("products.free_shipping", "免费配送")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    <span style={{ color: 'var(--text)' }}>{t("products.7day_return", "7天无理由退换")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 商品描述和规格Tab */}
        <div className="mt-12 bg-white rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          {/* Tab标题 */}
          <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setActiveTab('description')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'description' ? 'border-b-2' : ''}`}
              style={{ 
                color: activeTab === 'description' ? 'var(--accent)' : 'var(--text-muted)',
                borderColor: activeTab === 'description' ? 'var(--accent)' : 'transparent'
              }}
            >
              {t("products.description", "产品描述")}
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'specs' ? 'border-b-2' : ''}`}
              style={{ 
                color: activeTab === 'specs' ? 'var(--accent)' : 'var(--text-muted)',
                borderColor: activeTab === 'specs' ? 'var(--accent)' : 'transparent'
              }}
            >
              {t("products.specifications", "规格参数")}
            </button>
          </div>
          
          {/* Tab内容 */}
          <div className="p-6">
            {activeTab === 'description' && (
              <div className="prose max-w-none" style={{ color: 'var(--text)' }}>
                <p>{i18n.language === 'zh' ? product.description : i18n.language === 'ar' ? product.description_ar : product.description_en || product.description}</p>
              </div>
            )}
            
            {activeTab === 'specs' && (
              <div>
                {(product.specifications_detail || []).length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(product.specifications_detail || []).map((spec: any, index: number) => (
                      <div key={index} className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {i18n.language === 'zh' ? spec.field_name : i18n.language === 'ar' ? spec.field_name_ar : spec.field_name_en}
                        </span>
                        <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                          {i18n.language === 'zh' ? spec.value : i18n.language === 'ar' ? spec.value_ar : spec.value_en}
                          {spec.unit ? ` ${spec.unit}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>{t("products.no_specs", "暂无规格信息")}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 评价 */}
        <div className="mt-12 bg-white rounded-lg border p-6" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text)', fontFamily: 'var(--heading-font)' }}>{t("products.reviews", "顾客评价")} ({reviews.length})</h2>
          <div className="space-y-6">
            {reviews.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>{t("products.no_reviews", "暂无评价")}</p>
            ) : (
              reviews.slice(0, 5).map((review, index) => (
                <div key={review.id || index} className="pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center mb-2">
                    <div className="flex">{getStars(review.rating ?? 0)}</div>
                    <span className="text-sm ml-2" style={{ color: 'var(--text-muted)' }}>{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{review.comment}</p>
                  <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>— {review.user_name || t("products.anonymous", "匿名用户")}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 相关推荐 */}
        {relatedProducts.length > 0 && (
          <div className="mt-12 bg-white rounded-lg border p-6" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text)', fontFamily: 'var(--heading-font)' }}>{t("products.related", "你可能也喜欢")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((p: any) => (
                <Link key={p.id} href={`/products/${p.id}`} className="group">
                  <div className="aspect-square rounded-md overflow-hidden mb-2 border" style={{ borderColor: 'var(--border)' }}>
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <p className="text-sm line-clamp-2 group-hover:opacity-80" style={{ color: 'var(--text)' }}>{i18n.language === 'zh' ? p.name : i18n.language === 'ar' ? p.name_ar : p.name_en || p.name}</p>
                  <p className="text-sm font-medium mt-1" style={{ color: 'var(--accent)' }}>{formatCurrency(convertCurrency(p.price ?? 0, 'aed', currency), currency)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {modalOpen && <ImageModal images={currentImages} currentIndex={currentImageIndex} onClose={closeModal} onPrev={handlePrev} onNext={handleNext} />}
    </div>
  );
}