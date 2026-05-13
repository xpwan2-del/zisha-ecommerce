import { query } from '@/lib/db';

const WEBHOOK_EVENTS_TABLE = 'payment_webhook_events';

export interface NormalizedRefundWebhook {
  isRefundSuccess: boolean;
  orderNumber: string | null;
  referenceId: string | null;
  transactionId: string | null;
  eventId: string | null;
  refundAmount: number | null;
  rawStatus: string | null;
}

export interface RefundWebhookValidationResult {
  success: boolean;
  error?: string;
  orderId?: number;
  orderNumber?: string;
  orderAmount?: number;
}

export interface RefundWebhookEventRegistrationResult {
  success: boolean;
  eventId: string;
  duplicate: boolean;
  recordId?: number;
  status?: string;
  error?: string;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function nestedNumber(source: any, paths: string[][]): number | null {
  for (const path of paths) {
    let current = source;
    for (const key of path) current = current?.[key];
    const value = asNumber(current);
    if (value !== null) return value;
  }
  return null;
}

function serializePayload(payload: unknown): string {
  try {
    return JSON.stringify(payload);
  } catch {
    return '{}';
  }
}

export async function ensureWebhookEventsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS payment_webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      event_id TEXT NOT NULL,
      event_type TEXT,
      order_number TEXT,
      reference_id TEXT,
      transaction_id TEXT,
      status TEXT NOT NULL DEFAULT 'processing',
      failure_stage TEXT,
      processing_state TEXT,
      retry_count INTEGER DEFAULT 0,
      last_retry_at TEXT,
      raw_payload TEXT,
      error_message TEXT,
      processed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(platform, event_id)
    )
  `);

  const columns = [
    { name: 'failure_stage', type: 'TEXT' },
    { name: 'processing_state', type: 'TEXT' },
    { name: 'retry_count', type: 'INTEGER DEFAULT 0' },
    { name: 'last_retry_at', type: 'TEXT' }
  ];
  for (const col of columns) {
    try {
      await query(`ALTER TABLE payment_webhook_events ADD COLUMN ${col.name} ${col.type}`);
    } catch {
    }
  }

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhook_events_refund_transaction
    ON payment_webhook_events(platform, transaction_id, event_type)
    WHERE transaction_id IS NOT NULL AND transaction_id <> ''
  `);
}

