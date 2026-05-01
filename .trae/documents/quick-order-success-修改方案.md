# /quick-order/success 页面完善方案

## 一、现有问题分析

### 1.1 当前支付流程

```
quick-order 页面
    ↓ 点击"提交订单"
支付平台 (PayPal/Stripe/Alipay)
    ↓ 用户完成支付或取消
/quick-order/success?order_number=xxx
    ↓
PaymentResultCard 组件展示结果
```

### 1.2 发现的问题

| 问题 | 位置 | 严重性 | 描述 |
|------|------|--------|------|
| 订单快照缺失 | PaymentResultCard | 高 | 支付成功时没有显示订单商品快照，只显示商品名 |
| 金额显示不完整 | PaymentResultCard | 高 | `amount` 可能为 undefined，导致不显示金额 |
| 错误原因不详细 | PaymentResultCard | 中 | 失败时错误信息固定，不是从 API 返回的真实原因 |
| 无换支付方式功能 | PaymentResultCard | 中 | 失败时按钮逻辑有问题 |
| orders 页面不存在 | 整体流程 | 高 | PayPal 取消后跳转到 `/orders/${id}`，但这个页面不存在 |
| checkout 目录需删除 | 整体结构 | 低 | 整个 checkout 目录不再使用 |

---

## 二、需要修改的文件

### 2.1 删除的文件

| 文件 | 原因 |
|------|------|
| `/src/app/checkout/page.tsx` | 不再使用 |
| `/src/app/checkout/cancel/page.tsx` | 不再使用 |
| `/src/app/checkout/success/page.tsx` | 不再使用 |
| `/src/app/cart/success/page.tsx` | 不再使用 |

### 2.2 需要修改的文件

| 文件 | 修改内容 |
|------|----------|
| `/src/app/quick-order/success/page.tsx` | 完善支付结果获取逻辑，确保能拿到订单快照 |
| `/src/components/payment/PaymentResultCard.tsx` | 完善支付成功/失败的展示细节 |
| `/src/app/orders/page.tsx` | **新建** - 订单详情页（支付取消后跳转） |

---

## 三、详细修改方案

### 3.1 删除 checkout 相关文件

**待删除目录**：
- `/src/app/checkout/` 整个目录

### 3.2 完善 PaymentResultCard 组件

**问题 1：金额显示**

```typescript
// 当前代码 - amount 可能为 undefined
{amount !== undefined && (
  <div className="flex items-center justify-between text-sm">
    <span className="text-[var(--text-muted)]">💰 支付金额</span>
    <span className="font-bold text-lg">{formatCurrency(amount, currency)}</span>
  </div>
)}
```

**问题分析**：
- `orderInfo?.final_amount` 在成功时应该有值
- 但组件没有处理金额为 0 或不存在的情况

**修改方案**：
```typescript
// 增强金额显示逻辑
{orderInfo && (
  <>
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--text-muted)]">💰 支付金额</span>
      <span className="font-bold text-lg">
        {orderInfo.final_amount 
          ? formatCurrency(orderInfo.final_amount, orderInfo.currency || 'USD')
          : '待确认'}
      </span>
    </div>
    {orderInfo.shipping_fee > 0 && (
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">📦 运费</span>
        <span className="text-[var(--text)]">{formatCurrency(orderInfo.shipping_fee, orderInfo.currency || 'USD')}</span>
      </div>
    )}
    {orderInfo.total_coupon_discount > 0 && (
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">🎟️ 优惠券</span>
        <span className="text-green-600">-{formatCurrency(orderInfo.total_coupon_discount, orderInfo.currency || 'USD')}</span>
      </div>
    )}
  </>
)}
```

---

**问题 2：订单快照缺失**

**当前代码**：
```typescript
// 只显示第一个商品名
productName={orderInfo?.items?.[0]?.product_name}
```

**修改方案** - 新增订单快照显示区域：

```typescript
// 在订单信息区域添加商品快照
{type === 'success' && orderInfo?.items && orderInfo.items.length > 0 && (
  <div className="bg-[var(--background-alt)] rounded-lg p-4 mb-6">
    <h3 className="font-semibold text-[var(--text)] mb-3">📦 订单商品</h3>
    <div className="space-y-2">
      {orderInfo.items.map((item: any, index: number) => (
        <div key={index} className="flex items-center gap-3">
          <span className="text-2xl">🏺</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text)] truncate">{item.name}</p>
            <p className="text-xs text-[var(--text-muted)]">x{item.quantity}</p>
          </div>
          <span className="text-sm text-[var(--text)]">
            {formatCurrency(item.original_price * item.quantity, orderInfo.currency || 'USD')}
          </span>
        </div>
      ))}
    </div>
    <div className="border-t border-[var(--border)] mt-3 pt-3 flex justify-between">
      <span className="font-medium text-[var(--text)]">共 {orderInfo.items.length} 件商品</span>
      <span className="font-bold text-[var(--primary)]">
        {formatCurrency(orderInfo.final_amount, orderInfo.currency || 'USD')}
      </span>
    </div>
  </div>
)}
```

---

**问题 3：支付失败原因不详细**

**当前代码**：
```typescript
// 固定的错误信息
errorMessage: {
  zh: data.message_zh || data.message || '支付失败',
  en: data.message_en || 'Payment failed',
  ar: data.message_ar || data.message || 'فشل الدفع',
}
```

