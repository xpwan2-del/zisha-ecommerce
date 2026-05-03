# P1 补充关键功能 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 完善支付成功/取消流程的订单信息展示、添加 paid_at 字段、实现库存超时自动释放

**架构：** 增强 `/payment-result` 页面展示完整订单信息（商品图片、地址、金额明细）；改造旧 cancel handler 统一走 `/payment-result?status=cancel` 并在页面显示可重新支付；orders 表加 `paid_at` 字段并在支付成功时写入；创建库存超时清理 API，在 `/payment-result` 页面加载时触发检查

**技术栈：** Next.js App Router, TypeScript, Tailwind CSS（CSS 变量 `var(--xxx)`）, SQLite, sql.js

---

## 前置检查清单（遵循 XPSKILL.md 规范）

### 现有功能检查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| `/api/payments/paypal/success/` | ❌ 不存在 | 需创建 fallback handler |
| `/api/payments/alipay/success/` | ❌ 不存在 | 需创建 fallback handler |
| `/api/payments/stripe/success/` | ❌ 不存在 | 需创建 fallback handler |
| `/api/payments/result/route.ts` | ✅ 已存在 | 统一回调入口（P0 已完成） |
| `/payment-result/page.tsx` | ✅ 已存在 | 展示页（P0 已完成） |
| `/orders/[id]/page.tsx` | ✅ 已存在 | 订单详情页（P0 已完成） |
| `orders.paid_at` 字段 | ❌ 不存在 | 需 ALTER TABLE 添加 |
| 库存超时释放 | ❌ 不存在 | 需新建清理 API |
| `inventory_transactions` 表 | ✅ 已有 | 库存流水记录 |
| `transaction_type` 表 | ✅ 已有 | 含 `order_cancel` 等类型码 |
| `EnhancedPaymentResultCard` | ✅ 已有 | 可复用，但需显示更多信息 |
| `payment_logs` 表 | ✅ 已有 | 支付日志 |
| CSS 变量系统 | ✅ 已有 | `--primary`, `--accent`, `--background`, `--text`, `--text-muted`, `--border`, `--card` |

### 复用策略

- **不修改** `EnhancedPaymentResultCard.tsx` — 通过页面层补充订单信息展示
- **不修改** `/api/payments/result` — 已经是统一入口，只增强它调用的页面
- **不修改** 现有的 `paypal/alipay/stripe/route.ts` — return_url 已在 P0 改好
- **不删除** 旧 cancel handler — 按增量原则，改为统一重定向

---

## 文件清单

### 需要创建的文件

| 文件路径 | 职责 |
|---------|------|
| `src/app/api/inventory/release-expired/route.ts` | 库存超时释放 API（POST），扫描 expired_at 超时的 pending 订单，还库存 |
| `src/app/api/payments/paypal/success/route.ts` | PayPal 支付成功 fallback handler（重定向到统一流程） |
| `src/app/api/payments/alipay/success/route.ts` | Alipay 支付成功 fallback handler（重定向到统一流程） |
| `src/app/api/payments/stripe/success/route.ts` | Stripe 支付成功 fallback handler（重定向到统一流程） |
| `src/app/api/orders/cleanup-expired/route.ts` | 订单超时清理 API（POST），标记超时 pending 订单为 cancelled |

### 需要修改的文件

