# 多支付通道统一收口 + 架构模块化 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 Stripe、Alipay 支付通道统一收口为"前端只传 order_number，金额从 DB 读取"的安全模式（与 PayPal 一致），同时架构模块化以便未来添加微信支付等新通道时只需新建 Adapter 文件，零改动现有代码。

**架构：** Strategy（策略）+ Adapter（适配器）双模式。共享层 `order-data-service.ts` 负责从 DB 获取订单支付数据（4 个通道 100% 相同），每个通道的 Adapter 独立处理 API 认证、金额转换、请求构造、响应解析。新加通道 = 新建一个 Adapter 文件 + 一个薄路由文件。

**技术栈：** Next.js 16 App Router + SQL.js (sqlite) + Stripe SDK + PayPal REST API + Alipay RSA2 签名

---

## 背景分析

### 四通道核心差异

| 维度 | PayPal (✅ 已收口) | Stripe (🔧待改) | Alipay (🔧待改) | 微信支付 (⏳未来) |
|------|-------------------|-----------------|-----------------|-------------------|
| API 地址 | `POST /v2/checkout/orders` | `checkout.sessions.create` | `alipay.trade.page.pay` | `POST /v3/pay/transactions/jsapi` |
| 认证方式 | OAuth2 (client_id+secret → Bearer) | API Key | RSA2 签名 | APIv3 签名 (商户证书RSA) |
| 金额单位 | 主币单位（如 99.99） | **分** (×100) | 主币单位（如 99.99） | **分** (×100) |
| 金额字段名 | `amount.value` | `unit_amount` | `total_amount` | `amount.total` |
| 支持币种 | 多币种 | 135+ currencies | 主要 CNY | **仅 CNY**（境内商户） |
| 行项目 | ✅ items[] + breakdown | ✅ line_items[] | ❌ 不支持 | ⚠️ detail 可选 |
| 返回类型 | `redirect_url` | `redirect_url` | `redirect_url` (302) | **`prepay_id`** (非URL!) |
| 前端接参 | 仅 `order_number` | ~~amount, items, currency~~ | ~~amount, order_id~~ | 仅 `order_number` + `openid` |
| 订单号字段 | `reference_id`+`custom_id` | `metadata.order_number` | `out_trade_no` | `out_trade_no` |
| 商品描述 | `items[].name` | `product_data.name` | `subject` | `description` |

### 关键安全风险

| 问题编号 | 通道 | 严重程度 | 描述 |
|---------|------|---------|------|
| PAYMENT-004 | Stripe | 🔴 高 | 金额/items 来自前端，仅做单品校验，不校验 `orders.final_amount` |
| PAYMENT-005 | Alipay | 🔴 严重 | GET 和 POST 都直接使用前端 `amount` 参数，零校验 |
| PAYMENT-006 | Alipay | 🟡 中 | POST 缺少 `payment_method === 'alipay'` 校验 |
| — | Alipay | 🟢 低 | `EXCHANGE_RATES` 常量定义但从未使用（死代码） |

### 设计决策：什么合并，什么不合并

**✅ 合并到共享层（`order-data-service.ts`）**——4 个通道 100% 相同的逻辑：
1. 根据 `order_number` 查询 `orders` 表 → `final_amount`, `shipping_fee`, discounts, status
2. 根据 `order.id` 查询 `order_items` → 商品列表、数量、单价
3. 校验订单状态是否为 `pending`
4. 校验 `payment_method` 是否匹配当前通道
5. 返回标准化的 `OrderPaymentData` 结构体

**❌ 留在各自 Adapter**——每个通道独立处理：
1. 金额单位转换（PayPal/Alipay 主币；Stripe/微信 分）
2. API 认证（OAuth2 vs API Key vs RSA2 vs APIv3）
3. 请求体构造（字段名完全不同）
4. 行项目处理（PayPal 要 breakdown；Stripe 要 line_items；Alipay 不支持；微信可选）
5. 响应解析（返回 URL vs 返回 prepay_id）
6. 前端 SDK 参数（微信需要 paySign + nonceStr + timestamp）
7. 币种限制（微信仅 CNY）

### 响应类型分类

```
类型A - RedirectURL：PayPal、Stripe、Alipay
  → 返回 { payment_id, redirect_url }

类型B - SDKParams：微信支付
  → 返回 { payment_id, sdk_params: { prepay_id, paySign, nonceStr, timestamp } }
```

---

## 文件结构总览

```
src/lib/payment/
├── types.ts                      # 新建 - 统一类型定义
├── channel-config.ts             # 新建 - 通道配置注册表
├── order-data-service.ts         # 新建 - 共享数据层（✅ 核心复用）
├── paypal-adapter.ts             # 新建 - PayPal 适配器
├── stripe-adapter.ts             # 新建 - Stripe 适配器
├── alipay-adapter.ts             # 新建 - Alipay 适配器
├── payment-service.ts            # 新建 - 统一入口（Strategy 模式）
├── PaymentService.ts             # 已有 - 配置管理
├── errorCodeMapper.ts            # 已有 - 错误码映射
└── utils.ts                      # 已有 - 通用工具

路由层（极致轻薄）：
├── src/app/api/payments/paypal/route.ts    # 简化 - 约 30 行薄路由
├── src/app/api/payments/stripe/route.ts    # 重写 - 约 30 行薄路由
└── src/app/api/payments/alipay/route.ts    # 重写 - 约 40 行薄路由
```

