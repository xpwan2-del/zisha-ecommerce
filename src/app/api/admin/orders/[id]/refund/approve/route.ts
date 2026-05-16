import { NextRequest } from 'next/server';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { RefundService } from '@/lib/payment/refund-service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const orderId = parseInt(id);
    logApiRequest('ORDERS', 'POST', `/api/admin/orders/${orderId}/refund/approve`);

    const operatorId = auth.user.userId;
    const operatorName = auth.user.name || 'Admin';

    const refundApproval = await RefundService.approveRefund({
      orderId,
      operatorId,
      operatorName,
      reason: '管理员同意退款',
    });

    if (!refundApproval.success) {
      return createErrorResponse(refundApproval.detail || refundApproval.error || 'REFUND_APPROVAL_FAILED', refundApproval.status || 400);
    }

    logApiSuccess('ORDERS', 'APPROVE_REFUND', {
      orderId,
      orderNumber: refundApproval.orderNumber,
      approveFromStatus: refundApproval.fromStatus,
      approveToStatus: refundApproval.toStatus,
      refundPlatform: refundApproval.refundResult?.platform || null,
      refundId: refundApproval.refundResult?.refundId || null,
      refundStatus: refundApproval.refundResult?.status || null,
    });
    return createSuccessResponse({
      message: '退款审批已通过，等待支付通道退款结果',
      order_status: refundApproval.toStatus,
      payment_status: 'refunding',
      after_sale_status: 'approved',
      refund: refundApproval.refundResult,
    });
  } catch (error) {
    logApiError('ORDERS', 'APPROVE_REFUND', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
