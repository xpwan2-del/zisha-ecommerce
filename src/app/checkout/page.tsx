"use client";

export default function CheckoutPage() {
  const checkoutData = {
    items: [
      {
        id: 1,
        name: '掇球紫砂壶',
        name_en: 'Duoqiu Zisha Teapot',
        image: '/images/products/2_掇球紫砂壶_1.jpg',
        price: 'AED 1,599.00',
        original_price: 'AED 1,999.00',
        quantity: 1,
      },
      {
        id: 2,
        name: '圆口紫砂茶杯',
        name_en: 'Round Mouth Teacup',
        image: '/images/products/16_圆口紫砂茶杯_1.jpg',
        price: 'AED 299.00',
        original_price: 'AED 399.00',
        quantity: 2,
      },
    ],
    subtotal: 'AED 2,197.00',
    original_subtotal: 'AED 2,797.00',
    shipping: 'Free',
    tax: 'AED 109.85',
    total: 'AED 2,306.85',
    promotions: '今日特惠 - AED 600.00',
    savings: 'AED 600.00',
  };

  const userAddress = {
    name: '张先生',
    phone: '+971 50 123 4567',
    address: 'Al Wasl Road, Jumeirah',
    city: 'Dubai',
    country: 'United Arab Emirates',
  };

  const paymentMethods = [
    {
      id: 'stripe',
      name: 'Credit / Debit Card',
      description: 'Visa, Mastercard, American Express',
      icons: ['VISA', 'MC', 'AMEX'],
      selected: true,
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Pay with your PayPal account',
      selected: false,
    },
    {
      id: 'alipay',
      name: 'Alipay',
      description: '支付宝支付',
      selected: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-8 text-pink-900">
          结账 Checkout
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/90 rounded-xl shadow-lg border border-pink-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-pink-50 to-white border-b border-pink-200">
                <h2 className="text-lg font-semibold text-pink-900 flex items-center gap-2">
                  <span>📍</span>
                  收货地址 Shipping Address
                </h2>
              </div>
              
              <div className="p-6">
                <div className="flex items-start gap-4 p-4 bg-pink-50/50 rounded-lg border border-pink-200">
                  <div className="flex-shrink-0 w-10 h-10 bg-pink-900 rounded-full flex items-center justify-center text-white">
                    👤
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-pink-900">{userAddress.name}</span>
                      <span className="px-2 py-0.5 text-xs bg-pink-900 text-white rounded-full">默认 Default</span>
                    </div>
                    <p className="text-sm text-pink-700">{userAddress.phone}</p>
                    <p className="text-sm text-pink-700 mt-1">{userAddress.address}, {userAddress.city}</p>
                    <p className="text-sm text-pink-700">{userAddress.country}</p>
                  </div>
                  <button className="text-sm text-pink-900 hover:text-pink-600 font-medium transition-colors">
                    更改 Change
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/90 rounded-xl shadow-lg border border-pink-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-pink-50 to-white border-b border-pink-200">
                <h2 className="text-lg font-semibold text-pink-900 flex items-center gap-2">
                  <span>💳</span>
                  支付方式 Payment Method
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      method.selected
                        ? 'border-pink-900 bg-pink-50/50 shadow-md'
                        : 'border-pink-200 hover:bg-pink-50/30'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 ${
                      method.selected ? 'border-pink-900' : 'border-pink-300'
                    }`}>
                      {method.selected && (
                        <div className="w-3 h-3 rounded-full bg-pink-900"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-pink-900">{method.name}</h3>
                      <p className="text-sm text-pink-600">{method.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {method.id === 'stripe' && (
                        <div className="flex space-x-2">
                          <div className="w-10 h-7 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
                          <div className="w-10 h-7 bg-gradient-to-r from-red-500 to-red-700 rounded flex items-center justify-center text-white text-xs font-bold">MC</div>
                          <div className="w-10 h-7 bg-gradient-to-r from-blue-400 to-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">AMEX</div>
                        </div>
                      )}
                      {method.id === 'paypal' && (
                        <div className="px-3 py-1.5 bg-[#FFC439] rounded font-bold text-sm text-[#003087]">PayPal</div>
                      )}
                      {method.id === 'alipay' && (
                        <div className="px-3 py-1.5 bg-[#1677FF] rounded flex items-center justify-center">
                          <span className="text-white font-bold text-sm">Alipay</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/90 rounded-xl shadow-lg border border-pink-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-pink-50 to-white border-b border-pink-200">
                <h2 className="text-lg font-semibold text-pink-900 flex items-center gap-2">
                  <span>🛒</span>
                  商品清单 Order Items
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                {checkoutData.items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 bg-pink-50/30 rounded-lg">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-pink-100 flex items-center justify-center text-4xl">
                      🏺
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-4">
                          <h3 className="font-medium text-pink-900 truncate">{item.name}</h3>
                          <p className="text-xs text-pink-600 truncate mt-0.5">{item.name_en}</p>
                          <p className="text-sm text-pink-700 mt-1">数量 Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-pink-900">{item.price}</p>
                          <p className="text-xs text-pink-400 line-through mt-0.5">{item.original_price}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white/90 rounded-xl shadow-lg border border-pink-200 overflow-hidden sticky top-6">
              <div className="px-6 py-4 bg-gradient-to-r from-pink-50 to-white border-b border-pink-200">
                <h2 className="text-lg font-semibold text-pink-900 flex items-center gap-2">
                  <span>📋</span>
                  订单摘要 Order Summary
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-pink-700">小计 Subtotal (2 items)</span>
                    <span className="text-pink-900 font-medium">{checkoutData.subtotal}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-pink-400 line-through">原价 Original Price</span>
                    <span className="text-pink-400 line-through">{checkoutData.original_subtotal}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">折扣 Discount</span>
                    <span className="text-green-600 font-medium">-{checkoutData.savings}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-pink-700">运费 Shipping</span>
                    <span className="text-green-600 font-medium">免运费 Free</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-pink-700">税费 Tax</span>
                    <span className="text-pink-900">{checkoutData.tax}</span>
                  </div>
                </div>
                
                <div className="border-t border-pink-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-pink-900">总计 Total</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-pink-900">{checkoutData.total}</span>
                      <p className="text-xs text-pink-600 mt-0.5">≈ $628.02 USD | ¥ 4,523.52 CNY</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    <div>
                      <p className="text-sm text-green-800 font-medium">{checkoutData.promotions}</p>
                      <p className="text-xs text-green-600">您节省了 {checkoutData.savings}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4">
                  <button
                    className="w-full py-4 bg-gradient-to-r from-pink-900 via-pink-800 to-pink-900 text-white rounded-lg font-semibold hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <span>🔒</span>
                    确认支付 Confirm Payment
                  </button>
                  
                  <button
                    className="w-full py-3 border-2 border-pink-900 text-pink-900 rounded-lg font-medium hover:bg-pink-50 transition-all flex items-center justify-center gap-2"
                  >
                    <span>←</span>
                    返回购物车 Back to Cart
                  </button>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-pink-50/50 border-t border-pink-200">
                <div className="flex items-center justify-center gap-4 text-pink-600">
                  <span>🔒</span>
                  <span className="text-xs">安全加密支付 Secure & Encrypted Payment</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
