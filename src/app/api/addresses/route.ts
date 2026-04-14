import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireOwnerOrAdmin } from '@/lib/auth';

// 辅助函数：记录用户操作日志
async function logUserAction(
  userId: number,
  actionType: string,
  targetTable: string,
  targetId: number | null,
  fieldName: string,
  oldValue: any,
  newValue: any,
  request: NextRequest
) {
  const ipAddress = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // 解析设备信息（简单版本）
  let deviceInfo = 'unknown';
  if (userAgent) {
    if (userAgent.includes('Mobile')) {
      if (userAgent.includes('iPhone')) deviceInfo = 'iPhone';
      else if (userAgent.includes('Android')) deviceInfo = 'Android';
      else deviceInfo = 'Mobile';
    } else if (userAgent.includes('Tablet')) {
      deviceInfo = 'Tablet';
    } else {
      deviceInfo = 'Desktop';
    }
  }

  await query(
    `INSERT INTO user_logs (
      user_id, action_type, target_table, target_id,
      field_name, old_value, new_value,
      ip_address, user_agent, device_info, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      userId,
      actionType,
      targetTable,
      targetId,
      fieldName,
      JSON.stringify(oldValue),
      JSON.stringify(newValue),
      ipAddress,
      userAgent,
      deviceInfo
    ]
  );
}

// GET /api/addresses - 获取当前用户的所有地址
export async function GET(request: NextRequest) {
  try {
    // 验证用户登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }
    const currentUser = authResult.user;

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('user_id');

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // 验证权限（只能查看自己的地址，管理员可以查看所有）
    const permissionResult = requireOwnerOrAdmin(request, parseInt(targetUserId));
    if (permissionResult.response) {
      return permissionResult.response;
    }

    const addressesResult = await query(
      `SELECT * FROM addresses
       WHERE user_id = ?
       ORDER BY is_default DESC, created_at DESC`,
      [targetUserId]
    );

    return NextResponse.json({
      success: true,
      data: addressesResult.rows || []
    });

  } catch (error) {
    console.error('Error getting addresses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get addresses' },
      { status: 500 }
    );
  }
}

// POST /api/addresses - 创建新地址
export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }
    const currentUser = authResult.user;

    const body = await request.json();
    const {
      user_id,
      name,
      phone,
      country,
      city,
      address,
      postal_code,
      is_default = false
    } = body;

    if (!user_id || !name || !phone || !country || !city || !address) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 验证权限（只能为自己创建地址，管理员可以为任何人创建）
    if (currentUser.role !== 'admin' && currentUser.userId !== user_id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Can only create address for yourself' },
        { status: 403 }
      );
    }

    // 如果设置为默认地址，先将其他地址设为非默认
    if (is_default) {
      await query(
        'UPDATE addresses SET is_default = false WHERE user_id = ?',
        [user_id]
      );
    }

    // 创建地址
    const result = await query(
      `INSERT INTO addresses (
        user_id, name, phone, country, city, address, postal_code, is_default, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      RETURNING id`,
      [user_id, name, phone, country, city, address, postal_code || '', is_default ? 1 : 0]
    );

    const addressId = result.rows[0]?.id;

    // 记录操作日志
    await logUserAction(
      user_id,
      'address_create',
      'addresses',
      addressId,
      'all',
      null,
      { name, phone, country, city, address, postal_code, is_default },
      request
    );

    return NextResponse.json({
      success: true,
      data: {
        id: addressId,
        user_id,
        name,
        phone,
        country,
        city,
        address,
        postal_code,
        is_default
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create address' },
      { status: 500 }
    );
  }
}

// PUT /api/addresses - 更新地址
export async function PUT(request: NextRequest) {
  try {
    // 验证用户登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }
    const currentUser = authResult.user;

    const body = await request.json();
    const {
      id,
      user_id,
      name,
      phone,
      country,
      city,
      address,
      postal_code,
      is_default
    } = body;

    if (!id || !user_id) {
      return NextResponse.json(
        { success: false, error: 'Address ID and User ID are required' },
        { status: 400 }
      );
    }

    // 验证权限（只能更新自己的地址，管理员可以更新任何地址）
    if (currentUser.role !== 'admin' && currentUser.userId !== user_id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Can only update your own address' },
        { status: 403 }
      );
    }

    // 获取旧地址信息用于日志
    const oldAddressResult = await query(
      'SELECT * FROM addresses WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (!oldAddressResult.rows || oldAddressResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Address not found' },
        { status: 404 }
      );
    }

    const oldAddress = oldAddressResult.rows[0];

    // 如果设置为默认地址，先将其他地址设为非默认
    if (is_default && !oldAddress.is_default) {
      await query(
        'UPDATE addresses SET is_default = false WHERE user_id = ?',
        [user_id]
      );
    }

    // 更新地址
    await query(
      `UPDATE addresses SET
        name = ?, phone = ?, country = ?, city = ?,
        address = ?, postal_code = ?, is_default = ?
       WHERE id = ? AND user_id = ?`,
      [
        name || oldAddress.name,
        phone || oldAddress.phone,
        country || oldAddress.country,
        city || oldAddress.city,
        address || oldAddress.address,
        postal_code !== undefined ? postal_code : oldAddress.postal_code,
        is_default !== undefined ? (is_default ? 1 : 0) : oldAddress.is_default,
        id,
        user_id
      ]
    );

    // 构建变更记录
    const changes: any = {};
    const oldValues: any = {};
    const newValues: any = {};

    if (name && name !== oldAddress.name) {
      changes.name = true;
      oldValues.name = oldAddress.name;
      newValues.name = name;
    }
    if (phone && phone !== oldAddress.phone) {
      changes.phone = true;
      oldValues.phone = oldAddress.phone;
      newValues.phone = phone;
    }
    if (country && country !== oldAddress.country) {
      changes.country = true;
      oldValues.country = oldAddress.country;
      newValues.country = country;
    }
    if (city && city !== oldAddress.city) {
      changes.city = true;
      oldValues.city = oldAddress.city;
      newValues.city = city;
    }
    if (address && address !== oldAddress.address) {
      changes.address = true;
      oldValues.address = oldAddress.address;
      newValues.address = address;
    }
    if (postal_code !== undefined && postal_code !== oldAddress.postal_code) {
      changes.postal_code = true;
      oldValues.postal_code = oldAddress.postal_code;
      newValues.postal_code = postal_code;
    }
    if (is_default !== undefined && is_default !== oldAddress.is_default) {
      changes.is_default = true;
      oldValues.is_default = oldAddress.is_default;
      newValues.is_default = is_default;
    }

    // 记录操作日志
    if (Object.keys(changes).length > 0) {
      await logUserAction(
        user_id,
        'address_update',
        'addresses',
        id,
        Object.keys(changes).join(','),
        oldValues,
        newValues,
        request
      );
    }

    return NextResponse.json({
      success: true,
      data: { id, message: 'Address updated successfully' }
    });

  } catch (error) {
    console.error('Error updating address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update address' },
      { status: 500 }
    );
  }
}

// DELETE /api/addresses - 删除地址
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }
    const currentUser = authResult.user;

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const userId = url.searchParams.get('user_id');

    if (!id || !userId) {
      return NextResponse.json(
        { success: false, error: 'Address ID and User ID are required' },
        { status: 400 }
      );
    }

    // 验证权限（只能删除自己的地址，管理员可以删除任何地址）
    if (currentUser.role !== 'admin' && currentUser.userId !== parseInt(userId)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Can only delete your own address' },
        { status: 403 }
      );
    }

    // 获取地址信息用于日志
    const addressResult = await query(
      'SELECT * FROM addresses WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!addressResult.rows || addressResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Address not found' },
        { status: 404 }
      );
    }

    const address = addressResult.rows[0];

    // 删除地址
    await query(
      'DELETE FROM addresses WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    // 记录操作日志
    await logUserAction(
      parseInt(userId),
      'address_delete',
      'addresses',
      parseInt(id),
      'all',
      address,
      null,
      request
    );

    return NextResponse.json({
      success: true,
      data: { message: 'Address deleted successfully' }
    });

  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete address' },
      { status: 500 }
    );
  }
}
