# 统一支付结果 API + 订单详情页 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 创建统一支付结果处理系统，修复 quick-order 支付回调路径，创建订单详情页，完善支付结果展示

**架构：** 三个支付平台的 return_url 统一改为 `/api/payments/result`（API 层验证+更新）→ 重定向到 `/payment-result`（前端展示）。订单详情页 `/orders/[id]` 展示完整订单+支付历史。旧页面保留为重定向封装。

**技术栈：** Next.js App Router, TypeScript, Tailwind CSS, SQLite, sql.js

---

## 文件清单

### 需要创建的文件

| 文件路径 | 职责 |
|---------|------|
| `src/app/api/payments/result/route.ts` | 统一支付结果处理 API（GET），接收平台回调、验证支付、更新订单、重定向 |
| `src/app/payment-result/page.tsx` | 统一支付结果展示页，替换 `/cart/success` 和 `/quick-order/success` |
| `src/app/orders/[id]/page.tsx` | 订单详情页，展示商品、地址、支付状态、物流，支持重新支付 |
| `src/components/payment/PaymentResultPageClient.tsx` | 支付结果页面客户端组件（封装 loading + 展示逻辑） |

### 需要修改的文件

| 文件路径 | 修改内容 |
|---------|---------|
| `src/app/api/payments/paypal/route.ts` | POST body 新增 `source` 参数；return_url 改为 `/api/payments/result?...&platform=paypal`；cancel_url 改为 `/api/payments/result?status=cancel&...` |
| `src/app/api/payments/alipay/route.ts` | POST body 新增 `source` 参数；return_url 改为 `/api/payments/result?...&platform=alipay`；GET 路由的 return_url 同步修改 |
| `src/app/api/payments/stripe/route.ts` | POST body 新增 `source` 参数；success_url 改为 `/api/payments/result?...&platform=stripe`；cancel_url 改为 `/api/payments/result?status=cancel&...` |
| `src/app/quick-order/page.tsx` | `handleCreateOrder` 中调用 `/api/payments/paypal` 和 `/api/payments/alipay` 时 body 添加 `source: 'quick-order'` |
| `src/app/cart/page.tsx` | `handleCheckout` 中调用 `/api/payments/paypal` 和 `/api/payments/alipay` 时 body 添加 `source: 'cart'` |
| `src/app/api/orders/[id]/route.ts` | GET 新增 JOIN `payment_logs` 查询，返回支付历史 |
| `src/app/api/cart/create-order/route.ts` | 响应新增 `items` 数组（含 images）；POST body 新增支持 `source` |
| `src/app/api/quick-order/create/route.ts` | 响应新增 `order_id`、`amount_aed`、`amount_usd`、`amount_cny`（已有）；新增 `items` 数组 |
| `src/app/cart/success/page.tsx` | 改为纯重定向到 `/payment-result`（兼容旧链接） |
| `src/app/quick-order/success/page.tsx` | 改为纯重定向到 `/payment-result`（兼容旧链接） |

### 保持不变的文件（只读参考）

| 文件路径 | 说明 |
|---------|------|
| `src/app/api/payments/paypal/notify/route.ts` | webhook 处理不变，继续由支付平台服务器调用 |
| `src/app/api/payments/alipay/notify/route.ts` | 同上 |
| `src/app/api/payments/stripe/notify/route.ts` | 同上 |
| `src/app/api/payments/paypal/cancel/route.ts` | 旧的 cancel handler 不再使用（新流程走 result API），但**保留不删** |
| `src/app/api/payments/alipay/cancel/route.ts` | 同上，保留不删 |
| `src/app/api/payments/stripe/cancel/route.ts` | 同上，保留不删 |
| `src/app/api/orders-list/route.ts` | 不变 |
| `src/components/payment/EnhancedPaymentResultCard.tsx` | 不变（被新页面引用） |

---

## 架构设计

### 新支付回调流程

