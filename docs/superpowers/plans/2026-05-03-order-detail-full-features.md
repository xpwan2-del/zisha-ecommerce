# 订单详情页完整功能 + Bug 修复 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 让订单详情页拥有完整功能（地址选择、优惠券选择、支付方式选择、价格重算），同时修复取消按钮报错、取消不还券、退款按钮无反应、coupon_ids 语义混乱 4 个 Bug。

**架构：** 订单详情页聚合地址 API、优惠券 API 的数据展示完整选择器，新增 `prepare-payment` API 统一处理订单更新+券标记+价格重算，取消 API 补齐还券逻辑，修复 quick-order 取消按钮的错误 HTTP 方法。

**技术栈：** Next.js 16 App Router + SQL.js (sqlite) + bcryptjs + jsonwebtoken

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/app/quick-order/page.tsx` | 修改 | 修复取消按钮的 HTTP 方法和 body |
| `src/app/api/orders/[id]/route.ts` | 修改 | PATCH cancel 增加归还优惠券逻辑 |
| `src/app/account/page.tsx` | 修改 | 退款按钮添加 onClick handler |
| `src/app/api/orders/[id]/refund/route.ts` | 新建 | 退款申请 API |
| `src/app/api/orders/[id]/prepare-payment/route.ts` | 新建 | 订单提交前重算+更新+标记券 |
| `src/app/orders/[id]/page.tsx` | 重写 | 完整功能：地址选择+券选择+支付方式+提交 |
| `src/app/api/inventory/reserve/route.ts` | 修改 | coupon_ids 列不再存储 promotion IDs |

---

### 任务 1：修复 quick-order 页取消按钮

**文件：**
- 修改：`src/app/quick-order/page.tsx:498-523`

- [ ] **步骤 1：修改 quick-order/page.tsx 取消按钮**

将 `handleCancelOrder` 中的 `method: 'PUT'` 改为 `method: 'PATCH'`，body 改为 `{ action: 'cancel' }`（与 account/page.tsx 中的取消逻辑一致）：

```typescript
// 替换 L498-L523
const handleCancelOrder = async () => {
    if (!confirm('确定要取消订单吗？')) return;
    if (!currentOrderDbId) {
      alert('订单信息加载中，请稍后');
      return;
    }

    try {
      const response = await fetch(`/api/orders/${currentOrderDbId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      });

      if (response.ok) {
        router.push('/');
      } else {
        const data = await response.json();
        alert(data.error || '取消失败，请重试');
      }
    } catch (err) {
      console.error('Cancel order error:', err);
      alert('取消失败，请重试');
    }
  };
```

- [ ] **步骤 2：验证修复**

重启 dev server，创建一个订单，进入 quick-order 页面点击取消，确认不再报错且订单状态变为 cancelled。

```bash
# 1. 登录
curl -s -c /tmp/cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"123456"}'

# 2. 创建订单
curl -s -b /tmp/cookies.txt -X POST http://localhost:3000/api/inventory/reserve \
  -H 'Content-Type: application/json' \
  -d '{"product_id":1,"quantity":1}' | python3 -m json.tool

# 3. 取消订单（模拟 PATCH）
curl -s -b /tmp/cookies.txt -X PATCH http://localhost:3000/api/orders/<ORDER_ID> \
  -H 'Content-Type: application/json' \
  -d '{"action":"cancel"}' | python3 -m json.tool
```

预期：返回 `{"success":true,"data":{"order_id":...,"status":"cancelled",...}}`，库存归还。

- [ ] **步骤 3：Commit**

```bash
git add src/app/quick-order/page.tsx
git commit -m "fix: quick-order cancel button uses PATCH instead of PUT"
```

---

### 任务 2：取消订单归还优惠券

**文件：**
- 修改：`src/app/api/orders/[id]/route.ts:120-241`

- [ ] **步骤 1：在 PATCH cancel 处理器末尾（更新订单状态之前）增加还券逻辑**

在 [api/orders/[id]/route.ts:L211](file:///Users/davis/zisha-ecommerce/src/app/api/orders/[id]/route.ts#L211)（`UPDATE orders SET order_status = 'cancelled'`）之前插入还券代码：

```typescript
    // ===== 新增：归还优惠券 =====
    // 1. 查询该订单使用的优惠券
    const orderCouponsResult = await query(
      `SELECT oc.id as order_coupon_id, oc.coupon_id, oc.discount_applied, 
              uc.id as user_coupon_id
       FROM order_coupons oc
       JOIN user_coupons uc ON oc.coupon_id = uc.coupon_id 
         AND oc.user_id = uc.user_id AND uc.status = 'used'
       WHERE oc.order_id = ? AND oc.status = 'applied'`,
      [orderId]
    );

    for (const row of orderCouponsResult.rows) {
      // 2. 把 user_coupons 状态从 'used' 改回 'active'
      await query(
        `UPDATE user_coupons SET status = 'active', used_order_id = NULL 
         WHERE id = ? AND user_id = ?`,
        [row.user_coupon_id, order.user_id]
      );
      // 3. 标记 order_coupons 为已退还
      await query(
        `UPDATE order_coupons SET status = 'refunded', refunded_at = datetime('now') 
         WHERE id = ?`,
        [row.order_coupon_id]
      );
    }
    // ===== 还券逻辑结束 =====
```

这段代码放在 for 循环归还库存之后（L210 之后），`UPDATE orders` 状态更新之前（L212 之前）。

- [ ] **步骤 2：验证修复**

创建订单 → 进入 quick-order 选券提交 → 然后取消 → 确认 user_coupons 状态恢复为 active。

```bash
# 查看取消后的券状态
sqlite3 src/lib/db/database.sqlite \
  "SELECT uc.id, uc.status, c.name FROM user_coupons uc 
   JOIN coupons c ON uc.coupon_id = c.id WHERE uc.user_id = 1 AND uc.status = 'used' LIMIT 5;"
```

预期：之前被取消订单使用的券恢复为 `active`，再查 `used` 时应为空或只有其他真正已使用的券。

- [ ] **步骤 3：Commit**

```bash
git add src/app/api/orders/[id]/route.ts
git commit -m "fix: cancel order now returns coupons to user"
```

---

### 任务 3：修复退款按钮 + 创建退款 API

**文件：**
- 创建：`src/app/api/orders/[id]/refund/route.ts`
- 修改：`src/app/account/page.tsx:285-286`（退款按钮添加 onClick）

- [ ] **步骤 1：创建退款 API**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

/**
 * POST /api/orders/[id]/refund - 申请退款
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    logMonitor('ORDERS', 'REQUEST', { method: 'POST', action: 'REQUEST_REFUND' });

    const authResult = requireAuth(request);
    if (authResult.response) return authResult.response;

    const { id } = await params;
    const orderId = id;

    // 查询订单
    const orderResult = await query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    // 权限验证
    if (authResult.user?.role !== 'admin' && order.user_id !== authResult.user?.userId) {
      return NextResponse.json(
        { success: false, error: '无权限操作此订单' },
        { status: 403 }
      );
    }

    // 只有 paid/shipped 状态可以申请退款
    if (!['paid', 'shipped'].includes(order.order_status)) {
      return NextResponse.json(
        { success: false, error: '当前订单状态不可申请退款' },
        { status: 400 }
      );
    }

    // 更新订单状态为 refunding
    await query(
      `UPDATE orders SET order_status = 'refunding', updated_at = datetime('now') WHERE id = ?`,
      [orderId]
    );

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'REQUEST_REFUND',
      orderId,
      orderNumber: order.order_number,
      fromStatus: order.order_status
    });

    return NextResponse.json({
      success: true,
      data: {
        order_id: Number(orderId),
        order_number: order.order_number,
        status: 'refunding',
        message: '退款申请已提交，请等待处理'
      }
    });

  } catch (error: any) {
    logMonitor('ORDERS', 'ERROR', {
      action: 'REQUEST_REFUND',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: '退款申请失败' },
      { status: 500 }
    );
  }
}
```

- [ ] **步骤 2：account/page.tsx 退款按钮添加 onClick handler**

修改 [account/page.tsx:L285-L286](file:///Users/davis/zisha-ecommerce/src/app/account/page.tsx#L285-L286)：

原代码：
```tsx
case 'paid':
    return (<>
        <button ...>申请退款</button>
        ...
    </>);
```

改为：
```tsx
case 'paid':
    return (<>
        <button onClick={() => handleRequestRefund(order)} className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors hover:opacity-90" style={{ background: 'var(--accent)', color: '#fff' }}>申请退款</button>
        <button onClick={handleEditAddress} className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors">修改地址</button>
    </>);
```

同理 `shipped` 状态的退款按钮（L288）也加上 `onClick={() => handleRequestRefund(order)}`。

然后在 OrderCard 组件内（`handleCancelOrder` 函数附近，约 L366 之前）添加 `handleRequestRefund` 函数：

```typescript
const handleRequestRefund = async (order: Order) => {
    if (!confirm('确定要申请退款吗？退款处理需要管理员审核。')) return;
    try {
      const res = await fetch(`/api/orders/${order.id}/refund`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        alert('退款申请已提交');
        onAddressUpdated?.();
      } else {
        alert(data.error || '退款申请失败');
      }
    } catch (err) {
      alert('退款申请失败');
    }
  };
```

- [ ] **步骤 3：验证修复**

```bash
# 找一个 paid 状态的订单
curl -s -b /tmp/cookies.txt -X POST http://localhost:3000/api/orders/<PAID_ORDER_ID>/refund | python3 -m json.tool
```

预期：`{"success":true,"data":{"status":"refunding","message":"退款申请已提交，请等待处理"}}`

- [ ] **步骤 4：Commit**

```bash
git add src/app/api/orders/[id]/refund/route.ts src/app/account/page.tsx
git commit -m "fix: add refund button handler and refund API"
```

---

### 任务 4：创建 prepare-payment API（订单提交前重算+更新+标记券）

**文件：**
- 创建：`src/app/api/orders/[id]/prepare-payment/route.ts`

- [ ] **步骤 1：创建 API 文件**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

/**
 * POST /api/orders/[id]/prepare-payment
 * 
 * 订单提交前：重算价格、更新订单、标记优惠券。
 * 这是 quick-order/create 的订单详情版。
 * 
 * @body { address_id: number, coupon_ids?: number[], payment_method: string }
 */

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

// ============================================================
// calculateShipping - 计算运费
// ============================================================
async function calculateShipping(city: string): Promise<number> {
  try {
    const shippingResult = await query(`
      SELECT shipping_fee FROM shipping_rates
      WHERE city = ? AND is_active = 1 LIMIT 1
    `, [city]);
    if (shippingResult.rows.length > 0) {
      return parseFloat(shippingResult.rows[0].shipping_fee) || 0;
    }
    const defaultShipping = await query(`
      SELECT shipping_fee FROM shipping_rates
      WHERE is_default = 1 AND is_active = 1 LIMIT 1
    `);
    if (defaultShipping.rows.length > 0) {
      return parseFloat(defaultShipping.rows[0].shipping_fee) || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

// ============================================================
// applyCouponDiscount - 应用单个优惠券折扣
// ============================================================
async function applyCouponDiscount(
  couponId: number, userId: number, subtotal: number
): Promise<{ discount: number; couponCode?: string }> {
  const couponResult = await query(`
    SELECT c.type, c.value, c.code
    FROM user_coupons uc
    JOIN coupons c ON uc.coupon_id = c.id
    WHERE uc.id = ? AND uc.user_id = ? AND uc.status = 'active'
      AND datetime('now') < uc.expires_at AND c.is_active = 1
  `, [couponId, userId]);

  if (couponResult.rows.length === 0) {
    return { discount: 0 };
  }

  const coupon = couponResult.rows[0];
  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = subtotal * (parseFloat(coupon.value) / 100);
  } else if (coupon.type === 'fixed') {
    discount = parseFloat(coupon.value);
  }
  discount = Math.min(discount, subtotal);
  return { discount, couponCode: coupon.code };
}

// ============================================================
// POST handler
// ============================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const lang = getLangFromRequest(request);

  logMonitor('ORDERS', 'REQUEST', {
    method: 'POST',
    path: '/api/orders/[id]/prepare-payment',
    lang
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('ORDERS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const { id } = await params;
    const orderId = id;
    const userId = authResult.user.userId;

    const body = await request.json();
    const { address_id, coupon_ids, payment_method } = body;

    if (!address_id || !payment_method) {
      return NextResponse.json(
        { success: false, error: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    // 1. 验证订单
    const orderResult = await query(
      `SELECT id, order_number, total_after_promotions_amount, total_original_price,
              order_final_discount_amount, final_amount, shipping_address_id,
              shipping_fee, order_status, user_id
       FROM orders WHERE id = ? AND user_id = ?`,
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];
    if (order.order_status !== 'pending') {
      return NextResponse.json(
        { success: false, error: '只有待支付订单可以提交' },
        { status: 400 }
      );
    }

    // 2. 验证地址
    const addressResult = await query(`
      SELECT id, contact_name, phone, street_address, city, country_name
      FROM addresses WHERE id = ? AND user_id = ?
    `, [address_id, userId]);

    if (addressResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ADDRESS_NOT_FOUND' },
        { status: 404 }
      );
    }

    const address = addressResult.rows[0];
    const shippingFee = await calculateShipping(address.city);

    // 3. 计算价格
    const subtotal = Number(order.total_after_promotions_amount) || 0;
    const originalTotal = Number(order.total_original_price) || 0;
    const productDiscount = Math.max(0, originalTotal - subtotal);

    let couponDiscount = 0;
    let couponIdsJson = '[]';
    const appliedCouponDetails: Array<{
      id: number;
      discount: number;
      code: string;
    }> = [];

    if (coupon_ids && coupon_ids.length > 0) {
      for (const couponId of coupon_ids) {
        const { discount, couponCode } = await applyCouponDiscount(
          couponId, userId, subtotal
        );
        couponDiscount += discount;
        if (couponCode) {
          appliedCouponDetails.push({
            id: couponId,
            discount,
            code: couponCode,
          });
        }
      }
      couponIdsJson = JSON.stringify(coupon_ids);
    }

    const finalAmount = subtotal + shippingFee - couponDiscount;
    const finalDiscountAmount = productDiscount + couponDiscount;

    // 4. 更新订单
    await query(
      `UPDATE orders SET
        payment_method = ?,
        shipping_address_id = ?,
        shipping_fee = ?,
        coupon_ids = ?,
        total_coupon_discount = ?,
        order_final_discount_amount = ?,
        final_amount = ?,
        updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [
        payment_method, address_id, shippingFee, couponIdsJson,
        couponDiscount, finalDiscountAmount, finalAmount,
        orderId, userId
      ]
    );

    // 5. 标记优惠券已使用
    if (coupon_ids && coupon_ids.length > 0) {
      for (const couponId of coupon_ids) {
        await query(
          `UPDATE user_coupons SET status = 'used', used_order_id = ?
           WHERE id = ? AND user_id = ?`,
          [orderId, couponId, userId]
        );
        await query(
          `INSERT INTO order_coupons (order_id, coupon_id, user_id, discount_applied, status, applied_at)
           VALUES (?, ?, ?, ?, 'applied', datetime('now'))`,
          [orderId, couponId, userId, 0]
        );
      }
    }

    // 6. 查询 order_items 用于返回
    const itemsResult = await query(
      `SELECT oi.*, p.name as product_name, p.name_en as product_name_en,
              p.image as product_image
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'PREPARE_PAYMENT',
      orderId,
      orderNumber: order.order_number,
      addressId: address_id,
      paymentMethod: payment_method,
      shippingFee,
      couponDiscount,
      finalAmount
    });

    return NextResponse.json({
      success: true,
      data: {
        order_id: Number(orderId),
        order_number: order.order_number,
        payment_method,
        shipping_fee: shippingFee,
        product_discount: productDiscount,
        coupon_discount: couponDiscount,
        total_discount: finalDiscountAmount,
        final_amount: finalAmount,
        address: {
          id: address.id,
          name: address.contact_name,
          phone: address.phone,
          address: address.street_address,
          city: address.city,
          country: address.country_name,
        },
        coupons: appliedCouponDetails,
        items: (itemsResult.rows || []).map((item: any) => ({
          product_id: item.product_id,
          name: item.product_name || item.product_name_en || '',
          quantity: item.quantity,
          original_price: item.original_price,
          unit_amount: item.original_price,
          price: item.original_price,
        })),
      }
    });

  } catch (error) {
    logMonitor('ORDERS', 'ERROR', {
      action: 'PREPARE_PAYMENT',
      error: String(error)
    });
    console.error('Error in prepare-payment API:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
```

- [ ] **步骤 2：验证 API**

```bash
# 创建订单后测试
curl -s -b /tmp/cookies.txt -X POST \
  http://localhost:3000/api/orders/<ORDER_ID>/prepare-payment \
  -H 'Content-Type: application/json' \
  -d '{"address_id":2,"payment_method":"paypal"}' | python3 -m json.tool
```

预期：返回 `success: true`，`data.final_amount` 已含运费和折扣。

- [ ] **步骤 3：Commit**

```bash
git add src/app/api/orders/[id]/prepare-payment/route.ts
git commit -m "feat: add prepare-payment API for order detail page"
```

---

### 任务 5：重写订单详情页（完整功能选择）

**文件：**
- 重写：`src/app/orders/[id]/page.tsx`

这是最大的改动。订单详情页要有：
1. 地址选择器（可切换）
2. 优惠券选择器（可选可用券，带 tab：可用/已过期/已使用/未领取）
3. 支付方式选择器（保留）
4. 价格重算显示
5. 提交按钮 → prepare-payment → payment API

- [ ] **步骤 1：读取当前文件确认行数**

```bash
wc -l src/app/orders/[id]/page.tsx
```

- [ ] **步骤 2：完整替换文件内容**

由于这是一个完整的页面重写（>400 行），我将分块写入。

**第一部分（1-80 行）：import + 接口定义 + 工具函数**

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';

// ============ 接口定义 ============

interface OrderDetailItem {
  id: number;
  product_id: number;
  product_name: string;
  product_name_en?: string;
  product_image: string;
  quantity: number;
  original_price: number;
  total_promotions_discount_amount: number;
}

interface PaymentLogEntry {
  id: number;
  transaction_id: string;
  amount: number;
  status: string;
  error_code: string;
  error_message: string;
  is_success: boolean;
  created_at: string;
}

interface OrderDetail {
  id: number;
  order_number: string;
  order_status: string;
  payment_status: string;
  payment_method: string;
  total_original_price: number;
  total_after_promotions_amount: number;
  order_final_discount_amount: number;
  total_coupon_discount: number;
  shipping_fee: number;
  final_amount: number;
  created_at: string;
  updated_at: string;
  address_name: string;
  address_phone: string;
  address_detail: string;
  items: OrderDetailItem[];
  payment_logs: PaymentLogEntry[];
}

interface Address {
  id: number;
  contact_name: string;
  phone: string;
  street_address: string;
  city: string;
  country_name: string;
  is_default: number;
}

interface CouponItem {
  id: number;
  coupon_id: number;
  code: string;
  name: string;
  type: string;
  value: number;
  is_stackable: number;
  permanent_days: number;
  description: string;
  expires_at: string;
}
```

**第二部分（81-170 行）：formatPrice + statusLabels + 组件**

```typescript
const formatPrice = (amount: number) => {
  return `$${Number(amount).toFixed(2)} / ¥${(Number(amount) * 7.19).toFixed(2)} / AED${(Number(amount) / 0.2722).toFixed(2)}`;
};

const formatPriceSimple = (amount: number, currency?: string) => {
  if (currency === 'CNY') return `¥${Number(amount).toFixed(2)}`;
  return `$${Number(amount).toFixed(2)}`;
};

const statusLabels: Record<string, { zh: string; color: string }> = {
  pending: { zh: '待支付', color: 'bg-yellow-100 text-yellow-800' },
  paid: { zh: '已支付', color: 'bg-green-100 text-green-800' },
  cancelled: { zh: '已取消', color: 'bg-red-100 text-red-800' },
  shipped: { zh: '已发货', color: 'bg-blue-100 text-blue-800' },
  delivered: { zh: '已签收', color: 'bg-purple-100 text-purple-800' },
  refunding: { zh: '退款中', color: 'bg-orange-100 text-orange-800' },
  refunded: { zh: '已退款', color: 'bg-gray-100 text-gray-800' },
};

// ============ 组件 ============

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const orderId = params.id as string;

  // 订单数据
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // 地址
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  // 优惠券
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [usedCoupons, setUsedCoupons] = useState<CouponItem[]>([]);
  const [expiredCoupons, setExpiredCoupons] = useState<CouponItem[]>([]);
  const [claimableCoupons, setClaimableCoupons] = useState<CouponItem[]>([]);
  const [couponTab, setCouponTab] = useState<'available' | 'expired' | 'used' | 'claimable'>('available');
  const [selectedCouponIds, setSelectedCouponIds] = useState<number[]>([]);

  // 支付方式
  const [selectedPayment, setSelectedPayment] = useState<'paypal' | 'alipay' | 'stripe'>('paypal');
```

**第三部分（171-260 行）：fetchOrder + fetchAddresses + fetchCoupons**

```typescript
  // ============ 数据加载 ============

  const fetchOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setOrder(data.data);
      } else {
        setError(data.error || '订单不存在');
      }
    } catch {
      setError('加载订单失败');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch('/api/addresses', { credentials: 'include' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAddresses(data.data);
        // 自动选默认地址（如果还没选）
        setSelectedAddressId(prev => {
          if (prev) return prev;
          const def = data.data.find((a: Address) => a.is_default);
          return def?.id || data.data[0]?.id || null;
        });
      }
    } catch { /* ignore */ }
  }, []);

  const fetchCoupons = useCallback(async () => {
    if (!user) return;
    try {
      // 获取用户所有券（active=可用的）
      const activeRes = await fetch(
        `/api/coupons?status=active&limit=100`,
        { headers: { 'x-user-id': String(user.id) } }
      );
      const activeData = await activeRes.json();
      if (activeData.success) {
        setCoupons(
          (activeData.data?.user_coupons || []).map((c: any) => ({
            id: c.id,
            coupon_id: c.coupon_id,
            code: c.code,
            name: c.name,
            type: c.type,
            value: c.value,
            is_stackable: c.is_stackable ?? 0,
            permanent_days: c.permanent_days || 0,
            description: c.description || '',
            expires_at: c.expires_at,
          }))
        );
      }
      // 已使用
      const usedRes = await fetch(
        `/api/coupons?status=used&limit=100`,
        { headers: { 'x-user-id': String(user.id) } }
      );
      const usedData = await usedRes.json();
      if (usedData.success) {
        setUsedCoupons(
          (usedData.data?.user_coupons || []).map((c: any) => ({
            id: c.id, coupon_id: c.coupon_id, code: c.code,
            name: c.name, type: c.type, value: c.value,
            is_stackable: c.is_stackable ?? 0, permanent_days: c.permanent_days || 0,
            description: c.description || '', expires_at: c.expires_at,
          }))
        );
      }
      // 已过期
      const expiredRes = await fetch(
        `/api/coupons?status=expired&limit=100`,
        { headers: { 'x-user-id': String(user.id) } }
      );
      const expiredData = await expiredRes.json();
      if (expiredData.success) {
        setExpiredCoupons(
          (expiredData.data?.user_coupons || []).map((c: any) => ({
            id: c.id, coupon_id: c.coupon_id, code: c.code,
            name: c.name, type: c.type, value: c.value,
            is_stackable: c.is_stackable ?? 0, permanent_days: c.permanent_days || 0,
            description: c.description || '', expires_at: c.expires_at,
          }))
        );
      }
      // 未领取
      const claimRes = await fetch(
        `/api/coupons?status=available&limit=100`,
        { headers: { 'x-user-id': String(user.id) } }
      );
      const claimData = await claimRes.json();
      if (claimData.success) {
        setClaimableCoupons(
          (claimData.data?.available_coupons || []).map((c: any) => ({
            id: 0, coupon_id: c.id, code: c.code,
            name: c.name, type: c.type, value: c.value,
            is_stackable: c.is_stackable ?? 0, permanent_days: c.permanent_days || 0,
            description: c.description || '', expires_at: c.end_date,
          }))
        );
      }
    } catch { /* ignore */ }
  }, [user]);
```

**第四部分（261-380 行）：useEffect + 券选择逻辑 + 领取券**

```typescript
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/orders/${orderId}`);
      return;
    }
    fetchOrder();
    fetchAddresses();
    fetchCoupons();
  }, [orderId, user, authLoading, router, fetchOrder, fetchAddresses, fetchCoupons]);

  // ============ 优惠券选择逻辑 ============

  const handleCouponSelect = (coupon: CouponItem) => {
    const isSelected = selectedCouponIds.includes(coupon.id);
    if (isSelected) {
      setSelectedCouponIds(prev => prev.filter(id => id !== coupon.id));
      return;
    }
    // 如果已选中不可叠加券，不允许再加
    const hasNonStackable = selectedCouponIds.some(id => {
      const c = coupons.find(x => x.id === id);
      return c && c.is_stackable === 0;
    });
    if (hasNonStackable) return;
    if (coupon.is_stackable === 0) {
      setSelectedCouponIds([coupon.id]);
      return;
    }
    setSelectedCouponIds(prev => [...prev, coupon.id]);
  };

  const handleReceiveCoupon = async (couponId: number) => {
    if (!user) return;
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({ coupon_id: couponId }),
      });
      if (res.ok) {
        fetchCoupons();
        setCouponTab('available');
      }
    } catch { /* ignore */ }
  };
```

**第五部分（381-520 行）：handleSubmit 提交逻辑（prepare-payment → payment API） + handleCancel**

```typescript
  // ============ 提交支付 ============

  const handleSubmit = async () => {
    if (!order || !selectedAddressId) {
      alert('请选择收货地址');
      return;
    }
    setIsPaying(true);

    try {
      // 1. 调用 prepare-payment 更新订单（地址、券、价格）
      const prepareRes = await fetch(`/api/orders/${order.id}/prepare-payment`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address_id: selectedAddressId,
          coupon_ids: selectedCouponIds.length > 0 ? selectedCouponIds : undefined,
          payment_method: selectedPayment,
        }),
      });

      const prepareData = await prepareRes.json();
      if (!prepareRes.ok || !prepareData.success) {
        alert(prepareData.error || '订单更新失败');
        setIsPaying(false);
        return;
      }

      const pd = prepareData.data;

      // 2. 调用支付 API
      const paymentPayload: any = {
        amount: pd.final_amount,
        currency: selectedPayment === 'alipay' ? 'CNY' : 'USD',
        order_number: pd.order_number,
        order_id: pd.order_id,
        source: 're-pay',
        items: pd.items || [],
      };

      const payRes = await fetch(`/api/payments/${selectedPayment}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(paymentPayload),
      });

      const payData = await payRes.json();
      if (payData.success) {
        if (payData.data?.redirect_url) {
          window.location.href = payData.data.redirect_url;
        } else if (payData.data?.payment_url) {
          window.location.href = payData.data.payment_url;
        } else {
          alert('支付创建失败：未获取到支付链接');
        }
      } else {
        alert(payData.error || '支付创建失败');
      }
    } catch {
      alert('支付请求失败');
    } finally {
      setIsPaying(false);
    }
  };

  // ============ 取消订单 ============

  const handleCancel = async () => {
    if (!order) return;
    if (!confirm('确定要取消这个订单吗？取消后库存和优惠券将自动归还。')) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOrder();
      } else {
        alert(data.error || '取消失败');
      }
    } catch {
      alert('取消请求失败');
    } finally {
      setIsCancelling(false);
    }
  };
```

**第六部分（521-680 行）：Loading + Error + 已取消/已完成订单的只读展示**

```typescript
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center">
        <p className="text-[var(--text-muted)] mb-4">{error || '订单不存在'}</p>
        <button onClick={() => router.push('/account?tab=orders')}
          className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg">
          返回订单列表
        </button>
      </div>
    );
  }

  const statusInfo = statusLabels[order.order_status] || { zh: order.order_status, color: 'bg-gray-100 text-gray-800' };
  const isPending = order.order_status === 'pending';

  // 计算预估价格（用于前端展示，最终价格由 API 返回）
  const calculateEstimatedPrice = () => {
    const subtotal = order.total_after_promotions_amount || order.final_amount;
    const shipping = 0; // 前端不计算运费，留给 API
    let couponDisc = 0;
    if (selectedCouponIds.length > 0) {
      selectedCouponIds.forEach(id => {
        const c = coupons.find(x => x.id === id);
        if (c) {
          if (c.type === 'percentage') {
            couponDisc += subtotal * (c.value / 100);
          } else if (c.type === 'fixed') {
            couponDisc += c.value;
          }
        }
      });
    }
    return Math.max(0, subtotal + shipping - couponDisc);
  };

  const estimatedFinal = calculateEstimatedPrice();
  const hasPromotionDiscount = order.order_final_discount_amount > 0 && order.total_coupon_discount === 0;
  const hasCouponDiscount = order.total_coupon_discount > 0;
  const activeDiscountAmount = hasPromotionDiscount ? order.order_final_discount_amount : 0;
  const activeCouponAmount = hasCouponDiscount ? order.total_coupon_discount : order.order_final_discount_amount;
```

**第七部分（681-end 行）：JSX 渲染 —— 完整页面**

JSX 结构：
1. 页面头部（返回按钮 + 标题 + 状态标签）
2. 订单信息卡片
3. **地址选择卡片**（pending 时可切换，非 pending 时只读）
4. 商品清单卡片
5. 价格明细卡片
6. **优惠券选择卡片**（pending 时显示，含 tab 切换）
7. **支付方式选择卡片**（pending 时显示）
8. 支付记录卡片（如有）
9. 操作按钮区（提交订单 + 取消订单，或跳转 quick-order 修改）

```tsx
  return (
    <div className="min-h-screen bg-[var(--background)] py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ===== 页面头部 ===== */}
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => router.back()}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-2 cursor-pointer">
              ← 返回
            </button>
            <h1 className="text-2xl font-bold text-[var(--text)]">订单详情</h1>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.zh}
          </span>
        </div>

        {/* ===== 订单信息 ===== */}
        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">订单信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-[var(--text-muted)]">订单号：</span><span className="font-mono">{order.order_number}</span></div>
            <div><span className="text-[var(--text-muted)]">支付方式：</span>{order.payment_method?.toUpperCase() || '—'}</div>
            <div><span className="text-[var(--text-muted)]">下单时间：</span>{order.created_at ? new Date(order.created_at).toLocaleString('zh-CN') : '—'}</div>
            <div><span className="text-[var(--text-muted)]">更新时间：</span>{order.updated_at ? new Date(order.updated_at).toLocaleString('zh-CN') : '—'}</div>
          </div>
        </div>

        {/* ===== 收货地址（可切换） ===== */}
        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">收货地址</h2>
          {isPending && addresses.length > 0 ? (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedAddressId === addr.id
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                      : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedAddressId === addr.id
                        ? 'border-[var(--accent)] bg-[var(--accent)]'
                        : 'border-[var(--border)]'
                    }`}>
                      {selectedAddressId === addr.id && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text)]">{addr.contact_name}</span>
                        <span className="text-[var(--text-muted)]">{addr.phone}</span>
                        {addr.is_default === 1 && (
                          <span className="text-xs bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-0.5 rounded">默认</span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--text-muted)] mt-1">
                        {addr.street_address}, {addr.city}, {addr.country_name}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[var(--text)]">
              <p className="font-medium">{order.address_name} <span className="text-[var(--text-muted)] ml-2">{order.address_phone}</span></p>
              <p className="text-[var(--text-muted)] mt-1">{order.address_detail}</p>
            </div>
          )}
        </div>

        {/* ===== 商品信息 ===== */}
        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">商品信息</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 py-3 border-b border-[var(--border)] last:border-0">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {item.product_image ? (
                    <Image src={item.product_image} alt={item.product_name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🏺</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.product_id}`} className="font-medium text-[var(--text)] hover:text-[var(--accent)]">
                    {item.product_name}
                  </Link>
                  {item.product_name_en && <p className="text-xs text-[var(--text-muted)]">{item.product_name_en}</p>}
                  <p className="text-sm text-[var(--text-muted)] mt-1">x{item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-[var(--text)]">{formatPrice(item.original_price * item.quantity)}</p>
                  {item.total_promotions_discount_amount > 0 && (
                    <p className="text-xs text-green-600">-{formatPrice(item.total_promotions_discount_amount)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ===== 价格明细 ===== */}
          <div className="mt-6 pt-4 border-t border-[var(--border)] space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">商品原价</span>
              <span className="text-[var(--text)]">{formatPrice(order.total_original_price)}</span>
            </div>
            {activeDiscountAmount > 0 && !hasCouponDiscount && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">促销折扣</span>
                <span className="text-green-600">-{formatPrice(activeDiscountAmount)}</span>
              </div>
            )}
            {hasCouponDiscount && order.total_coupon_discount > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">优惠券</span>
                <span className="text-green-600">-{formatPrice(order.total_coupon_discount)}</span>
              </div>
            )}
            {order.order_final_discount_amount > 0 && hasCouponDiscount && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">总折扣</span>
                <span className="text-green-600">-{formatPrice(order.order_final_discount_amount)}</span>
              </div>
            )}
            {/* Pending 状态下显示预估 */}
            {isPending && selectedCouponIds.length > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">预估券折扣</span>
                <span className="text-green-600">
                  -{formatPriceSimple(
                    selectedCouponIds.reduce((sum, id) => {
                      const c = coupons.find(x => x.id === id);
                      if (!c) return sum;
                      const subtotal = order.total_after_promotions_amount || order.final_amount;
                      if (c.type === 'percentage') return sum + subtotal * (c.value / 100);
                      return sum + c.value;
                    }, 0)
                  )}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">运费</span>
              <span className="text-[var(--text)]">{order.shipping_fee > 0 ? formatPrice(order.shipping_fee) : '免运费'}</span>
            </div>
            {isPending && selectedCouponIds.length > 0 && (
              <div className="flex justify-between pt-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
                <span>预估应付（实际以提交为准）</span>
                <span className="font-bold text-[var(--accent)]">{formatPriceSimple(estimatedFinal)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-[var(--border)] font-bold text-lg">
              <span>应付总额</span>
              <span className="text-[var(--accent)]">{formatPrice(order.final_amount)}</span>
            </div>
          </div>
        </div>

        {/* ===== 优惠券选择（仅 pending） ===== */}
        {isPending && (
          <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4">选择优惠券</h2>
            {/* 不使用优惠券 */}
            <div onClick={() => setSelectedCouponIds([])}
              className={`p-4 border rounded-lg transition-all mb-3 cursor-pointer ${
                selectedCouponIds.length === 0
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                  : 'border-[var(--border)] hover:border-[var(--accent)]/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedCouponIds.length === 0
                    ? 'border-[var(--accent)] bg-[var(--accent)]'
                    : 'border-[var(--border)]'
                }`}>
                  {selectedCouponIds.length === 0 && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-[var(--text)]">不使用优惠券</span>
              </div>
            </div>

            {/* Tab 切换 */}
            <div className="flex border-b mb-4" style={{ borderColor: 'var(--border)' }}>
              {[
                ['available', `可用 (${coupons.length})`],
                ['expired', `已过期 (${expiredCoupons.length})`],
                ['used', `已使用 (${usedCoupons.length})`],
                ['claimable', `未领取 (${claimableCoupons.length})`],
              ].map(([key, label]) => (
                <button key={key}
                  onClick={() => setCouponTab(key as typeof couponTab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    couponTab === key ? 'border-[var(--accent)]' : 'border-transparent'
                  }`}
                  style={{ color: couponTab === key ? 'var(--accent)' : 'var(--text-muted)' }}
                >{label}</button>
              ))}
            </div>

            {/* 优惠券列表 */}
            <div className="grid grid-cols-2 gap-3">
              {couponTab === 'available' && coupons.length === 0 && (
                <div className="col-span-2 text-center py-4 text-[var(--text-muted)]">暂无可用优惠券</div>
              )}
              {couponTab === 'available' && coupons.map((c) => {
                const isSelected = selectedCouponIds.includes(c.id);
                const discountText = c.type === 'percentage' ? `${c.value}%` : `$${c.value}`;
                const daysLeft = Math.max(0, Math.ceil(
                  (new Date(c.expires_at).getTime() - Date.now()) / 86400000
                ));
                const isDisabled = !isSelected && selectedCouponIds.length > 0
                  && selectedCouponIds.some(id => {
                    const x = coupons.find(q => q.id === id);
                    return x?.is_stackable === 0 || c.is_stackable === 0;
                  });

                return (
                  <div key={c.id}
                    onClick={() => !isDisabled && handleCouponSelect(c)}
                    style={{ backgroundColor: 'var(--card)' }}
                    className={`rounded-lg overflow-hidden border transition-all ${
                      isSelected
                        ? 'border-[var(--accent)] shadow-lg cursor-pointer'
                        : isDisabled
                        ? 'border-[var(--border)] opacity-50 cursor-not-allowed'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/40 cursor-pointer shadow-md'
                    }`}
                  >
                    <div className="flex h-full">
                      <div className={`w-[100px] shrink-0 p-2 flex flex-col items-center justify-center ${
                        isSelected ? 'bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)]' : 'bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]'
                      }`}>
                        <span className="text-white text-[10px] font-bold text-center leading-tight">{c.name}</span>
                      </div>
                      <div className="flex-1 p-2">
                        <div className="flex justify-between items-start">
                          <span className="text-[var(--accent)] font-bold text-sm">{discountText}</span>
                          {isSelected && <span className="text-green-500 text-xs">✓</span>}
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)]">{c.code}</p>
                        <p className="text-[10px] mt-1 text-[var(--text)] truncate">{c.description}</p>
                        <span className="text-[10px] text-[var(--text-muted)] bg-gray-100 px-1 py-0.5 rounded">剩{daysLeft}天</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {couponTab === 'expired' && expiredCoupons.length === 0 && (
                <div className="col-span-2 text-center py-4 text-[var(--text-muted)]">无已过期优惠券</div>
              )}
              {couponTab === 'expired' && expiredCoupons.map((c) => (
                <div key={c.id} className="rounded-lg border border-[var(--border)] opacity-50 p-3">
                  <p className="text-xs font-medium text-gray-400">{c.name}</p>
                  <p className="text-[10px] text-gray-400">{c.code}</p>
                </div>
              ))}

              {couponTab === 'used' && usedCoupons.length === 0 && (
                <div className="col-span-2 text-center py-4 text-[var(--text-muted)]">无已使用优惠券</div>
              )}
              {couponTab === 'used' && usedCoupons.map((c) => (
                <div key={c.id} className="rounded-lg border border-[var(--border)] opacity-50 p-3">
                  <p className="text-xs font-medium text-gray-400">{c.name}（已使用）</p>
                  <p className="text-[10px] text-gray-400">{c.code}</p>
                </div>
              ))}

              {couponTab === 'claimable' && claimableCoupons.length === 0 && (
                <div className="col-span-2 text-center py-4 text-[var(--text-muted)]">无可领取优惠券</div>
              )}
              {couponTab === 'claimable' && claimableCoupons.map((c) => (
                <div key={c.coupon_id} className="rounded-lg border border-green-200 bg-green-50 p-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-medium text-green-700">{c.name}</p>
                    <p className="text-[10px] text-green-600">{c.code}</p>
                  </div>
                  <button onClick={() => handleReceiveCoupon(c.coupon_id)}
                    className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer">
                    领取
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 支付方式（仅 pending） ===== */}
        {isPending && (
          <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4">支付方式</h2>
            <div className="space-y-3">
              {[
                ['paypal', 'PayPal', '(美元支付)'],
                ['alipay', '支付宝', '(人民币支付)'],
                ['stripe', 'Stripe', '(美元支付)'],
              ].map(([key, name, hint]) => (
                <div key={key}
                  onClick={() => setSelectedPayment(key as 'paypal' | 'alipay' | 'stripe')}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedPayment === key
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                      : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPayment === key
                        ? 'border-[var(--accent)] bg-[var(--accent)]'
                        : 'border-[var(--border)]'
                    }`}>
                      {selectedPayment === key && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-[var(--text)]">{name}</span>
                    <span className="text-sm opacity-60">{hint}</span>
                    <span className="font-bold text-[var(--accent)] ml-auto">
                      {selectedPayment === 'alipay'
                        ? `¥${(order.final_amount * 7.19).toFixed(2)} CNY`
                        : `$${Number(order.final_amount).toFixed(2)} USD`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 支付记录 ===== */}
        {order.payment_logs && order.payment_logs.length > 0 && (
          <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4">支付记录</h2>
            <div className="space-y-3">
              {order.payment_logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 text-sm">
                  <div className="flex items-center gap-3">
                    <span className={log.is_success ? 'text-green-500' : 'text-red-500'}>
                      {log.is_success ? '✅' : '❌'}
                    </span>
                    <span className="text-[var(--text)]">{log.status}</span>
                    {log.error_message && (
                      <span className="text-red-500 text-xs">{log.error_message}</span>
                    )}
                  </div>
                  <div className="text-[var(--text-muted)] text-xs">
                    {log.created_at ? new Date(log.created_at).toLocaleString('zh-CN') : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 操作按钮（仅 pending） ===== */}
        {isPending && (
          <div className="flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={isPaying || !selectedAddressId}
              className="flex-1 py-3 rounded-lg text-white font-bold text-lg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
            >
              {isPaying ? '提交中...' : (
                selectedPayment === 'alipay'
                  ? `提交订单 (¥${(order.final_amount * 7.19).toFixed(2)} CNY)`
                  : `提交订单 ($${Number(order.final_amount).toFixed(2)} USD)`
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="px-6 py-3 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isCancelling ? '取消中...' : '取消订单'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **步骤 3：验证页面**

浏览器访问 `http://localhost:3000/orders/126`：
- 应看到地址选择卡片（可点击切换）
- 应看到优惠券选择卡片（含 tab 切换）
- 应看到支付方式卡片（PayPal/支付宝/Stripe）
- 点击"提交订单"应先调 prepare-payment，再跳转 PayPal

- [ ] **步骤 4：Commit**

```bash
git add src/app/orders/[id]/page.tsx
git commit -m "feat: order detail page with full address/coupon/payment selection"
```

---

### 任务 6：修正 coupon_ids 语义混乱

**文件：**
- 修改：`src/app/api/inventory/reserve/route.ts:344-345`

- [ ] **步骤 1：inventory/reserve 创建订单时不往 coupon_ids 写 promotion IDs**

将 [inventory/reserve:L345](file:///Users/davis/zisha-ecommerce/src/app/api/inventory/reserve/route.ts#L345)：

```typescript
promotionIdsJson,  // ❌ 这句删掉
```

改为：

```typescript
'[]',  // coupon_ids 初始化空数组，促销信息已在 order_items.promotion_ids 中
```

完整改法是 `INSERT INTO orders` 中第 345 行 `promotionIdsJson` 改为 `'[]'`：

```typescript
const orderInsertResult = await query(
  `INSERT INTO orders (
    user_id, order_number, total_after_promotions_amount, total_original_price, shipping_fee,
    order_final_discount_amount, payment_method, payment_status, order_status,
    shipping_address_id, coupon_ids, total_coupon_discount, final_amount,
    notes, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
  [
    userId, orderNumber, totalAmount, totalOriginalPrice,
    0, discountAmount, '', 'pending', 'pending', null,
    '[]',  // ← 由 promotionIdsJson 改为 '[]'
    0, finalAmount, null
  ]
);
```

- [ ] **步骤 2：验证**

创建新订单后检查数据库：

```bash
sqlite3 src/lib/db/database.sqlite \
  "SELECT id, order_number, coupon_ids FROM orders ORDER BY id DESC LIMIT 1;"
```

预期：coupon_ids = `[]`，不再包含 promotion IDs。

- [ ] **步骤 3：Commit**

```bash
git add src/app/api/inventory/reserve/route.ts
git commit -m "fix: coupon_ids column no longer stores promotion IDs"
```

---

## 验证清单

全部修改完成后，完整回归测试：

```bash
# 1. 登录
curl -s -c /tmp/cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"123456"}'

# 2. 创建订单
curl -s -b /tmp/cookies.txt -X POST http://localhost:3000/api/inventory/reserve \
  -H 'Content-Type: application/json' \
  -d '{"product_id":1,"quantity":1}' | python3 -m json.tool

# 3. 检查 coupon_ids 为空数组
sqlite3 src/lib/db/database.sqlite \
  "SELECT id, coupon_ids FROM orders ORDER BY id DESC LIMIT 1;"

# 4. 准备支付（传入地址）
curl -s -b /tmp/cookies.txt -X POST \
  "http://localhost:3000/api/orders/<ORDER_ID>/prepare-payment" \
  -H 'Content-Type: application/json' \
  -d '{"address_id":2,"payment_method":"paypal"}' | python3 -m json.tool

# 5. PayPal 支付
curl -s -b /tmp/cookies.txt -X POST http://localhost:3000/api/payments/paypal \
  -H 'Content-Type: application/json' \
  -d '{"amount":59.13,"currency":"USD","order_number":"<ORD_NUM>","order_id":<ID>,"source":"re-pay","items":[{"product_id":1,"name":"test","quantity":1,"unit_amount":84.47,"price":84.47}]}' | python3 -m json.tool

# 6. 取消订单（确认还券）
curl -s -b /tmp/cookies.txt -X PATCH \
  "http://localhost:3000/api/orders/<ORDER_ID>" \
  -H 'Content-Type: application/json' \
  -d '{"action":"cancel"}' | python3 -m json.tool

# 7. 退款申请
curl -s -b /tmp/cookies.txt -X POST \
  "http://localhost:3000/api/orders/<PAID_ORDER_ID>/refund" | python3 -m json.tool
```

---

## 版本记录

| 版本 | 日期 | 内容 |
|------|------|------|
| 1.0 | 2026-05-03 | 初始版本 |
</parameter>
</｜DSML｜invoke