# 订单中心 P0 全自动退款闭环 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 新增统一退款服务层，让管理员同意退款时自动调用支付通道退款接口，并保持订单状态机、支付回调和资源归还幂等一致。

**架构：** 采用 `RefundService + PaymentAdapter.refundPayment()`。管理员审批接口只负责鉴权、调用服务和审计；退款服务负责读取订单、校验状态、选择支付通道、发起退款、推进 `refunding_payment → refunding`；支付平台回调继续负责 `refunding → refunded` 和资源归还。

**技术栈：** Next.js App Router、TypeScript、SQL.js、现有 `OrderStatusService`、现有 `PaymentService`、现有支付 Adapter、现有后台审计日志。

---

## 文件清单

### 需要创建
- `src/lib/payment/refund-service.ts`：统一退款服务层，封装退款订单读取、状态校验、支付通道分发、状态机推进和幂等返回。
- `p0-refund-service-guard.test.mjs`：P0 退款闭环守护测试，验证服务层、适配器接口和审批路由不回退。

### 需要修改
- `src/lib/payment/types.ts`：新增退款请求、退款结果类型，并给 `PaymentAdapter` 增加 `refundPayment()`。
- `src/lib/payment/stripe-adapter.ts`：实现 Stripe 退款方法。
- `src/lib/payment/alipay-adapter.ts`：实现 Alipay 退款方法。
- `src/lib/payment/paypal-adapter.ts`：实现 PayPal 退款方法。
- `src/app/api/admin/orders/[id]/refund/approve/route.ts`：改为调用统一退款服务，不在路由中直接推进退款状态。
- `docs/superpowers/plans/2026-05-10-admin-platform-enterprise-upgrade.md`：回写 P0 退款闭环进度。

---

## 任务 1：锁定退款服务协议

**文件：**
- 修改：`src/lib/payment/types.ts`
- 创建：`p0-refund-service-guard.test.mjs`

- [ ] **步骤 1：编写失败的守护测试**

```javascript
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('./', import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, 'utf8');

const types = read('src/lib/payment/types.ts');
assert.match(types, /RefundPaymentRequest/, '必须定义退款请求类型');
assert.match(types, /RefundPaymentResult/, '必须定义退款结果类型');
assert.match(types, /refundPayment\(/, 'PaymentAdapter 必须声明 refundPayment 方法');

console.log('P0 refund service guard: types passed');
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node p0-refund-service-guard.test.mjs`
预期：FAIL，提示缺少 `RefundPaymentRequest` 或 `refundPayment()`。

- [ ] **步骤 3：补充退款类型协议**

```typescript
export interface RefundPaymentRequest {
  orderId: number;
  orderNumber: string;
  paymentMethod: string;
  paymentId?: string | null;
  referenceId?: string | null;
  amount: number;
  currency?: string;
  reason?: string;
  operatorId: number;
  operatorName: string;
}

export interface RefundPaymentResult {
  success: boolean;
  platform: string;
  refundId?: string | null;
  status: 'processing' | 'succeeded' | 'failed';
  raw?: unknown;
}
```

- [ ] **步骤 4：扩展适配器接口**

```typescript
export interface PaymentAdapter {
  createPayment(
    orderData: OrderPaymentData,
    request: PaymentRequest
  ): Promise<PaymentGatewayResult>;

  refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResult>;
}
```

- [ ] **步骤 5：运行测试验证通过**

运行：`node p0-refund-service-guard.test.mjs`
预期：PASS。

---

## 任务 2：实现支付通道退款 Adapter

**文件：**
- 修改：`src/lib/payment/stripe-adapter.ts`
- 修改：`src/lib/payment/alipay-adapter.ts`
- 修改：`src/lib/payment/paypal-adapter.ts`
- 修改：`p0-refund-service-guard.test.mjs`

- [ ] **步骤 1：补充 Adapter 守护断言**

