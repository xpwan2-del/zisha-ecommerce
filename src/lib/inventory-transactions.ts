import { query } from '@/lib/db';

export const InventoryTransactionCode = {
  ORDER_CREATE: 'sales_creat',
  QUICK_ORDER_INCREMENT: 'sales_increase',
  QUICK_ORDER_DECREMENT: 'sales_reduce',
  SALES_RETURN: 'sales_return',
  SALES_CANCEL: 'sales_cancel',
  SALES_DELETE: 'sales_delete',
  CART_CREATE: 'cat_creat',
  CART_INCREASE: 'cat_increase',
  CART_DECREASE: 'cat_reduce',
  CART_DELETE: 'cat_delete',
  STOCK_GAIN: 'stock_gain',
  STOCK_LOSE: 'stock_lose',
  SELF_RESTOCK: 'self_estock',
  SUPPLIER_RESTOCK: 'sup_restock',
  EXPIRED: 'expired',
  SUPPLIER_RETURN: 'sup_return',
  STOCK_DAMAGE: 'stock_damage',
  ORDER_CANCEL: 'order_cancel',
  REFUND_RETURN: 'refund_return',
  ADMIN_ADJUST_INCREASE: 'admin_adjust_increase',
  ADMIN_ADJUST_REDUCE: 'admin_adjust_reduce',
} as const;

export type InventoryTransactionCodeValue =
  (typeof InventoryTransactionCode)[keyof typeof InventoryTransactionCode];

export interface InventoryOperator {
  operatorId: number | string | Uint8Array | null;
  operatorName: string;
}

export interface CreateInventoryTransactionInput {
  productId: number | string;
  productName: string;
  transactionTypeCode: InventoryTransactionCodeValue | string;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  referenceType?: string | null;
  referenceId?: number | string | Uint8Array | null;
  operatorId?: number | string | Uint8Array | null;
  operatorName?: string | null;
}

export class InventoryTransactionTypeMissingError extends Error {
  code = 'TRANSACTION_TYPE_NOT_FOUND';
  transactionTypeCode: string;

  constructor(transactionTypeCode: string) {
    super(
      `transaction_type 没有找到，需要补新的字典：code=${transactionTypeCode}。库存流水无法写入，请先补全 transaction_type 表。`
    );
    this.name = 'InventoryTransactionTypeMissingError';
    this.transactionTypeCode = transactionTypeCode;
  }
}

export function resolveInventoryOperator(
  operatorId: number | string | Uint8Array | null | undefined,
  operatorName?: string | null
): InventoryOperator {
  if (operatorId === null || operatorId === undefined) {
    return {
      operatorId: null,
      operatorName: operatorName?.trim() || 'SYSTEM',
    };
  }

  return {
    operatorId,
    operatorName: operatorName?.trim() || `User-${operatorId}`,
  };
}

export async function getInventoryTransactionTypeId(
  transactionTypeCode: InventoryTransactionCodeValue | string
): Promise<number> {
  const typeResult = await query(
    'SELECT id FROM transaction_type WHERE code = ?',
    [transactionTypeCode]
  );
  const transactionTypeId = typeResult.rows[0]?.id;

  if (!transactionTypeId) {
    throw new InventoryTransactionTypeMissingError(transactionTypeCode);
  }

  return Number(transactionTypeId);
}

export async function createInventoryTransaction({
  productId,
  productName,
  transactionTypeCode,
  quantityChange,
  quantityBefore,
  quantityAfter,
  reason,
  referenceType = null,
  referenceId = null,
  operatorId,
  operatorName,
}: CreateInventoryTransactionInput) {
  const transactionTypeId = await getInventoryTransactionTypeId(transactionTypeCode);
  const operator = resolveInventoryOperator(operatorId, operatorName);

  return query(
    `INSERT INTO inventory_transactions (
      product_id, product_name, transaction_type_id, quantity_change,
      quantity_before, quantity_after, reason, reference_type, reference_id,
      operator_id, operator_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      productId,
      productName,
      transactionTypeId,
      quantityChange,
      quantityBefore,
      quantityAfter,
      reason,
      referenceType,
      referenceId,
      operator.operatorId,
      operator.operatorName,
    ]
  );
}
