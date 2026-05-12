export interface RefundSuccessInput {
  orderId: number;
  userId: number;
  operatorId: number | null;
  operatorName: string;
  reason?: string;
  platform?: string | null;
  transactionId?: string | null;
}

export function buildRefundSuccessExtraData(input: RefundSuccessInput) {
  return {
    reason: input.reason || '退款成功',
    platform: input.platform || null,
    transactionId: input.transactionId || null,
    releaseOrderResources: {
      orderId: input.orderId,
      userId: input.userId,
      transactionTypeCode: 'refund_return',
      inventoryReason: '退款成功返还库存',
      referenceType: 'refund',
      operatorId: input.operatorId,
      operatorName: input.operatorName,
    },
  };
}