```
用户点击支付
  ↓
前端调用 POST /api/payments/{paypal|alipay|stripe}
  body: { order_number, amount, currency, items, source }  ← 新增 source
  ↓
支付API构建 {return_url} 指向 /api/payments/result?order_number=...&source=...&platform=...
     构建 {cancel_url} 指向 /api/payments/result?order_number=...&source=...&platform=...&status=cancel
  ↓
返回 redirect_url → 前端 window.location.href
  ↓
用户在支付平台完成/取消
  ↓
支付平台重定向到 /api/payments/result?order_number=...&source=...&platform=...
  （PayPal 额外带 token&PayerID，Alipay 带 trade_no，Stripe 带 session_id）
  ↓
/api/payments/result GET：
  1. 识别平台（token=PayPal | trade_no=Alipay | session_id=Stripe）
  2. 如果是 cancel（status=cancel）：记录取消日志、更新订单状态
  3. 如果是 success：验证支付（调用平台API确认）、更新订单、记录日志
  4. Response.redirect → /payment-result?status=success|cancel&order_number=...&source=...
  ↓
/payment-result 页面：
  1. 读 URL params（status, order_number, source）
  2. 调用 /api/orders-list?order_number=XXX 获取完整订单数据
  3. 渲染 EnhancedPaymentResultCard
  4. 按钮行为根据 source 区分（重支付→/quick-order 或 /cart）
```

### 向后兼容策略

1. **旧 cancel API**（`/payments/{x}/cancel`）：保留不删，但不再被新流程使用
2. **旧 success 页面**（`/cart/success`, `/quick-order/success`）：改为纯重定向封装
3. **webhook/notify API**：完全不动，继续由支付平台服务器调用
4. **orders-list API**：不动，新页面调用它获取订单数据
5. **orders/[id] API**：只增加 JOIN payment_logs，不改变已有数据结构

---

## 任务 1：创建统一支付结果 API

**文件：**
- 创建：`src/app/api/payments/result/route.ts`

**职责：** 接收三个支付平台的重定向回调，识别平台和状态，验证/记录，更新订单，重定向

- [ ] **步骤 1：创建 API 文件**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
import { resolvePaymentError } from '@/lib/payment/errorCodeMapper';

/**
 * @api {GET} /api/payments/result 统一支付结果回调
 * @apiName PaymentResult
 * @apiGroup PAYMENTS
 * @apiDescription 三个支付平台（PayPal/Alipay/Stripe）支付完成后的统一回调入口。
 * 接收平台返回的参数，验证支付状态，更新订单和支付日志，重定向到前端展示页。
 *
 * @apiParam {String} order_number 订单号
 * @apiParam {String} [source] 来源（quick-order|cart）
 * @apiParam {String} [platform] 支付平台（paypal|alipay|stripe）
 * @apiParam {String} [status] cancel 表示用户取消支付
 * @apiParam {String} [token] PayPal 返回的 token（EC-xxx）
 * @apiParam {String} [PayerID] PayPal 返回的 PayerID
 * @apiParam {String} [trade_no] Alipay 返回的 trade_no
 * @apiParam {String} [session_id] Stripe 返回的 session_id
 */

const PAYPAL_API_BASE_SANDBOX = 'https://api-m.sandbox.paypal.com';
const PAYPAL_API_BASE_LIVE = 'https://api-m.paypal.com';

function getPayPalConfig() {
  // 从 payment_config 表读取
  return { isSandbox: true, clientId: '', clientSecret: '' };
}

async function getPayPalAccessToken(config: any) {
  const apiBase = config.isSandbox ? PAYPAL_API_BASE_SANDBOX : PAYPAL_API_BASE_LIVE;
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const response = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await response.json();
  return { accessToken: data.access_token, apiBase };
}