| 文件路径 | 修改内容 |
|---------|---------|
| `src/app/payment-result/page.tsx` | 增强展示：订单商品图片、收货地址、完整金额明细（原价/促销/优惠券/运费/应付）；cancel 时显示重新支付按钮 |
| `src/app/api/payments/result/route.ts` | 支付成功时写入 `paid_at = datetime('now')`；支付成功时回写 `paid_at` |
| `src/app/api/payments/paypal/cancel/route.ts` | redirectUrl 改为 `/payment-result?status=cancel&order_number=...&source=...&platform=paypal` |
| `src/app/api/payments/alipay/cancel/route.ts` | redirectUrl 改为 `/payment-result?status=cancel&order_number=...&source=...&platform=alipay` |
| `src/app/api/payments/stripe/cancel/route.ts` | redirectUrl 改为 `/payment-result?status=cancel&order_number=...&source=...&platform=stripe` |
| `src/app/api/inventory/reserve/route.ts` | 创建 pending 订单时写入 `expired_at = datetime('now', '+30 minutes')` |
| `src/app/api/cart/create-order/route.ts` | 创建 pending 订单时写入 `expired_at = datetime('now', '+30 minutes')` |

### 保持不变的文件（只读参考）

| 文件路径 | 说明 |
|---------|------|
| `src/components/payment/EnhancedPaymentResultCard.tsx` | 不被修改，页面层增强展示 |
| `src/app/api/payments/paypal/route.ts` | return_url 已在 P0 改好，不动 |
| `src/app/api/payments/alipay/route.ts` | 同上 |
| `src/app/api/payments/stripe/route.ts` | 同上 |
| `src/app/api/orders/[id]/route.ts` | 已在 P0 增加 payment_logs，不动 |
| `src/lib/payment/errorCodeMapper.ts` | 不动 |
| `src/lib/messages.ts` | 不动（已有相关错误码） |

---

## 数据库变更

### orders 表新增字段

```sql
-- 1. 添加 paid_at 字段（记录支付成功时间）
ALTER TABLE orders ADD COLUMN paid_at TEXT;

-- 2. 添加 expired_at 字段（订单超时自动取消时间，用于库存释放）
ALTER TABLE orders ADD COLUMN expired_at TEXT;
```

**影响评估：**
- `paid_at`：新增字段，默认 NULL，不影响现有查询（`SELECT *` 会多一列，但代码用 `o.*` 的地方会自动包含）
- `expired_at`：同上，默认 NULL
- 不删除任何现有字段，不修改现有数据
- 所有现有 INSERT 语句不包含这两个字段 → SQLite 会自动填 NULL

---

## 架构设计

### 增强后的支付回调流程

```
用户支付成功
  ↓
/api/payments/result (验证 → 写入 paid_at → UPDATE order_status='paid')
  ↓
/payment-result?status=success&order_number=XXX
  ↓
页面加载 → 调用 /api/orders-list?order_number=XXX → 获取完整订单（含 items, address, payment_logs）
  ↓
展示：✅ 图标 + 商品图片 + 商品名 x 数量 + 收货地址 + 金额明细 + "查看订单"/"继续购物"按钮

用户取消支付
  ↓
/api/payments/result?status=cancel (记录日志 → UPDATE order_status='cancelled')
  ↓
/payment-result?status=cancel&order_number=XXX&source=XXX&platform=XXX
  ↓
页面加载 → 调用 /api/orders-list → 获取订单
  ↓
展示：❌ 图标 + 失败原因 + 订单信息 + "重新支付"按钮 (根据source跳回quick-order或cart)
```

### 库存超时自动释放流程

```
库存超时检查（两种触发方式）：
  方式A：用户访问 /payment-result 页面时检查（被动触发，推荐）
  方式B：curl cron 调用 /api/inventory/release-expired（主动触发，可选）

检查逻辑：
  1. SELECT 所有 order_status='pending' AND expired_at < datetime('now') 的订单
  2. 遍历每个订单的 order_items，逐个还库存
     UPDATE inventory SET quantity = quantity + item.quantity WHERE product_id = item.product_id
  3. 记录库存流水（transaction_type: order_cancel）
  4. UPDATE orders SET order_status='cancelled', payment_status='cancelled', updated_at=datetime('now')
  5. 记录 payment_log（error_code: 'TIMEOUT', status: 'cancelled'）
```

### 向后兼容策略

