import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('INVENTORY', 'GET', '/api/admin/inventory-status');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const result = await query('SELECT * FROM inventory_status ORDER BY threshold_min DESC');

    logApiSuccess('INVENTORY', 'GET_INVENTORY_STATUS', { count: result.rows.length });
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    logApiError('INVENTORY', 'GET_INVENTORY_STATUS', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory status' },
      { status: 500 }
    );
  }
}