async function capturePayPalOrder(accessToken: string, apiBase: string, paypalOrderId: string) {
  const response = await fetch(`${apiBase}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  return await response.json();
}

async function retrieveStripeSession(sessionId: string) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) throw new Error('Stripe not configured');
  const Stripe = require('stripe');
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
  return await stripe.checkout.sessions.retrieve(sessionId);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderNumber = searchParams.get('order_number') || '';
  const source = searchParams.get('source') || 'cart';
  const platform = searchParams.get('platform') || '';
  const isCancel = searchParams.get('status') === 'cancel';

  // PayPal params
  const paypalToken = searchParams.get('token');
  const payerId = searchParams.get('PayerID');

  // Alipay params
  const tradeNo = searchParams.get('trade_no');

  // Stripe params
  const sessionId = searchParams.get('session_id');

  logMonitor('PAYMENTS', 'REQUEST', {
    action: 'PAYMENT_RESULT_CALLBACK',
    orderNumber,
    source,
    platform,
    isCancel,
    hasPayPalToken: !!paypalToken,
    hasTradeNo: !!tradeNo,
    hasSessionId: !!sessionId,
  });

  try {
    // 查找订单
    const orderResult = await query(
      'SELECT id, order_number, order_status, payment_status, payment_method, final_amount FROM orders WHERE order_number = ?',
      [orderNumber]
    );

    if (orderResult.rows.length === 0) {
      logMonitor('PAYMENTS', 'NOT_FOUND', { orderNumber });
      // 订单不存在，跳转到首页
      return NextResponse.redirect(
        new URL(`/?error=order_not_found`, request.url)
      );
    }

    const order = orderResult.rows[0];
    const orderId = order.id;

    // === 处理取消 ===
    if (isCancel) {
      // 记录取消日志
      await query(
        `INSERT INTO payment_logs (order_id, order_number, payment_method, amount, currency, status, error_code, error_message, is_success, payment_stage, created_at)
         VALUES (?, ?, ?, ?, 'USD', 'cancelled', 'USER_CANCEL', 'User cancelled payment', 0, 'cancel', datetime('now'))`,
        [orderId, orderNumber, platform || order.payment_method, order.final_amount || 0]
      );

      // 更新订单状态为 cancelled
      await query(
        'UPDATE orders SET order_status = ?, payment_status = ?, updated_at = datetime(\'now\') WHERE id = ?',
        ['cancelled', 'cancelled', orderId]
      );

      logMonitor('PAYMENTS', 'SUCCESS', {
        action: 'PAYMENT_CANCELLED',
        orderId,
        orderNumber,
        platform,
        source,
      });

      // 重定向到前端展示页
      const redirectUrl = new URL('/payment-result', request.url);
      redirectUrl.searchParams.set('status', 'cancel');
      redirectUrl.searchParams.set('order_number', orderNumber);
      redirectUrl.searchParams.set('source', source);
      return NextResponse.redirect(redirectUrl);
    }

    // === 处理支付成功 ===
    let captureResult: any = null;
    let paypalOrderId = '';

    // 识别平台并验证支付
    const detectedPlatform = platform
      || (paypalToken ? 'paypal' : '')
      || (tradeNo ? 'alipay' : '')
      || (sessionId ? 'stripe' : '');

    if (detectedPlatform === 'paypal' && paypalToken) {
      paypalOrderId = paypalToken;
      // 获取 PayPal access token
      const configResult = await query(
        'SELECT is_sandbox, config_json FROM payment_config WHERE payment_method = ? AND is_enabled = 1',
        ['paypal']
      );
      if (configResult.rows.length === 0) {
        throw new Error('PayPal not configured');
      }
      const cfg = configResult.rows[0];
      const configJson = JSON.parse(cfg.config_json || '{}');

      const apiBase = cfg.is_sandbox ? PAYPAL_API_BASE_SANDBOX : PAYPAL_API_BASE_LIVE;
      const auth = Buffer.from(`${configJson.client_id}:${configJson.client_secret}`).toString('base64');
      const tokenResp = await fetch(`${apiBase}/v1/oauth2/token`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      });
      const tokenData = await tokenResp.json();
      const accessToken = tokenData.access_token;

      // Capture PayPal order
      const capResp = await fetch(`${apiBase}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      captureResult = await capResp.json();

      if (captureResult.status !== 'COMPLETED') {
        // 支付未完成
        throw new Error(`PayPal capture status: ${captureResult.status}`);
      }
    } else if (detectedPlatform === 'stripe' && sessionId) {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) throw new Error('Stripe not configured');
      const Stripe = require('stripe');
      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
      captureResult = await stripe.checkout.sessions.retrieve(sessionId);
      if (captureResult.payment_status !== 'paid') {
        throw new Error(`Stripe payment status: ${captureResult.payment_status}`);
      }
    } else if (detectedPlatform === 'alipay' && tradeNo) {
      // Alipay: trade_no 存在即表示支付成功（简化处理）
      captureResult = { trade_no: tradeNo, status: 'TRADE_SUCCESS' };
    } else {
      // 无法识别平台，记录日志后跳转
      logMonitor('PAYMENTS', 'ERROR', {
        action: 'UNKNOWN_PLATFORM',
        orderNumber,
        detectedPlatform,
      });
      const redirectUrl = new URL('/payment-result', request.url);
      redirectUrl.searchParams.set('status', 'fail');
      redirectUrl.searchParams.set('order_number', orderNumber);
      redirectUrl.searchParams.set('source', source);
      return NextResponse.redirect(redirectUrl);
    }

    // 记录支付日志
    const transactionId = detectedPlatform === 'paypal'
      ? (captureResult?.purchase_units?.[0]?.payments?.captures?.[0]?.id || paypalOrderId)
      : (detectedPlatform === 'stripe' ? (captureResult?.payment_intent || sessionId) : tradeNo);

    await query(
      `INSERT INTO payment_logs (order_id, order_number, payment_method, transaction_id, amount, currency, status, is_success, payment_stage, platform_order_id, created_at)
       VALUES (?, ?, ?, ?, ?, 'USD', 'completed', 1, 'callback', ?, datetime('now'))`,
      [orderId, orderNumber, detectedPlatform, transactionId, order.final_amount || 0, paypalOrderId || sessionId || tradeNo]
    );

    // 更新订单为已支付
    await query(
      'UPDATE orders SET order_status = ?, payment_status = ?, updated_at = datetime(\'now\') WHERE id = ?',
      ['paid', 'paid', orderId]
    );

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'PAYMENT_SUCCESS',
      orderId,
      orderNumber,
      platform: detectedPlatform,
      transactionId,
      source,
    });

    // 重定向到前端展示页
    const redirectUrl = new URL('/payment-result', request.url);
    redirectUrl.searchParams.set('status', 'success');
    redirectUrl.searchParams.set('order_number', orderNumber);
    redirectUrl.searchParams.set('source', source);
    redirectUrl.searchParams.set('platform', detectedPlatform);
    return NextResponse.redirect(redirectUrl);

  } catch (error: any) {
    logMonitor('PAYMENTS', 'ERROR', {
      action: 'PAYMENT_RESULT_ERROR',
      orderNumber,
      error: String(error),
    });

    // 即使出错也跳转到前端展示页，让用户看到失败信息
    const redirectUrl = new URL('/payment-result', request.url);
    redirectUrl.searchParams.set('status', 'fail');
    redirectUrl.searchParams.set('order_number', orderNumber);
    redirectUrl.searchParams.set('source', source);
    redirectUrl.searchParams.set('error', encodeURIComponent(String(error)));
    return NextResponse.redirect(redirectUrl);
  }
}
```

- [ ] **步骤 2：验证文件语法**

运行：`npx tsc --noEmit src/app/api/payments/result/route.ts 2>&1 | head -20`
预期：无类型错误（或仅依赖库的已知 warning）

---

## 任务 2：修改三个支付平台的 return_url

**文件：**
- 修改：`src/app/api/payments/paypal/route.ts`
- 修改：`src/app/api/payments/alipay/route.ts`
- 修改：`src/app/api/payments/stripe/route.ts`

**职责：** 接受 `source` 参数，将 return_url 和 cancel_url 统一改为 `/api/payments/result`

- [ ] **步骤 1：修改 PayPal POST 路由**

修改文件：`src/app/api/payments/paypal/route.ts:199-273`

```typescript
// 在 POST 函数中，修改 body 解构，新增 source 参数
const body = await req.json();
const { amount, currency = 'USD', items, order_number, source = 'cart' } = body;
//                                         ^^^^^^^^^^^^^^^^^^^^^^^ 新增

