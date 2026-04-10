import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 辅助函数：记录积分变动
async function logPointsChange(
  userId: number,
  changeType: string,
  points: number,
  beforePoints: number,
  afterPoints: number,
  sourceType: string,
  sourceId: number | null,
  description: string,
  operatorName: string,
  ipAddress: string
) {
  await query(
    `INSERT INTO points_logs (
      user_id, change_type, points,
      before_points, after_points,
      source_type, source_id, description,
      operator_name, ip_address, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      userId, changeType, points,
      beforePoints, afterPoints,
      sourceType, sourceId, description,
      operatorName, ipAddress
    ]
  );
}

// GET /api/points - 获取用户积分记录
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const changeType = url.searchParams.get('change_type');
    const isAdmin = url.searchParams.get('is_admin') === 'true';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // 如果不是管理员，必须提供user_id且只能查看自己的记录
    if (!isAdmin && !userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    let whereClause = '';
    const params: any[] = [];

    // 普通用户只能查看自己的记录
    if (!isAdmin && userId) {
      whereClause = 'WHERE pl.user_id = ?';
      params.push(userId);
    }

    // 按变动类型筛选
    if (changeType) {
      whereClause += whereClause ? ' AND' : 'WHERE';
      whereClause += ' pl.change_type = ?';
      params.push(changeType);
    }

    const offset = (page - 1) * limit;

    // 查询积分记录
    const logsQuery = `
      SELECT
        pl.id, pl.user_id,
        pl.change_type, pl.points,
        pl.before_points, pl.after_points,
        pl.source_type, pl.source_id,
        pl.description, pl.operator_name,
        pl.ip_address, pl.created_at,
        u.name as user_name, u.email as user_email
      FROM points_logs pl
      LEFT JOIN users u ON pl.user_id = u.id
      ${whereClause}
      ORDER BY pl.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const logsResult = await query(logsQuery, [...params, limit, offset]);
    const logs = logsResult.rows || [];

    // 查询总数
    const countQuery = `SELECT COUNT(*) as count FROM points_logs pl ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(String(countResult.rows?.[0]?.count || 0));

    // 查询用户当前积分
    let currentPoints = 0;
    if (userId) {
      const userResult = await query(
        'SELECT points FROM users WHERE id = ?',
        [userId]
      );
      currentPoints = parseInt(String(userResult.rows?.[0]?.points || 0));
    }

    // 查询积分统计
    const statsQuery = userId ? `
      SELECT
        SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as total_earned,
        SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END) as total_spent,
        COUNT(*) as total_records
      FROM points_logs
      WHERE user_id = ?
    ` : `
      SELECT
        SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as total_earned,
        SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END) as total_spent,
        COUNT(*) as total_records
      FROM points_logs
    `;
    const statsResult = await query(statsQuery, userId ? [userId] : []);
    const stats = statsResult.rows?.[0] || {};

    return NextResponse.json({
      success: true,
      data: {
        current_points: currentPoints,
        logs,
        stats: {
          total_earned: parseInt(stats.total_earned) || 0,
          total_spent: parseInt(stats.total_spent) || 0,
          total_records: parseInt(stats.total_records) || 0
        },
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting points logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get points logs' },
      { status: 500 }
    );
  }
}

// POST /api/points - 调整用户积分（管理员或系统）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      change_type,
      points,
      source_type = 'manual',
      source_id = null,
      description,
      operator_name = 'system'
    } = body;

    if (!user_id || !change_type || points === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: user_id, change_type, points' },
        { status: 400 }
      );
    }

    // 获取用户当前积分
    const userResult = await query(
      'SELECT points FROM users WHERE id = ?',
      [user_id]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const currentPoints = parseInt(String(userResult.rows[0].points)) || 0;

    // 计算新积分
    let newPoints = currentPoints;
    let actualPoints = points;

    switch (change_type) {
      case 'earn':
        newPoints = currentPoints + points;
        break;
      case 'spend':
        if (currentPoints < points) {
          return NextResponse.json(
            { success: false, error: 'Insufficient points' },
            { status: 400 }
          );
        }
        newPoints = currentPoints - points;
        actualPoints = -points;
        break;
      case 'adjust':
        newPoints = points;
        actualPoints = points - currentPoints;
        break;
      case 'refund':
        newPoints = currentPoints + points;
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid change_type. Use: earn, spend, adjust, refund' },
          { status: 400 }
        );
    }

    // 更新用户积分
    await query(
      'UPDATE users SET points = ?, updated_at = datetime("now") WHERE id = ?',
      [newPoints, user_id]
    );

    // 获取IP地址
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';

    // 记录积分变动日志
    await logPointsChange(
      user_id,
      change_type,
      actualPoints,
      currentPoints,
      newPoints,
      source_type,
      source_id,
      description || `${change_type} ${Math.abs(actualPoints)} points`,
      operator_name,
      ipAddress
    );

    return NextResponse.json({
      success: true,
      data: {
        user_id,
        change_type,
        points: actualPoints,
        before_points: currentPoints,
        after_points: newPoints,
        description
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error adjusting points:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to adjust points' },
      { status: 500 }
    );
  }
}