```javascript
const stripe = read('src/lib/payment/stripe-adapter.ts');
assert.match(stripe, /async refundPayment/, 'StripeAdapter 必须实现 refundPayment');
assert.match(stripe, /stripe\.refunds\.create/, 'Stripe 退款必须调用 refunds.create');

const alipay = read('src/lib/payment/alipay-adapter.ts');
assert.match(alipay, /async refundPayment/, 'AlipayAdapter 必须实现 refundPayment');
assert.match(alipay, /alipay\.trade\.refund/, 'Alipay 退款必须调用 alipay.trade.refund');

const paypal = read('src/lib/payment/paypal-adapter.ts');
assert.match(paypal, /async refundPayment/, 'PayPalAdapter 必须实现 refundPayment');
assert.match(paypal, /\/v2\/payments\/captures\//, 'PayPal 退款必须调用 captures refund API');
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node p0-refund-service-guard.test.mjs`
预期：FAIL，提示 Adapter 未实现退款方法。

- [ ] **步骤 3：实现 Stripe 退款**

```typescript
async refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResult> {
  const { secretKey } = parseStripeConfig();
  if (!secretKey) throw new Error('Stripe is not configured');
  if (!request.referenceId && !request.paymentId) throw new Error('Stripe refund reference missing');

  const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' as any });
  const refund = await stripe.refunds.create({
    payment_intent: request.referenceId || request.paymentId || undefined,
    amount: Math.round(request.amount * 100),
    reason: 'requested_by_customer',
    metadata: { order_number: request.orderNumber },
  });

  return {
    success: true,
    platform: 'stripe',
    refundId: refund.id,
    status: refund.status === 'succeeded' ? 'succeeded' : 'processing',
    raw: refund,
  };
}
```

- [ ] **步骤 4：实现 Alipay 退款**

```typescript
async refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResult> {
  const { privateKey: alipayPrivateKey, gatewayUrl: alipayGateway, appId: alipayAppId } = parseAlipayConfig();
  if (!alipayPrivateKey) throw new Error('Alipay private key not configured');

  const outRequestNo = `refund_${request.orderNumber}_${Date.now()}`;
  const bizContent = JSON.stringify({
    out_trade_no: request.orderNumber,
    trade_no: request.referenceId || undefined,
    refund_amount: request.amount.toFixed(2),
    refund_reason: request.reason || '管理员同意退款',
    out_request_no: outRequestNo,
  });

  const params: Record<string, string> = {
    app_id: alipayAppId,
    method: 'alipay.trade.refund',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
    version: '1.0',
    biz_content: bizContent,
  };

  const sign = this.generateRSA2Sign(new URLSearchParams(params).toString(), alipayPrivateKey);
  params.sign = sign;

  const response = await fetch(alipayGateway, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error('Alipay refund request failed');

  return { success: true, platform: 'alipay', refundId: outRequestNo, status: 'processing', raw };
}
```

- [ ] **步骤 5：实现 PayPal 退款**

```typescript
async refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResult> {
  const config = this.getConfig();
  const accessToken = await this.getAccessToken();
  const captureId = request.referenceId || request.paymentId;
  if (!captureId) throw new Error('PayPal capture id missing');

  const response = await fetch(`${config.apiBase}/v2/payments/captures/${captureId}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `refund-${request.orderNumber}`,
    },
    body: JSON.stringify({
      amount: {
        value: request.amount.toFixed(2),
        currency_code: request.currency || 'USD',
      },
      invoice_id: request.orderNumber,
      note_to_payer: request.reason || 'Order refund',
    }),
  });

  const raw = await response.json();
  if (!response.ok) throw new Error(raw?.message || 'PayPal refund request failed');

  return { success: true, platform: 'paypal', refundId: raw.id, status: 'processing', raw };
}
```

- [ ] **步骤 6：运行测试验证通过**

运行：`node p0-refund-service-guard.test.mjs`
预期：PASS。

---

## 任务 3：实现统一退款服务层

**文件：**
- 创建：`src/lib/payment/refund-service.ts`
- 修改：`p0-refund-service-guard.test.mjs`

- [ ] **步骤 1：补充服务层守护断言**

```javascript
const service = read('src/lib/payment/refund-service.ts');
assert.match(service, /export class RefundService/, '必须导出 RefundService');
assert.match(service, /approveRefund/, 'RefundService 必须提供 approveRefund');
assert.match(service, /OrderStatusService\.changeStatus/, '退款审批必须通过状态机');
assert.match(service, /OrderEvent\.REFUND_APPROVE/, '必须使用 REFUND_APPROVE 事件');
assert.match(service, /refundPayment/, '必须调用支付 Adapter 退款方法');
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node p0-refund-service-guard.test.mjs`
预期：FAIL，提示 `refund-service.ts` 不存在。

- [ ] **步骤 3：实现订单读取和基础校验**

```typescript
import { query } from '@/lib/db';
import { OrderEvent, OrderStatusService } from '@/lib/order-status-service';
import { AlipayAdapter } from '@/lib/payment/alipay-adapter';
import { PayPalAdapter } from '@/lib/payment/paypal-adapter';
import { StripeAdapter } from '@/lib/payment/stripe-adapter';
import type { PaymentAdapter, RefundPaymentRequest, RefundPaymentResult } from '@/lib/payment/types';

