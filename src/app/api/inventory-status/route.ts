import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query('SELECT * FROM inventory_status ORDER BY threshold_min DESC');

    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching inventory status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory status' },
      { status: 500 }
    );
  }
}
