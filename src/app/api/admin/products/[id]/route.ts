import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { createInventoryTransaction, InventoryTransactionCode } from '@/lib/inventory-transactions';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

function calcStatusId(qty: number): number {
  if (qty <= 0) return 4;
  if (qty <= 5) return 3;
  if (qty <= 10) return 2;
  return 1;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  logApiRequest('PRODUCTS', 'GET', '/api/admin/products/[id]');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
      return createErrorResponse('INVALID_PARAM', 400);
    }

    const productResult = await query(`
      SELECT 
        p.*,
        c.name as category_name,
        c.name_en as category_name_en,
        c.name_ar as category_name_ar
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [productId]);

    if (productResult.rows.length === 0) {
      return createErrorResponse('PRODUCT_NOT_FOUND', 404);
    }

    const product = productResult.rows[0];

    const inventoryResult = await query(`
      SELECT 
        i.*,
        ins.name as status_name,
        ins.name_en as status_name_en,
        ins.name_ar as status_name_ar,
        ins.color as status_color
      FROM inventory i
      LEFT JOIN inventory_status ins ON i.status_id = ins.id
      WHERE i.product_id = ?
    `, [productId]);

    const promotionsResult = await query(`
      SELECT 
        pp.id as product_promotion_id,
        pp.promotion_id,
        pp.original_price,
        pp.start_time,
        pp.end_time,
        pp.priority,
        pp.can_stack,
        pr.name,
        pr.name_en,
        pr.name_ar,
        pr.discount_percent,
        pr.type as promotion_type,
        pr.icon as promotion_icon,
        pr.color as promotion_color
      FROM product_promotions pp
      JOIN promotions pr ON pp.promotion_id = pr.id
      WHERE pp.product_id = ?
    `, [productId]);

    const activitiesResult = await query(`
      SELECT 
        pa.id as product_activity_id,
        pa.activity_category_id,
        pa.start_time,
        pa.end_time,
        ac.name,
        ac.name_en,
        ac.name_ar,
        ac.icon,
        ac.color
      FROM product_activities pa
      JOIN activity_categories ac ON pa.activity_category_id = ac.id
      WHERE pa.product_id = ?
    `, [productId]);

    logApiSuccess('PRODUCTS', 'GET_ADMIN_PRODUCT_BY_ID', { productId });

    return createSuccessResponse({
      ...product,
      inventory: inventoryResult.rows[0] || null,
      promotions: promotionsResult.rows || [],
      activities: activitiesResult.rows || []
    });

  } catch (error) {
    logApiError('PRODUCTS', 'GET_ADMIN_PRODUCT_BY_ID', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  logApiRequest('PRODUCTS', 'PUT', '/api/admin/products/[id]');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  const operatorName = auth.user.name || 'Admin';

  try {
    const { id } = await params;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
      return createErrorResponse('INVALID_PARAM', 400);
    }

    const checkResult = await query('SELECT id FROM products WHERE id = ?', [productId]);
    if (checkResult.rows.length === 0) {
      return createErrorResponse('PRODUCT_NOT_FOUND', 404);
    }

    const body = await request.json();

    const {
      name,
      name_en,
      name_ar,
      price,
      price_usd,
      price_ae,
      category_id,
      description,
      description_en,
      description_ar,
      image,
      images,
      video,
      is_limited,
      display_mode,
      specifications,
      shipping,
      after_sale,
      quantity,
      promotions,
      activities
    } = body;

    const oldProductResult = await query('SELECT * FROM products WHERE id = ?', [productId]);
    const oldProduct = oldProductResult.rows[0];

    const oldInventoryResult = await query('SELECT quantity FROM inventory WHERE product_id = ?', [productId]);
    const oldQuantity = oldInventoryResult.rows[0]?.quantity || 0;

    await query('BEGIN TRANSACTION');

    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
      if (name_en !== undefined) { updateFields.push('name_en = ?'); updateValues.push(name_en); }
      if (name_ar !== undefined) { updateFields.push('name_ar = ?'); updateValues.push(name_ar); }
      if (price !== undefined) { updateFields.push('price = ?'); updateValues.push(price); }
      if (price_usd !== undefined) { updateFields.push('price_usd = ?'); updateValues.push(price_usd); }
      if (price_ae !== undefined) { updateFields.push('price_ae = ?'); updateValues.push(price_ae); }
      if (category_id !== undefined) {
        const categoryCheck = await query('SELECT id FROM categories WHERE id = ?', [category_id]);
        if (categoryCheck.rows.length === 0) {
          await query('ROLLBACK');
          return createErrorResponse('CATEGORY_NOT_FOUND', 400);
        }
        updateFields.push('category_id = ?'); updateValues.push(category_id);
      }
      if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
      if (description_en !== undefined) { updateFields.push('description_en = ?'); updateValues.push(description_en); }
      if (description_ar !== undefined) { updateFields.push('description_ar = ?'); updateValues.push(description_ar); }
      if (image !== undefined) { updateFields.push('image = ?'); updateValues.push(image); }
      if (images !== undefined) { updateFields.push('images = ?'); updateValues.push(JSON.stringify(images)); }
      if (video !== undefined) { updateFields.push('video = ?'); updateValues.push(video); }
      if (is_limited !== undefined) { updateFields.push('is_limited = ?'); updateValues.push(is_limited); }
      if (display_mode !== undefined) { updateFields.push('display_mode = ?'); updateValues.push(display_mode); }
      if (specifications !== undefined) { updateFields.push('specifications = ?'); updateValues.push(specifications); }
      if (shipping !== undefined) { updateFields.push('shipping = ?'); updateValues.push(shipping); }
      if (after_sale !== undefined) { updateFields.push('after_sale = ?'); updateValues.push(after_sale); }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = datetime("now")');
        updateValues.push(productId);

        await query(`
          UPDATE products 
          SET ${updateFields.join(', ')}
          WHERE id = ?
        `, updateValues);
      }

      if (quantity !== undefined) {
        const newStatusId = calcStatusId(quantity);

        await query(`
          UPDATE inventory 
          SET quantity = ?, status_id = ?, updated_at = datetime('now')
          WHERE product_id = ?
        `, [quantity, newStatusId, productId]);

        const quantityChange = quantity - oldQuantity;

        if (quantityChange !== 0) {
          await createInventoryTransaction({
            productId,
            productName: name || oldProduct.name,
            transactionTypeCode:
              quantityChange > 0
                ? InventoryTransactionCode.ADMIN_ADJUST_INCREASE
                : InventoryTransactionCode.ADMIN_ADJUST_REDUCE,
            quantityChange,
            quantityBefore: oldQuantity,
            quantityAfter: quantity,
            reason: '人工调整库存',
            referenceType: 'admin_product_update',
            referenceId: productId,
            operatorId: null,
            operatorName: operatorName,
          });
        }
      }

      if (promotions !== undefined && Array.isArray(promotions)) {
        await query('DELETE FROM product_promotions WHERE product_id = ?', [productId]);

        for (const promo of promotions) {
          await query(`
            INSERT INTO product_promotions (
              product_id, promotion_id, original_price,
              start_time, end_time, priority, can_stack, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [
            productId,
            promo.promotion_id,
            promo.original_price || price || oldProduct.price,
            promo.start_time || null,
            promo.end_time || null,
            promo.priority || 2,
            promo.can_stack !== undefined ? promo.can_stack : 1
          ]);
        }
      }

      if (activities !== undefined && Array.isArray(activities)) {
        await query('DELETE FROM product_activities WHERE product_id = ?', [productId]);

        for (const activity of activities) {
          await query(`
            INSERT INTO product_activities (
              product_id, activity_category_id, start_time, end_time, created_at
            ) VALUES (?, ?, ?, ?, datetime('now'))
          `, [
            productId,
            activity.activity_category_id,
            activity.start_time || null,
            activity.end_time || null
          ]);
        }
      }

      await query(`
        INSERT INTO product_logs (
          product_id, action, field_name, old_value, new_value, operator_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        productId,
        'update',
        'product',
        JSON.stringify({ name: oldProduct.name, price: oldProduct.price }),
        JSON.stringify({ name, price }),
        operatorName
      ]);

      await query('COMMIT');

      await recordAdminAuditLog({
        request,
        module: 'PRODUCTS',
        action: 'UPDATE_PRODUCT',
        description: `更新商品 ${oldProduct.name}`,
        operator: operatorName,
        resourceId: productId,
        resourceType: 'product',
        riskLevel: quantity !== undefined ? 'high' : 'medium',
        metadata: {
          before: {
            name: oldProduct.name,
            price: oldProduct.price,
            quantity: oldQuantity,
          },
          after: {
            name: name ?? oldProduct.name,
            price: price ?? oldProduct.price,
            quantity: quantity ?? oldQuantity,
          },
        },
      });

      logApiSuccess('PRODUCTS', 'UPDATE_ADMIN_PRODUCT', { productId });

      return createSuccessResponse({
        id: productId,
        message: '商品更新成功'
      });

    } catch (txError) {
      await query('ROLLBACK');
      throw txError;
    }

  } catch (error) {
    logApiError('PRODUCTS', 'UPDATE_ADMIN_PRODUCT', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  logApiRequest('PRODUCTS', 'DELETE', '/api/admin/products/[id]');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  const operatorName = auth.user.name || 'Admin';

  try {
    const { id } = await params;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
      return createErrorResponse('INVALID_PARAM', 400);
    }

    const checkResult = await query('SELECT id, name FROM products WHERE id = ?', [productId]);
    if (checkResult.rows.length === 0) {
      return createErrorResponse('PRODUCT_NOT_FOUND', 404);
    }

    const productName = checkResult.rows[0].name;

    await query('BEGIN TRANSACTION');

    try {
      await query('DELETE FROM product_promotions WHERE product_id = ?', [productId]);
      await query('DELETE FROM product_activities WHERE product_id = ?', [productId]);
      await query('DELETE FROM inventory WHERE product_id = ?', [productId]);
      await query('DELETE FROM inventory_transactions WHERE product_id = ?', [productId]);
      await query('DELETE FROM products WHERE id = ?', [productId]);

      await query(`
        INSERT INTO product_logs (
          product_id, action, field_name, old_value, operator_name, created_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [productId, 'delete', 'product', JSON.stringify({ name: productName }), operatorName]);

      await query('COMMIT');

      await recordAdminAuditLog({
        request,
        module: 'PRODUCTS',
        action: 'DELETE_PRODUCT',
        description: `删除商品 ${productName}`,
        operator: operatorName,
        resourceId: productId,
        resourceType: 'product',
        riskLevel: 'high',
        metadata: { productName },
      });

      logApiSuccess('PRODUCTS', 'DELETE_ADMIN_PRODUCT', { productId });

      return createSuccessResponse({
        id: productId,
        message: '商品删除成功'
      });

    } catch (txError) {
      await query('ROLLBACK');
      throw txError;
    }

  } catch (error) {
    logApiError('PRODUCTS', 'DELETE_ADMIN_PRODUCT', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
