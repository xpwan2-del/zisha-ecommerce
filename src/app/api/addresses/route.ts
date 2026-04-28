import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 地址管理
 * ============================================================
 *
 * @api {GET} /api/addresses 获取用户地址列表
 * @apiName GetAddresses
 * @apiGroup CART
 * @apiDescription 获取当前用户的收货地址列表
 *
 * @api {POST} /api/addresses 创建新地址
 * @apiName CreateAddress
 * @apiGroup CART
 * @apiDescription 创建新的收货地址
 *
 * @api {PUT} /api/addresses 更新地址
 * @apiName UpdateAddress
 * @apiGroup CART
 * @apiDescription 更新现有收货地址
 *
 * @api {DELETE} /api/addresses 删除地址
 * @apiName DeleteAddress
 * @apiGroup CART
 * @apiDescription 删除指定的收货地址
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 * @apiHeader {String} Authorization Bearer Token 用户认证凭证
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": [{ "id": 1, "contact_name": "张三", ... }]
 *     }
 *
 * @apiError {String} UNAUTHORIZED 未登录或Token无效
 * @apiError {String} MISSING_PARAMS 缺少必需参数
 * @apiError {String} NOT_FOUND 地址不存在
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

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

function formatAddress(address: any) {
  const parts = [];
  if (address.country_name) parts.push(address.country_name);
  if (address.state_name) parts.push(address.state_name);
  if (address.city) parts.push(address.city);
  return parts.join(', ');
}