**修改方案** - 从 payment_error_codes 表获取详细错误信息：

需要在 notify API 返回更详细的错误信息：

```typescript
// 修改 PaymentResultCardProps
export interface PaymentResultCardProps {
  // ... 现有字段
  errorDetails?: {
    code: string;
    originalMessage?: string;
    solution?: string;  // 新增：针对此错误的解决方案
  };
}
```

---

**问题 4：换支付方式按钮逻辑**

**当前代码**：
```typescript
const handleChangePayment = () => {
  router.push(`/quick-order?order_id=${orderInfo?.id || ''}`);
};
```

**问题**：跳回 quick-order 页面后，用户需要重新选择支付方式

**修改方案**：保持当前逻辑即可（返回快速订单页重新发起支付）

---

### 3.3 完善 quick-order/success 页面

**问题**：获取订单信息可能失败

**当前代码**：
```typescript
const orderResponse = await fetch(`/api/orders?order_number=${orderNumber}`, {
  credentials: 'include',
});
const orderData = await orderResponse.json();

if (orderData.success && orderData.data) {
  setOrderInfo(orderData.data);
}
```

**问题**：
- `/api/orders` 是 POST 创建订单的 API，不是 GET 查询的
- 应该使用 `/api/orders-list?order_number=${orderNumber}`

**修改方案**：
```typescript
// 修改查询订单的 API 调用
const orderResponse = await fetch(`/api/orders-list?order_number=${orderNumber}`, {
  credentials: 'include',
});
const orderData = await orderResponse.json();

// 订单列表返回格式是 { success, data: { orders: [...] } }
// 需要从中提取单个订单
if (orderData.success && orderData.data?.orders?.[0]) {
  setOrderInfo(orderData.data.orders[0]);
}
```

---

### 3.4 新建订单详情页 `/src/app/orders/page.tsx`

**目的**：支付取消后跳转到此页面，展示订单状态和支付失败原因

**页面功能**：

| 功能 | 说明 |
|------|------|
| 显示订单基本信息 | 订单号、状态、时间 |
| 显示订单商品快照 | 商品列表、金额明细 |
| 显示支付状态 | 成功/失败/取消 |
| 支付失败原因 | 从 payment_logs 获取错误码和原因 |
| 操作按钮 | 重新支付、更换支付方式、返回购物车 |

**与 PaymentResultCard 的关系**：
- 可以复用 PaymentResultCard 组件
- 也可以创建新的 OrderDetailCard 组件

---

## 四、支付失败后的完整流程

### 4.1 PayPal 取消流程

```
用户点击 PayPal 取消
    ↓
GET /api/payments/paypal/cancel?token=order_number
    ↓
记录 payment_logs (status='cancelled', error_code='USER_CANCEL')
    ↓
redirect to /orders/{order_id}?cancelled=true
    ↓
/orders/page.tsx 读取 ?cancelled=true
    ↓
显示支付取消提示 + 失败原因
    ↓
提供"重新支付"和"更换支付方式"按钮
```

### 4.2 Stripe 取消流程

类似 PayPal，Stripe 取消后也应跳转到 `/orders/{order_id}`

### 4.3 Alipay 取消流程

类似 PayPal，Alipay 取消后也应跳转到 `/orders/{order_id}`

---

## 五、数据库相关

### 5.1 payment_logs 表结构（已有）

```sql
payment_logs 表关键字段：
- order_id: 订单ID
- order_number: 订单号
- payment_method: paypal/stripe/alipay
- status: pending/success/cancelled/failed
- error_code: USER_CANCEL/PAYMENT_TIMEOUT/...
- error_message: 原始错误信息
- platform_order_id: 支付平台订单号
- amount: 支付金额
- currency: 币种
- raw_response: 原始响应 JSON
- created_at: 创建时间
```

### 5.2 payment_error_codes 表（已有）

```sql
payment_error_codes 表关键字段：
- platform: paypal/stripe/alipay
- original_code: 支付平台原始错误码
- unified_code: 统一错误码
- message_zh/message_en/message_ar: 多语言错误信息
```

---

## 六、修改优先级

| 优先级 | 修改内容 | 工作量 |
|--------|----------|--------|
| P0 | 删除 checkout 目录 | 5分钟 |
| P0 | 修复 orders-list API 调用 | 10分钟 |
| P0 | 新建 /orders/page.tsx | 2小时 |
| P1 | 完善订单快照显示 | 1小时 |
| P1 | 完善金额显示 | 30分钟 |
| P2 | 完善错误原因显示 | 1小时 |

---

## 七、预期效果

### 7.1 支付成功时

- 显示支付方式图标
- 显示绿色成功动画
- 显示订单号
- 显示订单商品快照（所有商品）
- 显示金额明细（总价、运费、优惠券折扣）
- 显示支付状态"已支付"
- 按钮：查看订单、继续购物

### 7.2 支付失败时

- 显示支付方式图标
- 显示红色失败动画
- 显示订单号
- 显示失败原因（从 payment_error_codes 获取）
- 显示可能的原因和解决方案
- 按钮：重新支付、更换支付方式

---

**确认后我将开始实施修改。**
