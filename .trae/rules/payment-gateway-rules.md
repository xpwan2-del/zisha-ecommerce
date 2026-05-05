# 支付通道统一架构规则

## 核心原则

**前端只传 `order_number`，金额和商品一律从 DB 读取，不以任何形式接受前端金额参数。**

---

## 架构：Strategy + Adapter 双模式

```
路由层（薄）              适配器层                              API
────────────────────────────────────────────────────────────────
alipay/route.ts  →  AlipayAdapter.createPayment()  →  支付宝 page.pay
stripe/route.ts  →  StripeAdapter.createPayment()  →  Stripe Checkout
paypal/route.ts  →  PayPalAdapter.createPayment()  →  PayPal Orders v2
(未来) wechat/route.ts → WechatAdapter.createPayment() → 微信 v3 JSAPI
              ↑
      getPaymentOrderData()  共享数据层 — 从 DB 查订单 + 校验
```

---

## 文件结构

```
src/lib/payment/
├── types.ts                  # 统一类型：OrderPaymentData, PaymentAdapter, PaymentGatewayResult
├── channel-config.ts         # 通道配置：amountUnit(main/cents), responseType(redirect/sdk_params)
├── order-data-service.ts     # 共享：getPaymentOrderData(orderNumber, method?)  ← 唯一查 DB 入口
├── alipay-adapter.ts         # 支付宝 RSA2 签名 → redirect_url
├── stripe-adapter.ts         # Stripe 折扣分拆 + 运费 → redirect_url
├── paypal-adapter.ts         # PayPal OAuth2 → redirect_url

路由层（所有路由模式一致，约 30 行）：
src/app/api/payments/{channel}/route.ts
```

---

## 路由层标准模板

```typescript
export async function POST(request: NextRequest) {
  const { order_number } = await request.json();   // 只接 order_number
  const orderData = await getPaymentOrderData(order_number, 'stripe'); // DB 授权数据 + 自动校验
  const result = await adapter.createPayment(orderData, { ... });
  return NextResponse.json({ success: true, data: result });
}
```

---

## getPaymentOrderData 自动校验（无需手写）

| 校验项 | 失败抛出 |
|--------|---------|
| 订单不存在 | `PaymentDataError('ORDER_NOT_FOUND', 404)` |
| 状态非 pending | `PaymentDataError('ORDER_STATUS_INVALID', 400)` |
| payment_method 不匹配 | `PaymentDataError('PAYMENT_METHOD_MISMATCH', 400)` |
| 订单无商品 | `PaymentDataError('ORDER_EMPTY', 400)` |

---

## 四通道关键差异

| | PayPal | Stripe | Alipay | 微信(未来) |
|------|--------|--------|--------|-----------|
| 金额单位 | 主币 | **分(×100)** | 主币 | **分(×100)** |
| 行项目 | items[]+breakdown | line_items[] | ❌ | detail(可选) |
| 返回类型 | redirect_url | redirect_url | redirect_url | **prepay_id**(SDK) |
| 币种 | 多币种 | 多币种 | CNY | **仅CNY** |
| 额外参数 | 无 | 无 | 无 | openid + client_ip |

---

## 添加新通道（只需 2 个文件）

1. `src/lib/payment/xxx-adapter.ts` — 实现 `PaymentAdapter.createPayment()`
2. `src/app/api/payments/xxx/route.ts` — 标准薄路由

**零改动现有文件。**

---

## 禁止事项

- ❌ 路由层直接写 SQL 查询
- ❌ 接受前端传入的任何金额参数（amount, items, total 等全部拒绝）
- ❌ 绕过 `getPaymentOrderData` 自行查订单
- ❌ 新增通道时不实现 `PaymentAdapter` 接口