---

## 分阶段任务

---

### Phase 1：创建共享层（零风险，不改任何现有路由）

---

### 任务 1.1：创建统一类型定义

**文件：**
- 新建：`src/lib/payment/types.ts`

**职责：** 定义所有通道共用的接口和类型

- [ ] **步骤 1：编写 types.ts**

```typescript
// src/lib/payment/types.ts
// 多支付通道统一类型定义

/**
 * 订单支付数据 — 从 DB 查询后的标准化结构
 * 所有支付通道 Adapter 都使用这个结构
 */
export interface OrderPaymentData {
  order: {
    id: number;
    order_number: string;
    final_amount: number;
    shipping_fee: number;
    total_original_price: number;
    order_final_discount_amount: number;
    total_coupon_discount: number;
    order_status: string;
    payment_method: string;
    created_at: string;
  };
  items: OrderPaymentItem[];
  finalAmount: number;
  shippingFee: number;
  itemTotal: number;
  discountAmount: number;
}

export interface OrderPaymentItem {
  product_id: number;
  product_name: string;
  quantity: number;
  original_price: number;
}

/**
 * 支付请求入参 — 路由层接收的标准化参数
 */
export interface PaymentRequest {
  order_number: string;
  currency?: string;
  lang?: string;
  source?: string;
  extra?: Record<string, string>;
}

/**
 * 支付网关返回结果
 */
export type PaymentGatewayResult =
  | RedirectPaymentResult
  | SdkParamsPaymentResult;

export interface RedirectPaymentResult {
  type: 'redirect';
  paymentId: string;
  redirectUrl: string;
}

export interface SdkParamsPaymentResult {
  type: 'sdk_params';
  paymentId: string;
  sdkParams: {
    prepayId: string;
    paySign: string;
    nonceStr: string;
    timestamp: string;
    signType: string;
  };
}

/**
 * 通道配置
 */
export interface ChannelConfig {
  channel: string;
  amountUnit: 'main' | 'cents';
  supportsLineItems: boolean;
  responseType: 'redirect' | 'sdk_params';
  defaultCurrency: string;
  supportedCurrencies: string[];
  requiresClientIp: boolean;
  requiresOpenid: boolean;
}

/**
 * 通道适配器接口 — 每个支付通道实现此接口
 */
export interface PaymentAdapter {
  createPayment(
    orderData: OrderPaymentData,
    request: PaymentRequest
  ): Promise<PaymentGatewayResult>;
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
预期：无新增错误

- [ ] **步骤 3：Commit**

```bash
git add src/lib/payment/types.ts
git commit -m "feat(payment): add unified payment types definition"
```

---

### 任务 1.2：创建通道配置注册表

**文件：**
- 新建：`src/lib/payment/channel-config.ts`

**职责：** 集中管理 4 个通道的差异化配置

- [ ] **步骤 1：编写 channel-config.ts**

```typescript
// src/lib/payment/channel-config.ts
import { ChannelConfig } from './types';

export const CHANNEL_CONFIGS: Record<string, ChannelConfig> = {
  paypal: {
    channel: 'paypal',
    amountUnit: 'main',
    supportsLineItems: true,
    responseType: 'redirect',
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD', 'EUR', 'AED', 'GBP', 'CNY'],
    requiresClientIp: false,
    requiresOpenid: false,
  },
  stripe: {
    channel: 'stripe',
    amountUnit: 'cents',
    supportsLineItems: true,
    responseType: 'redirect',
    defaultCurrency: 'usd',
    supportedCurrencies: ['usd', 'aed', 'eur', 'cny', 'gbp'],
    requiresClientIp: false,
    requiresOpenid: false,
  },
  alipay: {
    channel: 'alipay',
    amountUnit: 'main',
    supportsLineItems: false,
    responseType: 'redirect',
    defaultCurrency: 'CNY',
    supportedCurrencies: ['CNY'],
    requiresClientIp: false,
    requiresOpenid: false,
  },
  wechat: {
    channel: 'wechat',
    amountUnit: 'cents',
    supportsLineItems: false,
    responseType: 'sdk_params',
    defaultCurrency: 'CNY',
    supportedCurrencies: ['CNY'],
    requiresClientIp: true,
    requiresOpenid: true,
  },
};

