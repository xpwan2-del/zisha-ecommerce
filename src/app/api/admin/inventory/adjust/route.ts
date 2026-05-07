import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { createInventoryTransaction, InventoryTransactionCode } from '@/lib/inventory-transactions';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function POST(request: NextRequest) {
  logApiRequest('INVENTORY', 'POST', '/api/admin/inventory/adjust');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { product_id, change_type, quantity, reason, operator_name } = body;
    const operatorId = auth.user.userId;
    const opName = operator_name || auth.user.name || 'Admin';

    if (!product_id || !quantity) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const product = await query('SELECT * FROM products WHERE id = ?', [product_id]);
    if (product.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const inv = await query('SELECT * FROM inventory WHERE product_id = ?', [product_id]);
    const currentStock = inv.rows[0]?.quantity || 0;
    let newStock: number;

    switch (change_type) {
      case 'increase': newStock = currentStock + quantity; break;
      case 'decrease': newStock = Math.max(0, currentStock - quantity); break;
      case 'set': newStock = quantity; break;
      default: return createErrorResponse('INVALID_CHANGE_TYPE', 400);
    }

    if (inv.rows.length > 0) {
      await query(
        `UPDATE inventory SET quantity = ?, updated_at = datetime('now') WHERE product_id = ?`,
        [newStock, product_id]
      );
    } else {
      const statusId = newStock <= 0 ? 4 : newStock <= 5 ? 3 : newStock <= 10 ? 2 : 1;
      await query(
        `INSERT INTO inventory (product_id, product_name, quantity, status_id, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [product_id, product.rows[0].name, newStock, statusId]
      );
    }

    const quantityChange = newStock - currentStock;

    await createInventoryTransaction({
      productId: product_id,
      productName: product.rows[0].name,
      transactionTypeCode:
        quantityChange >= 0
          ? InventoryTransactionCode.ADMIN_ADJUST_INCREASE
          : InventoryTransactionCode.ADMIN_ADJUST_REDUCE,
      quantityChange,
      quantityBefore: currentStock,
      quantityAfter: newStock,
      reason: reason || '管理员手动调整',
      referenceType: 'admin_adjust',
      referenceId: null,
      operatorId,
      operatorName: opName,
    });

    if (currentStock <= 0 && newStock > 0) {
      await query(
        `UPDATE inventory_alerts SET is_resolved = 1, resolved_at = datetime('now'), resolution_note = '管理员补货' WHERE product_id = ? AND is_resolved = 0`,
        [product_id]
      );
    }

    logApiSuccess('INVENTORY', 'ADJUST_STOCK', { product_id, stockBefore: currentStock, stockAfter: newStock });
    return createSuccessResponse({
      product_id,
      stock_before: currentStock,
      stock_after: newStock
    });
  } catch (error) {
    logApiError('INVENTORY', 'ADJUST_STOCK', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