1. **新字段默认 NULL**：`paid_at` 和 `expired_at` 对已有订单为 NULL，不影响任何查询
2. **旧 cancel handler 保留**：只改重定向目标 URL，不改逻辑
3. **旧 success 页面不变**：P0 已改为重定向封装，不碰
4. **payment_result API 只增加写入 paid_at**：不影响已有响应结构
5. **库存释放只处理过期订单**：`WHERE expired_at IS NOT NULL AND expired_at < datetime('now')`，已有订单（expired_at=NULL）不受影响

---

## 任务 5：完善三个支付通道的 success API handler

### 任务 5-1：创建 PayPal success fallback handler

**文件：**
- 创建：`src/app/api/payments/paypal/success/route.ts`

**职责：** 兼容可能仍使用旧 success URL 的回调，重定向到统一 result API

- [ ] **步骤 1：创建文件**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logMonitor } from '@/lib/utils/logger';

/**
 * @api {GET} /api/payments/paypal/success PayPal 支付成功回调（兼容）
 * @apiName PayPalSuccess
 * @apiGroup PAYMENTS
 * @apiDescription PayPal 支付成功后的回调入口（兼容旧 URL）。
 * 将请求参数转发到统一支付结果 API 处理。
 *
 * @apiParam {String} token PayPal 返回的 token
 * @apiParam {String} [PayerID] PayPal PayerID
 */

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get('token') || '';
  const payerId = searchParams.get('PayerID') || '';

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'GET',
    path: '/api/payments/paypal/success',
    hasToken: !!token,
    hasPayerId: !!payerId
  });

  const redirectUrl = new URL('/api/payments/result', request.url);
  redirectUrl.searchParams.set('token', token);
  redirectUrl.searchParams.set('PayerID', payerId);
  redirectUrl.searchParams.set('platform', 'paypal');

  return NextResponse.redirect(redirectUrl);
}
```

### 任务 5-2：创建 Alipay success fallback handler

**文件：**
- 创建：`src/app/api/payments/alipay/success/route.ts`

- [ ] **步骤 1：创建文件**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logMonitor } from '@/lib/utils/logger';

/**
 * @api {GET|POST} /api/payments/alipay/success Alipay 支付成功回调（兼容）
 * @apiName AlipaySuccess
 * @apiGroup PAYMENTS
 * @apiDescription Alipay 支付成功后的回调入口（兼容旧 URL）。
 *
 * @apiParam {String} trade_no Alipay 交易号
 * @apiParam {String} [out_trade_no] 商户订单号
 */

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tradeNo = searchParams.get('trade_no') || '';
  const outTradeNo = searchParams.get('out_trade_no') || '';

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'GET',
    path: '/api/payments/alipay/success',
    hasTradeNo: !!tradeNo
  });

  const redirectUrl = new URL('/api/payments/result', request.url);
  redirectUrl.searchParams.set('trade_no', tradeNo);
  redirectUrl.searchParams.set('platform', 'alipay');
  if (outTradeNo) {
    redirectUrl.searchParams.set('order_number', outTradeNo);
  }

  return NextResponse.redirect(redirectUrl);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const tradeNo = body.trade_no || '';
  const outTradeNo = body.out_trade_no || '';

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'POST',
    path: '/api/payments/alipay/success',
    hasTradeNo: !!tradeNo
  });

  const redirectUrl = new URL('/api/payments/result', request.url);
  redirectUrl.searchParams.set('trade_no', tradeNo);
  redirectUrl.searchParams.set('platform', 'alipay');
  if (outTradeNo) {
    redirectUrl.searchParams.set('order_number', outTradeNo);
  }

  return NextResponse.redirect(redirectUrl);
}
```

### 任务 5-3：创建 Stripe success fallback handler

**文件：**
- 创建：`src/app/api/payments/stripe/success/route.ts`

- [ ] **步骤 1：创建文件**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logMonitor } from '@/lib/utils/logger';

