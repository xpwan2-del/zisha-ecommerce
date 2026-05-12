export interface PaymentSuccessPersistenceInput {
  orderId: number;
  orderNumber: string;
  detectedPlatform: string;
  transactionId: string;
  platformOrderId: string;
  amount: number;
}

export interface PaymentSuccessPersistence {
  orderUpdate: {
    orderStatus: 'paid';
    paymentStatus: 'paid';
    paymentMethod: string;
    referenceId: string;
    afterSaleStatus: 'none';
    refundFromStatus: null;
  };
  orderPayment: {
    orderId: number;
    paymentMethod: string;
    transactionId: string;
    amount: number;
    paymentStatus: 'paid';
  };
}

export function buildPaymentSuccessPersistence({
  orderId,
  detectedPlatform,
  transactionId,
  platformOrderId,
  amount,
}: PaymentSuccessPersistenceInput): PaymentSuccessPersistence {
  return {
    orderUpdate: {
      orderStatus: 'paid',
      paymentStatus: 'paid',
      paymentMethod: detectedPlatform,
      referenceId: platformOrderId,
      afterSaleStatus: 'none',
      refundFromStatus: null,
    },
    orderPayment: {
      orderId,
      paymentMethod: detectedPlatform,
      transactionId,
      amount,
      paymentStatus: 'paid',
    },
  };
}
