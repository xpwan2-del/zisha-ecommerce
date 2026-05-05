import { query } from '@/lib/db';

interface ReleaseOrderResourcesParams {
  orderId: number | string;
  userId: number;
  transactionTypeCode: string;
  inventoryReason: string;
  referenceType: string;
  operatorId: number | null;
  operatorName: string;
}

interface ReleaseOrderResourcesResult {
  itemsReleased: number;
  couponsReleased: number;
}

export async function releaseOrderResources({
  orderId,
  userId,
  transactionTypeCode,
  inventoryReason,
  referenceType,
  operatorId,
  operatorName,
}: ReleaseOrderResourcesParams): Promise<ReleaseOrderResourcesResult> {
  const itemsResult = await query(
    `SELECT oi.product_id, oi.quantity, p.name
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [orderId]
  );

  const cancelTypeResult = await query(
    'SELECT id FROM transaction_type WHERE code = ?',
    [transactionTypeCode]
  );
  const cancelTypeId = cancelTypeResult.rows[0]?.id || null;

  for (const item of itemsResult.rows) {
    const beforeResult = await query(
      'SELECT quantity FROM inventory WHERE product_id = ?',
      [item.product_id]
    );
    const beforeStock = beforeResult.rows[0]?.quantity || 0;

    await query(
      'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
      [item.quantity, item.product_id]
    );

    if (cancelTypeId) {
      await query(
        `INSERT INTO inventory_transactions (
          product_id, product_name, transaction_type_id, quantity_change,
          quantity_before, quantity_after, reason, reference_type, reference_id,
          operator_id, operator_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          item.product_id,
          item.name || 'Product',
          cancelTypeId,
          item.quantity,
          beforeStock,
          beforeStock + item.quantity,
          inventoryReason,
          referenceType,
          orderId,
          operatorId,
          operatorName,
        ]
      );
    }
  }

  const orderCouponsResult = await query(
    `SELECT oc.id as order_coupon_id, oc.coupon_id as user_coupon_id
     FROM order_coupons oc
     JOIN user_coupons uc ON oc.coupon_id = uc.id
       AND oc.user_id = uc.user_id AND uc.status = 'used'
     WHERE oc.order_id = ? AND oc.status = 'applied'`,
    [orderId]
  );

  for (const row of orderCouponsResult.rows) {
    await query(
      `UPDATE user_coupons SET status = 'active', used_order_id = NULL
       WHERE id = ? AND user_id = ?`,
      [row.user_coupon_id, userId]
    );
    await query(
      `UPDATE order_coupons SET status = 'refunded', refunded_at = datetime('now')
       WHERE id = ?`,
      [row.order_coupon_id]
    );
  }

  return {
    itemsReleased: itemsResult.rows.length,
    couponsReleased: orderCouponsResult.rows.length,
  };
}