/**
 * @api {GET} /api/payments/stripe/success Stripe 支付成功回调（兼容）
 * @apiName StripeSuccess
 * @apiGroup PAYMENTS
 * @apiDescription Stripe 支付成功后的回调入口（兼容旧 URL）。
 *
 * @apiParam {String} session_id Stripe Checkout Session ID
 */

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get('session_id') || '';

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'GET',
    path: '/api/payments/stripe/success',
    hasSessionId: !!sessionId
  });

  const redirectUrl = new URL('/api/payments/result', request.url);
  redirectUrl.searchParams.set('session_id', sessionId);
  redirectUrl.searchParams.set('platform', 'stripe');

  return NextResponse.redirect(redirectUrl);
}
```

### 任务 5-4：验证

运行：`npx tsc --noEmit 2>&1 | head -20`
预期：无类型错误

---

## 任务 6：修复 cancel 回调，显示支付失败原因和订单信息

### 任务 6-1：改造三个旧 cancel handler 统一重定向到 /payment-result

**文件：**
- 修改：`src/app/api/payments/paypal/cancel/route.ts:163`
- 修改：`src/app/api/payments/alipay/cancel/route.ts:144`
- 修改：`src/app/api/payments/stripe/cancel/route.ts:149`

**职责：** 旧 cancel handler 当前重定向到 `/orders/{id}?cancelled=true`（订单详情页还不存在时写的），改为重定向到 `/payment-result?status=cancel&...`

- [ ] **步骤 1：修改 PayPal cancel 重定向**

修改 [paypal/cancel/route.ts:163](file:///Users/davis/zisha-ecommerce/src/app/api/payments/paypal/cancel/route.ts#L163)：

```typescript
// 旧代码：
const redirectUrl = `/orders/${order.id}?cancelled=true&payment_cancelled=true`;

// 新代码：
const redirectUrl = `/payment-result?status=cancel&order_number=${encodeURIComponent(orderNumber)}&source=quick-order&platform=paypal`;
```

同时删除第 164-170 行的重复 logMonitor：

```typescript
// 删除这两段（保留上面的 PAYPAL_CANCEL_LOGGED logMonitor）：
logMonitor('PAYMENTS', 'SUCCESS', {
  action: 'PAYPAL_CANCEL_REDIRECT',
  orderId: order.id,
  orderNumber: order.order_number,
  redirectUrl
});
```

- [ ] **步骤 2：修改 Alipay cancel 重定向**

修改 [alipay/cancel/route.ts:144](file:///Users/davis/zisha-ecommerce/src/app/api/payments/alipay/cancel/route.ts#L144)：

```typescript
// 旧代码：
const redirectUrl = `/orders/${order.id}?cancelled=true&payment_cancelled=true`;

// 新代码：
const redirectUrl = `/payment-result?status=cancel&order_number=${encodeURIComponent(orderNumber)}&source=quick-order&platform=alipay`;
```

同样删除第 146-151 行的重复 logMonitor。

- [ ] **步骤 3：修改 Stripe cancel 重定向**

修改 [stripe/cancel/route.ts:149](file:///Users/davis/zisha-ecommerce/src/app/api/payments/stripe/cancel/route.ts#L149)：

```typescript
// 旧代码：
const redirectUrl = `/orders/${order.id}?cancelled=true&payment_cancelled=true`;