export async function registerRefundWebhookEvent(
  platform: string,
  webhook: NormalizedRefundWebhook,
  payload: unknown,
  eventType: string
): Promise<RefundWebhookEventRegistrationResult> {
  await ensureWebhookEventsTable();

  const fallbackEventId = [
    platform,
    webhook.eventId,
    webhook.orderNumber,
    webhook.referenceId,
    webhook.transactionId,
    String(webhook.refundAmount ?? ''),
  ].filter(Boolean).join(':');

  const eventId = fallbackEventId || `${platform}:unknown`;

  const existing = await query(
    `SELECT id, event_id, status FROM ${WEBHOOK_EVENTS_TABLE}
     WHERE platform = ?
       AND (
         event_id = ?
         OR (transaction_id = ? AND event_type = ?)
       )
     LIMIT 1`,
    [platform, eventId, webhook.transactionId, eventType]
  );

  if (existing.rows.length > 0) {
    const existingRow = existing.rows[0];
    const existingStatus = String(existingRow.status || 'processing');

    if (existingStatus === 'completed') {
      return {
        success: true,
        eventId: String(existingRow.event_id || eventId),
        duplicate: true,
        recordId: Number(existingRow.id),
        status: existingStatus,
      };
    }

    await query(
      `UPDATE ${WEBHOOK_EVENTS_TABLE}
       SET status = 'processing',
           processing_state = CASE WHEN status = 'failed' THEN 'retrying' ELSE COALESCE(processing_state, 'processing') END,
           retry_count = CASE WHEN status = 'failed' THEN COALESCE(retry_count, 0) + 1 ELSE COALESCE(retry_count, 0) END,
           last_retry_at = CASE WHEN status = 'failed' THEN datetime('now') ELSE last_retry_at END,
           raw_payload = ?,
           error_message = NULL,
           failure_stage = NULL,
           updated_at = datetime('now')
       WHERE id = ?`,
      [serializePayload(payload), existingRow.id]
    );

    return {
      success: true,
      eventId: String(existingRow.event_id || eventId),
      duplicate: false,
      recordId: Number(existingRow.id),
      status: 'processing',
    };
  }

  const insertResult = await query(
    `INSERT OR IGNORE INTO ${WEBHOOK_EVENTS_TABLE}
     (platform, event_id, event_type, order_number, reference_id, transaction_id, status, raw_payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'processing', ?, datetime('now'), datetime('now'))`,
    [
      platform,
      eventId,
      eventType,
      webhook.orderNumber,
      webhook.referenceId,
      webhook.transactionId,
      serializePayload(payload),
    ]
  );

  if (insertResult.changes === 0) {
    const duplicate = await query(
      `SELECT id, event_id, status FROM ${WEBHOOK_EVENTS_TABLE}
       WHERE platform = ? AND transaction_id = ? AND event_type = ?
       LIMIT 1`,
      [platform, webhook.transactionId, eventType]
    );

    const duplicateRow = duplicate.rows[0];
    const duplicateStatus = String(duplicateRow?.status || 'processing');

    if (duplicateStatus === 'completed') {
      return {
        success: true,
        eventId: String(duplicateRow?.event_id || eventId),
        duplicate: true,
        recordId: Number(duplicateRow?.id || 0),
        status: duplicateStatus,
      };
    }

    if (duplicateRow?.id) {
      await query(
        `UPDATE ${WEBHOOK_EVENTS_TABLE}
         SET status = 'processing',
             processing_state = CASE WHEN status = 'failed' THEN 'retrying' ELSE COALESCE(processing_state, 'processing') END,
             retry_count = CASE WHEN status = 'failed' THEN COALESCE(retry_count, 0) + 1 ELSE COALESCE(retry_count, 0) END,
             last_retry_at = CASE WHEN status = 'failed' THEN datetime('now') ELSE last_retry_at END,
             raw_payload = ?,
             error_message = NULL,
             failure_stage = NULL,
             updated_at = datetime('now')
         WHERE id = ?`,
        [serializePayload(payload), duplicateRow.id]
      );
    }

    return {
      success: true,
      eventId: String(duplicateRow?.event_id || eventId),
      duplicate: false,
      recordId: Number(duplicateRow?.id || 0),
      status: 'processing',
    };
  }

  return {
    success: true,
    eventId,
    duplicate: false,
    recordId: Number(insertResult.lastInsertRowid || 0),
    status: 'processing',
  };
}

export async function markRefundWebhookEventCompleted(platform: string, eventId: string) {
  await ensureWebhookEventsTable();
  await query(
    `UPDATE ${WEBHOOK_EVENTS_TABLE}
     SET status = 'completed',
         processing_state = 'completed',
         processed_at = datetime('now'),
         updated_at = datetime('now'),
         error_message = NULL,
         failure_stage = NULL
     WHERE platform = ? AND event_id = ?`,
    [platform, eventId]
  );
}

export async function markRefundWebhookEventFailed(
  platform: string,
  eventId: string,
  errorMessage: string,
  failureStage: string = 'unknown'
) {
  await ensureWebhookEventsTable();
  await query(
    `UPDATE ${WEBHOOK_EVENTS_TABLE}
     SET status = 'failed',
         processing_state = 'failed',
         failure_stage = ?,
         error_message = ?,
         updated_at = datetime('now')
     WHERE platform = ? AND event_id = ?`,
    [failureStage, errorMessage, platform, eventId]
  );
}

export async function getLatestFailedRefundWebhookEvent(orderNumber: string) {
  await ensureWebhookEventsTable();
  const result = await query(
    `SELECT id, platform, event_id, event_type, order_number, reference_id, transaction_id,
            status, failure_stage, processing_state, retry_count, last_retry_at,
            raw_payload, error_message, created_at, updated_at
     FROM ${WEBHOOK_EVENTS_TABLE}
     WHERE order_number = ?
       AND event_type = 'refund_success'
       AND status = 'failed'
     ORDER BY updated_at DESC, id DESC
     LIMIT 1`,
    [orderNumber]
  );
  return result.rows[0] || null;
}

export async function markRefundWebhookEventRetrying(platform: string, eventId: string) {
  await ensureWebhookEventsTable();
  await query(
    `UPDATE ${WEBHOOK_EVENTS_TABLE}
     SET status = 'processing',
         processing_state = 'retrying',
         retry_count = COALESCE(retry_count, 0) + 1,
         last_retry_at = datetime('now'),
         updated_at = datetime('now')
     WHERE platform = ? AND event_id = ?`,
    [platform, eventId]
  );
}