export function getChannelConfig(channel: string): ChannelConfig {
  const config = CHANNEL_CONFIGS[channel];
  if (!config) {
    throw new Error(`Unknown payment channel: ${channel}`);
  }
  return config;
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
预期：无新增错误

- [ ] **步骤 3：Commit**

```bash
git add src/lib/payment/channel-config.ts
git commit -m "feat(payment): add channel configuration registry"
```

---

### 任务 1.3：创建共享订单数据服务

**文件：**
- 新建：`src/lib/payment/order-data-service.ts`

**职责：** 从 DB 查询订单支付所需的所有数据，所有 Adapter 共用

- [ ] **步骤 1：编写 order-data-service.ts**

```typescript
// src/lib/payment/order-data-service.ts
import { query } from '@/lib/db';
import { OrderPaymentData } from './types';

/**
 * getPaymentOrderData - 从数据库获取订单支付所需的数据
 *
 * 所有支付通道 Adapter 调用此函数获取订单数据，
 * 确保金额和其他信息以 DB 为准，不接受前端传入。
 *
 * @param orderNumber - 订单号
 * @param expectedMethod - 期望的支付方式（如 'alipay', 'stripe'），用于校验
 * @returns 标准化的订单支付数据
 */
export async function getPaymentOrderData(
  orderNumber: string,
  expectedMethod?: string
): Promise<OrderPaymentData> {
  // 1. 查询订单
  const orderResult = await query(
    `SELECT id, order_number, final_amount, shipping_fee,
            total_original_price, order_final_discount_amount,
            total_coupon_discount, order_status, payment_method, created_at
     FROM orders WHERE order_number = ?`,
    [orderNumber]
  );

  if (orderResult.rows.length === 0) {
    throw new PaymentDataError('ORDER_NOT_FOUND', '订单不存在', 404);
  }

  const order = orderResult.rows[0];

  // 2. 校验订单状态
  if (order.order_status !== 'pending') {
    throw new PaymentDataError(
      'ORDER_STATUS_INVALID',
      '订单状态不允许支付',
      400
    );
  }

  // 3. 校验支付方式（如果指定了 expectedMethod）
  if (expectedMethod && order.payment_method !== expectedMethod) {
    throw new PaymentDataError(
      'PAYMENT_METHOD_MISMATCH',
      `订单支付方式不匹配，期望: ${expectedMethod}，实际: ${order.payment_method}`,
      400
    );
  }

  // 4. 查询订单商品
  const itemsResult = await query(
    `SELECT oi.product_id, p.name as product_name, oi.quantity, oi.original_price
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [order.id]
  );

  if (itemsResult.rows.length === 0) {
    throw new PaymentDataError('ORDER_EMPTY', '订单无商品', 400);
  }

  // 5. 组装返回数据
  const finalAmount = parseFloat(order.final_amount) || 0;
  const shippingFee = parseFloat(order.shipping_fee) || 0;
  const itemTotal = parseFloat(order.total_original_price) || 0;
  const discountAmount = parseFloat(order.order_final_discount_amount) || 0;

  return {
    order: {
      id: order.id,
      order_number: order.order_number,
      final_amount: finalAmount,
      shipping_fee: shippingFee,
      total_original_price: itemTotal,
      order_final_discount_amount: discountAmount,
      total_coupon_discount: parseFloat(order.total_coupon_discount) || 0,
      order_status: order.order_status,
      payment_method: order.payment_method,
      created_at: order.created_at,
    },
    items: itemsResult.rows.map((item: any) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      original_price: parseFloat(item.original_price) || 0,
    })),
    finalAmount,
    shippingFee,
    itemTotal,
    discountAmount,
  };
}

/**
 * PaymentDataError - 订单数据校验错误
 */
export class PaymentDataError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
预期：无新增错误

- [ ] **步骤 3：Commit**

```bash
git add src/lib/payment/order-data-service.ts
git commit -m "feat(payment): add shared order data service for all gateways"
```

---

### Phase 2：收口 Alipay（安全风险最高，优先处理）

---

### 任务 2.1：创建 Alipay Adapter

**文件：**
- 新建：`src/lib/payment/alipay-adapter.ts`

**职责：** 封装 Alipay `alipay.trade.page.pay` API 调用，金额以 DB 为准

- [ ] **步骤 1：编写 alipay-adapter.ts**

