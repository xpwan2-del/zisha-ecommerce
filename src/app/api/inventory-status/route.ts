import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

export async function GET() {
  try {
    logMonitor('INVENTORY', 'REQUEST', { method: 'GET', action: 'GET_INVENTORY_STATUS' });

    const result = await query('SELECT * FROM inventory_status ORDER BY threshold_min DESC');

    logMonitor('INVENTORY', 'SUCCESS', { action: 'GET_INVENTORY_STATUS', count: result.rows.length });
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    logMonitor('INVENTORY', 'ERROR', { action: 'GET_INVENTORY_STATUS', error: error?.message || String(error) });
    console.error('Error fetching inventory status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory status' },
      { status: 500 }
    );
  }
}