interface ApproveRefundInput {
  orderId: number;
  operatorId: number;
  operatorName: string;
  reason?: string;
}

export class RefundService {
  static async approveRefund(input: ApproveRefundInput) {
    const orderResult = await query('SELECT * FROM orders WHERE id = ?', [input.orderId]);
    if (orderResult.rows.length === 0) return { success: false, error: 'ORDER_NOT_FOUND', status: 404 };

    const order = orderResult.rows[0];
    if (order.order_status !== 'refunding_payment') {
      return { success: false, error: 'INVALID_ORDER_STATUS', status: 400 };
    }

    const adapter = this.getAdapter(order.payment_method);
    if (!adapter) return { success: false, error: 'PAYMENT_METHOD_NOT_SUPPORTED', status: 400 };

    const refundRequest: RefundPaymentRequest = {
      orderId: Number(order.id),
      orderNumber: String(order.order_number),
      paymentMethod: String(order.payment_method || ''),
      referenceId: order.reference_id || null,
      amount: Number(order.final_amount || 0),
      currency: 'USD',
      reason: input.reason || '管理员同意退款',
      operatorId: input.operatorId,
      operatorName: input.operatorName,
    };

    return this.executeRefund(order, adapter, refundRequest, input);
  }
```

- [ ] **步骤 4：实现支付通道调用和状态机推进**

```typescript
  private static async executeRefund(
    order: any,
    adapter: PaymentAdapter,
    refundRequest: RefundPaymentRequest,
    input: ApproveRefundInput
  ) {
    let refundResult: RefundPaymentResult;
    try {
      refundResult = await adapter.refundPayment(refundRequest);
    } catch (error) {
      return {
        success: false,
        error: 'REFUND_GATEWAY_FAILED',
        status: 502,
        detail: error instanceof Error ? error.message : String(error),
      };
    }

    if (!refundResult.success) {
      return { success: false, error: 'REFUND_GATEWAY_REJECTED', status: 502, refundResult };
    }

    const approveChange = await OrderStatusService.changeStatus(
      Number(order.id),
      OrderEvent.REFUND_APPROVE,
      { type: 'admin', id: input.operatorId, name: input.operatorName },
      {
        reason: input.reason || '管理员同意退款',
        referenceId: refundResult.refundId || order.reference_id || null,
      }
    );

    if (!approveChange.success) {
      return { success: false, error: approveChange.error || 'STATUS_CHANGE_FAILED', status: 400, refundResult };
    }

    return {
      success: true,
      orderId: Number(order.id),
      orderNumber: String(order.order_number),
      fromStatus: approveChange.fromStatus,
      toStatus: approveChange.toStatus,
      refundResult,
    };
  }