export async function GET(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('CART', 'REQUEST', {
    method: 'GET',
    path: '/api/addresses'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('CART', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }
    const currentUser = authResult.user;

    const addressesResult = await query(
      `SELECT * FROM addresses
       WHERE user_id = ?
       ORDER BY is_default DESC, created_at DESC`,
      [currentUser.userId]
    );

    const addresses = (addressesResult.rows || []).map((addr: any) => ({
      id: addr.id,
      user_id: addr.user_id,
      contact_name: addr.contact_name,
      phone: addr.phone,
      country_code: addr.country_code,
      country_name: addr.country_name,
      state_code: addr.state_code,
      state_name: addr.state_name,
      city: addr.city,
      street_address: addr.street_address,
      street_address_2: addr.street_address_2 || '',
      postal_code: addr.postal_code || '',
      label: addr.label || '',
      is_default: !!addr.is_default,
      formatted_address: formatAddress(addr),
      created_at: addr.created_at,
      updated_at: addr.updated_at
    }));

    logMonitor('CART', 'SUCCESS', {
      action: 'GET_ADDRESSES',
      userId: currentUser.userId,
      count: addresses.length
    });

    return NextResponse.json({
      success: true,
      data: addresses
    });

  } catch (error) {
    console.error('Error getting addresses:', error);
    logMonitor('CART', 'ERROR', {
      action: 'GET_ADDRESSES',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to get addresses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('CART', 'REQUEST', {
    method: 'POST',
    path: '/api/addresses'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('CART', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }
    const currentUser = authResult.user;

    const body = await request.json();
    const {
      contact_name,
      phone,
      country_code,
      country_name,
      state_code,
      state_name,
      city,
      street_address,
      street_address_2,
      postal_code,
      label,
      is_default = false
    } = body;

    if (!contact_name || !phone || !country_name || !city || !street_address) {
      logMonitor('CART', 'VALIDATION_FAILED', {
        reason: 'Missing required fields',
        required: ['contact_name', 'phone', 'country_name', 'city', 'street_address']
      });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const user_id = currentUser.userId;

    const existingAddresses = await query(
      'SELECT COUNT(*) as count FROM addresses WHERE user_id = ?',
      [user_id]
    );
    const hasExistingAddresses = (existingAddresses.rows?.[0]?.count || 0) > 0;

    let shouldBeDefault = is_default;
    if (!hasExistingAddresses) {
      shouldBeDefault = true;
    }

    if (shouldBeDefault) {
      await query(
        'UPDATE addresses SET is_default = false WHERE user_id = ?',
        [user_id]
      );
    }

    const insertResult = await query(
      `INSERT INTO addresses (
        user_id, contact_name, phone, country_code, country_name,
        state_code, state_name, city, street_address, street_address_2,
        postal_code, label, is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        user_id,
        contact_name,
        phone,
        country_code || null,
        country_name,
        state_code || null,
        state_name || null,
        city,
        street_address,
        street_address_2 || '',
        postal_code || '',
        label || '',
        shouldBeDefault ? 1 : 0
      ]
    );

    const addressId = insertResult.lastInsertRowid as number | null;

    await logUserAction(
      user_id,
      'address_create',
      'addresses',
      addressId,
      'all',
      null,
      { contact_name, phone, country_name, city, street_address, is_default: shouldBeDefault },
      request
    );

    return NextResponse.json({
      success: true,
      data: {
        id: addressId,
        user_id,
        contact_name,
        phone,
        country_code,
        country_name,
        state_code,
        state_name,
        city,
        street_address,
        street_address_2: street_address_2 || '',
        postal_code: postal_code || '',
        label: label || '',
        is_default: shouldBeDefault,
        formatted_address: formatAddress({ country_name, state_name, city, street_address }),
        created_at: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating address:', error);
    logMonitor('CART', 'ERROR', {
      action: 'CREATE_ADDRESS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to create address' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('CART', 'REQUEST', {
    method: 'PUT',
    path: '/api/addresses'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('CART', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }
    const currentUser = authResult.user;

    const body = await request.json();
    const {
      id,
      contact_name,
      phone,
      country_code,
      country_name,
      state_code,
      state_name,
      city,
      street_address,
      street_address_2,
      postal_code,
      label,
      is_default
    } = body;

    if (!id) {
      logMonitor('CART', 'VALIDATION_FAILED', {
        reason: 'Missing required field: id'
      });
      return NextResponse.json(
        { success: false, error: 'Address ID is required' },
        { status: 400 }
      );
    }

    const user_id = currentUser.userId;

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

    if (is_default && !oldAddress.is_default) {
      await query(
        'UPDATE addresses SET is_default = false WHERE user_id = ?',
        [user_id]
      );
    }

    const newIsDefault = is_default !== undefined ? is_default : oldAddress.is_default;

    await query(
      `UPDATE addresses SET
        contact_name = ?, phone = ?, country_code = ?, country_name = ?,
        state_code = ?, state_name = ?, city = ?, street_address = ?,
        street_address_2 = ?, postal_code = ?, label = ?, is_default = ?,
        updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [
        contact_name || oldAddress.contact_name,
        phone || oldAddress.phone,
        country_code !== undefined ? country_code : oldAddress.country_code,
        country_name || oldAddress.country_name,
        state_code !== undefined ? state_code : oldAddress.state_code,
        state_name !== undefined ? state_name : oldAddress.state_name,
        city || oldAddress.city,
        street_address || oldAddress.street_address,
        street_address_2 !== undefined ? street_address_2 : oldAddress.street_address_2,
        postal_code !== undefined ? postal_code : oldAddress.postal_code,
        label !== undefined ? label : oldAddress.label,
        newIsDefault ? 1 : 0,
        id,
        user_id
      ]
    );

    const changes: any = {};
    const oldValues: any = {};
    const newValues: any = {};

    if (contact_name && contact_name !== oldAddress.contact_name) {
      changes.contact_name = true;
      oldValues.contact_name = oldAddress.contact_name;
      newValues.contact_name = contact_name;
    }
    if (phone && phone !== oldAddress.phone) {
      changes.phone = true;
      oldValues.phone = oldAddress.phone;
      newValues.phone = phone;
    }
    if (country_name && country_name !== oldAddress.country_name) {
      changes.country_name = true;
      oldValues.country_name = oldAddress.country_name;
      newValues.country_name = country_name;
    }
    if (city && city !== oldAddress.city) {
      changes.city = true;
      oldValues.city = oldAddress.city;
      newValues.city = city;
    }
    if (street_address && street_address !== oldAddress.street_address) {
      changes.street_address = true;
      oldValues.street_address = oldAddress.street_address;
      newValues.street_address = street_address;
    }
    if (is_default !== undefined && is_default !== oldAddress.is_default) {
      changes.is_default = true;
      oldValues.is_default = oldAddress.is_default;
      newValues.is_default = is_default;
    }

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
    logMonitor('CART', 'ERROR', {
      action: 'UPDATE_ADDRESS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to update address' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('CART', 'REQUEST', {
    method: 'DELETE',
    path: '/api/addresses'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('CART', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }
    const currentUser = authResult.user;

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      logMonitor('CART', 'VALIDATION_FAILED', {
        reason: 'Missing required field: id'
      });
      return NextResponse.json(
        { success: false, error: 'Address ID is required' },
        { status: 400 }
      );
    }

    const user_id = currentUser.userId;

    const addressResult = await query(
      'SELECT * FROM addresses WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (!addressResult.rows || addressResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Address not found' },
        { status: 404 }
      );
    }

    const address = addressResult.rows[0];
    const wasDefault = address.is_default;

    await query(
      'DELETE FROM addresses WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (wasDefault) {
      const remainingAddresses = await query(
        'SELECT id FROM addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [user_id]
      );
      if (remainingAddresses.rows && remainingAddresses.rows.length > 0) {
        await query(
          'UPDATE addresses SET is_default = true WHERE id = ?',
          [remainingAddresses.rows[0].id]
        );
      }
    }

    await logUserAction(
      user_id,
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
    logMonitor('CART', 'ERROR', {
      action: 'DELETE_ADDRESS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to delete address' },
      { status: 500 }
    );
  }
}