```typescript
// src/lib/payment/alipay-adapter.ts
import { OrderPaymentData, PaymentRequest, RedirectPaymentResult, PaymentAdapter } from './types';
import { getChannelConfig } from './channel-config';
import { logMonitor } from '@/lib/utils/logger';
import crypto from 'crypto';

/**
 * AlipayAdapter - 支付宝页面支付适配器
 *
 * 实现 alipay.trade.page.pay 接口：
 * 1. orderData.finalAmount 替代前端 amount
 * 2. 使用 RSA2 签名构造支付 URL
 * 3. 返回 302 重定向地址
 */
export class AlipayAdapter implements PaymentAdapter {
  async createPayment(
    orderData: OrderPaymentData,
    request: PaymentRequest
  ): Promise<RedirectPaymentResult> {
    const { order, finalAmount } = orderData;
    const { order_number, currency = 'CNY', source = 'cart', lang = 'zh' } = request;

    logMonitor('PAYMENTS', 'REQUEST', {
      action: 'ALIPAY_ADAPTER_CREATE',
      orderNumber: order_number,
      finalAmount,
      currency,
    });

    // 获取 Alipay 配置
    const alipayPartner = process.env.ALIPAY_PARTNER_ID;
    const alipaySellerId = process.env.ALIPAY_SELLER_ID;
    const alipayPrivateKey = process.env.ALIPAY_PRIVATE_KEY;
    const alipayGateway = process.env.ALIPAY_GATEWAY_URL || 'https://openapi.alipaydev.com/gateway.do';
    const alipayAppId = process.env.ALIPAY_APP_ID || '';

    // 如果未配置 Alipay，返回模拟支付 URL
    if (!alipayPartner || !alipaySellerId || !alipayPrivateKey) {
      logMonitor('PAYMENTS', 'INFO', {
        action: 'ALIPAY_MOCK_MODE',
        reason: 'Alipay config not found, using mock URL',
      });
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const mockUrl = `${baseUrl}/cart/success?order_number=${order_number}&payment_method=alipay`;
      return {
        type: 'redirect',
        paymentId: `alipay_mock_${order_number}`,
        redirectUrl: mockUrl,
      };
    }

    // 构造 biz_content — 注意 total_amount 来自 orderData.finalAmount
    const bizContent = {
      out_trade_no: order_number,
      total_amount: finalAmount.toFixed(2),
      subject: `Order Payment - ${order_number}`,
      product_code: 'FAST_INSTANT_TRADE_PAY',
    };

    const bizContentStr = JSON.stringify(bizContent);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const now = new Date();

    const params: Record<string, string> = {
      app_id: alipayAppId,
      method: 'alipay.trade.page.pay',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: now.toISOString().split('T')[0] + ' ' + now.toTimeString().split(' ')[0],
      version: '1.0',
      notify_url: `${baseUrl}/api/payments/alipay/notify`,
      return_url: `${baseUrl}/api/payments/result?order_number=${order_number}&trade_no={TRADE_NO}&source=${source}&platform=alipay`,
      biz_content: bizContentStr,
    };

    // RSA2 签名
    const queryString = new URLSearchParams(params).toString();
    const sign = this.generateRSA2Sign(queryString, alipayPrivateKey);
    params.sign = sign;

    const paymentUrl = `${alipayGateway}?${new URLSearchParams(params).toString()}`;

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'ALIPAY_URL_GENERATED',
      orderNumber: order_number,
      finalAmount,
      paymentUrlPresent: !!paymentUrl,
    });

    return {
      type: 'redirect',
      paymentId: `alipay_${order_number}`,
      redirectUrl: paymentUrl,
    };
  }

  private generateRSA2Sign(content: string, privateKey: string): string {
    const sign = crypto.sign('RSA-SHA256', Buffer.from(content), {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    });
    return sign.toString('base64');
  }
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
预期：无新增错误

- [ ] **步骤 3：Commit**

```bash
git add src/lib/payment/alipay-adapter.ts
git commit -m "feat(payment): add Alipay adapter with DB-authoritative amount"
```

---

### 任务 2.2：重写 Alipay 路由

**文件：**
- 重写：`src/app/api/payments/alipay/route.ts`

**职责：** GET 和 POST 都改为只接 `order_number`，金额从 DB 读取

**需要删掉的：**
- `EXCHANGE_RATES` 常量（死代码）
- 旧 `GET` 中的 `amount` 从 URL 参数读取
- 旧 `POST` 中的 `amount` 从请求体读取
- 旧 `POST` 中缺失的 `payment_method` 校验

- [ ] **步骤 1：备份现有文件并编写新 route.ts**

```typescript
// src/app/api/payments/alipay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';
import { getPaymentOrderData, PaymentDataError } from '@/lib/payment/order-data-service';
import { AlipayAdapter } from '@/lib/payment/alipay-adapter';

const alipayAdapter = new AlipayAdapter();

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

/**
 * GET /api/payments/alipay - 创建支付宝支付（URL 参数模式）
 *
 * 前端调用：GET /api/payments/alipay?order_number=xxx
 * 后端从 DB 获取订单 final_amount，构造支付宝支付 URL 并 302 跳转
 */
export async function GET(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'GET',
    path: '/api/payments/alipay',
    lang,
  });

  try {
    const { searchParams } = new URL(request.url);
    const order_number = searchParams.get('order_number');
    const source = searchParams.get('source') || 'cart';

    if (!order_number) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', { reason: 'Missing order_number' });
      return NextResponse.json({
        success: false,
        error: 'MISSING_ORDER_NUMBER',
        message: '缺少订单号 order_number',
      }, { status: 400 });
    }

    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PAYMENTS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    // 从 DB 获取订单数据（自动校验状态 + payment_method === 'alipay'）
    const orderData = await getPaymentOrderData(order_number, 'alipay');

    const result = await alipayAdapter.createPayment(orderData, {
      order_number,
      source,
      lang,
    });

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'ALIPAY_REDIRECT',
      orderNumber: order_number,
      finalAmount: orderData.finalAmount,
    });

    return NextResponse.redirect(result.redirectUrl);

  } catch (error: any) {
    if (error instanceof PaymentDataError) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        action: 'ALIPAY_CREATE',
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({
        success: false,
        error: error.code,
        message: error.message,
      }, { status: error.status });
    }

    logMonitor('PAYMENTS', 'ERROR', {
      action: 'ALIPAY_CREATE',
      error: String(error),
    });
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误',
    }, { status: 500 });
  }
}

/**
 * POST /api/payments/alipay - 创建支付宝支付（JSON 模式）
 *
 * 前端调用：POST /api/payments/alipay { order_number }
 * 后端从 DB 获取订单 final_amount，返回支付 URL 给前端自行跳转
 */
