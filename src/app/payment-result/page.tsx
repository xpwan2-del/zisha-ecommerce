'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EnhancedPaymentResultCard } from '@/components/payment';

function PaymentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'fail'>('fail');
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [errorInfo, setErrorInfo] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'stripe' | 'alipay'>('paypal');

  const status = searchParams.get('status') || 'fail';
  const orderNumber = searchParams.get('order_number') || '';
  const orderId = searchParams.get('order_id') || '';
  const source = (searchParams.get('source') as 'quick-order' | 'cart') || 'cart';
  const platform = searchParams.get('platform') || 'paypal';
  const errorMsg = searchParams.get('error');

  useEffect(() => {
    const fetchOrderAndVerify = async () => {
      if (!orderNumber && !orderId) {
        setIsLoading(false);
        return;
      }

      try {
        fetch('/api/inventory/release-expired', {
          method: 'POST',
        }).catch(() => {});

        // 优先用 orderId 精确获取，其次用 orderNumber
        let fetchedOrder = null;
        if (orderId) {
          const res = await fetch(`/api/orders/${orderId}`, { credentials: 'include' });
          const data = await res.json();
          if (data.success) {
            fetchedOrder = data.data;
          }
        } else if (orderNumber) {
          const res = await fetch(`/api/orders-list?order_number=${orderNumber}`, { credentials: 'include' });
          const data = await res.json();
          if (data.success) {
            const orders = data.data?.orders || [];
            if (orders.length > 0) fetchedOrder = orders[0];
          }
        }

        if (fetchedOrder) setOrderInfo(fetchedOrder);

        const platformMap: Record<string, 'paypal' | 'stripe' | 'alipay'> = {
          paypal: 'paypal', stripe: 'stripe', alipay: 'alipay',
        };
        if (platformMap[platform]) {
          setPaymentMethod(platformMap[platform]);
        }

        if (status === 'success') {
          setPaymentStatus('success');
        } else if (status === 'cancel') {
          setPaymentStatus('fail');
          setErrorInfo({
            errorCode: 'USER_CANCEL',
            errorMessage: {
              zh: '您取消了支付，订单已自动取消。如需购买请重新下单。',
              en: 'Payment was cancelled. Your order has been cancelled. Please place a new order.',
              ar: 'تم إلغاء الدفع. تم إلغاء طلبك. يرجى تقديم طلب جديد.',
            },
          });
        } else {
          setPaymentStatus('fail');
          const reason = status || 'fail';
          setErrorInfo({
            errorCode: reason.toUpperCase(),
            errorMessage: {
              zh: decodeURIComponent(errorMsg || '') || '支付失败，请重试',
              en: 'Payment failed, please retry',
              ar: 'فشل الدفع، يرجى المحاولة مرة أخرى',
            },
          });
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        setPaymentStatus('fail');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderAndVerify();
  }, [orderId, orderNumber, status, platform, errorMsg]);

  const handleViewOrder = () => {
    const id = orderId || orderInfo?.id;
    if (id) {
      router.push(`/orders/${id}`);
    } else {
      router.push('/account?tab=orders');
    }
  };

  const handleContinueShopping = () => {
    router.push('/');
  };

  // 统一跳转到订单详情页，不再回到购买页面（避免重复创建订单）
  const handleRetry = () => {
    const id = orderId || orderInfo?.id;
    if (id) {
      router.push(`/orders/${id}`);
    } else {
      router.push('/account?tab=orders');
    }
  };

  const handleChangePayment = () => {
    handleRetry();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">正在加载订单信息...</p>
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

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}
