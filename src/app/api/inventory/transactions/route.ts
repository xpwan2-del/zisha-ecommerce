import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 库存流水查询
 * ============================================================
 *
 * @api {GET} /api/inventory/transactions 查询库存流水
 * @apiName GetInventoryTransactions
 * @apiGroup INVENTORY
 * @apiDescription 查询库存流水记录，支持多种筛选条件
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

export async function GET(request: NextRequest) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'GET',
    path: '/api/inventory/transactions'
  });

  try {
    const { searchParams } = new URL(request.url);
    const product_id = searchParams.get('product_id');
    const transaction_type = searchParams.get('transaction_type');
    const reference_type = searchParams.get('reference_type');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    logMonitor('INVENTORY', 'INFO', {
      action: 'GET_INVENTORY_TRANSACTIONS',
      productId: product_id,
      transactionType: transaction_type,
      referenceType: reference_type,
      startDate: start_date,
      endDate: end_date,
      page,
      limit
    });

    const whereConditions: string[] = [];
    const params: any[] = [];

    if (product_id) {
      whereConditions.push('it.product_id = ?');
      params.push(product_id);
    }

    if (transaction_type) {
      whereConditions.push('it.transaction_type_id = ?');
      params.push(transaction_type);
    }

    if (reference_type) {
      whereConditions.push('it.reference_type = ?');
      params.push(reference_type);
    }

    if (start_date) {
      whereConditions.push('it.created_at >= ?');
      params.push(start_date);
    }

    if (end_date) {
      whereConditions.push('it.created_at <= ?');
      params.push(end_date);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as count FROM inventory_transactions it ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(String(countResult.rows?.[0]?.count || 0));

    const transactionsQuery = `
      SELECT
        it.id,
        it.product_id,
        it.product_name,
        it.transaction_type_id,
        tt.code as transaction_code,
        tt.name_zh as transaction_name_zh,
        tt.name_en as transaction_name_en,
        tt.name_ar as transaction_name_ar,
        it.quantity_change,
        it.quantity_before,
        it.quantity_after,
        it.reason,
        it.reference_type,
        it.reference_id,
        it.operator_id,
        it.operator_name,
        it.created_at,
        p.image as product_image
      FROM inventory_transactions it
      JOIN products p ON it.product_id = p.id
      LEFT JOIN transaction_type tt ON it.transaction_type_id = tt.id
      ${whereClause}
      ORDER BY it.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const transactionsResult = await query(transactionsQuery, [...params, limit, offset]);
    const transactions = transactionsResult.rows || [];

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'GET_INVENTORY_TRANSACTIONS',
      count: transactions.length,
      total,
      pagination: { page, limit, totalPages: Math.ceil(total / limit) }
    });

    const statsQuery = `
      SELECT
        transaction_type_id,
        COUNT(*) as count,
        SUM(quantity_change) as total_change
      FROM inventory_transactions it
      ${whereClause ? whereClause + ' AND' : 'WHERE'} quantity_change > 0
      GROUP BY transaction_type_id
    `;
    const statsResult = await query(statsQuery, params);
    const inStats = statsResult.rows || [];

    const outStatsQuery = `
      SELECT
        transaction_type_id,
        COUNT(*) as count,
        SUM(ABS(quantity_change)) as total_change
      FROM inventory_transactions it
      ${whereClause ? whereClause + ' AND' : 'WHERE'} quantity_change < 0
      GROUP BY transaction_type_id
    `;
    const outStatsResult = await query(outStatsQuery, params);
    const outStats = outStatsResult.rows || [];

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions.map((t: any) => ({
          id: t.id,
          product_id: t.product_id,
          product_name: t.product_name,
          product_image: t.product_image,
          transaction_type_id: t.transaction_type_id,
          transaction_code: t.transaction_code,
          transaction_name_zh: t.transaction_name_zh,
          transaction_name_en: t.transaction_name_en,
          transaction_name_ar: t.transaction_name_ar,
          quantity_change: t.quantity_change,
          quantity_before: t.quantity_before,
          quantity_after: t.quantity_after,
          reason: t.reason,
          reference_type: t.reference_type,
          reference_id: t.reference_id,
          operator_id: t.operator_id,
          operator_name: t.operator_name,
          created_at: t.created_at
        })),
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        },
        stats: {
          in_stats: inStats.map((s: any) => ({
            type: s.transaction_type_id,
            count: parseInt(s.count),
            total_change: parseInt(s.total_change)
          })),
          out_stats: outStats.map((s: any) => ({
            type: s.transaction_type_id,
            count: parseInt(s.count),
            total_change: parseInt(s.total_change)
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    logMonitor('INVENTORY', 'ERROR', {
      action: 'GET_INVENTORY_TRANSACTIONS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory transactions' },
      { status: 500 }
    );
  }
}