export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'POST',
    path: '/api/payments/alipay',
    lang,
  });

  try {
    const body = await request.json();
    const { order_number, source = 'cart' } = body;

    if (!order_number) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', { reason: 'Missing order_number' });
      return NextResponse.json({
        success: false,
        error: 'MISSING_ORDER_NUMBER',
        message: '缺少订单号 order_number',
      }, { status: 400 });
    }

    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PAYMENTS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    // 从 DB 获取订单数据（自动校验状态 + payment_method === 'alipay'）
    const orderData = await getPaymentOrderData(order_number, 'alipay');

    const result = await alipayAdapter.createPayment(orderData, {
      order_number,
      source,
      lang,
    });

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'ALIPAY_CREATED',
      orderNumber: order_number,
      finalAmount: orderData.finalAmount,
    });

    return NextResponse.json({
      success: true,
      data: {
        order_number,
        payment_method: 'alipay',
        payment_url: result.redirectUrl,
      },
    });

  } catch (error: any) {
    if (error instanceof PaymentDataError) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        action: 'ALIPAY_CREATE',
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({
        success: false,
        error: error.code,
        message: error.message,
      }, { status: error.status });
    }

    logMonitor('PAYMENTS', 'ERROR', {
      action: 'ALIPAY_CREATE',
      error: String(error),
    });
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误',
    }, { status: 500 });
  }
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
预期：无新增错误

- [ ] **步骤 3：验证 Alipay 支付功能**

1. 启动开发服务器：`npm run dev`
2. 创建一个 `payment_method = 'alipay'` 的 pending 订单
3. 用 curl 测试 POST：
```bash
curl -X POST http://localhost:3000/api/payments/alipay \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<有效的JWT>" \
  -d '{"order_number":"ORDxxx"}'
```
4. 确认响应中的 `payment_url` 金额与 `orders.final_amount` 一致
5. 确认响应无 `amount` 字段来自前端

- [ ] **步骤 4：验证 payment_method 校验**

1. 创建一个 `payment_method = 'stripe'` 的订单
2. 用上述 curl 访问 Alipay API，传入该订单的 order_number
3. 预期返回 400 错误：`PAYMENT_METHOD_MISMATCH`

- [ ] **步骤 5：Commit**

```bash
git add src/app/api/payments/alipay/route.ts
git commit -m "fix(payment): Alipay route reads amount from DB, adds payment_method validation"
```

---

### Phase 3：收口 Stripe

---

### 任务 3.1：创建 Stripe Adapter

**文件：**
- 新建：`src/lib/payment/stripe-adapter.ts`

**职责：** 封装 Stripe Checkout Session API 调用，金额和 line_items 以 DB 为准

- [ ] **步骤 1：编写 stripe-adapter.ts**

```typescript
// src/lib/payment/stripe-adapter.ts
import Stripe from 'stripe';
import { OrderPaymentData, PaymentRequest, RedirectPaymentResult, PaymentAdapter } from './types';
import { getChannelConfig } from './channel-config';
import { logMonitor } from '@/lib/utils/logger';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' as any })
  : null;

/**
 * StripeAdapter - Stripe Checkout Session 适配器
 *
 * 实现 Stripe Checkout API：
 * 1. orderData.finalAmount → 转换为分（×100）
 * 2. orderData.items → 构建 line_items
 * 3. 运费和折扣通过 Stripe Checkout 的 shipping_options / discounts 传递
 */
export class StripeAdapter implements PaymentAdapter {
  async createPayment(
    orderData: OrderPaymentData,
    request: PaymentRequest
  ): Promise<RedirectPaymentResult> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const { order, items, shippingFee, discountAmount } = orderData;
    const { order_number, currency = 'aed', source = 'cart' } = request;

    logMonitor('PAYMENTS', 'REQUEST', {
      action: 'STRIPE_ADAPTER_CREATE',
      orderNumber: order_number,
      itemCount: items.length,
      shippingFee,
      discountAmount,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // 构建 line_items — 数据来源：DB order_items
    // 注意：Stripe 金额单位为分，需要 ×100
    const lineItems = items.map((item) => ({
      price_data: {
        currency,
        product_data: {
          name: item.product_name || `Product ${item.product_id}`,
        },
        unit_amount: Math.round(item.original_price * 100),
      },
      quantity: item.quantity,
    }));

    // 构建 shipping_options（如果有运费）
    const shippingOptions = shippingFee > 0
      ? [{
          shipping_rate_data: {
            type: 'fixed_amount' as const,
            fixed_amount: {
              amount: Math.round(shippingFee * 100),
              currency,
            },
            display_name: 'Shipping Fee',
          },
        }]
      : undefined;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      ...(shippingOptions && { shipping_options: shippingOptions }),
      success_url: `${baseUrl}/api/payments/result?order_number=${order_number}&session_id={CHECKOUT_SESSION_ID}&source=${source}&platform=stripe`,
      cancel_url: `${baseUrl}/api/payments/result?order_number=${order_number}&source=${source}&platform=stripe&status=cancel`,
      metadata: {
        order_number,
      },
    });

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'STRIPE_SESSION_CREATED',
      sessionId: session.id,
      orderNumber: order_number,
      currency,
      itemCount: items.length,
    });

    return {
      type: 'redirect',
      paymentId: session.id,
      redirectUrl: session.url || '',
    };
  }
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
预期：无新增错误

- [ ] **步骤 3：Commit**

```bash
git add src/lib/payment/stripe-adapter.ts
git commit -m "feat(payment): add Stripe adapter with DB-authoritative amounts"
```

---

### 任务 3.2：重写 Stripe 路由

**文件：**
- 重写：`src/app/api/payments/stripe/route.ts`

**职责：** 改为只接 `order_number`，删除 `verifyPrices()` 和 `calculateItemPrice()`

**需要删掉的：**
- `verifyPrices()` 函数（行 69-82）
- `calculateItemPrice()` 函数（行 19-66）
- 前端传入的 `amount`, `items`, `currency` 参数
- `re-pay` 特殊模式

- [ ] **步骤 1：编写新 route.ts**

```typescript
// src/app/api/payments/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logMonitor } from '@/lib/utils/logger';
import { getPaymentOrderData, PaymentDataError } from '@/lib/payment/order-data-service';
import { StripeAdapter } from '@/lib/payment/stripe-adapter';

