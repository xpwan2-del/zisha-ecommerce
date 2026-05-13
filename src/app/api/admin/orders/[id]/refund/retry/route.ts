import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createErrorResponse, createSuccessResponse, logApiError, logApiRequest, logApiSuccess } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { completeRefundSuccess } from '@/lib/refund-completion-service';
import { getLatestFailedRefundWebhookEvent, markRefundWebhookEventRetryFailed, markRefundWebhookEventRetrying, markRefundWebhookEventRetryCompleted } from '@/lib/payment/refund-webhook-service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const orderId = parseInt(id);
    logApiRequest('ORDERS', 'POST', `/api/admin/orders/${orderId}/refund/retry`);

    const orderResult = await query(
      'SELECT id, order_number, order_status, payment_status, payment_method, reference_id FROM orders WHERE id = ?',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return createErrorResponse('NOT_FOUND', 404);
    }

    const order = orderResult.rows[0];
    const latestFailedRefundWebhook = await getLatestFailedRefundWebhookEvent(String(order.order_number || ''));

    if (!latestFailedRefundWebhook) {
      return createErrorResponse('REFUND_RETRY_NOT_AVAILABLE', 400);
    }

    await markRefundWebhookEventRetrying(latestFailedRefundWebhook.platform, latestFailedRefundWebhook.event_id);

    const refundResult = await completeRefundSuccess({
      orderNumber: order.order_number,
      referenceId: order.reference_id,
      platform: latestFailedRefundWebhook.platform,
      transactionId: latestFailedRefundWebhook.transaction_id,
      reason: '管理员重试退款完成',
      operatorId: auth.user?.id ?? 0,
      operatorName: auth.user?.name || 'admin_retry',
    });

    if (!refundResult.success) {
      await markRefundWebhookEventRetryFailed(
        latestFailedRefundWebhook.platform,
        latestFailedRefundWebhook.event_id,
        refundResult.error || 'REFUND_RETRY_FAILED',
        'refund_completion'
      );
      await recordAdminAuditLog({
        request,
        module: 'ORDERS',
        action: 'REFUND_RETRY_FAILED',
        operator: auth.user?.name || String(auth.user?.id || 'admin'),
        resourceType: 'order',
        resourceId: String(orderId),
        description: `退款重试失败: ${refundResult.error || 'REFUND_RETRY_FAILED'}`,
        status: 'failed',
        errorMessage: refundResult.error || 'REFUND_RETRY_FAILED',
      });
      return createErrorResponse(refundResult.error || 'REFUND_RETRY_FAILED', 400);
    }

    await markRefundWebhookEventRetryCompleted(latestFailedRefundWebhook.platform, latestFailedRefundWebhook.event_id);

    await recordAdminAuditLog({
      request,
      module: 'ORDERS',
      action: 'REFUND_RETRY_SUCCESS',
      operator: auth.user?.name || String(auth.user?.id || 'admin'),
      resourceType: 'order',
      resourceId: String(orderId),
      description: '管理员退款重试成功',
      status: 'success',
    });

    logApiSuccess('ORDERS', 'POST_REFUND_RETRY', {
      orderId,
      orderNumber: order.order_number,
      platform: latestFailedRefundWebhook.platform,
    });

    return createSuccessResponse({
      success: true,
      orderId,
      orderNumber: order.order_number,
      refundResult,
      webhookEvent: {
        eventId: latestFailedRefundWebhook.event_id,
        platform: latestFailedRefundWebhook.platform,
        retryCount: (latestFailedRefundWebhook.retry_count || 0) + 1,
      },
    });
  } catch (error) {
    logApiError('ORDERS', 'POST_REFUND_RETRY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
