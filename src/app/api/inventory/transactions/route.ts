import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const product_id = searchParams.get('product_id');
    const transaction_type = searchParams.get('transaction_type');
    const reference_type = searchParams.get('reference_type');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const whereConditions: string[] = [];
    const params: any[] = [];

    if (product_id) {
      whereConditions.push('it.product_id = ?');
      params.push(product_id);
    }

    if (transaction_type) {
      whereConditions.push('it.transaction_type = ?');
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
        it.transaction_type,
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
      ${whereClause}
      ORDER BY it.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const transactionsResult = await query(transactionsQuery, [...params, limit, offset]);
    const transactions = transactionsResult.rows || [];

    const statsQuery = `
      SELECT
        transaction_type,
        COUNT(*) as count,
        SUM(quantity_change) as total_change
      FROM inventory_transactions
      ${whereClause ? whereClause + ' AND' : 'WHERE'} quantity_change > 0
      GROUP BY transaction_type
    `;
    const statsResult = await query(statsQuery, params);
    const inStats = statsResult.rows || [];

    const outStatsQuery = `
      SELECT
        transaction_type,
        COUNT(*) as count,
        SUM(ABS(quantity_change)) as total_change
      FROM inventory_transactions
      ${whereClause ? whereClause + ' AND' : 'WHERE'} quantity_change < 0
      GROUP BY transaction_type
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
          transaction_type: t.transaction_type,
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
            type: s.transaction_type,
            count: parseInt(s.count),
            total_change: parseInt(s.total_change)
          })),
          out_stats: outStats.map((s: any) => ({
            type: s.transaction_type,
            count: parseInt(s.count),
            total_change: parseInt(s.total_change)
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory transactions' },
      { status: 500 }
    );
  }
}
