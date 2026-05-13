import { query } from '@/lib/db';
import { createInventoryTransaction } from '@/lib/inventory-transactions';

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
  alreadyReleased?: boolean;
}

async function ensureOrderResourceReleasesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS order_resource_releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      reference_type TEXT NOT NULL,
      transaction_type_code TEXT NOT NULL,
      items_released INTEGER NOT NULL DEFAULT 0,
      coupons_released INTEGER NOT NULL DEFAULT 0,
      operator_id INTEGER,
      operator_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(order_id, reference_type, transaction_type_code)
    )
  `);
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
  await ensureOrderResourceReleasesTable();

  const releaseInsertResult = await query(
    `INSERT OR IGNORE INTO order_resource_releases (
      order_id, reference_type, transaction_type_code,
      operator_id, operator_name, created_at
    ) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    [orderId, referenceType, transactionTypeCode, operatorId, operatorName]
  );

  if (releaseInsertResult.changes === 0) {
    return {
      itemsReleased: 0,
      couponsReleased: 0,
      alreadyReleased: true,
    };
  }

  const itemsResult = await query(
    `SELECT oi.product_id, oi.quantity, p.name
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [orderId]
  );

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

    await createInventoryTransaction({
      productId: item.product_id,
      productName: item.name || 'Product',
      transactionTypeCode,
      quantityChange: item.quantity,
      quantityBefore: beforeStock,
      quantityAfter: beforeStock + item.quantity,
      reason: inventoryReason,
      referenceType,
      referenceId: orderId,
      operatorId,
      operatorName,
    });
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

  await query(
    `UPDATE order_resource_releases
     SET items_released = ?, coupons_released = ?
     WHERE order_id = ? AND reference_type = ? AND transaction_type_code = ?`,
    [itemsResult.rows.length, orderCouponsResult.rows.length, orderId, referenceType, transactionTypeCode]
  );

  return {
    itemsReleased: itemsResult.rows.length,
    couponsReleased: orderCouponsResult.rows.length,
  };
}