export async function markRefundWebhookEventRetryCompleted(platform: string, eventId: string) {
  return markRefundWebhookEventCompleted(platform, eventId);
}

export async function markRefundWebhookEventRetryFailed(
  platform: string,
  eventId: string,
  errorMessage: string,
  failureStage: string = 'retry'
) {
  return markRefundWebhookEventFailed(platform, eventId, errorMessage, failureStage);
}


export async function registerPaymentWebhookEvent(
  platform: string,
  webhook: NormalizedRefundWebhook,
  payload: unknown
): Promise<RefundWebhookEventRegistrationResult> {
  return registerRefundWebhookEvent(platform, webhook, payload, 'payment_success');
}

export async function markPaymentWebhookEventCompleted(platform: string, eventId: string) {
  return markRefundWebhookEventCompleted(platform, eventId);
}

export async function markPaymentWebhookEventFailed(platform: string, eventId: string, errorMessage: string) {
  return markRefundWebhookEventFailed(platform, eventId, errorMessage);
}

export function normalizeStripeRefundWebhook(payload: any): NormalizedRefundWebhook {
  const object = payload?.data?.object || payload;
  const rawStatus = asString(object?.status) || asString(payload?.type);
  const eventId = asString(payload?.id) || asString(object?.id);
  const refundId = asString(object?.id) || asString(payload?.refund_id);
  const paymentIntent = asString(object?.payment_intent) || asString(payload?.payment_intent);
  const refundAmount = nestedNumber(object, [['amount']]);
  const metadata = object?.metadata || payload?.metadata || {};

  return {
    isRefundSuccess: payload?.refund_success === true || payload?.refund_success === 'true' || payload?.type === 'charge.refunded' || payload?.type === 'refund.updated' || rawStatus === 'succeeded',
    orderNumber: asString(payload?.order_number) || asString(metadata?.order_number),
    referenceId: paymentIntent,
    transactionId: refundId || paymentIntent,
    eventId,
    refundAmount: refundAmount === null ? null : refundAmount / 100,
    rawStatus,
  };
}

export function normalizeStripePaymentWebhook(payload: any): NormalizedRefundWebhook {
  const object = payload?.data?.object || payload;
  const metadata = object?.metadata || payload?.metadata || {};
  const paymentIntent = asString(object?.payment_intent) || asString(payload?.payment_intent);
  return {
    isRefundSuccess: false,
    orderNumber: asString(payload?.order_number) || asString(metadata?.order_number),
    referenceId: paymentIntent || asString(object?.id),
    transactionId: paymentIntent || asString(object?.id),
    eventId: asString(payload?.id) || asString(object?.id),
    refundAmount: null,
    rawStatus: asString(object?.payment_status) || asString(object?.status) || asString(payload?.type),
  };
}

export function normalizePayPalPaymentWebhook(payload: any): NormalizedRefundWebhook {
  const resource = payload?.resource || payload;
  const capture = resource?.purchase_units?.[0]?.payments?.captures?.[0] || resource;
  return {
    isRefundSuccess: false,
    orderNumber: asString(payload?.order_number) || asString(resource?.custom_id) || asString(resource?.invoice_id),
    referenceId: asString(payload?.token) || asString(resource?.id) || asString(payload?.orderId),
    transactionId: asString(capture?.id) || asString(payload?.transaction_id) || asString(resource?.id) || asString(payload?.token),
    eventId: asString(payload?.id) || asString(capture?.id) || asString(resource?.id) || asString(payload?.token),
    refundAmount: null,
    rawStatus: asString(capture?.status) || asString(resource?.status) || asString(payload?.status),
  };
}

export function normalizeAlipayPaymentWebhook(params: Record<string, string>): NormalizedRefundWebhook {
  const rawStatus = asString(params.trade_status) || asString(params.status);
  const tradeNo = asString(params.trade_no) || asString(params.reference_id);
  const orderNumber = asString(params.out_trade_no) || asString(params.order_number);
  return {
    isRefundSuccess: false,
    orderNumber,
    referenceId: tradeNo,
    transactionId: tradeNo,
    eventId: asString(params.notify_id) || tradeNo || orderNumber,
    refundAmount: null,
    rawStatus,
  };
}

