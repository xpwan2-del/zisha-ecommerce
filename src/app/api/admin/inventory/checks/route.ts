import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { logMonitor } from '@/lib/utils/logger';
import { checkAdminAuth } from '@/lib/admin-helpers';

const INVENTORY_CHECK_STATUSES = new Set(['pending', 'recorded', 'completed']);

function normalizePage(value: string | null) {
  const page = Number.parseInt(value || '1', 10);
  if (!Number.isFinite(page)) return 1;
  return Math.max(page, 1);
}

function normalizeLimit(value: string | null) {
  const limit = Number.parseInt(value || '20', 10);
  if (!Number.isFinite(limit)) return 20;
  return Math.min(Math.max(limit, 1), 100);
}

function normalizeProductIds(productIds: unknown) {
  if (productIds === undefined || productIds === null) return [];
  if (!Array.isArray(productIds)) return null;
  const ids = productIds.map((id) => Number.parseInt(String(id), 10));
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) return null;
  return Array.from(new Set(ids));
}

function createInventoryCheckNumber() {
  return `CHK${Date.now()}${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export async function GET(request: NextRequest) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'GET',
    path: '/api/inventory/checks'
  });

  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = normalizePage(searchParams.get('page'));
    const limit = normalizeLimit(searchParams.get('limit'));

    if (status && !INVENTORY_CHECK_STATUSES.has(status)) {
      return NextResponse.json({ success: false, error: 'INVALID_INVENTORY_CHECK_STATUS' }, { status: 400 });
    }

    logMonitor('INVENTORY', 'INFO', {
      action: 'GET_INVENTORY_CHECKS',
      status,
      page,
      limit
    });

    const whereConditions: string[] = [];
    const params: any[] = [];

    if (status) {
      whereConditions.push('ic.status = ?');
      params.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as count FROM inventory_checks ic ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(String(countResult.rows?.[0]?.count || 0));

    const checksQuery = `
      SELECT
        ic.id,
        ic.check_number,
        ic.status,
        ic.total_products,
        ic.profit_count,
        ic.loss_count,
        ic.profit_quantity,
        ic.loss_quantity,
        ic.operator_id,
        ic.operator_name,
        ic.completed_at,
        ic.created_at,
        ic.updated_at
      FROM inventory_checks ic
      ${whereClause}
      ORDER BY ic.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const checksResult = await query(checksQuery, [...params, limit, offset]);
    const checks = checksResult.rows || [];

    const statsQuery = `
      SELECT
        status,
        COUNT(*) as count
      FROM inventory_checks
      GROUP BY status
    `;
    const statsResult = await query(statsQuery);
    const stats = statsResult.rows || [];

    return NextResponse.json({
      success: true,
      data: {
        checks: checks.map((c: any) => ({
          id: c.id,
          check_number: c.check_number,
          status: c.status,
          total_products: c.total_products,
          profit_count: c.profit_count,
          loss_count: c.loss_count,
          profit_quantity: c.profit_quantity,
          loss_quantity: c.loss_quantity,
          operator_id: c.operator_id,
          operator_name: c.operator_name,
          completed_at: c.completed_at,
          created_at: c.created_at,
          updated_at: c.updated_at
        })),
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        },
        stats: stats.map((s: any) => ({
          status: s.status,
          count: parseInt(s.count)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching inventory checks:', error);
    logMonitor('INVENTORY', 'ERROR', {
      action: 'GET_INVENTORY_CHECKS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory checks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'POST',
    path: '/api/inventory/checks'
  });

  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const productIds = normalizeProductIds(body.product_ids);
    const operator_name = auth.user.name || 'Admin';
    const operator_id = auth.user.userId;

    if (productIds === null) {
      return NextResponse.json({ success: false, error: 'INVALID_PRODUCT_IDS' }, { status: 400 });
    }

    logMonitor('INVENTORY', 'INFO', {
      action: 'CREATE_INVENTORY_CHECK',
      productIdsCount: productIds.length,
      operatorName: operator_name
    });

    const checkNumber = createInventoryCheckNumber();

    let productsQuery = 'SELECT id, name FROM products';
    let params: any[] = [];

    if (productIds.length > 0) {
      const placeholders = productIds.map(() => '?').join(',');
      productsQuery += ` WHERE id IN (${placeholders})`;
      params = productIds;
    }

    const productsResult = await query(productsQuery, params);
    const products = productsResult.rows || [];

    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No products found for inventory check'
      }, { status: 404 });
    }

    await query('BEGIN TRANSACTION');

    const insertResult = await query(
      `INSERT INTO inventory_checks (
        check_number, status, total_products,
        operator_id, operator_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [checkNumber, 'pending', products.length, operator_id, operator_name]
    );

    const checkId = insertResult.lastInsertRowid;

    for (const product of products) {
      const inventoryResult = await query(
        'SELECT quantity FROM inventory WHERE product_id = ?',
        [product.id]
      );
      const systemQuantity = inventoryResult.rows?.[0]?.quantity || 0;

      await query(
        `INSERT INTO inventory_check_items (
          check_id, product_id, product_name, system_quantity, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`,
        [checkId, product.id, product.name, systemQuantity]
      );
    }

    await query('COMMIT');

    await recordAdminAuditLog({
      request,
      module: 'INVENTORY',
      action: 'CREATE_INVENTORY_CHECK',
      description: `管理员创建库存盘点单: ${checkNumber}`,
      operator: operator_name,
      status: 'success',
      resourceId: Number(checkId || 0),
      resourceType: 'inventory_check',
      riskLevel: 'high',
      metadata: { checkNumber, totalProducts: products.length, productIds }
    });

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'CREATE_INVENTORY_CHECK',
      checkId,
      checkNumber,
      totalProducts: products.length
    });

    return NextResponse.json({
      success: true,
      data: {
        id: checkId,
        check_number: checkNumber,
        status: 'pending',
        total_products: products.length,
        operator_name: operator_name,
        created_at: new Date().toISOString()
      },
      message: `盘点单 ${checkNumber} 创建成功，待录入实际库存`
    }, { status: 201 });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error creating inventory check:', error);
    logMonitor('INVENTORY', 'ERROR', {
      action: 'CREATE_INVENTORY_CHECK',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to create inventory check' },
      { status: 500 }
    );
  }
}
