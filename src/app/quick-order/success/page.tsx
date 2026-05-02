'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { EnhancedPaymentResultCard } from '@/components/payment';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'zh';

  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'fail'>('success');
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [errorInfo, setErrorInfo] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'stripe' | 'alipay'>('paypal');

  const orderNumber = searchParams.get('order_number');
  const paypalToken = searchParams.get('token');
  const alipayTradeNo = searchParams.get('trade_no');
  const stripeSessionId = searchParams.get('session_id');
  const source = (searchParams.get('source') as 'quick-order' | 'cart') || 'quick-order';

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderNumber) {
        setIsVerifying(false);
        return;
      }

      try {
        let notifyUrl = '/api/payments/paypal/notify';
        let notifyData: any = {
          orderId: paypalToken,
          order_number: orderNumber,
        };

        if (stripeSessionId) {
          notifyUrl = '/api/payments/stripe/notify';
          notifyData = {
            session_id: stripeSessionId,
            order_number: orderNumber,
          };
          setPaymentMethod('stripe');
        } else if (alipayTradeNo) {
          notifyUrl = '/api/payments/alipay/notify';
          notifyData = {
            trade_no: alipayTradeNo,
            order_number: orderNumber,
          };
          setPaymentMethod('alipay');
        }

        const response = await fetch(notifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-lang': locale,
          },
          body: JSON.stringify(notifyData),
        });

        const data = await response.json();

        const orderResponse = await fetch(`/api/orders-list?order_number=${orderNumber}`, {
          credentials: 'include',
        });
        const orderData = await orderResponse.json();

        if (orderData.success && orderData.data?.orders?.[0]) {
          setOrderInfo(orderData.data.orders[0]);
        } else if (orderData.success && orderData.data?.orders) {
          setOrderInfo(orderData.data.orders[0]);
        }

        if (data.success) {
          setPaymentStatus('success');
        } else {
          setPaymentStatus('fail');
          setErrorInfo({
            errorCode: data.error_code,
            errorMessage: {
              zh: data.message_zh || data.message || '支付失败',
              en: data.message_en || 'Payment failed',
              ar: data.message_ar || data.message || 'فشل الدفع',
            },
          });
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setPaymentStatus('fail');
        setErrorInfo({
          errorCode: 'UNKNOWN_ERROR',
          errorMessage: {
            zh: '支付验证失败，请稍后重试',
            en: 'Payment verification failed, please retry',
            ar: 'فشل التحقق من الدفع، يرجى المحاولة لاحقًا',
          },
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [orderNumber, paypalToken, alipayTradeNo, stripeSessionId, locale]);

  const handleViewOrder = () => {
    router.push('/account?tab=orders');
  };

  const handleContinueShopping = () => {
    router.push('/');
  };

  const handleRetry = () => {
    if (source === 'cart') {
      router.push('/cart');
    } else {
      if (orderInfo?.id) {
        router.push(`/quick-order?order_id=${orderInfo.id}`);
      } else {
        router.push('/quick-order');
      }
    }
  };

  const handleChangePayment = () => {
    handleRetry();
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">
            {locale === 'zh' ? '正在验证支付状态...' :
             locale === 'ar' ? 'جارٍ التحقق من حالة الدفع...' :
             'Verifying payment status...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <EnhancedPaymentResultCard
          type={paymentStatus}
          paymentMethod={paymentMethod}
          orderInfo={orderInfo}
          errorCode={errorInfo?.errorCode}
          errorMessage={errorInfo?.errorMessage}
          source={source}
          onViewOrder={handleViewOrder}
          onContinueShopping={handleContinueShopping}
          onRetry={handleRetry}
          onChangePayment={handleChangePayment}
        />
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
