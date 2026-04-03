"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { convertCurrency, formatCurrency } from '@/lib/utils/currency';
import { useCart } from '@/lib/contexts/CartContext';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedCapacity, setSelectedCapacity] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) {
          throw new Error('Product not found');
        }
        const data = await response.json();
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/cart');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl">Product not found</p>
      </div>
    );
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-8">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <a href="/" className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary">
                  {t('home.title')}
                </a>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <a href="/products" className="ml-2 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary">
                    {t('products.title')}
                  </a>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-2 text-gray-500 dark:text-gray-400">{product.name}</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Image/Video Section */}
          <div>
            {product.video && (
              <div className="relative mb-4 rounded-lg overflow-hidden shadow-lg">
                {product.is_limited && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold z-10">
                    {product.discount}% OFF
                  </div>
                )}
                <div className="aspect-w-16 aspect-h-9">
                  <iframe
                    src={product.video}
                    title="Product Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  ></iframe>
                </div>
              </div>
            )}

            {!product.video && (
              <>
                <div className="relative mb-4 rounded-lg overflow-hidden shadow-lg">
                  {product.is_limited && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold z-10">
                      {product.discount}% OFF
                    </div>
                  )}
                  <img 
                    src={product.images[activeImage] || product.image} 
                    alt={`${product.name} - View ${activeImage + 1}`} 
                    className="w-full h-auto"
                  />
                </div>

                {product.images && product.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-3">
                    {product.images.map((image: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setActiveImage(index)}
                        className={`rounded-lg overflow-hidden border-2 ${activeImage === index ? 'border-primary' : 'border-gray-200 dark:border-gray-700'}`}
                      >
                        <img 
                          src={image} 
                          alt={`${product.name} - Thumbnail ${index + 1}`} 
                          className="w-full h-24 object-cover hover:opacity-80 transition-opacity"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Product Info */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-2 text-gray-600 dark:text-gray-300">5.0 (12 reviews)</span>
              </div>
              <span className="text-gray-600 dark:text-gray-300">•</span>
              <span className="text-gray-600 dark:text-gray-300">{t('products.sold', { count: product.stock })}</span>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-4">
                <span className="text-3xl font-bold text-primary">{formatCurrency(convertCurrency(product.price, 'aed', currency), currency)}</span>
                {product.original_price > product.price && (
                  <span className="text-xl text-gray-500 line-through">{formatCurrency(convertCurrency(product.original_price, 'aed', currency), currency)}</span>
                )}
              </div>
              {product.is_limited && (
                <p className="text-red-500 font-medium mt-2">{t('products.limited_offer')}</p>
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">{t('products.specifications')}</h3>
              
              {/* Material Selection */}
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">{t('products.material')}</h4>
                <div className="flex flex-wrap gap-2">
                  {['紫泥', '红泥', '段泥'].map((material) => (
                    <button
                      key={material}
                      onClick={() => setSelectedMaterial(material)}
                      className={`px-4 py-2 rounded-lg border ${selectedMaterial === material ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-gray-700'} hover:border-primary transition-colors`}
                    >
                      {material}
                      {material !== '紫泥' && (
                        <span className="ml-1 text-sm text-gray-500">+50 AED</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capacity Selection */}
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">{t('products.capacity')}</h4>
                <div className="flex flex-wrap gap-2">
                  {[100, 150, 200, 300, 500].map((capacity) => (
                    <button
                      key={capacity}
                      onClick={() => setSelectedCapacity(capacity.toString())}
                      className={`px-4 py-2 rounded-lg border ${selectedCapacity === capacity.toString() ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-gray-700'} hover:border-primary transition-colors`}
                    >
                      {capacity}ml
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selection */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-2">{t('products.quantity')}</h4>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-lg font-medium w-10 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-500">{t('products.in_stock', { count: product.stock })}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {t('products.add_to_cart')}
                </button>
                <button
                  onClick={handleBuyNow}
                  className="flex-1 border border-primary text-primary hover:bg-primary/5 py-3 rounded-lg font-medium transition-colors"
                >
                  {t('products.buy_now')}
                </button>
                <button className="w-12 h-12 border border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Service Commitments */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">{t('products.service_commitments')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">{t('products.7day_return')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">{t('products.free_shipping')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">{t('products.authentic_guarantee')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">{t('products.secure_payment')}</span>
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            {product.shipping && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">{t('products.shipping_info')}</h3>
                <div className="space-y-2">
                  {product.shipping.freeShipping ? (
                    <p className="text-green-600 dark:text-green-400">{t('products.free_shipping')}</p>
                  ) : (
                    <p>{t('products.shipping_fee', { fee: product.shipping.shippingFee })}</p>
                  )}
                  {product.shipping.shippingTime && (
                    <p>{t('products.shipping_time', { time: product.shipping.shippingTime })}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-12">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px space-x-8">
              <button
                onClick={() => setActiveTab('description')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'description' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              >
                {t('products.description')}
              </button>
              <button
                onClick={() => setActiveTab('specifications')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'specifications' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              >
                {t('products.specifications')}
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'reviews' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              >
                {t('products.reviews')} (12)
              </button>
              <button
                onClick={() => setActiveTab('after_sale')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'after_sale' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              >
                {t('products.after_sale')}
              </button>
            </nav>
          </div>

          <div className="py-8">
            {activeTab === 'description' && (
              <div className="prose dark:prose-invert max-w-none">
                <p>{product.description}</p>
                {product.features && product.features.length > 0 && (
                  <ul className="list-disc pl-5 space-y-2">
                    {product.features.map((feature: string, index: number) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="space-y-4">
                {product.specifications && (
                  <table className="w-full border-collapse">
                    <tbody>
                      {product.specifications.weight && (
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <td className="py-3 px-4 font-medium">{t('products.weight')}</td>
                          <td className="py-3 px-4">{product.specifications.weight}</td>
                        </tr>
                      )}
                      {product.specifications.size && (
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <td className="py-3 px-4 font-medium">{t('products.size')}</td>
                          <td className="py-3 px-4">{product.specifications.size}</td>
                        </tr>
                      )}
                      {product.specifications.material && (
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <td className="py-3 px-4 font-medium">{t('products.material')}</td>
                          <td className="py-3 px-4">{product.specifications.material}</td>
                        </tr>
                      )}
                      {product.specifications.capacity && (
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <td className="py-3 px-4 font-medium">{t('products.capacity')}</td>
                          <td className="py-3 px-4">{product.specifications.capacity}</td>
                        </tr>
                      )}
                      {product.specifications.color && product.specifications.color.length > 0 && (
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <td className="py-3 px-4 font-medium">{t('products.color')}</td>
                          <td className="py-3 px-4">{product.specifications.color.join(', ')}</td>
                        </tr>
                      )}
                      {product.specifications.other && (
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <td className="py-3 px-4 font-medium">{t('products.other')}</td>
                          <td className="py-3 px-4">{product.specifications.other}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* Review form */}
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">{t('products.leave_review')}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('products.rating')}</label>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} className="text-gray-400 hover:text-yellow-400">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('products.comment')}</label>
                      <textarea className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" rows={4} placeholder={t('products.review_placeholder')}></textarea>
                    </div>
                    <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                      {t('products.submit_review')}
                    </button>
                  </div>
                </div>

                {/* Existing reviews */}
                <div className="space-y-4">
                  {[1, 2, 3].map((review) => (
                    <div key={review} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <span className="font-medium">U{review}</span>
                        </div>
                        <div>
                          <h4 className="font-medium">User {review}</h4>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            <span className="ml-2 text-sm text-gray-500">5.0</span>
                          </div>
                        </div>
                        <span className="ml-auto text-sm text-gray-500">2024-01-1{review}</span>
                      </div>
                      <p className="mt-2 text-gray-600 dark:text-gray-300">
                        This is a great product! I love the quality and design. Highly recommended.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'after_sale' && (
              <div className="space-y-4">
                {product.afterSale && (
                  <div className="space-y-4">
                    {product.afterSale.returnPolicy && (
                      <div>
                        <h4 className="font-semibold mb-2">{t('products.return_policy')}</h4>
                        <p className="text-gray-600 dark:text-gray-300">{product.afterSale.returnPolicy}</p>
                      </div>
                    )}
                    {product.afterSale.refundPolicy && (
                      <div>
                        <h4 className="font-semibold mb-2">{t('products.refund_policy')}</h4>
                        <p className="text-gray-600 dark:text-gray-300">{product.afterSale.refundPolicy}</p>
                      </div>
                    )}
                    {product.afterSale.warranty && (
                      <div>
                        <h4 className="font-semibold mb-2">{t('products.warranty')}</h4>
                        <p className="text-gray-600 dark:text-gray-300">{product.afterSale.warranty}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-8 text-center">{t('products.related_products')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer">
                <div className="aspect-square overflow-hidden">
                  <img 
                    src={`https://neeko-copilot.bytedance.net/api/text2image?prompt=zisha%20teapot%20${item}&size=square_hd`} 
                    alt={`Related product ${item}`} 
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2 line-clamp-2">Related Product {item}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl font-bold text-primary">{200 + item * 50}.00 AED</span>
                  </div>
                  <button className="w-full bg-primary hover:bg-primary/90 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300">
                    {t('products.view')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
            {t('products.added_to_cart')}
          </div>
        )}
      </div>
    </div>
  );
}