# 紫砂电商 Admin 后台完整实施代码计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 完整重建 admin 后台管理系统，覆盖 18 个管理模块，创建 35+ 个 API 路由、7 个新页面、4 个重写页面

**架构：** 基于 Next.js App Router，所有 admin API 统一放在 `/api/admin/*` 下，使用 `requireAdmin` 做权限验证，遵循 [API-DEV-GUIDE.md](file:///Users/davis/zisha-ecommerce/.trae/rules/API-DEV-GUIDE.md) 规范

**技术栈：** Next.js 14 App Router, sql.js (SQLite), jsonwebtoken, CSS Variables

**铁律：** 
- ❌ 绝不修改任何数据库表结构
- ❌ 绝不修改任何前端代码（`src/app/(shop)/`, `src/app/cart/`, `src/app/orders/` 等）
- ✅ 只修改 `src/app/admin/` 和 `src/app/api/admin/` 下的代码
- ✅ 严格遵循现有 CSS 变量系统（`--primary`, `--accent`, `--text`, `--text-muted`, `--border`, `--card`, `--background`）

---

## 阶段一：基础设施

### 任务 1.1：Admin 中间件路由保护

**文件：** 修改 `src/middleware.ts`

当前 middleware 只做日志记录，需要添加 `/admin/*` 路由保护。但注意 `/admin/login` 需要公开访问。

- [ ] **步骤 1：添加 admin 路由保护逻辑**

```typescript
// 修改 src/middleware.ts，在现有 middleware 函数中添加：

export function middleware(request: NextRequest) {
  const startTime = performance.now();
  const url = request.url;
  const method = request.method;
  const pathname = request.nextUrl.pathname;

  logMonitor('ROUTER', 'REQUEST', {
    url,
    method,
    pathname,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  });

  // 新增：admin 路由保护（/admin/login 和 /api/admin/ 除外）
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get('access_token')?.value;
    if (!token) {
      logMonitor('ROUTER', 'AUTH_FAILED', { pathname, reason: 'No token, redirecting to login' });
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  const endTime = performance.now();
  const duration = `${(endTime - startTime).toFixed(2)}ms`;

  logMonitor('ROUTER', 'RESPONSE', {
    pathname,
    method,
    status: response.status,
    duration
  });

  return response;
}
```

- [ ] **步骤 2：扩展 matcher 配置**

```typescript
// matcher 需要包含 /admin 路径
export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',  // 新增
  ],
};
```

---

### 任务 1.2：Admin 登录/退出完善

**文件：** 修改 `src/app/admin/login/page.tsx`

需要确保登录成功后存储 JWT token 到 cookie 并跳转 dashboard。

关键修改：
- 登录成功后将 token 存入 `access_token` cookie
- token 设置为 48h 有效期
- 重定向到 `/admin/dashboard`

```typescript
// 在 handleSubmit 成功回调中添加：
if (data.success) {
  document.cookie = `access_token=${data.data.token}; path=/; max-age=${48 * 3600}; SameSite=Lax`;
  router.push('/admin/dashboard');
}
```

---

### 任务 1.3：Admin Layout 添加用户信息

**文件：** 修改 `src/app/admin/layout.tsx`

在 layout 右上角添加当前用户信息和退出按钮。

需要读取 `access_token` cookie，解析 JWT 获取用户名/角色，显示在 header。

```tsx
// 新增 AdminHeader 组件逻辑：
// 1. 从 cookie 读取 access_token
// 2. 用 jwt-decode 解析 payload
// 3. 显示用户名 + 角色 + 退出按钮
// 4. 退出：清除 cookie，跳转 /admin/login
```

---

### 任务 1.4：创建 Admin API 共享辅助函数

**文件：** 新建 `src/lib/admin-helpers.ts`

所有 admin API 共用的辅助函数，避免在每个 route.ts 中重复定义：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

export function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

export function createErrorResponse(error: string, status: number = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    { success: true, data },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

export function checkAdminAuth(request: NextRequest) {
  const result = requireAdmin(request);
  if (result.response) {
    logMonitor('API', 'AUTH_FAILED', { reason: 'Admin required' });
  }
  return result;
}

export function logApiRequest(module: string, method: string, path: string, extra?: Record<string, any>) {
  logMonitor(module, 'REQUEST', { method, path, ...extra });
}

export function logApiSuccess(module: string, action: string, extra?: Record<string, any>) {
  logMonitor(module, 'SUCCESS', { action, ...extra });
}

export function logApiError(module: string, action: string, error: unknown) {
  logMonitor(module, 'ERROR', { action, error: String(error) });
}

export function getPaginationParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return {
    page: Math.max(1, parseInt(searchParams.get('page') || '1')),
    limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20'))),
    search: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || 'created_at',
    sortOrder: (searchParams.get('sortOrder') || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
  };
}
```

---

## 阶段二：P0 核心 — 订单管理 + 优惠券管理

### 任务 2.1：Admin 订单列表 API

**文件：** 新建 `src/app/api/admin/orders/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, getPaginationParams, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('ORDERS', 'GET', '/api/admin/orders');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { page, limit, search, sortBy, sortOrder } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const orderStatus = searchParams.get('orderStatus') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const allowedSortColumns = ['id', 'final_amount', 'created_at', 'order_status'];
    const sort = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (search) {
      whereClauses.push('(o.order_number LIKE ? OR u.email LIKE ? OR u.name LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (orderStatus) {
      whereClauses.push('o.order_status = ?');
      params.push(orderStatus);
    }
    if (paymentStatus) {
      whereClauses.push('o.payment_status = ?');
      params.push(paymentStatus);
    }
    if (startDate) {
      whereClauses.push('o.created_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereClauses.push('o.created_at <= ?');
      params.push(endDate + ' 23:59:59');
    }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countResult = await query(
      `SELECT COUNT(*) as total FROM orders o LEFT JOIN users u ON o.user_id = u.id ${whereSQL}`,
      params
    );
    const total = countResult.rows[0]?.total || 0;

    const offset = (page - 1) * limit;
    const dataResult = await query(
      `SELECT o.id, o.order_number, o.order_status, o.payment_status,
              o.final_amount, o.total_original_price, o.shipping_fee,
              o.total_coupon_discount, o.order_final_discount_amount,
              o.payment_method, o.coupon_ids, o.created_at, o.updated_at,
              u.name as user_name, u.email as user_email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ${whereSQL}
       ORDER BY o.${sort} ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    logApiSuccess('ORDERS', 'GET_ORDERS_LIST', { total, page, limit });
    return createSuccessResponse({
      orders: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logApiError('ORDERS', 'GET_ORDERS_LIST', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

---

### 任务 2.2：Admin 订单详情 API

**文件：** 新建 `src/app/api/admin/orders/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('ORDERS', 'GET', `/api/admin/orders/${params.id}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const orderId = parseInt(params.id);

    const orderResult = await query(
      `SELECT o.*, u.name as user_name, u.email as user_email,
              a.contact_name as address_contact, a.phone as address_phone,
              a.street_address, a.city, a.state_name, a.country_name, a.postal_code
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN addresses a ON o.shipping_address_id = a.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return createErrorResponse('NOT_FOUND', 404);
    }

    const order = orderResult.rows[0];

    const statusLogs = await query(
      `SELECT * FROM order_status_logs WHERE order_id = ? ORDER BY created_at DESC`,
      [orderId]
    );

    const payments = await query(
      `SELECT * FROM order_payments WHERE order_id = ?`,
      [orderId]
    );

    const logistics = await query(
      `SELECT * FROM order_logistics WHERE order_id = ?`,
      [orderId]
    );

    const orderCoupons = await query(
      `SELECT oc.*, c.code as coupon_code, c.name as coupon_name, c.type as coupon_type, c.value as coupon_value
       FROM order_coupons oc
       LEFT JOIN coupons c ON oc.coupon_id = c.id
       WHERE oc.order_id = ?`,
      [orderId]
    );

    logApiSuccess('ORDERS', 'GET_ORDER_DETAIL', { orderId, orderNumber: order.order_number });
    return createSuccessResponse({
      order,
      statusLogs: statusLogs.rows,
      payments: payments.rows,
      logistics: logistics.rows,
      coupons: orderCoupons.rows
    });
  } catch (error) {
    logApiError('ORDERS', 'GET_ORDER_DETAIL', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('ORDERS', 'PUT', `/api/admin/orders/${params.id}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const orderId = parseInt(params.id);
    const body = await request.json();
    const { order_status, payment_status, payment_method, shipping_address_id, notes } = body;
    const operatorId = auth.user.userId;
    const operatorName = auth.user.name || 'Admin';

    const currentOrder = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (currentOrder.rows.length === 0) {
      return createErrorResponse('NOT_FOUND', 404);
    }

    const oldOrder = currentOrder.rows[0];
    const updates: string[] = [];
    const paramsArr: any[] = [];

    if (order_status !== undefined) {
      updates.push('order_status = ?');
      paramsArr.push(order_status);
    }
    if (payment_status !== undefined) {
      updates.push('payment_status = ?');
      paramsArr.push(payment_status);
    }
    if (payment_method !== undefined) {
      updates.push('payment_method = ?');
      paramsArr.push(payment_method);
    }
    if (shipping_address_id !== undefined) {
      updates.push('shipping_address_id = ?');
      paramsArr.push(shipping_address_id);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      paramsArr.push(notes);
    }

    if (updates.length === 0) {
      return createErrorResponse('NO_CHANGES', 400);
    }

    updates.push("updated_at = datetime('now')");
    paramsArr.push(orderId);

    await query(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
      paramsArr
    );

    if (order_status !== undefined && order_status !== oldOrder.order_status) {
      await query(
        `INSERT INTO order_status_logs (order_id, old_status, new_status, change_reason, changed_by, created_at, order_number, operator_type, operator_name)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?, 'admin', ?)`,
        [orderId, oldOrder.order_status, order_status, '管理员手动修改', operatorId, oldOrder.order_number, operatorName]
      );
    }

    logApiSuccess('ORDERS', 'UPDATE_ORDER', { orderId, orderNumber: oldOrder.order_number, changes: updates.join(', ') });
    const updated = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    return createSuccessResponse(updated.rows[0]);
  } catch (error) {
    logApiError('ORDERS', 'UPDATE_ORDER', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

---

### 任务 2.3：Admin 订单发货 API

**文件：** 新建 `src/app/api/admin/orders/[id]/ship/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('ORDERS', 'POST', `/api/admin/orders/${params.id}/ship`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const orderId = parseInt(params.id);
    const body = await request.json();
    const { tracking_number, carrier, estimated_delivery } = body;
    const operatorId = auth.user.userId;
    const operatorName = auth.user.name || 'Admin';

    if (!tracking_number || !carrier) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const order = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (order.rows.length === 0) {
      return createErrorResponse('NOT_FOUND', 404);
    }

    const currentOrder = order.rows[0];

    if (currentOrder.order_status !== 'paid' && currentOrder.payment_status !== 'paid') {
      return createErrorResponse('INVALID_ORDER_STATUS', 400);
    }

    await query(
      `INSERT INTO order_logistics (order_id, tracking_number, carrier, status, estimated_delivery, created_at, updated_at)
       VALUES (?, ?, ?, 'shipped', ?, datetime('now'), datetime('now'))`,
      [orderId, tracking_number, carrier, estimated_delivery || null]
    );

    await query(
      `UPDATE orders SET order_status = 'shipped', updated_at = datetime('now') WHERE id = ?`,
      [orderId]
    );

    await query(
      `INSERT INTO order_status_logs (order_id, old_status, new_status, change_reason, changed_by, created_at, order_number, operator_type, operator_name)
       VALUES (?, ?, 'shipped', ?, ?, datetime('now'), ?, 'admin', ?)`,
      [orderId, currentOrder.order_status, `发货: ${carrier} ${tracking_number}`, operatorId, currentOrder.order_number, operatorName]
    );

    logApiSuccess('ORDERS', 'SHIP_ORDER', { orderId, orderNumber: currentOrder.order_number, tracking_number, carrier });
    return createSuccessResponse({ message: '发货成功', tracking_number, carrier });
  } catch (error) {
    logApiError('ORDERS', 'SHIP_ORDER', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

---

### 任务 2.4：Admin 订单退款处理 API

**文件：** 新建 `src/app/api/admin/orders/[id]/refund/approve/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('ORDERS', 'POST', `/api/admin/orders/${params.id}/refund/approve`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const orderId = parseInt(params.id);
    const operatorId = auth.user.userId;
    const operatorName = auth.user.name || 'Admin';

    const order = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (order.rows.length === 0) {
      return createErrorResponse('NOT_FOUND', 404);
    }

    const currentOrder = order.rows[0];

    if (currentOrder.order_status !== 'refunding') {
      return createErrorResponse('INVALID_ORDER_STATUS', 400);
    }

    await query(
      `UPDATE orders SET order_status = 'refunded', payment_status = 'refunded', updated_at = datetime('now') WHERE id = ?`,
      [orderId]
    );

    await query(
      `INSERT INTO order_status_logs (order_id, old_status, new_status, change_reason, changed_by, created_at, order_number, operator_type, operator_name)
       VALUES (?, 'refunding', 'refunded', '管理员同意退款', ?, datetime('now'), ?, 'admin', ?)`,
      [orderId, operatorId, currentOrder.order_number, operatorName]
    );

    // 退还优惠券
    const orderCoupons = await query('SELECT * FROM order_coupons WHERE order_id = ? AND status = ?', [orderId, 'used']);
    for (const oc of orderCoupons.rows) {
      await query(
        `UPDATE user_coupons SET status = 'active', used_order_id = NULL WHERE id = ?`,
        [oc.coupon_id]
      );
      await query(
        `UPDATE order_coupons SET status = 'refunded', refunded_at = datetime('now') WHERE id = ?`,
        [oc.id]
      );
    }

    logApiSuccess('ORDERS', 'APPROVE_REFUND', { orderId, orderNumber: currentOrder.order_number });
    return createSuccessResponse({ message: '退款已处理' });
  } catch (error) {
    logApiError('ORDERS', 'APPROVE_REFUND', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

**文件：** 新建 `src/app/api/admin/orders/[id]/refund/reject/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('ORDERS', 'POST', `/api/admin/orders/${params.id}/refund/reject`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const orderId = parseInt(params.id);
    const body = await request.json();
    const { reason = '管理员拒绝退款' } = body;
    const operatorId = auth.user.userId;
    const operatorName = auth.user.name || 'Admin';

    const order = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (order.rows.length === 0) {
      return createErrorResponse('NOT_FOUND', 404);
    }

    const currentOrder = order.rows[0];

    if (currentOrder.order_status !== 'refunding') {
      return createErrorResponse('INVALID_ORDER_STATUS', 400);
    }

    await query(
      `UPDATE orders SET order_status = 'paid', updated_at = datetime('now') WHERE id = ?`,
      [orderId]
    );

    await query(
      `INSERT INTO order_status_logs (order_id, old_status, new_status, change_reason, changed_by, created_at, order_number, operator_type, operator_name)
       VALUES (?, 'refunding', 'paid', ?, ?, datetime('now'), ?, 'admin', ?)`,
      [orderId, reason, operatorId, currentOrder.order_number, operatorName]
    );

    logApiSuccess('ORDERS', 'REJECT_REFUND', { orderId, orderNumber: currentOrder.order_number, reason });
    return createSuccessResponse({ message: '已拒绝退款申请' });
  } catch (error) {
    logApiError('ORDERS', 'REJECT_REFUND', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

---

### 任务 2.5：Admin 优惠券管理 API

**文件：** 新建 `src/app/api/admin/coupons/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, getPaginationParams, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('ORDERS', 'GET', `/api/admin/coupons/${params.id}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const couponId = parseInt(params.id);
    const coupon = await query('SELECT * FROM coupons WHERE id = ?', [couponId]);

    if (coupon.rows.length === 0) {
      return createErrorResponse('NOT_FOUND', 404);
    }

    const totalClaimed = await query(
      'SELECT COUNT(*) as count FROM user_coupons WHERE coupon_id = ?',
      [couponId]
    );

    const totalUsed = await query(
      'SELECT COUNT(*) as count FROM user_coupons WHERE coupon_id = ? AND status IN (?, ?)',
      [couponId, 'used', 'expired']
    );

    const orderStats = await query(
      `SELECT COUNT(DISTINCT oc.order_id) as order_count,
              COALESCE(SUM(oc.discount_applied), 0) as total_discount
       FROM order_coupons oc WHERE oc.coupon_id = ?`,
      [couponId]
    );

    logApiSuccess('ORDERS', 'GET_COUPON_DETAIL', { couponId, code: coupon.rows[0].code });
    return createSuccessResponse({
      coupon: coupon.rows[0],
      stats: {
        totalClaimed: totalClaimed.rows[0]?.count || 0,
        totalUsed: totalUsed.rows[0]?.count || 0,
        orderCount: orderStats.rows[0]?.order_count || 0,
        totalDiscount: orderStats.rows[0]?.total_discount || 0
      }
    });
  } catch (error) {
    logApiError('ORDERS', 'GET_COUPON_DETAIL', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('ORDERS', 'PUT', `/api/admin/coupons/${params.id}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const couponId = parseInt(params.id);
    const body = await request.json();
    const { name, type, value, start_date, end_date, usage_limit, is_permanent, permanent_days, is_stackable, is_active, description } = body;

    const existing = await query('SELECT * FROM coupons WHERE id = ?', [couponId]);
    if (existing.rows.length === 0) {
      return createErrorResponse('NOT_FOUND', 404);
    }

    const updates: string[] = [];
    const paramsArr: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); paramsArr.push(name); }
    if (type !== undefined) { updates.push('type = ?'); paramsArr.push(type); }
    if (value !== undefined) { updates.push('value = ?'); paramsArr.push(value); }
    if (start_date !== undefined) { updates.push('start_date = ?'); paramsArr.push(start_date); }
    if (end_date !== undefined) { updates.push('end_date = ?'); paramsArr.push(end_date); }
    if (usage_limit !== undefined) { updates.push('usage_limit = ?'); paramsArr.push(usage_limit); }
    if (is_permanent !== undefined) { updates.push('is_permanent = ?'); paramsArr.push(is_permanent ? 1 : 0); }
    if (permanent_days !== undefined) { updates.push('permanent_days = ?'); paramsArr.push(permanent_days); }
    if (is_stackable !== undefined) { updates.push('is_stackable = ?'); paramsArr.push(is_stackable ? 1 : 0); }
    if (is_active !== undefined) { updates.push('is_active = ?'); paramsArr.push(is_active ? 1 : 0); }
    if (description !== undefined) { updates.push('description = ?'); paramsArr.push(description); }

    if (updates.length === 0) {
      return createErrorResponse('NO_CHANGES', 400);
    }

    paramsArr.push(couponId);
    await query(`UPDATE coupons SET ${updates.join(', ')} WHERE id = ?`, paramsArr);

    const updated = await query('SELECT * FROM coupons WHERE id = ?', [couponId]);
    logApiSuccess('ORDERS', 'UPDATE_COUPON', { couponId, code: updated.rows[0].code });
    return createSuccessResponse(updated.rows[0]);
  } catch (error) {
    logApiError('ORDERS', 'UPDATE_COUPON', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('ORDERS', 'DELETE', `/api/admin/coupons/${params.id}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const couponId = parseInt(params.id);
    const existing = await query('SELECT * FROM coupons WHERE id = ?', [couponId]);
    if (existing.rows.length === 0) {
      return createErrorResponse('NOT_FOUND', 404);
    }

    await query('DELETE FROM order_coupons WHERE coupon_id = ?', [couponId]);
    await query('DELETE FROM user_coupons WHERE coupon_id = ?', [couponId]);
    await query('DELETE FROM coupons WHERE id = ?', [couponId]);

    logApiSuccess('ORDERS', 'DELETE_COUPON', { couponId });
    return createSuccessResponse({ message: '优惠券已删除' });
  } catch (error) {
    logApiError('ORDERS', 'DELETE_COUPON', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

**修改现有文件：** `src/app/api/admin/coupons/route.ts` — 添加 GET 方法获取优惠券列表

在现有的 POST 方法之前添加 GET 方法：

```typescript
export async function GET(request: NextRequest) {
  logApiRequest('ORDERS', 'GET', '/api/admin/coupons');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { page, limit, search, sortBy, sortOrder } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (search) {
      whereClauses.push('(code LIKE ? OR name LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s);
    }
    if (status === 'active') { whereClauses.push('is_active = 1'); }
    if (status === 'inactive') { whereClauses.push('is_active = 0'); }
    if (type) { whereClauses.push('type = ?'); params.push(type); }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countResult = await query(`SELECT COUNT(*) as total FROM coupons ${whereSQL}`, params);
    const total = countResult.rows[0]?.total || 0;

    const offset = (page - 1) * limit;
    const dataResult = await query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM user_coupons WHERE coupon_id = c.id) as claimed_count,
              (SELECT COUNT(*) FROM user_coupons WHERE coupon_id = c.id AND status = 'used') as used_count
       FROM coupons c ${whereSQL}
       ORDER BY ${sortBy === 'name' ? 'c.name' : 'c.created_at'} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    logApiSuccess('ORDERS', 'GET_COUPONS', { total });
    return createSuccessResponse({
      coupons: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logApiError('ORDERS', 'GET_COUPONS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

**新建文件：** `src/app/api/admin/coupons/[id]/toggle/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('ORDERS', 'PUT', `/api/admin/coupons/${params.id}/toggle`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const couponId = parseInt(params.id);
    const existing = await query('SELECT id, is_active, code FROM coupons WHERE id = ?', [couponId]);
    if (existing.rows.length === 0) {
      return createErrorResponse('NOT_FOUND', 404);
    }

    const newActive = existing.rows[0].is_active ? 0 : 1;
    await query('UPDATE coupons SET is_active = ? WHERE id = ?', [newActive, couponId]);

    logApiSuccess('ORDERS', 'TOGGLE_COUPON', { couponId, code: existing.rows[0].code, is_active: !!newActive });
    return createSuccessResponse({ is_active: !!newActive });
  } catch (error) {
    logApiError('ORDERS', 'TOGGLE_COUPON', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

---

## 阶段三：P0 其余 — 评价 + 设置 + 分析 + 物流

### 任务 3.1：Admin 评价管理 API

**文件：** 新建 `src/app/api/admin/reviews/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, getPaginationParams, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('PRODUCTS', 'GET', '/api/admin/reviews');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { page, limit, search } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const rating = parseInt(searchParams.get('rating') || '0');
    const productId = parseInt(searchParams.get('productId') || '0');

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (search) {
      whereClauses.push('(r.comment LIKE ? OR u.name LIKE ? OR p.name LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (status === 'pending') { whereClauses.push("r.status = 'pending'"); }
    if (status === 'approved') { whereClauses.push("r.status = 'approved'"); }
    if (status === 'rejected') { whereClauses.push("r.status = 'rejected'"); }
    if (rating > 0) { whereClauses.push('r.rating = ?'); params.push(rating); }
    if (productId > 0) { whereClauses.push('r.product_id = ?'); params.push(productId); }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countResult = await query(
      `SELECT COUNT(*) as total FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN products p ON r.product_id = p.id ${whereSQL}`,
      params
    );
    const total = countResult.rows[0]?.total || 0;

    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT r.*, u.name as user_name, u.email as user_email,
              p.name as product_name, p.name_en as product_name_en,
              (SELECT COUNT(*) FROM review_replies WHERE review_id = r.id) as reply_count
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN products p ON r.product_id = p.id
       ${whereSQL}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    logApiSuccess('PRODUCTS', 'GET_REVIEWS', { total });
    return createSuccessResponse({
      reviews: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logApiError('PRODUCTS', 'GET_REVIEWS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

**文件：** 新建 `src/app/api/admin/reviews/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('PRODUCTS', 'GET', `/api/admin/reviews/${params.id}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const reviewId = parseInt(params.id);
    const result = await query(
      `SELECT r.*, u.name as user_name, u.email as user_email,
              p.name as product_name, p.id as product_id
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN products p ON r.product_id = p.id
       WHERE r.id = ?`,
      [reviewId]
    );

    if (result.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const replies = await query(
      `SELECT rr.*, u.name as user_name FROM review_replies rr
       LEFT JOIN users u ON rr.user_id = u.id
       WHERE rr.review_id = ? ORDER BY rr.created_at ASC`,
      [reviewId]
    );

    const helpfulStats = await query(
      `SELECT SUM(CASE WHEN is_helpful = 1 THEN 1 ELSE 0 END) as helpful_count,
              SUM(CASE WHEN is_helpful = 0 THEN 1 ELSE 0 END) as not_helpful_count
       FROM review_helpful WHERE review_id = ?`,
      [reviewId]
    );

    logApiSuccess('PRODUCTS', 'GET_REVIEW_DETAIL', { reviewId });
    return createSuccessResponse({
      review: result.rows[0],
      replies: replies.rows,
      helpful: helpfulStats.rows[0] || { helpful_count: 0, not_helpful_count: 0 }
    });
  } catch (error) {
    logApiError('PRODUCTS', 'GET_REVIEW_DETAIL', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('PRODUCTS', 'PUT', `/api/admin/reviews/${params.id}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const reviewId = parseInt(params.id);
    const body = await request.json();
    const { status } = body;

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    const existing = await query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    await query('UPDATE reviews SET status = ? WHERE id = ?', [status, reviewId]);

    logApiSuccess('PRODUCTS', 'UPDATE_REVIEW_STATUS', { reviewId, status });
    return createSuccessResponse({ message: '审核状态已更新', status });
  } catch (error) {
    logApiError('PRODUCTS', 'UPDATE_REVIEW_STATUS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('PRODUCTS', 'DELETE', `/api/admin/reviews/${params.id}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const reviewId = parseInt(params.id);
    const existing = await query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    await query('DELETE FROM review_replies WHERE review_id = ?', [reviewId]);
    await query('DELETE FROM review_helpful WHERE review_id = ?', [reviewId]);
    await query('DELETE FROM reviews WHERE id = ?', [reviewId]);

    logApiSuccess('PRODUCTS', 'DELETE_REVIEW', { reviewId });
    return createSuccessResponse({ message: '评价已删除' });
  } catch (error) {
    logApiError('PRODUCTS', 'DELETE_REVIEW', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

**文件：** 新建 `src/app/api/admin/reviews/[id]/reply/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('PRODUCTS', 'POST', `/api/admin/reviews/${params.id}/reply`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const reviewId = parseInt(params.id);
    const userId = auth.user.userId;
    const body = await request.json();
    const { content, content_en, content_ar } = body;

    if (!content) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const existing = await query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const result = await query(
      `INSERT INTO review_replies (review_id, user_id, content, content_en, content_ar, is_admin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      [reviewId, userId, content, content_en || '', content_ar || '']
    );

    if (existing.rows[0].status === 'pending') {
      await query('UPDATE reviews SET status = ? WHERE id = ?', ['approved', reviewId]);
    }

    logApiSuccess('PRODUCTS', 'ADD_REVIEW_REPLY', { reviewId, replyId: result.lastInsertRowid });
    return createSuccessResponse({ id: result.lastInsertRowid, content }, 201);
  } catch (error) {
    logApiError('PRODUCTS', 'ADD_REVIEW_REPLY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

**文件：** 新建 `src/app/api/admin/reviews/[id]/reply/[replyId]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function PUT(request: NextRequest, { params }: { params: { id: string; replyId: string } }) {
  logApiRequest('PRODUCTS', 'PUT', `/api/admin/reviews/${params.id}/reply/${params.replyId}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const replyId = parseInt(params.replyId);
    const body = await request.json();
    const { content, content_en, content_ar } = body;

    const existing = await query('SELECT * FROM review_replies WHERE id = ?', [replyId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const updates: string[] = [];
    const paramsArr: any[] = [];
    if (content !== undefined) { updates.push('content = ?'); paramsArr.push(content); }
    if (content_en !== undefined) { updates.push('content_en = ?'); paramsArr.push(content_en); }
    if (content_ar !== undefined) { updates.push('content_ar = ?'); paramsArr.push(content_ar); }
    updates.push("updated_at = datetime('now')");

    paramsArr.push(replyId);
    await query(`UPDATE review_replies SET ${updates.join(', ')} WHERE id = ?`, paramsArr);

    logApiSuccess('PRODUCTS', 'UPDATE_REVIEW_REPLY', { replyId });
    return createSuccessResponse({ message: '回复已更新' });
  } catch (error) {
    logApiError('PRODUCTS', 'UPDATE_REVIEW_REPLY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; replyId: string } }) {
  logApiRequest('PRODUCTS', 'DELETE', `/api/admin/reviews/${params.id}/reply/${params.replyId}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const replyId = parseInt(params.replyId);
    await query('DELETE FROM review_replies WHERE id = ?', [replyId]);

    logApiSuccess('PRODUCTS', 'DELETE_REVIEW_REPLY', { replyId });
    return createSuccessResponse({ message: '回复已删除' });
  } catch (error) {
    logApiError('PRODUCTS', 'DELETE_REVIEW_REPLY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

---

### 任务 3.2：Admin Dashboard API

**文件：** 新建 `src/app/api/admin/dashboard/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('API', 'GET', '/api/admin/dashboard');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const queries = await Promise.all([
      query(`SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as amount FROM orders WHERE DATE(created_at) = DATE('now')`),
      query(`SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as amount FROM orders WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`),
      query(`SELECT COUNT(*) as count FROM orders WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')`),
      query(`SELECT COUNT(*) as count FROM users`),
      query(`SELECT COUNT(*) as count FROM products`),
      query(`SELECT COUNT(*) as count FROM inventory WHERE quantity <= 5 AND quantity > 0`),
      query(`SELECT COUNT(*) as count FROM inventory WHERE quantity <= 0`),
      query(`SELECT COUNT(*) as count FROM orders WHERE order_status = 'pending'`),
      query(`SELECT COUNT(*) as count FROM orders WHERE order_status = 'refunding'`),
      query(`SELECT o.id, o.order_number, o.final_amount, o.order_status, o.payment_status, o.created_at, u.name as user_name FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 10`),
    ]);

    const todayOrders = queries[0].rows[0] || { count: 0, amount: 0 };
    const monthOrders = queries[1].rows[0] || { count: 0, amount: 0 };
    const lastMonthCount = queries[2].rows[0]?.count || 0;
    const totalUsers = queries[3].rows[0]?.count || 0;
    const totalProducts = queries[4].rows[0]?.count || 0;
    const lowStock = queries[5].rows[0]?.count || 0;
    const outOfStock = queries[6].rows[0]?.count || 0;
    const pendingOrders = queries[7].rows[0]?.count || 0;
    const pendingRefunds = queries[8].rows[0]?.count || 0;
    const recentOrders = queries[9].rows;

    const monthGrowth = lastMonthCount > 0
      ? ((monthOrders.count - lastMonthCount) / lastMonthCount * 100).toFixed(1)
      : 'N/A';

    logApiSuccess('API', 'GET_DASHBOARD');
    return createSuccessResponse({
      todayOrders: { count: todayOrders.count, amount: Number(todayOrders.amount) || 0 },
      monthOrders: { count: monthOrders.count, amount: Number(monthOrders.amount) || 0 },
      monthGrowth,
      totalUsers,
      totalProducts,
      lowStock,
      outOfStock,
      pendingOrders,
      pendingRefunds,
      recentOrders
    });
  } catch (error) {
    logApiError('API', 'GET_DASHBOARD', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

---

### 任务 3.3：Admin 系统设置 API

**文件：** 新建 `src/app/api/admin/settings/payment/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('PAYMENTS', 'GET', '/api/admin/settings/payment');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const result = await query('SELECT * FROM payment_config ORDER BY sort_order');
    const configs = result.rows.map((r: any) => ({
      ...r,
      config_json: r.config_json ? JSON.parse(String(r.config_json)) : {}
    }));

    logApiSuccess('PAYMENTS', 'GET_PAYMENT_CONFIG');
    return createSuccessResponse(configs);
  } catch (error) {
    logApiError('PAYMENTS', 'GET_PAYMENT_CONFIG', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: NextRequest) {
  logApiRequest('PAYMENTS', 'PUT', '/api/admin/settings/payment');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { payment_method, is_enabled, is_sandbox, config_json, display_name, sort_order } = body;

    if (!payment_method) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const existing = await query('SELECT * FROM payment_config WHERE payment_method = ?', [payment_method]);

    if (existing.rows.length > 0) {
      const updates: string[] = [];
      const paramsArr: any[] = [];
      if (is_enabled !== undefined) { updates.push('is_enabled = ?'); paramsArr.push(is_enabled ? 1 : 0); }
      if (is_sandbox !== undefined) { updates.push('is_sandbox = ?'); paramsArr.push(is_sandbox ? 1 : 0); }
      if (config_json !== undefined) { updates.push('config_json = ?'); paramsArr.push(JSON.stringify(config_json)); }
      if (display_name !== undefined) { updates.push('display_name = ?'); paramsArr.push(display_name); }
      if (sort_order !== undefined) { updates.push('sort_order = ?'); paramsArr.push(sort_order); }
      updates.push("updated_at = datetime('now')");

      paramsArr.push(payment_method);
      await query(`UPDATE payment_config SET ${updates.join(', ')} WHERE payment_method = ?`, paramsArr);
    } else {
      await query(
        `INSERT INTO payment_config (payment_method, display_name, is_enabled, is_sandbox, config_json, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [payment_method, display_name || payment_method, is_enabled ? 1 : 0, is_sandbox ? 1 : 0, JSON.stringify(config_json || {}), sort_order || 0]
      );
    }

    logApiSuccess('PAYMENTS', 'UPDATE_PAYMENT_CONFIG', { payment_method });
    return createSuccessResponse({ message: '支付配置已更新' });
  } catch (error) {
    logApiError('PAYMENTS', 'UPDATE_PAYMENT_CONFIG', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

**文件：** 新建 `src/app/api/admin/settings/exchange-rates/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('PAYMENTS', 'GET', '/api/admin/settings/exchange-rates');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const result = await query('SELECT * FROM exchange_rates ORDER BY currency');
    logApiSuccess('PAYMENTS', 'GET_EXCHANGE_RATES');
    return createSuccessResponse(result.rows);
  } catch (error) {
    logApiError('PAYMENTS', 'GET_EXCHANGE_RATES', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  logApiRequest('PAYMENTS', 'POST', '/api/admin/settings/exchange-rates');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { currency, rate_to_usd } = body;

    if (!currency || rate_to_usd === undefined) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    await query(
      `INSERT OR REPLACE INTO exchange_rates (currency, rate_to_usd, updated_at)
       VALUES (?, ?, datetime('now'))`,
      [currency.toUpperCase(), rate_to_usd]
    );

    logApiSuccess('PAYMENTS', 'ADD_EXCHANGE_RATE', { currency });
    return createSuccessResponse({ message: '汇率已添加' }, 201);
  } catch (error) {
    logApiError('PAYMENTS', 'ADD_EXCHANGE_RATE', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest) {
  logApiRequest('PAYMENTS', 'DELETE', '/api/admin/settings/exchange-rates');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency');
    if (!currency) return createErrorResponse('MISSING_PARAMS', 400);

    await query('DELETE FROM exchange_rates WHERE currency = ?', [currency.toUpperCase()]);
    logApiSuccess('PAYMENTS', 'DELETE_EXCHANGE_RATE', { currency });
    return createSuccessResponse({ message: '汇率已删除' });
  } catch (error) {
    logApiError('PAYMENTS', 'DELETE_EXCHANGE_RATE', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

**文件：** 新建 `src/app/api/admin/settings/general/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('API', 'GET', '/api/admin/settings/general');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const result = await query('SELECT * FROM system_configs ORDER BY config_key');
    const configs: Record<string, string> = {};
    for (const row of result.rows) {
      configs[row.config_key] = row.config_value;
    }
    logApiSuccess('API', 'GET_GENERAL_CONFIG');
    return createSuccessResponse(configs);
  } catch (error) {
    logApiError('API', 'GET_GENERAL_CONFIG', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: NextRequest) {
  logApiRequest('API', 'PUT', '/api/admin/settings/general');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue;
      await query(
        `INSERT INTO system_configs (config_key, config_value, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = datetime('now')`,
        [key, String(value)]
      );
    }

    logApiSuccess('API', 'UPDATE_GENERAL_CONFIG');
    return createSuccessResponse({ message: '配置已更新' });
  } catch (error) {
    logApiError('API', 'UPDATE_GENERAL_CONFIG', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

**文件：** 新建 `src/app/api/admin/settings/audit-logs/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, getPaginationParams, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('API', 'GET', '/api/admin/settings/audit-logs');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { page, limit } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const module = searchParams.get('module') || '';
    const action = searchParams.get('action') || '';
    const status = searchParams.get('status') || '';

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (module) { whereClauses.push('module = ?'); params.push(module); }
    if (action) { whereClauses.push('action = ?'); params.push(action); }
    if (status) { whereClauses.push('status = ?'); params.push(status); }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countResult = await query(`SELECT COUNT(*) as total FROM audit_logs ${whereSQL}`, params);
    const total = countResult.rows[0]?.total || 0;

    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT * FROM audit_logs ${whereSQL} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    logApiSuccess('API', 'GET_AUDIT_LOGS', { total });
    return createSuccessResponse({
      logs: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logApiError('API', 'GET_AUDIT_LOGS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

---

### 任务 3.4：Admin 用户管理 API

**文件：** 新建 `src/app/api/admin/users/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, getPaginationParams, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('AUTH', 'GET', '/api/admin/users');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { page, limit, search } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || '';

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (search) {
      whereClauses.push('(name LIKE ? OR email LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s);
    }
    if (role) { whereClauses.push('role = ?'); params.push(role); }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countResult = await query(`SELECT COUNT(*) as total FROM users ${whereSQL}`, params);
    const total = countResult.rows[0]?.total || 0;

    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT id, name, email, phone, role, level, points, total_spent, created_at
       FROM users ${whereSQL}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    logApiSuccess('AUTH', 'GET_USERS', { total });
    return createSuccessResponse({
      users: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logApiError('AUTH', 'GET_USERS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

**文件：** 新建 `src/app/api/admin/users/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('AUTH', 'GET', `/api/admin/users/${params.id}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const userId = parseInt(params.id);

    const [userResult, orderCount, couponCount, favoriteCount, pointsResult] = await Promise.all([
      query('SELECT id, name, email, phone, role, level, points, total_spent, created_at FROM users WHERE id = ?', [userId]),
      query('SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as total_amount FROM orders WHERE user_id = ?', [userId]),
      query('SELECT COUNT(*) as count FROM user_coupons WHERE user_id = ?', [userId]),
      query('SELECT COUNT(*) as count FROM user_favorites WHERE user_id = ?', [userId]),
      query('SELECT * FROM points_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [userId]),
    ]);

    if (userResult.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const recentOrders = await query(
      'SELECT id, order_number, final_amount, order_status, payment_status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [userId]
    );

    const recentCoupons = await query(
      `SELECT uc.*, c.code, c.name, c.type, c.value FROM user_coupons uc
       LEFT JOIN coupons c ON uc.coupon_id = c.id
       WHERE uc.user_id = ? ORDER BY uc.created_at DESC LIMIT 10`,
      [userId]
    );

    logApiSuccess('AUTH', 'GET_USER_DETAIL', { userId });
    return createSuccessResponse({
      user: userResult.rows[0],
      stats: {
        orderCount: orderCount.rows[0]?.count || 0,
        totalSpent: orderCount.rows[0]?.total_amount || 0,
        couponCount: couponCount.rows[0]?.count || 0,
        favoriteCount: favoriteCount.rows[0]?.count || 0,
      },
      recentOrders: recentOrders.rows,
      recentCoupons: recentCoupons.rows,
      pointsLogs: pointsResult.rows
    });
  } catch (error) {
    logApiError('AUTH', 'GET_USER_DETAIL', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('AUTH', 'PUT', `/api/admin/users/${params.id}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const userId = parseInt(params.id);
    const body = await request.json();
    const { name, role, phone, points } = body;

    const existing = await query('SELECT * FROM users WHERE id = ?', [userId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const updates: string[] = [];
    const paramsArr: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); paramsArr.push(name); }
    if (role !== undefined) {
      if (!['admin', 'user'].includes(role)) return createErrorResponse('VALIDATION_FAILED', 400);
      updates.push('role = ?'); paramsArr.push(role);
    }
    if (phone !== undefined) { updates.push('phone = ?'); paramsArr.push(phone); }
    if (points !== undefined) {
      updates.push('points = ?'); paramsArr.push(points);
    }

    if (updates.length === 0) return createErrorResponse('NO_CHANGES', 400);

    paramsArr.push(userId);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, paramsArr);

    const updated = await query('SELECT id, name, email, phone, role, level, points, total_spent FROM users WHERE id = ?', [userId]);
    logApiSuccess('AUTH', 'UPDATE_USER', { userId });
    return createSuccessResponse(updated.rows[0]);
  } catch (error) {
    logApiError('AUTH', 'UPDATE_USER', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

---

### 任务 3.5：Admin 分类管理 API

**文件：** 新建 `src/app/api/admin/categories/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('PRODUCTS', 'GET', '/api/admin/categories');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const result = await query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM products WHERE category_id = c.id) as product_count
       FROM categories c
       ORDER BY c.priority ASC, c.name ASC`
    );

    logApiSuccess('PRODUCTS', 'GET_CATEGORIES');
    return createSuccessResponse(result.rows);
  } catch (error) {
    logApiError('PRODUCTS', 'GET_CATEGORIES', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  logApiRequest('PRODUCTS', 'POST', '/api/admin/categories');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { name, name_en, name_ar, slug, description, image, priority } = body;

    if (!name || !slug) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const existing = await query('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (existing.rows.length > 0) return createErrorResponse('DUPLICATE_SLUG', 400);

    const result = await query(
      `INSERT INTO categories (name, name_en, name_ar, slug, description, image, priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [name, name_en || '', name_ar || '', slug, description || '', image || '', priority || 0]
    );

    logApiSuccess('PRODUCTS', 'CREATE_CATEGORY', { slug });
    return createSuccessResponse({ id: result.lastInsertRowid, slug }, 201);
  } catch (error) {
    logApiError('PRODUCTS', 'CREATE_CATEGORY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

**文件：** 新建 `src/app/api/admin/categories/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('PRODUCTS', 'PUT', `/api/admin/categories/${params.id}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const catId = parseInt(params.id);
    const body = await request.json();
    const { name, name_en, name_ar, description, image, priority } = body;

    const existing = await query('SELECT * FROM categories WHERE id = ?', [catId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const updates: string[] = [];
    const paramsArr: any[] = [];
    if (name !== undefined) { updates.push('name = ?'); paramsArr.push(name); }
    if (name_en !== undefined) { updates.push('name_en = ?'); paramsArr.push(name_en); }
    if (name_ar !== undefined) { updates.push('name_ar = ?'); paramsArr.push(name_ar); }
    if (description !== undefined) { updates.push('description = ?'); paramsArr.push(description); }
    if (image !== undefined) { updates.push('image = ?'); paramsArr.push(image); }
    if (priority !== undefined) { updates.push('priority = ?'); paramsArr.push(priority); }

    if (updates.length === 0) return createErrorResponse('NO_CHANGES', 400);

    paramsArr.push(catId);
    await query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, paramsArr);

    const updated = await query('SELECT * FROM categories WHERE id = ?', [catId]);
    logApiSuccess('PRODUCTS', 'UPDATE_CATEGORY', { catId });
    return createSuccessResponse(updated.rows[0]);
  } catch (error) {
    logApiError('PRODUCTS', 'UPDATE_CATEGORY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('PRODUCTS', 'DELETE', `/api/admin/categories/${params.id}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const catId = parseInt(params.id);

    const productCount = await query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [catId]);
    if ((productCount.rows[0]?.count || 0) > 0) {
      return createErrorResponse('CATEGORY_HAS_PRODUCTS', 400);
    }

    await query('DELETE FROM categories WHERE id = ?', [catId]);
    logApiSuccess('PRODUCTS', 'DELETE_CATEGORY', { catId });
    return createSuccessResponse({ message: '分类已删除' });
  } catch (error) {
    logApiError('PRODUCTS', 'DELETE_CATEGORY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

---

### 任务 3.6：Admin 促销管理 API

**文件：** 新建 `src/app/api/admin/promotions/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, getPaginationParams, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('PRODUCTS', 'GET', '/api/admin/promotions');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { search } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (search) {
      whereClauses.push('(p.name LIKE ? OR p.name_en LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s);
    }
    if (status === 'active') whereClauses.push("p.status = 'active'");
    if (status === 'inactive') whereClauses.push("p.status = 'inactive'");

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const result = await query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM product_promotions WHERE promotion_id = p.id) as product_count,
              (SELECT COALESCE(SUM(total_orders), 0) FROM promotion_stats WHERE promotion_id = p.id) as total_order_count,
              (SELECT COALESCE(SUM(total_discount), 0) FROM promotion_stats WHERE promotion_id = p.id) as total_discount_amount
       FROM promotions p ${whereSQL}
       ORDER BY p.created_at DESC`,
      params
    );

    logApiSuccess('PRODUCTS', 'GET_PROMOTIONS');
    return createSuccessResponse(result.rows);
  } catch (error) {
    logApiError('PRODUCTS', 'GET_PROMOTIONS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  logApiRequest('PRODUCTS', 'POST', '/api/admin/promotions');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { name, name_en, name_ar, type, discount_percent, status, description, min_spend, max_discount, usage_limit, icon, color } = body;

    if (!name || !type || discount_percent === undefined) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const result = await query(
      `INSERT INTO promotions (name, name_en, name_ar, type, discount_percent, status, description, min_spend, max_discount, usage_limit, icon, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [name, name_en || '', name_ar || '', type, discount_percent, status || 'active', description || '',
       min_spend || 0, max_discount || null, usage_limit || null, icon || '', color || '']
    );

    logApiSuccess('PRODUCTS', 'CREATE_PROMOTION', { name, type, discount_percent });
    return createSuccessResponse({ id: result.lastInsertRowid, name }, 201);
  } catch (error) {
    logApiError('PRODUCTS', 'CREATE_PROMOTION', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

**文件：** 新建 `src/app/api/admin/promotions/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('PRODUCTS', 'GET', `/api/admin/promotions/${params.id}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const promoId = parseInt(params.id);
    const result = await query('SELECT * FROM promotions WHERE id = ?', [promoId]);
    if (result.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const products = await query(
      `SELECT pp.*, pr.name as product_name, pr.name_en as product_name_en,
              pr.image as product_image
       FROM product_promotions pp
       LEFT JOIN products pr ON pp.product_id = pr.id
       WHERE pp.promotion_id = ?`,
      [promoId]
    );

    const stats = await query('SELECT * FROM promotion_stats WHERE promotion_id = ? ORDER BY start_date DESC', [promoId]);

    logApiSuccess('PRODUCTS', 'GET_PROMOTION_DETAIL', { promoId, name: result.rows[0].name });
    return createSuccessResponse({
      promotion: result.rows[0],
      products: products.rows,
      stats: stats.rows
    });
  } catch (error) {
    logApiError('PRODUCTS', 'GET_PROMOTION_DETAIL', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('PRODUCTS', 'PUT', `/api/admin/promotions/${params.id}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const promoId = parseInt(params.id);
    const body = await request.json();
    const { name, name_en, name_ar, type, discount_percent, status, description, min_spend, max_discount, usage_limit, icon, color } = body;

    const existing = await query('SELECT * FROM promotions WHERE id = ?', [promoId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const updates: string[] = [];
    const paramsArr: any[] = [];
    if (name !== undefined) { updates.push('name = ?'); paramsArr.push(name); }
    if (name_en !== undefined) { updates.push('name_en = ?'); paramsArr.push(name_en); }
    if (name_ar !== undefined) { updates.push('name_ar = ?'); paramsArr.push(name_ar); }
    if (type !== undefined) { updates.push('type = ?'); paramsArr.push(type); }
    if (discount_percent !== undefined) { updates.push('discount_percent = ?'); paramsArr.push(discount_percent); }
    if (status !== undefined) { updates.push('status = ?'); paramsArr.push(status); }
    if (description !== undefined) { updates.push('description = ?'); paramsArr.push(description); }
    if (min_spend !== undefined) { updates.push('min_spend = ?'); paramsArr.push(min_spend); }
    if (max_discount !== undefined) { updates.push('max_discount = ?'); paramsArr.push(max_discount); }
    if (usage_limit !== undefined) { updates.push('usage_limit = ?'); paramsArr.push(usage_limit); }
    if (icon !== undefined) { updates.push('icon = ?'); paramsArr.push(icon); }
    if (color !== undefined) { updates.push('color = ?'); paramsArr.push(color); }
    updates.push("updated_at = datetime('now')");

    paramsArr.push(promoId);
    await query(`UPDATE promotions SET ${updates.join(', ')} WHERE id = ?`, paramsArr);

    const updated = await query('SELECT * FROM promotions WHERE id = ?', [promoId]);
    logApiSuccess('PRODUCTS', 'UPDATE_PROMOTION', { promoId, name: updated.rows[0].name });
    return createSuccessResponse(updated.rows[0]);
  } catch (error) {
    logApiError('PRODUCTS', 'UPDATE_PROMOTION', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  logApiRequest('PRODUCTS', 'DELETE', `/api/admin/promotions/${params.id}`);
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const promoId = parseInt(params.id);
    await query('DELETE FROM product_promotions WHERE promotion_id = ?', [promoId]);
    await query('DELETE FROM promotion_stats WHERE promotion_id = ?', [promoId]);
    await query('DELETE FROM promotions WHERE id = ?', [promoId]);

    logApiSuccess('PRODUCTS', 'DELETE_PROMOTION', { promoId });
    return createSuccessResponse({ message: '促销活动已删除' });
  } catch (error) {
    logApiError('PRODUCTS', 'DELETE_PROMOTION', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

---

### 任务 3.7：Admin 库存管理 API

**文件：** 新建 `src/app/api/admin/inventory/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('INVENTORY', 'GET', '/api/admin/inventory');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const result = await query(
      `SELECT i.*, p.name as product_full_name, p.name_en as product_name_en,
              ist.name as status_name, ist.color as status_color
       FROM inventory i
       LEFT JOIN products p ON i.product_id = p.id
       LEFT JOIN inventory_status ist ON i.status_id = ist.id
       ORDER BY i.quantity ASC`
    );

    logApiSuccess('INVENTORY', 'GET_INVENTORY', { count: result.rows.length });
    return createSuccessResponse(result.rows);
  } catch (error) {
    logApiError('INVENTORY', 'GET_INVENTORY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

**文件：** 新建 `src/app/api/admin/inventory/adjust/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function POST(request: NextRequest) {
  logApiRequest('INVENTORY', 'POST', '/api/admin/inventory/adjust');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { product_id, change_type, quantity, reason, operator_name } = body;
    const operatorId = auth.user.userId;
    const opName = operator_name || auth.user.name || 'Admin';

    if (!product_id || !quantity) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const product = await query('SELECT * FROM products WHERE id = ?', [product_id]);
    if (product.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const inv = await query('SELECT * FROM inventory WHERE product_id = ?', [product_id]);
    const currentStock = inv.rows[0]?.quantity || 0;
    let newStock: number;

    switch (change_type) {
      case 'increase': newStock = currentStock + quantity; break;
      case 'decrease': newStock = Math.max(0, currentStock - quantity); break;
      case 'set': newStock = quantity; break;
      default: return createErrorResponse('INVALID_CHANGE_TYPE', 400);
    }

    if (inv.rows.length > 0) {
      await query(
        `UPDATE inventory SET quantity = ?, updated_at = datetime('now') WHERE product_id = ?`,
        [newStock, product_id]
      );
    } else {
      const statusId = newStock <= 0 ? 4 : newStock <= 5 ? 3 : newStock <= 10 ? 2 : 1;
      await query(
        `INSERT INTO inventory (product_id, product_name, quantity, status_id, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [product_id, product.rows[0].name, newStock, statusId]
      );
    }

    await query(
      `INSERT INTO inventory_transactions (product_id, product_name, quantity_change, quantity_before, quantity_after, reason, reference_type, operator_id, operator_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'admin_adjust', ?, ?, datetime('now'))`,
      [product_id, product.rows[0].name, mewStock - currentStock, currentStock, newStock,
       reason || '管理员手动调整', operatorId, opName]
    );

    // 如果从 0 变成有货，清除预警
    if (currentStock <= 0 && newStock > 0) {
      await query(
        `UPDATE inventory_alerts SET is_resolved = 1, resolved_at = datetime('now'), resolution_note = '管理员补货' WHERE product_id = ? AND is_resolved = 0`,
        [product_id]
      );
    }

    logApiSuccess('INVENTORY', 'ADJUST_STOCK', { product_id, stockBefore: currentStock, stockAfter: newStock });
    return createSuccessResponse({
      product_id,
      stock_before: currentStock,
      stock_after: newStock
    });
  } catch (error) {
    logApiError('INVENTORY', 'ADJUST_STOCK', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

---

### 任务 3.8：Admin 数据分析 API

**文件：** 新建 `src/app/api/admin/analytics/dashboard/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('API', 'GET', '/api/admin/analytics/dashboard');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const queries = await Promise.all([
      query(`SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(final_amount), 0) as revenue
             FROM orders WHERE created_at >= DATE('now', '-7 days') GROUP BY DATE(created_at) ORDER BY date`),
      query(`SELECT DATE(created_at) as date, COUNT(*) as count
             FROM users WHERE created_at >= DATE('now', '-7 days') GROUP BY DATE(created_at) ORDER BY date`),
      query(`SELECT p.name, COUNT(o.id) as count, COALESCE(SUM(o.final_amount), 0) as total
             FROM orders o, products p WHERE o.id > 0 LIMIT 20`),
      query(`SELECT payment_method, COUNT(*) as count FROM orders WHERE payment_method IS NOT NULL GROUP BY payment_method`),
    ]);

    logApiSuccess('API', 'GET_ANALYTICS_DASHBOARD');
    return createSuccessResponse({
      dailySales: queries[0].rows,
      dailyUsers: queries[1].rows,
      topProducts: queries[2].rows,
      paymentDistribution: queries[3].rows
    });
  } catch (error) {
    logApiError('API', 'GET_ANALYTICS_DASHBOARD', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

**文件：** 新建 `src/app/api/admin/analytics/sales/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('API', 'GET', '/api/admin/analytics/sales');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    let dateGroupExpr = "strftime('%Y-%m', created_at)";
    if (period === 'week') dateGroupExpr = "strftime('%Y-%W', created_at)";
    if (period === 'day') dateGroupExpr = "DATE(created_at)";

    const result = await query(
      `SELECT ${dateGroupExpr} as period,
              COUNT(*) as order_count,
              COALESCE(SUM(final_amount), 0) as total_revenue,
              COALESCE(AVG(final_amount), 0) as avg_order_value
       FROM orders GROUP BY period ORDER BY period DESC LIMIT 24`
    );

    logApiSuccess('API', 'GET_SALES_ANALYTICS');
    return createSuccessResponse(result.rows);
  } catch (error) {
    logApiError('API', 'GET_SALES_ANALYTICS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
```

---

## 阶段四：Admin 页面重写（中文优先，CSS变量系统）

本阶段所有页面严格使用 **CSS Variables**（`--primary`, `--accent`, `--text`, `--text-muted`, `--border`, `--card`, `--background`），不引入任何 Bootstrap/Tailwind 不兼容类名。

### 任务 4.1：重写 Dashboard 页面

**文件：** 重写 `src/app/admin/dashboard/page.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";

interface DashboardData {
  todayOrders: { count: number; amount: number };
  monthOrders: { count: number; amount: number };
  monthGrowth: string;
  totalUsers: number;
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  pendingOrders: number;
  pendingRefunds: number;
  recentOrders: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (err) { console.error('Dashboard fetch error:', err); }
    finally { setLoading(false); }
  };

  const formatCurrency = (v: number) => `¥${(v || 0).toFixed(2)}`;

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>加载中...</div>;

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
        color: '#fff', padding: '2rem', borderRadius: '12px', marginBottom: '1.5rem'
      }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>仪表盘</h1>
        <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>紫砂电商管理后台数据概览</p>
      </div>

      {/* 核心指标卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="今日订单" value={data?.todayOrders.count || 0} sub={`¥${(data?.todayOrders.amount || 0).toFixed(2)}`} />
        <StatCard label="本月订单" value={data?.monthOrders.count || 0} sub={`¥${(data?.monthOrders.amount || 0).toFixed(2)}`} />
        <StatCard label="总用户" value={data?.totalUsers || 0} />
        <StatCard label="总商品" value={data?.totalProducts || 0} />
        <StatCard label="低库存商品" value={data?.lowStock || 0} color="var(--color-orange)" />
        <StatCard label="缺货商品" value={data?.outOfStock || 0} color="var(--color-red)" />
      </div>

      {/* 待处理提醒 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--card)', borderRadius: '8px', padding: '1.25rem', border: '2px solid var(--color-red)', borderLeft: '4px solid var(--color-red)' }}>
          <h3 style={{ color: 'var(--color-red)', fontWeight: 600 }}>⚠ 待处理订单</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{data?.pendingOrders || 0}</p>
        </div>
        <div style={{ background: 'var(--card)', borderRadius: '8px', padding: '1.25rem', border: '2px solid var(--color-orange)', borderLeft: '4px solid var(--color-orange)' }}>
          <h3 style={{ color: 'var(--color-orange)', fontWeight: 600 }}>🔄 待处理退款</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{data?.pendingRefunds || 0}</p>
        </div>
      </div>

      {/* 最近订单 */}
      <div style={{ background: 'var(--card)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)' }}>
        <h2 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text)' }}>最近订单</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--background)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>订单号</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>用户</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>金额</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>状态</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>时间</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentOrders || []).map((o: any) => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{o.order_number?.slice(-8)}</td>
                  <td style={{ padding: '0.75rem' }}>{o.user_name || '-'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>¥{Number(o.final_amount || 0).toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <StatusBadge status={o.order_status} />
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {new Date(o.created_at).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--card)', borderRadius: '8px', padding: '1.25rem',
      border: '1px solid var(--border)', borderLeft: `4px solid ${color || 'var(--accent)'}`
    }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pending: { label: '待支付', bg: '#FEF3C7', color: '#92400E' },
    paid: { label: '已支付', bg: '#D1FAE5', color: '#065F46' },
    shipped: { label: '已发货', bg: '#DBEAFE', color: '#1E40AF' },
    delivered: { label: '已签收', bg: '#E0E7FF', color: '#3730A3' },
    cancelled: { label: '已取消', bg: '#FEE2E2', color: '#991B1B' },
    refunding: { label: '退款中', bg: '#FED7AA', color: '#9A3412' },
    refunded: { label: '已退款', bg: '#F3E8FF', color: '#6B21A8' },
  };
  const s = map[status] || { label: status, bg: '#E5E7EB', color: '#374151' };
  return <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>{s.label}</span>;
}
```

---

### 任务 4.2：重写用户管理页面

**文件：** 重写 `src/app/admin/users/page.tsx`

关键改动：
- 接口类型 `_id` → `id: number`
- `setUsers(data)` → 正确解包 `data.data.users`
- API 从 `/api/users` → `/api/admin/users`
- 全中文界面

```tsx
"use client";
import { useState, useEffect } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  level: string;
  points: number;
  total_spent: number;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', role: 'user', phone: '', points: 0 });

  useEffect(() => { fetchUsers(); }, [page, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', search });
      if (roleFilter) params.set('role', roleFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users);
        setPagination(data.data.pagination);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({ name: user.name, role: user.role, phone: user.phone || '', points: user.points });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    await fetch(`/api/admin/users/${editUser.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setEditUser(null);
    fetchUsers();
  };

  return (
    <div>
      <PageHeader title="用户管理" subtitle="管理所有注册用户" />

      {/* 筛选栏 */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchUsers()}
          placeholder="搜索姓名或邮箱..."
          style={{ flex: 1, padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', background: 'var(--card)' }}
        />
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card)', color: 'var(--text)' }}>
          <option value="">全部角色</option>
          <option value="admin">管理员</option>
          <option value="user">普通用户</option>
        </select>
        <button onClick={fetchUsers} style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          搜索
        </button>
      </div>

      {/* 表格 */}
      <TableCard>
        {loading ? <div style={{ textAlign: 'center', padding: '2rem' }}>加载中...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--background)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                <Th>ID</Th><Th>姓名</Th><Th>邮箱</Th><Th>角色</Th><Th>积分</Th><Th>消费</Th><Th>注册时间</Th><Th>操作</Th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <Td>{u.id}</Td><Td>{u.name}</Td><Td>{u.email}</Td>
                  <Td><RoleBadge role={u.role} /></Td>
                  <Td>{u.points}</Td><Td>¥{Number(u.total_spent || 0).toFixed(2)}</Td>
                  <Td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString('zh-CN')}</Td>
                  <Td><button onClick={() => openEdit(u)} style={{ color: 'var(--accent)', border: 'none', background: 'none', cursor: 'pointer' }}>编辑</button></Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} total={pagination.total} />
      </TableCard>

      {/* 编辑弹窗 */}
      {editUser && <Modal title="编辑用户" onClose={() => setEditUser(null)} onSubmit={saveEdit}>
        <FormField label="姓名"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" /></FormField>
        <FormField label="角色">
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input">
            <option value="user">普通用户</option><option value="admin">管理员</option>
          </select>
        </FormField>
        <FormField label="电话"><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input" /></FormField>
        <FormField label="积分"><input type="number" value={form.points} onChange={e => setForm({ ...form, points: Number(e.target.value) })} className="input" /></FormField>
      </Modal>}
    </div>
  );
}

// 共享组件（内联）
function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, var(--accent), var(--secondary))', color: '#fff', padding: '2rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{title}</h1>
      <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>{subtitle}</p>
    </div>
  );
}

function TableCard({ children }: { children: React.ReactNode }) {
  return <div style={{ background: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>{children}</div>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>{children}</th>;
}

function Td({ children, style }: { children: React.ReactNode; style?: any }) {
  return <td style={{ padding: '0.75rem 1rem', color: 'var(--text)', ...style }}>{children}</td>;
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
      background: role === 'admin' ? '#F3E8FF' : '#DBEAFE',
      color: role === 'admin' ? '#6B21A8' : '#1E40AF'
    }}>{role === 'admin' ? '管理员' : '用户'}</span>
  );
}

function Modal({ title, children, onClose, onSubmit }: any) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text)' }}>{title}</h2>
        {children}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1.5rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer' }}>取消</button>
          <button onClick={onSubmit} style={{ padding: '0.5rem 1.5rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>保存</button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: any) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem', color: 'var(--text)' }}>{label}</label>
      {children}
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange, total }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>共 {total} 条</span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} style={btnStyle}>上一页</button>
        <span style={{ padding: '0.5rem', color: 'var(--text)' }}>第 {page}/{totalPages} 页</span>
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} style={btnStyle}>下一页</button>
      </div>
    </div>
  );
}

const btnStyle = { padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer' };
```

---

## 阶段五：P2/P3 优化（CSS统一 & logMonitor规范化）

### 任务 5.1：标准化所有已有 API

**修改文件：** `src/app/api/admin/coupons/route.ts` — 在已有 POST 前添加 GET（已在阶段二实施）

### 任务 5.2：广播添加 logMonitor 监听检查

对所有新建 API 确保每个方法都有至少 3 处 logMonitor：
1. REQUEST — 方法进入时
2. SUCCESS/ERROR — 业务结果
3. 异常时 ERROR

### 任务 5.3：统一 CSS 变量系统

确保所有 admin 页面不再出现以下禁用类名：
- ❌ `btn-primary` → ✅ `style={{ backgroundColor: 'var(--primary)' }}`
- ❌ `text-muted` → ✅ `style={{ color: 'var(--text-muted)' }}`
- ❌ `bg-primary` (Tailwind冲突)
- ❌ `dark:bg-dark/80` (无对应CSS变量)

---

## 实施文件清单总览

### 阶段一：基础设施 (4个文件)

| 操作 | 文件 |
|------|------|
| 修改 | `src/middleware.ts` |
| 修改 | `src/app/admin/login/page.tsx` |
| 修改 | `src/app/admin/layout.tsx` |
| **新建** | `src/lib/admin-helpers.ts` |

### 阶段二：P0 订单+优惠券 (10个文件)

| 操作 | 文件 |
|------|------|
| **新建** | `src/app/api/admin/orders/route.ts` |
| **新建** | `src/app/api/admin/orders/[id]/route.ts` |
| **新建** | `src/app/api/admin/orders/[id]/ship/route.ts` |
| **新建** | `src/app/api/admin/orders/[id]/refund/approve/route.ts` |
| **新建** | `src/app/api/admin/orders/[id]/refund/reject/route.ts` |
| 修改 | `src/app/api/admin/coupons/route.ts` (加GET) |
| **新建** | `src/app/api/admin/coupons/[id]/route.ts` |
| **新建** | `src/app/api/admin/coupons/[id]/toggle/route.ts` |
| **新建** | `src/app/admin/orders/page.tsx` |
| **新建** | `src/app/admin/coupons/page.tsx` |

### 阶段三：P0 其余 (15个文件)

| 操作 | 文件 |
|------|------|
| **新建** | `src/app/api/admin/dashboard/route.ts` |
| **新建** | `src/app/api/admin/reviews/route.ts` |
| **新建** | `src/app/api/admin/reviews/[id]/route.ts` |
| **新建** | `src/app/api/admin/reviews/[id]/reply/route.ts` |
| **新建** | `src/app/api/admin/reviews/[id]/reply/[replyId]/route.ts` |
| **新建** | `src/app/api/admin/settings/payment/route.ts` |
| **新建** | `src/app/api/admin/settings/exchange-rates/route.ts` |
| **新建** | `src/app/api/admin/settings/general/route.ts` |
| **新建** | `src/app/api/admin/settings/audit-logs/route.ts` |
| **新建** | `src/app/api/admin/users/route.ts` |
| **新建** | `src/app/api/admin/users/[id]/route.ts` |
| **新建** | `src/app/api/admin/categories/route.ts` |
| **新建** | `src/app/api/admin/categories/[id]/route.ts` |
| **新建** | `src/app/api/admin/promotions/route.ts` |
| **新建** | `src/app/api/admin/promotions/[id]/route.ts` |

### 阶段三：P0 库存+分析 (5个文件)

| 操作 | 文件 |
|------|------|
| **新建** | `src/app/api/admin/inventory/route.ts` |
| **新建** | `src/app/api/admin/inventory/adjust/route.ts` |
| **新建** | `src/app/api/admin/analytics/dashboard/route.ts` |
| **新建** | `src/app/api/admin/analytics/sales/route.ts` |
| **新建** | `src/app/admin/analytics/page.tsx` |
| **新建** | `src/app/admin/reviews/page.tsx` |
| **新建** | `src/app/admin/settings/page.tsx` |
| **新建** | `src/app/admin/deliver-refund/page.tsx` |

### 阶段四：已有页面重写 (3个文件)

| 操作 | 文件 |
|------|------|
| 重写 | `src/app/admin/dashboard/page.tsx` |
| 重写 | `src/app/admin/users/page.tsx` |
| 重写 | `src/app/admin/categories/page.tsx` |
| 重写 | `src/app/admin/promotions/page.tsx` |
| **新建** | `src/app/admin/products/[id]/page.tsx` |

### 汇总

| 类型 | 数量 |
|------|------|
| **新建 API 文件** | 32 |
| **修改 API 文件** | 1 (`api/admin/coupons/route.ts` 加GET) |
| **新建 Admin 页面** | 8 |
| **重写 Admin 页面** | 4 |
| **新建工具文件** | 1 (`lib/admin-helpers.ts`) |
| **修改配置文件** | 2 (`middleware.ts`, `admin/layout.tsx`) |

---

> **实施提示**: 此计划文件可作为 `subagent-driven-development` 的输入。每个 API 文件 80-200 行，可独立开发、测试、提交。
