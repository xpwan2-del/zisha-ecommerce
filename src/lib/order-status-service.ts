import { query } from './db';
export { OrderStatus, OrderEvent, OperatorType } from './order-status-config';
export type { OrderStatusType, OrderEventType } from './order-status-config';

export class OrderStatusService {
  static async changeStatus(
    orderId: number,
    eventCode: string,
    operatorInfo: {
      type: 'user' | 'system' | 'admin';
      id: number;
      name: string;
    },
    extraData?: Record<string, any>
  ): Promise<{ success: boolean; error?: string; fromStatus?: string; toStatus?: string }> {
    const orderResult = await query(
      'SELECT order_number, order_status FROM orders WHERE id = ?',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return { success: false, error: 'ORDER_NOT_FOUND' };
    }

    const order = orderResult.rows[0];
    const currentStatus = order.order_status;

    const transitionResult = await query(
      `SELECT to_status, is_allowed FROM order_status_transitions
       WHERE from_status = ? AND event_code = ? AND is_allowed = 1`,
      [currentStatus, eventCode]
    );

    if (transitionResult.rows.length === 0) {
      console.error(`[OrderStatus] Invalid transition: ${currentStatus} + ${eventCode}`);
      return { success: false, error: `INVALID_TRANSITION:${currentStatus}:${eventCode}` };
    }

    const targetStatus = transitionResult.rows[0].to_status;

    await query('BEGIN TRANSACTION');

    try {
      await query(
        `INSERT INTO order_status_logs (
          order_id, order_number, old_status, new_status,
          change_reason, changed_by, operator_type, operator_name,
          event_code, extra_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          order.order_number,
          currentStatus,
          targetStatus,
          `Event: ${eventCode}`,
          operatorInfo.id,
          operatorInfo.type,
          operatorInfo.name,
          eventCode,
          extraData ? JSON.stringify(extraData) : null
        ]
      );

      await query(
        `UPDATE orders SET order_status = ?, updated_at = ? WHERE id = ?`,
        [targetStatus, new Date().toISOString(), orderId]
      );

      await query('COMMIT');

      console.log(`[OrderStatus] Changed: order ${orderId} from ${currentStatus} to ${targetStatus} by ${eventCode}`);

      return { success: true, fromStatus: currentStatus, toStatus: targetStatus };
    } catch (error) {
      await query('ROLLBACK');
      console.error('[OrderStatus] Error:', error);
      return { success: false, error: 'STATUS_CHANGE_FAILED' };
    }
  }

  static async getStatusHistory(orderId: number) {
    const result = await query(
      `SELECT * FROM order_status_logs
       WHERE order_id = ?
       ORDER BY created_at ASC`,
      [orderId]
    );
    return result.rows;
  }
}