export function normalizePayPalRefundWebhook(payload: any): NormalizedRefundWebhook {
  const resource = payload?.resource || payload;
  const rawStatus = asString(resource?.status) || asString(payload?.event_type);
  const eventId = asString(payload?.id) || asString(resource?.id);
  const refundId = asString(resource?.id) || asString(payload?.refund_id);
  const orderNumber = asString(payload?.order_number) || asString(resource?.custom_id) || asString(resource?.invoice_id);
  const referenceId = asString(payload?.reference_id) || asString(resource?.parent_payment) || asString(resource?.supplementary_data?.related_ids?.order_id) || asString(payload?.orderId) || asString(payload?.token);
  const refundAmount = nestedNumber(resource, [['amount', 'value'], ['seller_payable_breakdown', 'gross_amount', 'value']]);

  return {
    isRefundSuccess: payload?.refund_success === true || payload?.refund_success === 'true' || payload?.event_type === 'PAYMENT.CAPTURE.REFUNDED' || rawStatus === 'COMPLETED',
    orderNumber,
    referenceId,
    transactionId: refundId || referenceId,
    eventId,
    refundAmount,
    rawStatus,
  };
}

export function normalizeAlipayRefundWebhook(params: Record<string, string>): NormalizedRefundWebhook {
  const rawStatus = asString(params.trade_status) || asString(params.refund_status);
  const tradeNo = asString(params.trade_no) || asString(params.reference_id);
  const orderNumber = asString(params.out_trade_no) || asString(params.order_number);
  const refundAmount = asNumber(params.refund_fee) ?? asNumber(params.refund_amount);
  const eventId = asString(params.notify_id) || [tradeNo, orderNumber, params.gmt_refund].filter(Boolean).join(':') || null;

  return {
    isRefundSuccess: params.refund_success === 'true' || params.refund_success === '1' || rawStatus === 'TRADE_SUCCESS' || Boolean(refundAmount),
    orderNumber,
    referenceId: tradeNo,
    transactionId: refundAmount !== null ? `${tradeNo || orderNumber}-refund` : tradeNo,
    eventId,
    refundAmount,
    rawStatus,
  };
}

export function validatePayPalWebhookSource(headers: Headers, payload: any): RefundWebhookValidationResult {
  const hasWebhookHeaders = Boolean(headers.get('paypal-transmission-id') && headers.get('paypal-transmission-sig') && headers.get('paypal-cert-url'));
  const isLocalFallback = process.env.NODE_ENV !== 'production' && Boolean(payload?.refund_success);
  return hasWebhookHeaders || isLocalFallback ? { success: true } : { success: false, error: 'INVALID_PAYPAL_WEBHOOK_SOURCE' };
}

export function validateAlipayWebhookSource(params: Record<string, string>): RefundWebhookValidationResult {
  const hasSignatureFields = Boolean(params.sign && params.sign_type && params.notify_id);
  const isLocalFallback = process.env.NODE_ENV !== 'production' && (params.refund_success === 'true' || params.refund_success === '1');
  return hasSignatureFields || isLocalFallback ? { success: true } : { success: false, error: 'INVALID_ALIPAY_WEBHOOK_SOURCE' };
}

export async function validateRefundWebhookAmount(webhook: NormalizedRefundWebhook, platform: string): Promise<RefundWebhookValidationResult> {
  const lookupValue = webhook.orderNumber || webhook.referenceId;
  if (!lookupValue) return { success: false, error: 'MISSING_ORDER_REFERENCE' };

  const orderResult = webhook.orderNumber
    ? await query('SELECT id, order_number, final_amount, payment_method FROM orders WHERE order_number = ?', [webhook.orderNumber])
    : await query('SELECT id, order_number, final_amount, payment_method FROM orders WHERE reference_id = ?', [webhook.referenceId]);

  if (orderResult.rows.length === 0) return { success: false, error: 'ORDER_NOT_FOUND' };

  const order = orderResult.rows[0];
  if (order.payment_method && String(order.payment_method).toLowerCase() !== platform) {
    return { success: false, error: 'PAYMENT_METHOD_MISMATCH', orderId: Number(order.id), orderNumber: String(order.order_number) };
  }

  const orderAmount = Number(order.final_amount || 0);
  if (webhook.refundAmount !== null && Math.abs(webhook.refundAmount - orderAmount) > 0.01) {
    return { success: false, error: 'REFUND_AMOUNT_MISMATCH', orderId: Number(order.id), orderNumber: String(order.order_number), orderAmount };
  }

  return { success: true, orderId: Number(order.id), orderNumber: String(order.order_number), orderAmount };
}