const stripeAdapter = new StripeAdapter();

/**
 * POST /api/payments/stripe - 创建 Stripe Checkout Session
 *
 * 前端只传 order_number，金额和商品从 DB 读取
 */
export async function POST(request: NextRequest) {
  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'POST',
    path: '/api/payments/stripe',
  });

  try {
    const body = await request.json();
    const { order_number, source = 'cart' } = body;

    if (!order_number) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', { reason: 'Missing order_number' });
      return NextResponse.json({
        success: false,
        error: 'MISSING_ORDER_NUMBER',
        message: '缺少订单号 order_number',
      }, { status: 400 });
    }

    // 从 DB 获取订单数据（自动校验状态 + payment_method === 'stripe'）
    const orderData = await getPaymentOrderData(order_number, 'stripe');

    const result = await stripeAdapter.createPayment(orderData, {
      order_number,
      source,
    });

    return NextResponse.json({
      success: true,
      data: {
        payment_id: result.paymentId,
        redirect_url: result.redirectUrl,
      },
    });

  } catch (error: any) {
    if (error instanceof PaymentDataError) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        action: 'STRIPE_CREATE',
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({
        success: false,
        error: error.code,
        message: error.message,
      }, { status: error.status });
    }

    logMonitor('PAYMENTS', 'ERROR', {
      action: 'STRIPE_PAYMENT',
      error: String(error),
    });
    return NextResponse.json({
      success: false,
      error: 'PAYMENT_CREATION_FAILED',
      message: 'Payment creation failed',
    }, { status: 500 });
  }
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
预期：无新增错误

- [ ] **步骤 3：验证 Stripe 支付功能**

1. 启动开发服务器：`npm run dev`
2. 创建一个 `payment_method = 'stripe'` 的 pending 订单（含运费+优惠券）
3. 用 curl 测试：
```bash
curl -X POST http://localhost:3000/api/payments/stripe \
  -H "Content-Type: application/json" \
  -d '{"order_number":"ORDxxx"}'
```
4. 确认返回的 `redirect_url` 指向正确的 Stripe Checkout 页面
5. 打开 Stripe Dashboard 确认 Session 的金额和商品与订单一致

- [ ] **步骤 4：验证旧的 amount 参数被拒绝**

1. 确认用旧的参数格式（含 `amount`）调用时不会产生异常行为
2. API 应该忽略 `amount` 参数（因为代码不再读取它）

- [ ] **步骤 5：Commit**

```bash
git add src/app/api/payments/stripe/route.ts
git commit -m "fix(payment): Stripe route reads amounts from DB, removes client-side price calc"
```

---

### Phase 4：PayPal 切换到共享层（可选）

---

### 任务 4.1：创建 PayPal Adapter

**文件：**
- 新建：`src/lib/payment/paypal-adapter.ts`

**职责：** 封装 PayPal Orders API v2 调用，用 `getPaymentOrderData()` 替代内联 SQL

- [ ] **步骤 1：编写 paypal-adapter.ts**