  private static getAdapter(paymentMethod: string): PaymentAdapter | null {
    switch (paymentMethod) {
      case 'stripe': return new StripeAdapter();
      case 'alipay': return new AlipayAdapter();
      case 'paypal': return new PayPalAdapter();
      default: return null;
    }
  }
}
```

- [ ] **步骤 5：运行测试验证通过**

运行：`node p0-refund-service-guard.test.mjs`
预期：PASS。

---

## 任务 4：接入管理员同意退款 API

**文件：**
- 修改：`src/app/api/admin/orders/[id]/refund/approve/route.ts`
- 修改：`p0-refund-service-guard.test.mjs`

- [ ] **步骤 1：补充路由守护断言**

```javascript
const approveRoute = read('src/app/api/admin/orders/[id]/refund/approve/route.ts');
assert.match(approveRoute, /RefundService/, '管理员同意退款路由必须调用 RefundService');
assert.doesNotMatch(approveRoute, /OrderStatusService\.changeStatus\(/, '路由层不能直接推进退款状态');
assert.match(approveRoute, /APPROVE_REFUND/, '同意退款仍必须记录审计日志');
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node p0-refund-service-guard.test.mjs`
预期：FAIL，提示路由未调用 `RefundService`。

- [ ] **步骤 3：改造审批路由**

```typescript
import { RefundService } from '@/lib/payment/refund-service';

const result = await RefundService.approveRefund({
  orderId,
  operatorId,
  operatorName,
  reason: '管理员同意退款',
});

if (!result.success) {
  return createErrorResponse(result.error || 'APPROVE_REFUND_FAILED', result.status || 400);
}
```

- [ ] **步骤 4：保留审计日志并写入退款结果**

```typescript
metadata: {
  orderNumber: result.orderNumber,
  fromStatus: result.fromStatus,
  toStatus: result.toStatus,
  refundId: result.refundResult?.refundId || null,
  refundPlatform: result.refundResult?.platform || null,
}
```

- [ ] **步骤 5：运行测试验证通过**

运行：`node p0-refund-service-guard.test.mjs`
预期：PASS。

---

## 任务 5：验证构建和回写总计划

**文件：**
- 修改：`docs/superpowers/plans/2026-05-10-admin-platform-enterprise-upgrade.md`

- [x] 订单中心 P0 全自动退款闭环：管理员同意退款后调用统一退款服务，服务层发起支付平台退款并推进 `refunding_payment → refunding`，支付回调继续负责 `refunding → refunded` 和资源归还。
- [x] 完成退款适配器层与退款服务层实现，并通过守护测试、lint、build 验证。
- [x] 回写总计划与验收标准，确认文档与实现一致。

- [ ] **步骤 2：运行守护测试**

运行：`node p0-refund-service-guard.test.mjs`
预期：PASS。

- [ ] **步骤 3：运行 lint**

运行：`npm run lint`
预期：退出码 0；若有既存 warning，需要在结果中说明。

- [ ] **步骤 4：运行 build**

运行：`npm run build`
预期：退出码 0。

---

## 验收标准

- 管理员同意退款接口不再直接改退款状态，而是调用 `RefundService.approveRefund()`。
- `RefundService` 只允许 `refunding_payment` 状态发起退款。
- `RefundService` 根据订单 `payment_method` 调用 Stripe、Alipay 或 PayPal 退款 Adapter。
- 支付通道退款请求成功后，状态机推进为 `refunding_payment → refunding`。
- 支付平台退款成功回调仍由现有 `completeRefundSuccess()` 处理，推进 `refunding → refunded` 并归还库存和优惠券。
- 退款失败不会进入 `refunding`，避免订单状态与真实支付平台退款不一致。
- 高风险审批动作继续写入 `audit_logs`。
- `node p0-refund-service-guard.test.mjs`、`npm run lint`、`npm run build` 通过。

## 自检清单

1. 规格覆盖度：
   - 统一退款服务层、Adapter 退款方法、管理员审批路由、状态机推进、审计、验证命令都有对应任务。
2. 占位符扫描：
   - 没有使用“待定”“后续实现”“类似任务”等占位描述。
3. 类型一致性：
   - `RefundPaymentRequest`、`RefundPaymentResult`、`PaymentAdapter.refundPayment()`、`RefundService.approveRefund()` 在各任务中命名一致。
4. 状态机一致性：
   - 文档和实现都保持 `refunding_payment → refunding → refunded`，不直接从审核态进入 `refunded`。