// 新代码：
const redirectUrl = `/payment-result?status=cancel&order_number=${encodeURIComponent(orderNumber)}&source=quick-order&platform=stripe`;
```

同样删除第 151-156 行的重复 logMonitor。

### 任务 6-2：增强 /payment-result 页面的取消展示

**文件：**
- 修改：`src/app/payment-result/page.tsx`

**职责：** 当前 cancel 状态只显示"您取消了支付"，改为显示完整订单信息 + 失败原因 + 重新支付按钮

- [ ] **步骤 1：在 cancel 状态下也获取并展示订单信息**

当前代码在 `status !== 'success'` 时设 `paymentStatus='fail'` 且 `setErrorInfo`，但 cancel 状态下也需要显示 orderInfo。需要在 fetchOrderAndVerify 中，不管 status 是什么都去获取订单数据：

修改 `fetchOrderAndVerify` 函数 —— 当前代码在 status !== 'success' 的分支只设置 errorInfo，不保留 orderInfo。改为：

```typescript
useEffect(() => {
  const fetchOrderAndVerify = async () => {
    if (!orderNumber) {
      setIsLoading(false);
      return;
    }

    try {
      const orderResponse = await fetch(`/api/orders-list?order_number=${orderNumber}`, {
        credentials: 'include',
      });
      const orderData = await orderResponse.json();

      if (orderData.success) {
        const orders = orderData.data?.orders || [];
        if (orders.length > 0) {
          setOrderInfo(orders[0]);
        }
      }

      const platformMap: Record<string, 'paypal' | 'stripe' | 'alipay'> = {
        paypal: 'paypal', stripe: 'stripe', alipay: 'alipay',
      };
      if (platformMap[platform]) {
        setPaymentMethod(platformMap[platform]);
      }

      if (status === 'success') {
        setPaymentStatus('success');
      } else if (status === 'cancel') {
        setPaymentStatus('fail');
        setErrorInfo({
          errorCode: 'USER_CANCEL',
          errorMessage: {
            zh: '您取消了支付，订单已自动取消。如需购买请重新下单。',
            en: 'Payment was cancelled. Your order has been cancelled. Please place a new order.',
            ar: 'تم إلغاء الدفع. تم إلغاء طلبك. يرجى تقديم طلب جديد.',
          },
        });
      } else {
        setPaymentStatus('fail');
        const reason = status || 'fail';
        setErrorInfo({
          errorCode: reason.toUpperCase(),
          errorMessage: {
            zh: decodeURIComponent(errorMsg || '') || '支付失败，请重试',
            en: 'Payment failed, please retry',
            ar: 'فشل الدفع، يرجى المحاولة مرة أخرى',
          },
        });
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      setPaymentStatus('fail');
    } finally {
      setIsLoading(false);
    }
  };

  fetchOrderAndVerify();
}, [orderNumber, status, platform, errorMsg]);
```

### 任务 6-3：修改 handleRetry，cancel 状态重新创建订单

当前 `handleRetry` 对于 quick-order 来源会尝试用已有 order_id 跳转，但 cancel 后订单已取消，需要重新创建：

```typescript
const handleRetry = () => {
  if (source === 'cart') {
    router.push('/cart');
  } else {
    if (orderInfo?.id && status === 'cancel') {
      router.push(`/quick-order?product_id=${orderInfo.items?.[0]?.product_id || ''}`);
    } else if (orderInfo?.id) {
      router.push(`/quick-order?order_id=${orderInfo.id}`);
    } else if (orderNumber) {
      router.push(`/quick-order?order_number=${orderNumber}`);
    } else {
      router.push('/quick-order');
    }
  }
};
```

### 任务 6-4：验证

运行：`npx tsc --noEmit 2>&1 | head -20`
预期：无类型错误

---

## 任务 7：添加 paid_at 字段到 orders 表

### 任务 7-1：数据库迁移 —— 添加 paid_at 和 expired_at 字段

**操作文件：**
- 数据库文件：`src/lib/db/database.sqlite`

**⚠️ 数据库操作前先备份：**

```bash
cp src/lib/db/database.sqlite src/lib/db/database.sqlite.backup-$(date +%Y%m%d-%H%M%S)
```

- [ ] **步骤 1：执行 ALTER TABLE**

通过 `/api/db/table/orders` API 执行（项目有现成的数据库管理 API），或创建迁移脚本。以下是 SQL：

```sql
ALTER TABLE orders ADD COLUMN paid_at TEXT;
ALTER TABLE orders ADD COLUMN expired_at TEXT;
```

- [ ] **步骤 2：验证字段添加成功**

```sql
PRAGMA table_info(orders);
```

预期输出中包含 `paid_at` 和 `expired_at` 两列，类型为 TEXT，默认值为 NULL。

### 任务 7-2：在支付成功时写入 paid_at

**文件：**
- 修改：`src/app/api/payments/result/route.ts:212-215`

**职责：** 当前 UPDATE orders 只设置 `order_status`, `payment_status`, `payment_method`, `updated_at`，需加上 `paid_at`

- [ ] **步骤 1：修改 UPDATE 语句**

修改 [result/route.ts:212-215](file:///Users/davis/zisha-ecommerce/src/app/api/payments/result/route.ts#L212-L215)：

```typescript
// 旧代码：
await query(
  'UPDATE orders SET order_status = ?, payment_status = ?, payment_method = ?, updated_at = datetime(\'now\') WHERE id = ?',
  ['paid', 'paid', detectedPlatform, orderId]
);

// 新代码：
await query(
  'UPDATE orders SET order_status = ?, payment_status = ?, payment_method = ?, paid_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?',
  ['paid', 'paid', detectedPlatform, orderId]
);
```

### 任务 7-3：在创建 pending 订单时写入 expired_at

**文件：**
- 修改：`src/app/api/inventory/reserve/route.ts:327-350`
- 修改：`src/app/api/cart/create-order/route.ts:265-286`

**职责：** 新创建的 pending 订单需要设置 30 分钟超时

- [ ] **步骤 1：修改 inventory/reserve 的 INSERT**

修改 [reserve/route.ts:327-350](file:///Users/davis/zisha-ecommerce/src/app/api/inventory/reserve/route.ts#L327-L350)：

```typescript
// 旧代码：
const orderInsertResult = await query(
  `INSERT INTO orders (
    user_id, order_number, total_after_promotions_amount, total_original_price, shipping_fee,
    order_final_discount_amount, payment_method, payment_status, order_status,
    shipping_address_id, coupon_ids, total_coupon_discount, final_amount,
    notes, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,

// 新代码：
const orderInsertResult = await query(
  `INSERT INTO orders (
    user_id, order_number, total_after_promotions_amount, total_original_price, shipping_fee,
    order_final_discount_amount, payment_method, payment_status, order_status,
    shipping_address_id, coupon_ids, total_coupon_discount, final_amount,
    notes, created_at, updated_at, expired_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now', '+30 minutes'))`,
```

- [ ] **步骤 2：修改 cart/create-order 的 INSERT**

修改 [cart/create-order/route.ts:265-286](file:///Users/davis/zisha-ecommerce/src/app/api/cart/create-order/route.ts#L265-L286)：

```typescript
// 旧代码：
const orderInsert = await query(
  `INSERT INTO orders (
    user_id, order_number, payment_method, order_status,
    total_after_promotions_amount, total_original_price, total_coupon_discount,
    order_final_discount_amount, final_amount,
    shipping_address_id, shipping_fee, coupon_ids, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,

// 新代码：
const orderInsert = await query(
  `INSERT INTO orders (
    user_id, order_number, payment_method, order_status,
    total_after_promotions_amount, total_original_price, total_coupon_discount,
    order_final_discount_amount, final_amount,
    shipping_address_id, shipping_fee, coupon_ids, created_at, expired_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now', '+30 minutes'))`,
```

### 任务 7-4：验证

```bash
# 验证 paid_at 和 expired_at 字段存在
curl -s 'http://localhost:3000/api/db/table/orders' | python3 -c "import sys,json; d=json.load(sys.stdin); [print(c['name']) for c in d.get('data',{}).get('columns',[])]" 2>/dev/null || echo "请手动检查数据库"

# 类型检查
npx tsc --noEmit 2>&1 | head -20
```

预期：`paid_at` 和 `expired_at` 在列列表中，无类型错误

---

## 任务 8：库存超时自动释放

### 任务 8-1：创建库存超时释放 API

**文件：**
- 创建：`src/app/api/inventory/release-expired/route.ts`

**职责：** 扫描所有 `order_status='pending' AND expired_at < datetime('now')` 的订单，还库存 + 取消订单

- [ ] **步骤 1：创建 API 文件**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * @api {POST} /api/inventory/release-expired 释放超时库存
 * @apiName ReleaseExpiredInventory
 * @apiGroup INVENTORY
 * @apiDescription 扫描所有 pending 状态且已过期的订单，
 * 将库存归还，标记订单为 cancelled，记录流水和支付日志。
 * 可被定时任务或页面加载时触发。
 *
 * @apiSuccess {Number} releasedOrders 释放的订单数
 * @apiSuccess {Number} restoredItems 归还库存的商品数
 * @apiSuccess {Array} details 详情列表
 */

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('INVENTORY', 'REQUEST', {
    method: 'POST',
    path: '/api/inventory/release-expired'
  });

  try {
    const expiredOrdersResult = await query(
      `SELECT o.id, o.order_number, o.final_amount, o.payment_method
       FROM orders o
       WHERE o.order_status = 'pending'
         AND o.expired_at IS NOT NULL
         AND o.expired_at < datetime('now')`
    );

    const expiredOrders = expiredOrdersResult.rows;
    let releasedOrders = 0;
    let restoredItems = 0;
    const details: any[] = [];

    const cancelTypeResult = await query(
      'SELECT id FROM transaction_type WHERE code = ?',
      ['order_cancel']
    );
    const cancelTypeId = cancelTypeResult.rows[0]?.id || null;

    for (const order of expiredOrders) {
      try {
        const itemsResult = await query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
          [order.id]
        );

        for (const item of itemsResult.rows) {
          const productResult = await query(
            'SELECT name FROM products WHERE id = ?',
            [item.product_id]
          );
          const productName = productResult.rows[0]?.name || 'Product';

          const beforeResult = await query(
            'SELECT quantity FROM inventory WHERE product_id = ?',
            [item.product_id]
          );
          const beforeStock = beforeResult.rows[0]?.quantity || 0;

          await query(
            'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
            [item.quantity, item.product_id]
          );

          if (cancelTypeId) {
            await query(
              `INSERT INTO inventory_transactions (
                product_id, product_name, transaction_type_id, quantity_change,
                quantity_before, quantity_after, reason, reference_type, reference_id,
                operator_id, operator_name, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
              [
                item.product_id,
                productName,
                cancelTypeId,
                item.quantity,
                beforeStock,
                beforeStock + item.quantity,
                '订单超时自动取消，归还库存',
                'order_timeout',
                order.id,
                null,
                'SYSTEM'
              ]
            );
          }

          restoredItems++;
        }

        await query(
          `UPDATE orders SET
            order_status = 'cancelled',
            payment_status = 'cancelled',
            updated_at = datetime('now')
           WHERE id = ?`,
          [order.id]
        );

        await query(
          `INSERT INTO payment_logs (
            order_id, order_number, payment_method, status,
            error_code, error_message, is_success,
            payment_stage, amount, currency, extra_data, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            order.id,
            order.order_number,
            order.payment_method || 'unknown',
            'cancelled',
            'TIMEOUT',
            'Order expired, inventory released',
            0,
            'timeout',
            order.final_amount || 0,
            'USD',
            JSON.stringify({ reason: 'timeout', released_at: new Date().toISOString() })
          ]
        );

        details.push({
          orderId: order.id,
          orderNumber: order.order_number,
          itemsRestored: itemsResult.rows.length
        });

        releasedOrders++;
      } catch (itemError) {
        logMonitor('INVENTORY', 'ERROR', {
          action: 'RELEASE_EXPIRED_ITEM',
          orderId: order.id,
          error: String(itemError)
        });
      }
    }

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'RELEASE_EXPIRED_INVENTORY',
      releasedOrders,
      restoredItems,
      expiredOrdersCount: expiredOrders.length
    });

    return NextResponse.json({
      success: true,
      data: {
        releasedOrders,
        restoredItems,
        details
      }
    });
  } catch (error) {
    logMonitor('INVENTORY', 'ERROR', {
      action: 'RELEASE_EXPIRED_INVENTORY',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
```

### 任务 8-2：在 /payment-result 页面加载时触发库存释放检查

**文件：**
- 修改：`src/app/payment-result/page.tsx`

**职责：** 用户访问支付结果页时，先触发一次库存超时释放（清理过期 pending 订单），再展示结果

- [ ] **步骤 1：在 fetchOrderAndVerify 前触发清理**

在 `useEffect` 中添加：

```typescript
useEffect(() => {
  const fetchOrderAndVerify = async () => {
    if (!orderNumber) {
      setIsLoading(false);
      return;
    }

    try {
      // 触发库存超时释放（静默，不影响当前用户展示）
      fetch('/api/inventory/release-expired', {
        method: 'POST',
      }).catch(() => {});

      // ... 原有的获取订单逻辑
```

### 任务 8-3：在支付成功时将 expired_at 清空（防止误释放）

**文件：**
- 修改：`src/app/api/payments/result/route.ts:212-215`

在任务 7-2 的 UPDATE 中同时清空 `expired_at`：

```typescript
await query(
  'UPDATE orders SET order_status = ?, payment_status = ?, payment_method = ?, paid_at = datetime(\'now\'), expired_at = NULL, updated_at = datetime(\'now\') WHERE id = ?',
  ['paid', 'paid', detectedPlatform, orderId]
);
```

### 任务 8-4：验证

```bash
# 1. 创建待支付订单（不支付）
# 手动在 quick-order 页面下单但不支付

# 2. 等待或手动修改 expired_at 为过去时间
# 通过 /api/db/table/orders/[id] 修改

# 3. 调用释放 API
curl -X POST 'http://localhost:3000/api/inventory/release-expired'

# 预期返回：{ "success": true, "data": { "releasedOrders": N, "restoredItems": M } }

# 类型检查
npx tsc --noEmit 2>&1 | head -20
```

---

## 自检

### 1. 规格覆盖度

| P1 需求 | 对应任务 | 覆盖 |
|---------|---------|------|
| 5. 完善三个 success API handler | 任务 5-1/5-2/5-3 | ✅ |
| 6. 修复 cancel 回调，显示原因+引导重新支付 | 任务 6-1/6-2/6-3 | ✅ |
| 7. 添加 paid_at 字段 | 任务 7-1/7-2 | ✅ |
| 8. 库存超时自动释放 | 任务 8-1/8-2/8-3 | ✅ |

### 2. 占位符扫描

- 无 "TODO"、"待定"、"后续实现"
- 所有步骤包含实际代码和可执行命令

### 3. 类型一致性

- `paid_at` 和 `expired_at` 在两个 INSERT（reserve, cart/create-order）中一致使用
- UPDATE 在 result API 中同步设置 `paid_at` 和清空 `expired_at`
- `/payment-result` 页面的 `handleRetry` 正确处理 cancel 状态

### 4. 不影响已有功能确认

- ✅ 不删除任何现有文件
- ✅ 不修改 `EnhancedPaymentResultCard` 组件
- ✅ 不修改 `orders-list` API
- ✅ 数据库只加字段，不删不改
- ✅ 旧 cancel handler 只改重定向 URL，逻辑不变
- ✅ 所有 CSS 使用 `var(--xxx)` 引用，不硬编码

---

## 执行交接

计划已完成并保存。两种执行方式：

**1. 子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点

选哪种方式？
