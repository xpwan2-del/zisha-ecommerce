import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/user-logs - 查询用户操作日志（用户查看自己的，管理员查看所有）
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const url = new URL(request.url);
    const actionType = url.searchParams.get('action_type');
    const isAdmin = url.searchParams.get('is_admin') === 'true';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const userId = authResult.user.userId;

    let whereClause = '';
    const params: any[] = [];

    // 普通用户只能查看自己的日志
    if (!isAdmin) {
      whereClause = 'WHERE ul.user_id = ?';
      params.push(userId);
    }

    // 按操作类型筛选
    if (actionType) {
      whereClause += whereClause ? ' AND' : 'WHERE';
      whereClause += ' ul.action_type = ?';
      params.push(actionType);
    }

    const offset = (page - 1) * limit;

    // 查询日志列表
    const logsQuery = `
      SELECT
        ul.id, ul.user_id,
        ul.action_type, ul.target_table, ul.target_id,
        ul.field_name, ul.old_value, ul.new_value,
        ul.ip_address, ul.user_agent, ul.device_info,
        ul.created_at,
        u.name as user_name, u.email as user_email
      FROM user_logs ul
      LEFT JOIN users u ON ul.user_id = u.id
      ${whereClause}
      ORDER BY ul.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const logsResult = await query(logsQuery, [...params, limit, offset]);
    const logs = logsResult.rows || [];

    // 查询总数
    const countQuery = `SELECT COUNT(*) as count FROM user_logs ul ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(String(countResult.rows?.[0]?.count || 0));

    // 解析JSON字段
    const formattedLogs = logs.map((log: any) => ({
      ...log,
      old_value: log.old_value ? JSON.parse(log.old_value) : null,
      new_value: log.new_value ? JSON.parse(log.new_value) : null
    }));

    return NextResponse.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting user logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user logs' },
      { status: 500 }
    );
  }
}
