export interface PaymentResultOrderLike {
  id?: number;
  order_number?: string;
  order_status?: string | null;
  payment_status?: string | null;
}

export interface PaymentResultStateInput {
  status: string;
  order?: PaymentResultOrderLike | null;
  errorMsg?: string | null;
}

export interface PaymentResultState {
  paymentStatus: 'success' | 'fail';
  errorCode?: string;
  errorMessage?: {
    zh: string;
    en: string;
    ar: string;
  };
}

const PAYMENT_NOT_CONFIRMED_MESSAGE = {
  zh: '支付结果页收到成功参数，但订单尚未确认支付成功，请稍后刷新订单状态。',
  en: 'The payment result page received a success status, but the order is not confirmed as paid yet. Please refresh the order status shortly.',
  ar: 'استلمت صفحة نتيجة الدفع حالة نجاح، لكن الطلب لم يتم تأكيد دفعه بعد. يرجى تحديث حالة الطلب بعد قليل.',
};

const USER_CANCEL_MESSAGE = {
  zh: '您取消了支付，订单仍待支付。您可以重新支付或取消订单。',
  en: 'Payment was cancelled. Your order is still pending. You can retry payment or cancel the order.',
  ar: 'تم إلغاء الدفع. طلبك لا يزال معلقاً. يمكنك إعادة الدفع أو إلغاء الطلب.',
};

const DEFAULT_FAIL_MESSAGE = {
  zh: '支付失败，请重试',
  en: 'Payment failed, please retry',
  ar: 'فشل الدفع، يرجى المحاولة مرة أخرى',
};

export function derivePaymentResultState({ status, order, errorMsg }: PaymentResultStateInput): PaymentResultState {
  if (status === 'cancel') {
    return {
      paymentStatus: 'fail',
      errorCode: 'USER_CANCEL',
      errorMessage: USER_CANCEL_MESSAGE,
    };
  }

  if (status === 'success') {
    const isPaid = order?.payment_status === 'paid' || order?.order_status === 'paid';

    if (isPaid) {
      return {
        paymentStatus: 'success',
      };
    }

    return {
      paymentStatus: 'fail',
      errorCode: 'PAYMENT_NOT_CONFIRMED',
      errorMessage: PAYMENT_NOT_CONFIRMED_MESSAGE,
    };
  }

  return {
    paymentStatus: 'fail',
    errorCode: (status || 'fail').toUpperCase(),
    errorMessage: {
      zh: errorMsg || DEFAULT_FAIL_MESSAGE.zh,
      en: DEFAULT_FAIL_MESSAGE.en,
      ar: DEFAULT_FAIL_MESSAGE.ar,
    },
  };
}