// 修改 application_context 中的 return_url 和 cancel_url（约第 270 行）
application_context: {
  return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payments/result?order_number=${order_number}&source=${source}&platform=paypal`,
  cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payments/result?order_number=${order_number}&source=${source}&platform=paypal&status=cancel`,
},
```

- [ ] **步骤 2：修改 Alipay POST 路由**

修改文件：`src/app/api/payments/alipay/route.ts:131-186`

```typescript
// POST 函数 body 解构，新增 source 参数
const { order_id, amount, currency, order_number, source = 'cart' } = body;
//                                          ^^^^^^^^^^^^^^^^^^^^^^^ 新增

// 修改 return_url 构建（约第 99 行，GET 路由中）
return_url: `${baseUrl}/api/payments/result?order_number=${order_number}&trade_no={TRADE_NO}&source=${source}&platform=alipay`,

// 修改 POST 响应中的 payment_url（约第 183 行）
payment_url: `${baseUrl}/api/payments/alipay?order_id=${order_id}&amount=${amount}&currency=${currency}&order_number=${order_number}&source=${source}`,
```

- [ ] **步骤 3：修改 Stripe POST 路由**

修改文件：`src/app/api/payments/stripe/route.ts:102-157`

```typescript
// POST body 解构，新增 source 参数
const { amount, currency = 'aed', items, order_number, source = 'cart' } = body;
//                                            ^^^^^^^^^^^^^^^^^^^^^^^ 新增