```typescript
// src/lib/payment/paypal-adapter.ts
import { OrderPaymentData, PaymentRequest, RedirectPaymentResult, PaymentAdapter } from './types';
import { PaymentService } from '@/lib/payment/PaymentService';
import { logMonitor } from '@/lib/utils/logger';

const PAYPAL_API_BASE_SANDBOX = 'https://api-m.sandbox.paypal.com';
const PAYPAL_API_BASE_LIVE = 'https://api-m.paypal.com';

/**
 * PayPalAdapter - PayPal Orders API v2 适配器
 */
export class PayPalAdapter implements PaymentAdapter {
  private getConfig() {
    const config = PaymentService.getConfig('paypal');
    if (!config) throw new Error('PayPal configuration not found');
    const configJson = JSON.parse(config.config_json || '{}');
    return {
      clientId: configJson.client_id || '',
      clientSecret: configJson.client_secret || '',
      isSandbox: config.is_sandbox,
      apiBase: config.is_sandbox ? PAYPAL_API_BASE_SANDBOX : PAYPAL_API_BASE_LIVE,
    };
  }

  private async getAccessToken(): Promise<string> {
    const { clientId, clientSecret, apiBase } = this.getConfig();
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(`${apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      logMonitor('PAYMENTS', 'ERROR', { action: 'PAYPAL_AUTH_FAILED', status: response.status });
      throw new Error('Failed to get PayPal access token');
    }

    const data = await response.json();
    return data.access_token;
  }

  private sanitizeProductName(name: string): string {
    return name.replace(/[^\x00-\x7F]/g, '').substring(0, 127);
  }

  async createPayment(
    orderData: OrderPaymentData,
    request: PaymentRequest
  ): Promise<RedirectPaymentResult> {
    await PaymentService.initialize();
    const config = this.getConfig();

    const { order, items, finalAmount, shippingFee, itemTotal, discountAmount } = orderData;
    const { order_number, currency = 'USD' } = request;

    logMonitor('PAYMENTS', 'REQUEST', {
      action: 'PAYPAL_ADAPTER_CREATE',
      orderNumber: order_number,
      finalAmount,
      currency,
    });

    // 构建 PayPal items
    const paypalItems = items.map((item) => ({
      name: this.sanitizeProductName(item.product_name) || `Product ${item.product_id}`,
      unit_amount: {
        currency_code: currency,
        value: parseFloat(item.original_price.toFixed(2)),
      },
      quantity: String(item.quantity),
      category: 'PHYSICAL_GOODS' as const,
    }));

    const accessToken = await this.getAccessToken();

    // 构建 breakdown
    const breakdown: any = {
      item_total: {
        currency_code: currency,
        value: parseFloat(itemTotal.toFixed(2)),
      },
    };

    if (shippingFee > 0) {
      breakdown.shipping = {
        currency_code: currency,
        value: parseFloat(shippingFee.toFixed(2)),
      };
    }

    if (discountAmount > 0) {
      breakdown.discount = {
        currency_code: currency,
        value: parseFloat(discountAmount.toFixed(2)),
      };
    }

    const paypalOrderData = {
      intent: 'CAPTURE' as const,
      purchase_units: [{
        reference_id: order_number,
        custom_id: order_number,
        amount: {
          currency_code: currency,
          value: parseFloat(finalAmount.toFixed(2)),
          breakdown,
        },
        items: paypalItems,
      }],
      application_context: {
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/cart/success?order_number=${order_number}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/cart/success?order_number=${order_number}&status=cancel&platform=paypal`,
      },
    };

    const response = await fetch(`${config.apiBase}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paypalOrderData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logMonitor('PAYMENTS', 'ERROR', {
        action: 'PAYPAL_API_ERROR',
        status: response.status,
        errorName: errorData.name,
        errorMessage: errorData.message,
      });
      throw { status: response.status, error: errorData };
    }

    const paypalResponse = await response.json();
    const approvalUrl = paypalResponse.links?.find((link: any) => link.rel === 'approve')?.href;

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'PAYPAL_ORDER_CREATED',
      paypalOrderId: paypalResponse.id,
      status: paypalResponse.status,
    });

    return {
      type: 'redirect',
      paymentId: paypalResponse.id,
      redirectUrl: approvalUrl,
    };
  }
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
预期：无新增错误

- [ ] **步骤 3：Commit**

```bash
git add src/lib/payment/paypal-adapter.ts
git commit -m "feat(payment): add PayPal adapter using shared order data service"
```

---

### 任务 4.2：简化 PayPal 路由

**文件：**
- 修改：`src/app/api/payments/paypal/route.ts`

**职责：** 用 Adapter 替代内联逻辑，路由层极度精简

- [ ] **步骤 1：重写 route.ts**

```typescript
// src/app/api/payments/paypal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logMonitor } from '@/lib/utils/logger';
import { resolvePaymentError } from '@/lib/payment/errorCodeMapper';
import { getPaymentOrderData, PaymentDataError } from '@/lib/payment/order-data-service';
import { PayPalAdapter } from '@/lib/payment/paypal-adapter';

const paypalAdapter = new PayPalAdapter();

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

export async function POST(req: NextRequest) {
  const lang = getLangFromRequest(req);

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'POST',
    path: '/api/payments/paypal',
    lang,
  });

  try {
    const body = await req.json();
    const { order_number, currency = 'USD' } = body;

    if (!order_number) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', { reason: 'Missing order_number' });
      return NextResponse.json({
        success: false,
        error: 'MISSING_ORDER_NUMBER',
        message: '缺少订单号 order_number',
      }, { status: 400 });
    }

    const orderData = await getPaymentOrderData(order_number, 'paypal');

    const result = await paypalAdapter.createPayment(orderData, {
      order_number,
      currency,
      lang,
    });

    return NextResponse.json({
      success: true,
      data: {
        payment_id: result.paymentId,
        redirect_url: result.redirectUrl,
      },
    });

  } catch (error: any) {
    if (error instanceof PaymentDataError) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({
        success: false,
        error: error.code,
        message: error.message,
      }, { status: error.status });
    }

    logMonitor('PAYMENTS', 'ERROR', {
      action: 'PAYPAL_PAYMENT_ERROR',
      error: String(error),
    });

    const resolved = await resolvePaymentError({
      platform: 'paypal',
      lang: (lang as any) || 'zh',
      httpStatus: error?.status,
      name: error?.error?.name,
      issues: Array.isArray(error?.error?.details)
        ? error.error.details.map((d: any) => ({ issue: d.issue, description: d.description }))
        : [],
      messageEn: error?.error?.message || error?.message,
    });

    return NextResponse.json({
      success: false,
      error: resolved.unifiedCode,
      error_type: resolved.errorType,
      message: resolved.message,
    }, { status: error.status || 500 });
  }
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
预期：无新增错误

- [ ] **步骤 3：验证 PayPal 支付功能**

1. 创建一个 `payment_method = 'paypal'` 的 pending 订单
2. 用 curl 测试：
```bash
curl -X POST http://localhost:3000/api/payments/paypal \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<有效的JWT>" \
  -d '{"order_number":"ORDxxx"}'