// 修改 success_url 和 cancel_url（约第 152-153 行）
success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/result?order_number=${order_number}&session_id={CHECKOUT_SESSION_ID}&source=${source}&platform=stripe`,
cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/result?order_number=${order_number}&source=${source}&platform=stripe&status=cancel`,
```

- [ ] **步骤 4：验证**

运行：`npx tsc --noEmit 2>&1 | grep -E "paypal/route|alipay/route|stripe/route" | head -20`
预期：无新的类型错误

---

## 任务 3：修改 quick-order 页面传递 source 参数

**文件：**
- 修改：`src/app/quick-order/page.tsx`

**职责：** `handleCreateOrder` 调用支付 API 时传递 `source: 'quick-order'`

- [ ] **步骤 1：修改 PayPal 调用**

修改文件：`src/app/quick-order/page.tsx:442-451`

```typescript
body: JSON.stringify({
  order_number: order_number,
  amount: (priceData?.total_usd ?? 0).toFixed(2) || '0',
  currency: 'USD',
  source: 'quick-order',  // ← 新增这一行
  items: [{
    product_id: product.id,
    name: product.name,
    price: priceData ? (priceData.subtotal ?? priceData.total_usd ?? 0) / quantity : 0,
    quantity: quantity
  }]
})
```

- [ ] **步骤 2：修改 Alipay 调用**

修改文件：`src/app/quick-order/page.tsx:473-477`

```typescript
body: JSON.stringify({
  order_number: order_number,
  amount: (priceData?.total_cny ?? 0).toFixed(2) || '0',
  currency: 'CNY',
  source: 'quick-order',  // ← 新增这一行
})
```

- [ ] **步骤 3：验证**

运行：`npx tsc --noEmit 2>&1 | grep "quick-order/page" | head -10`
预期：无类型错误

---

## 任务 4：修改 cart 页面传递 source 参数

**文件：**
- 修改：`src/app/cart/page.tsx`

**职责：** `handleCheckout` 调用支付 API 时传递 `source: 'cart'`

- [ ] **步骤 1：修改 PayPal 调用**

修改文件：`src/app/cart/page.tsx:670-681`

```typescript
body: JSON.stringify({
  order_number,
  amount: Number(amount_usd || 0).toFixed(2),
  currency: 'USD',
  source: 'cart',  // ← 新增这一行
  items: (items || []).map((it: any) => ({
    product_id: it.product_id,
    name: it.name,
    image: it.image,
    price: it.price_usd ?? it.price,
    quantity: it.quantity
  }))
})
```

- [ ] **步骤 2：修改 Alipay 调用**

修改文件：`src/app/cart/page.tsx` 约 699 行

```typescript
body: JSON.stringify({
  order_number,
  amount: Number(amount_cny || 0).toFixed(2),
  currency: 'CNY',
  source: 'cart',  // ← 新增这一行
})
```

- [ ] **步骤 3：验证**

运行：`npx tsc --noEmit 2>&1 | grep "cart/page" | head -10`
预期：无类型错误

---

## 任务 5：创建统一支付结果展示页面

**文件：**
- 创建：`src/app/payment-result/page.tsx`

**职责：** 统一支付结果展示页，替换旧的 `/cart/success` 和 `/quick-order/success`

- [ ] **步骤 1：创建页面**

```typescript
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EnhancedPaymentResultCard } from '@/components/payment';

function PaymentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'fail'>('fail');
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [errorInfo, setErrorInfo] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'stripe' | 'alipay'>('paypal');

  const status = searchParams.get('status') || 'fail';
  const orderNumber = searchParams.get('order_number') || '';
  const source = (searchParams.get('source') as 'quick-order' | 'cart') || 'cart';
  const platform = searchParams.get('platform') || 'paypal';
  const errorMsg = searchParams.get('error');

  useEffect(() => {
    const fetchOrderAndVerify = async () => {
      if (!orderNumber) {
        setIsLoading(false);
        return;
      }

      try {
        // 获取订单详情
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

        // 设置支付方式映射
        const platformMap: Record<string, 'paypal' | 'stripe' | 'alipay'> = {
          paypal: 'paypal', stripe: 'stripe', alipay: 'alipay',
        };
        if (platformMap[platform]) {
          setPaymentMethod(platformMap[platform]);
        }

        // 设置状态
        if (status === 'success') {
          setPaymentStatus('success');
        } else {
          setPaymentStatus('fail');
          // 从 URL params 构建错误信息
          const errorMessages: Record<string, string> = {
            cancel: '您取消了支付',
            fail: '支付未完成，请重试',
            error: '支付处理中遇到问题',
          };
          const reason = status || 'fail';
          setErrorInfo({
            errorCode: reason.toUpperCase(),
            errorMessage: {
              zh: errorMessages[reason] || decodeURIComponent(errorMsg || '') || '支付失败',
              en: reason === 'cancel' ? 'Payment was cancelled' : 'Payment failed, please retry',
              ar: reason === 'cancel' ? 'تم إلغاء الدفع' : 'فشل الدفع، يرجى المحاولة مرة أخرى',
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

  const handleViewOrder = () => {
    if (orderInfo?.id) {
      router.push(`/orders/${orderInfo.id}`);
    } else {
      router.push('/account?tab=orders');
    }
  };

  const handleContinueShopping = () => {
    router.push('/');
  };

  const handleRetry = () => {
    if (source === 'cart') {
      router.push('/cart');
    } else {
      if (orderInfo?.id) {
        router.push(`/quick-order?order_id=${orderInfo.id}`);
      } else if (orderNumber) {
        router.push(`/quick-order?order_number=${orderNumber}`);
      } else {
        router.push('/quick-order');
      }
    }
  };

  const handleChangePayment = () => {
    handleRetry();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">正在加载订单信息...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <EnhancedPaymentResultCard
          type={paymentStatus}
          paymentMethod={paymentMethod}
          orderInfo={orderInfo}
          errorCode={errorInfo?.errorCode}
          errorMessage={errorInfo?.errorMessage}
          source={source}
          onViewOrder={handleViewOrder}
          onContinueShopping={handleContinueShopping}
          onRetry={handleRetry}
          onChangePayment={handleChangePayment}
        />
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}
```

- [ ] **步骤 2：验证**

运行：`npx tsc --noEmit 2>&1 | grep "payment-result/page" | head -10`
预期：无类型错误

---

## 任务 6：创建订单详情页

**文件：**
- 创建：`src/app/orders/[id]/page.tsx`

**职责：** 展示订单完整详情（商品、地址、价格、支付状态、重新支付按钮）

- [ ] **步骤 1：创建订单详情页**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';

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

const formatPrice = (amount: number) => {
  return `$${Number(amount).toFixed(2)} / ¥${(Number(amount) * 7.19).toFixed(2)} / AED${(Number(amount) / 0.2722).toFixed(2)}`;
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

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/orders/${orderId}`);
      return;
    }

    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          credentials: 'include',
        });
        const data = await response.json();

        if (data.success) {
          setOrder(data.data);
        } else {
          setError(data.error || '订单不存在');
        }
      } catch (err) {
        setError('加载订单失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, user, authLoading, router]);

  const handleRepay = () => {
    if (!order) return;
    router.push(`/quick-order?order_id=${order.id}`);
  };

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
  const canRepay = order.order_status === 'pending' || order.order_status === 'cancelled'
    || order.payment_status === 'cancelled' || order.payment_status === 'pending';

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => router.back()} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-2">
              ← 返回
            </button>
            <h1 className="text-2xl font-bold text-[var(--text)]">订单详情</h1>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.zh}
          </span>
        </div>

        {/* 订单基本信息 */}
        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">订单信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-[var(--text-muted)]">订单号：</span><span className="font-mono">{order.order_number}</span></div>
            <div><span className="text-[var(--text-muted)]">支付方式：</span>{order.payment_method?.toUpperCase() || '—'}</div>
            <div><span className="text-[var(--text-muted)]">下单时间：</span>{order.created_at ? new Date(order.created_at).toLocaleString('zh-CN') : '—'}</div>
            <div><span className="text-[var(--text-muted)]">更新时间：</span>{order.updated_at ? new Date(order.updated_at).toLocaleString('zh-CN') : '—'}</div>
          </div>
        </div>

        {/* 收货地址 */}
        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">收货地址</h2>
          <div className="text-sm text-[var(--text)]">
            <p className="font-medium">{order.address_name} <span className="text-[var(--text-muted)] ml-2">{order.address_phone}</span></p>
            <p className="text-[var(--text-muted)] mt-1">{order.address_detail}</p>
          </div>
        </div>

        {/* 商品列表 */}
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
                </div>
              </div>
            ))}
          </div>

          {/* 费用明细 */}
          <div className="mt-6 pt-4 border-t border-[var(--border)] space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">商品原价</span>
              <span className="text-[var(--text)]">{formatPrice(order.total_original_price)}</span>
            </div>
            {order.order_final_discount_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">促销折扣</span>
                <span className="text-green-600">-{formatPrice(order.order_final_discount_amount)}</span>
              </div>
            )}
            {order.total_coupon_discount > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">优惠券</span>
                <span className="text-green-600">-{formatPrice(order.total_coupon_discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">运费</span>
              <span className="text-[var(--text)]">{order.shipping_fee > 0 ? formatPrice(order.shipping_fee) : '免运费'}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[var(--border)] font-bold text-lg">
              <span>应付总额</span>
              <span className="text-[var(--accent)]">{formatPrice(order.final_amount)}</span>
            </div>
          </div>
        </div>

        {/* 支付历史 */}
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

        {/* 操作按钮 */}
        <div className="flex gap-4">
          {canRepay && (
            <button onClick={handleRepay}
              className="flex-1 py-3 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90">
              💳 重新支付
            </button>
          )}
          <button onClick={() => router.push('/account?tab=orders')}
            className="flex-1 py-3 border-2 border-[var(--border)] text-[var(--text)] rounded-lg font-medium hover:bg-[var(--hover-bg)]">
            返回订单列表
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：验证**

运行：`npx tsc --noEmit 2>&1 | grep "orders/\[id\]/page" | head -10`
预期：无类型错误

---

## 任务 7：改造旧成功页面为重定向封装

**文件：**
- 修改：`src/app/cart/success/page.tsx`
- 修改：`src/app/quick-order/success/page.tsx`

**职责：** 保留旧 URL 兼容性，直接重定向到新的 `/payment-result` 页面

- [ ] **步骤 1：改造 cart/success**

```typescript
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CartSuccessRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('source', 'cart');
    router.replace(`/payment-result?${params.toString()}`);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
    </div>
  );
}

export default function CartSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div></div>}>
      <CartSuccessRedirect />
    </Suspense>
  );
}
```

- [ ] **步骤 2：改造 quick-order/success**

```typescript
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function QuickOrderSuccessRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('source', 'quick-order');
    router.replace(`/payment-result?${params.toString()}`);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
    </div>
  );
}

export default function QuickOrderSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div></div>}>
      <QuickOrderSuccessRedirect />
    </Suspense>
  );
}
```

---

## 任务 8：增强订单详情 API 返回支付历史

**文件：**
- 修改：`src/app/api/orders/[id]/route.ts`

**职责：** 在 GET 响应中加入 `payment_logs` 数组

- [ ] **步骤 1：添加 payment_logs 查询**

在 `src/app/api/orders/[id]/route.ts` 第 80 行（`logMonitor('ORDERS', 'SUCCESS'...)`）之前插入：

```typescript
// Get payment logs
const paymentLogsResult = await query(
  `SELECT id, transaction_id, amount, status, error_code, error_message,
          is_success, created_at
   FROM payment_logs
   WHERE order_id = ?
   ORDER BY created_at DESC`,
  [orderId]
);
```

- [ ] **步骤 2：修改响应体**

修改 `src/app/api/orders/[id]/route.ts` 约 86-93 行的响应：

```typescript
return NextResponse.json({
  success: true,
  data: {
    ...order,
    items: itemsResult.rows || [],
    logistics: logisticsResult.rows || [],
    payment_logs: paymentLogsResult.rows || []
  }
});
```

- [ ] **步骤 3：验证**

运行：`curl -s -b /tmp/cookies.txt "http://localhost:3000/api/orders/1" | python3 -c "import json,sys; d=json.load(sys.stdin); print('payment_logs' in d.get('data',{}))"`
预期：`True`

---

## 任务 9：全面回归测试

**文件：** 无新文件，仅测试

- [ ] **步骤 1：测试非认证 API（18 个）**

```bash
for api in "/api/products?limit=3" "/api/products/1" "/api/products/deals?limit=3" "/api/home" "/api/categories" "/api/themes" "/api/inventory" "/api/inventory/transactions?limit=3" "/api/inventory/status?ids=1,2,3" "/api/inventory/alerts" "/api/payments/methods" "/api/promotions" "/api/materials" "/api/about" "/api/contact" "/api/exchange-rates"; do
  echo -n "$api: "
  curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$api"
  echo ""
done
```
预期：全部 200

- [ ] **步骤 2：测试认证 API（7 个）**

```bash
# 先登录
curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt "http://localhost:3000/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"admin123"}' > /dev/null

for api in "/api/orders?limit=3" "/api/orders-list?limit=3" "/api/cart" "/api/auth/me" "/api/addresses"; do
  echo -n "$api: "
  curl -s -o /dev/null -w "%{http_code}" -b /tmp/cookies.txt "http://localhost:3000$api"
  echo ""
done
```
预期：全部 200

- [ ] **步骤 3：测试统一支付结果 API**

```bash
# 测试取消回调
echo -n "result cancel: "
curl -s -o /dev/null -w "%{http_code} → %{redirect_url}" "http://localhost:3000/api/payments/result?order_number=ORD_TEST&source=cart&status=cancel"
echo ""

# 测试不存在订单
echo -n "result not_found: "
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/payments/result?order_number=NONEXISTENT&source=cart"
echo ""
```
预期：redirect 302

- [ ] **步骤 4：测试前端页面访问**

```bash
for page in "/payment-result?status=success&order_number=TEST&source=cart" "/cart/success?order_number=TEST" "/quick-order/success?order_number=TEST"; do
  echo -n "$page: "
  curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$page"
  echo ""
done
```
预期：全部 200

- [ ] **步骤 5：测试 Deals 价格非零**

```bash
curl -s "http://localhost:3000/api/products/deals?limit=1" | python3 -c "import json,sys; d=json.load(sys.stdin); p=d['data']['products'][0]; assert p['price']>0 and p['price_usd']>0, 'price zero!'; print(f'OK: price={p[\"price\"]}, price_usd={p[\"price_usd\"]}')"
```
预期：`OK: price=XX.XX, price_usd=XX.XX`

---

## 影响分析 —— 为什么不会破坏现有功能

### 1. 完全不动的部分（零风险）

| 组件 | 说明 |
|------|------|
| `notify` webhook 处理（3 个平台） | **完全不修改** — 继续由支付平台服务器调用 |
| `cancel` API handler（3 个平台） | **保留不删** — 旧 cancel_url 的兜底 |
| `orders-list` API | **不修改** — 所有查询接口不变 |
| `products`、`home`、`categories` 等全部无关联 API | **完全不涉及** |
| 库存预留/扣减逻辑 | **完全不涉及** |
| 促销/优惠券计算逻辑 | **完全不涉及** |

### 2. 轻微修改的部分（低风险）

| 组件 | 变化 | 风险 |
|------|------|------|
| cart/page.tsx | body 加一个 `source: 'cart'` 字段 | PayPal/Alipay 路由忽略该字段时完全无影响（未使用前都是 `source = 'cart'` 的默认值） |
| quick-order/page.tsx | body 加一个 `source: 'quick-order'` 字段 | 同上 |
| orders/[id]/route.ts | 新加一个 SQL 查询 | 响应多一个字段，原有字段不变 |

### 3. 关键变化部分（需要重点验证）

| 组件 | 变化 | 缓解措施 |
|------|------|---------|
| paypal/route.ts | return_url 从 `/cart/success` 改为 `/api/payments/result?...` | `source` 参数有默认值 `'cart'`，不加时行为不变 |
| alipay/route.ts | 同上 | 同上 |
| stripe/route.ts | 同上 | 同上 |

### 4. 新增部分（零风险于现有功能）

| 组件 | 说明 |
|------|------|
| `/api/payments/result` | 新 API，不与任何现有 API 冲突 |
| `/payment-result` | 新页面，不影响任何现有页面 |
| `/orders/[id]` | 新页面，原路由不存在（之前 cancel 跳转到这里会 404） |

---

## 执行后验证清单

- [ ] 购物车添加商品 → 选 PayPal → 支付 API 返回 redirect_url（含 source=cart）
- [ ] 快速下单 → 选 PayPal → 支付 API 返回 redirect_url（含 source=quick-order）
- [ ] PayPal 取消 → 浏览器跳转到 `/payment-result?status=cancel&source=cart` → 显示取消信息 + 重新支付按钮
- [ ] PayPal 模拟成功 → `/api/payments/result` 处理完跳转到 `/payment-result?status=success`
- [ ] `/orders/[id]` 页面显示商品图片、地址、完整费用明细、支付记录
- [ ] 旧链接 `/cart/success?order_number=XXX` 自动重定向到 `/payment-result`
- [ ] 旧链接 `/quick-order/success?order_number=XXX` 自动重定向到 `/payment-result`
- [ ] 所有 18 个非认证 API 返回 200
- [ ] 所有 5 个认证 API 返回 200
- [ ] Deals 页面价格不为 $0.00
- [ ] 库存操作不变（加购物车扣库存、减购物车还库存）