```
3. 确认返回的 `redirect_url` 正确

- [ ] **步骤 4：Commit**

```bash
git add src/app/api/payments/paypal/route.ts
git commit -m "refactor(payment): PayPal route uses shared adapter, removes inline SQL"
```

---

### 最终验证

- [ ] **步骤 1：运行完整 TypeScript 编译**

```bash
npx tsc --noEmit --pretty
```
预期：0 errors

- [ ] **步骤 2：启动开发服务器全面验证**

```bash
npm run dev
```

- [ ] **步骤 3：三个通道各自创建订单 + 支付测试**

1. PayPal：创建订单 → POST /api/payments/paypal → 验证 redirect_url
2. Stripe：创建订单 → POST /api/payments/stripe → 验证 redirect_url
3. Alipay：创建订单 → POST /api/payments/alipay → 验证 redirect_url / payment_url

- [ ] **步骤 4：验证 paypal 订单不能被 alipay API 处理**

```bash
# 用 paypal 订单号调 alipay API
curl -X POST http://localhost:3000/api/payments/alipay \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<有效的JWT>" \
  -d '{"order_number":"ORD_PAYPAL_xxx"}'
# 预期：400 PAYMENT_METHOD_MISMATCH
```

- [ ] **步骤 5：最终 Commit**

```bash
git add -A
git commit -m "feat(payment): multi-gateway unification - all channels use DB-authoritative amounts"
```

---

## 变更汇总

| Phase | 新建文件 | 修改文件 | 删除内容 |
|-------|---------|---------|---------|
| 1.1 | `src/lib/payment/types.ts` | — | — |
| 1.2 | `src/lib/payment/channel-config.ts` | — | — |
| 1.3 | `src/lib/payment/order-data-service.ts` | — | — |
| 2.1 | `src/lib/payment/alipay-adapter.ts` | — | — |
| 2.2 | — | `src/app/api/payments/alipay/route.ts` | `EXCHANGE_RATES` 常量, 前端 amount 参数, 缺失的 payment_method 校验 |
| 3.1 | `src/lib/payment/stripe-adapter.ts` | — | — |
| 3.2 | — | `src/app/api/payments/stripe/route.ts` | `verifyPrices()` 函数, `calculateItemPrice()` 函数, `re-pay` 模式, 前端 amount/items 参数 |
| 4.1 | `src/lib/payment/paypal-adapter.ts` | — | — |
| 4.2 | — | `src/app/api/payments/paypal/route.ts` | 内联 SQL 查询, 内联 PayPal API 调用 |

---

## 风险评估

| 风险 | 级别 | 缓解措施 |
|------|------|---------|
| Alipay 前端传参方式变更后前端调用失败 | 🟡 中 | Phase 1 不涉及路由，Phase 2-3 逐通道验证 |
| Stripe 删除 `verifyPrices` 后金额不一致未被发现 | 🟢 低 | 现在金额直接从 DB 读取，不存在"不一致"的可能 |
| PayPal 重构后行为变化 | 🟡 中 | Phase 4 可选，先完成 Phase 2+3 验证后再做 |
| 微信支付不与 redirect_url 模式兼容 | 🟢 已解决 | `PaymentGatewayResult` 支持 `sdk_params` 类型，Adapter 独立处理 |
| TypeScript 类型错误 | 🟢 低 | 每个步骤后运行 `tsc --noEmit` |

---

## 微信支付集成路径（未来）

当需要添加微信支付时，只需：

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/lib/payment/wechat-adapter.ts` | 新建，实现 `PaymentAdapter` 接口 |
| 2 | `src/app/api/payments/wechat/route.ts` | 新建，约 40 行薄路由 |
| 3 | — | 零改动现有文件 ✅ |

微信支付 Adapter 伪代码：

```typescript
// src/lib/payment/wechat-adapter.ts
export class WechatAdapter implements PaymentAdapter {
  async createPayment(
    orderData: OrderPaymentData,
    request: PaymentRequest
  ): Promise<SdkParamsPaymentResult> {
    const { order, finalAmount } = orderData;
    const { order_number, extra } = request;

    // 调用微信 v3 API: POST /v3/pay/transactions/jsapi
    // 金额单位：分（×100）
    const response = await fetch('https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi', {
      method: 'POST',
      headers: {
        'Authorization': this.generateAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appid: process.env.WECHAT_APPID,
        mchid: process.env.WECHAT_MCHID,
        description: `Order ${order_number}`,
        out_trade_no: order_number,
        time_expire: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        notify_url: `${baseUrl}/api/payments/wechat/notify`,
        amount: {
          total: Math.round(finalAmount * 100),
          currency: 'CNY',
        },
        payer: {
          openid: extra?.openid,  // 从请求中传入
        },
      }),
    });

    const data = await response.json();
    const paySign = this.generatePaySign(data.prepay_id);

    return {
      type: 'sdk_params',
      paymentId: data.prepay_id,
      sdkParams: {
        prepayId: data.prepay_id,
        paySign,
        nonceStr: this.generateNonce(),
        timestamp: String(Math.floor(Date.now() / 1000)),
        signType: 'RSA',
      },
    };
  }
}
```

**唯一需要前端配合的**：微信支付前端需要调用 `wx.chooseWXPay(sdkParams)` 而不是 `window.location.href = redirectUrl`。这只需要在支付页面根据 `result.type === 'sdk_params'` 做分支判断。

---

## 版本记录

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| 1.0 | 2026-05-06 | 初始版本，完整计划 |
