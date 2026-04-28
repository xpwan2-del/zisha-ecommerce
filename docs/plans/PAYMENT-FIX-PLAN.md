# 🎯 紫砂电商支付系统重构计划

**更新日期**：2026-04-25  
**版本**：v2.0  
**核心思路**：简化流程，提升用户体验

---

## 一、问题总结

### 🔴 当前存在的问题

1. **订单状态混乱**
   - 存在 `pending` 和 `pending_payment` 两个类似状态
   - 流程复杂，用户体验差
   - 代码判断逻辑混乱

2. **订单号不统一**
   - 订单创建用 `QO` 前缀
   - 支付创建用 `ORD-` 前缀
   - 回调时无法匹配

3. **流程冗余**
   - 存在单独的"确认订单页面"
   - 需要多次页面跳转
   - 超时取消逻辑复杂

4. **代码臃肿**
   - 大量未使用的状态分支
   - 重复的逻辑判断
   - 无用的代码残留

---

## 二、目标状态

### ✅ 简化后的流程

```
商品详情页
    ↓ 点击"立即购买"
快速订单页（pending - 待支付）
    ↓ 填写地址、选择优惠券
点击"提交订单"
    ↓ 直接跳转支付平台
[PayPal / Stripe / Alipay]
    ↓ 支付完成
支付成功页（paid）
```

### ✅ 简化后的订单状态

| 状态代码 | 状态名称 | 业务定义 |
|---------|---------|---------|
| `pending` | 待支付 | 用户提交订单，等待支付（可随时回来继续支付）|
| `paid` | 已支付 | 支付成功 |
| `cancelled` | 已取消 | 用户主动取消 |
| `processing` | 处理中 | 商家接单 |
| `shipped` | 已发货 | 已发货 |
| `delivered` | 已送达 | 已收货 |
| `completed` | 已完成 | 交易完成 |
| `refunding` | 退款中 | 退款处理 |
| `refunded` | 已退款 | 退款完成 |

### ✅ 需要删除的状态

| 删除项 | 原因 |
|-------|------|
| `pending_payment` | 不需要单独的确认页面 |
| 所有 `pending_payment` 相关转换 | 简化流程 |
| `timeout_cancel` 相关转换 | 不需要超时自动取消 |

---

## 三、详细修改清单

### 📋 Phase 1: 订单号统一（优先级 P0）

#### 修改文件 1.1：`/src/app/api/inventory/reserve/route.ts`

**位置**：第 302 行

**修改前**：
```typescript
const orderNumber = `QO${Date.now()}${Math.floor(Math.random() * 1000)}`;
```

**修改后**：
```typescript
const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
```

**原因**：统一使用 `ORD` 前缀

---

#### 修改文件 1.2：`/src/app/api/payments/paypal/route.ts`

**修改点 A**：第 127 行 - 接受 order_number 参数

**修改前**：
```typescript
const { amount, currency = 'AED', items } = body;
```

**修改后**：
```typescript
const { amount, currency = 'AED', items, order_number } = body;
```

**修改点 B**：第 130-135 行 - 验证 order_number

**修改前**：
```typescript
console.log('Processing payment - Amount:', amount, 'Currency:', currency, 'Items count:', items?.length || 0);
```

**修改后**：
```typescript
console.log('Processing payment - Amount:', amount, 'Currency:', currency, 'Items count:', items?.length || 0);

if (!order_number) {
  return NextResponse.json({ error: '缺少订单号 order_number' }, { status: 400 });
}
```

**修改点 C**：第 177-196 行 - 使用传入的 order_number

**修改前**：
```typescript
const orderId = `ORD-${Date.now()}`;
const paypalOrderData = {
  intent: 'CAPTURE',
  purchase_units: [{
    reference_id: orderId,
    ...
  }],
  application_context: {
    return_url: `${...}/quick-order/success?order_number=${orderId}`,
    ...
  },
};
```

**修改后**：
```typescript
const paypalOrderData = {
  intent: 'CAPTURE',
  purchase_units: [{
    reference_id: order_number,
    custom_id: order_number,
    ...
  }],
  application_context: {
    return_url: `${...}/quick-order/success?order_number=${order_number}`,
    ...
  },
};
```

---

### 📋 Phase 2: 快速订单页面重构（优先级 P0）

#### 修改文件 2.1：`/src/app/quick-order/page.tsx`

**目标**：简化流程，点击"提交订单"直接跳转支付平台

**需要修改的部分**：

##### 修改点 A：删除 pending_payment 状态判断

**删除代码段**（约第 337-388 行）：
```typescript
// 删除这段
if (orderStatus === 'pending_payment') {
  const orderIdNum = parseInt(orderId, 10);
  
  // 先获取订单的 order_number
  const orderResponse = await fetch(`/api/orders/${orderIdNum}`, {...});
  const orderData = await orderResponse.json();
  const order_number = orderData?.data?.order_number;
  
  // 调用支付...
}
```

**原因**：不需要 `pending_payment` 状态

##### 修改点 B：简化 pending 状态逻辑

**修改前**（约第 391-459 行）：
```typescript
// pending status: call create API first
const createResponse = await fetch('/api/quick-order/create', {...});
const createData = await createResponse.json();

if (!createResponse.ok || !createData.success) {
  setError(createData.error || 'Failed to create order');
  return;
}

const { order_id, order_number, payment_url } = createData.data;

if (paymentMethod === 'paypal') {
  // 调用支付 API
}
```

**修改后**：
```typescript
// pending status: 直接调用支付 API，使用 orderId
const orderIdNum = parseInt(orderId, 10);

// 获取订单信息
const orderResponse = await fetch(`/api/orders/${orderIdNum}`, {...});
const orderData = await orderResponse.json();
const order_number = orderData?.data?.order_number;

if (paymentMethod === 'paypal') {
  // 直接调用支付，跳转 PayPal
  const paypalResponse = await fetch('/api/payments/paypal', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_number: order_number,
      amount: priceData?.total_usd?.toFixed(2) || '0',
      currency: 'USD',
      items: [{
        product_id: product.id,
        name: product.name,
        price: priceData ? (priceData.subtotal / quantity) : 0,
        quantity: quantity
      }]
    })
  });
  
  const paypalData = await paypalResponse.json();
  
  if (paypalResponse.ok && paypalData.url) {
    window.location.href = paypalData.url;
  } else {
    setError(paypalData.error || '支付失败，请重试');
  }
}
```

##### 修改点 C：添加"取消订单"按钮

**添加位置**：在"提交订单"按钮下方

**新增代码**：
```tsx
<button
  type="button"
  onClick={handleCancelOrder}
  className="w-full mt-4 py-3 text-gray-600 hover:text-red-600 transition-colors"
>
  取消订单
</button>
```

**新增函数**：
```typescript
const handleCancelOrder = async () => {
  if (!confirm('确定要取消订单吗？')) return;
  
  try {
    const response = await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' })
    });
    
    if (response.ok) {
      router.push('/');
    }
  } catch (error) {
    setError('取消失败');
  }
};
```

---

### 📋 Phase 3: 删除未使用的代码（优先级 P1）

#### 删除文件 3.1：订单确认页面

**删除文件**：`/src/app/quick-order/confirm/page.tsx`

**原因**：
- 不需要单独的确认订单页面
- 所有流程在快速订单页完成

---

#### 删除代码 3.2：状态转换配置

**文件**：`/src/app/api/quick-order/create/route.ts`

**删除内容**：
```typescript
// 删除状态转换调用
const statusResult = await OrderStatusService.changeStatus(
  order_id,
  'user_confirm_payment',
  ...
);
```

**原因**：
- 不需要 `pending_payment` 状态
- 订单创建后直接是 `pending` 状态

---

#### 删除代码 3.3：order_status_transitions 配置

**删除数据库记录**：

```sql
-- 删除 pending_payment 相关转换
DELETE FROM order_status_transitions 
WHERE from_status = 'pending_payment' OR to_status = 'pending_payment';

-- 删除 pending 的超时取消
DELETE FROM order_status_transitions 
WHERE event_code = 'timeout_cancel' AND from_status = 'pending';

-- 删除 pending_payment 的超时取消
DELETE FROM order_status_transitions 
WHERE event_code = 'timeout_cancel' AND from_status = 'pending_payment';
```

---

### 📋 Phase 4: 修复支付回调（优先级 P0）

#### 修改文件 4.1：`/src/app/api/payments/paypal/notify/route.ts`

**修改点 A**：第 34-36 行 - 修复回调查询逻辑

**当前代码**：
```typescript
const orderResult = await query(
  'SELECT id, order_number, final_amount, payment_status, order_status FROM orders WHERE order_number = ?',
  [order_number]
);
```

**修改后**：
```typescript
// 优先通过 order_number 查询
let orderResult = await query(
  'SELECT id, order_number, final_amount, payment_status, order_status FROM orders WHERE order_number = ?',
  [order_number]
);

// 如果找不到，尝试通过 reference_id 查询
if (orderResult.rows.length === 0) {
  orderResult = await query(
    'SELECT id, order_number, final_amount, payment_status, order_status FROM orders WHERE reference_id = ?',
    [order_number]
  );
}
```

**修改点 B**：添加金额验证

**添加代码**（在更新订单状态前）：
```typescript
// 验证金额
const captureAmount = parseFloat(response.result.purchase_units[0].amount.value);
const orderAmount = parseFloat(order.final_amount);

if (Math.abs(captureAmount - orderAmount) > 0.01) {
  console.error('[PayPal Notify] Amount mismatch:', { captureAmount, orderAmount });
  // 记录异常，但仍然更新状态
}
```

---

### 📋 Phase 5: API 重构（优先级 P1）

#### 修改文件 5.1：`/src/app/api/quick-order/create/route.ts`

**简化目标**：删除 `user_confirm_payment` 事件触发

**修改前**：
```typescript
// 第 334-346 行
const statusResult = await OrderStatusService.changeStatus(
  order_id,
  'user_confirm_payment',
  {
    type: 'user',
    id: userId,
    name: '用户'
  },
  {
    payment_method,
    final_amount: finalAmount
  }
);

if (!statusResult.success) {
  return createErrorResponse('STATUS_CHANGE_FAILED', lang, 500);
}
```

**修改后**：
```typescript
// 不再需要状态转换
// 订单已经是 pending 状态
// 直接返回成功

logMonitor('ORDERS', 'SUCCESS', {
  action: 'UPDATE_QUICK_ORDER',
  orderId: order_id
});
```

---

### 📋 Phase 6: 数据库优化（优先级 P2）

#### 修改 6.1：添加 reference_id 字段

**SQL**：
```sql
ALTER TABLE orders ADD COLUMN reference_id VARCHAR(100);
```

**原因**：存储 PayPal 订单ID，便于双向查询

---

#### 修改 6.2：清理无用数据

```sql
-- 清理过期的 pending 订单（可选，超过24小时未支付）
-- UPDATE orders SET order_status = 'cancelled' 
-- WHERE order_status = 'pending' 
-- AND created_at < datetime('now', '-24 hours');
```

---

## 四、完整执行计划

### Step 1：备份数据库
```bash
cp src/lib/db/database.sqlite src/lib/db/database.sqlite.backup.$(date +%Y%m%d_%H%M%S)
```

### Step 2：Phase 1 - 订单号统一（3个修改点）
- [ ] 2.1 修改 inventory/reserve - 订单号前缀
- [ ] 2.2 修改 payments/paypal - 接受 order_number
- [ ] 2.3 修改 payments/paypal - 使用 order_number

### Step 3：Phase 2 - 快速订单页面重构（3个修改点）
- [ ] 3.1 删除 pending_payment 状态判断
- [ ] 3.2 简化 pending 状态逻辑
- [ ] 3.3 添加"取消订单"按钮

### Step 4：Phase 3 - 删除未使用代码（3个删除项）
- [ ] 4.1 删除 quick-order/confirm 页面
- [ ] 4.2 删除状态转换调用代码
- [ ] 4.3 清理数据库状态转换配置

### Step 5：Phase 4 - 修复支付回调（2个修改点）
- [ ] 5.1 修复回调查询逻辑
- [ ] 5.2 添加金额验证

### Step 6：Phase 5 - API 重构（1个修改点）
- [ ] 6.1 简化 quick-order/create API

### Step 7：Phase 6 - 数据库优化（2个修改）
- [ ] 7.1 添加 reference_id 字段
- [ ] 7.2 清理无用数据（可选）

### Step 8：测试验证
- [ ] 8.1 测试完整支付流程
- [ ] 8.2 测试取消订单流程
- [ ] 8.3 测试支付回调
- [ ] 8.4 测试未支付订单重新支付

---

## 五、修改文件清单

### 需要修改的文件

| 序号 | 文件路径 | 修改内容 | 优先级 | 状态 |
|------|---------|---------|--------|------|
| 1 | `/src/app/api/inventory/reserve/route.ts` | 统一订单号前缀 | P0 | ⏳ |
| 2 | `/src/app/api/payments/paypal/route.ts` | 接受并使用 order_number | P0 | ⏳ |
| 3 | `/src/app/quick-order/page.tsx` | 简化流程，添加取消按钮 | P0 | ⏳ |
| 4 | `/src/app/api/payments/paypal/notify/route.ts` | 修复回调查询 | P0 | ⏳ |
| 5 | `/src/app/api/quick-order/create/route.ts` | 删除状态转换调用 | P1 | ⏳ |

### 需要删除的文件

| 序号 | 文件路径 | 删除原因 | 优先级 | 状态 |
|------|---------|---------|--------|------|
| 1 | `/src/app/quick-order/confirm/page.tsx` | 不需要确认页面 | P1 | ⏳ |

### 需要清理的数据库数据

| 序号 | 操作 | SQL | 优先级 | 状态 |
|------|------|-----|--------|------|
| 1 | 删除 pending_payment 转换 | DELETE WHERE from_status = 'pending_payment' | P1 | ⏳ |
| 2 | 删除超时取消转换 | DELETE WHERE event_code = 'timeout_cancel' | P1 | ⏳ |
| 3 | 添加 reference_id 字段 | ALTER TABLE orders ADD COLUMN reference_id | P2 | ⏳ |

---

## 六、状态转换最终配置

### 保留的状态转换

| 当前状态 | 事件 | 目标状态 | 说明 |
|---------|------|---------|------|
| - | order_created | `pending` | 创建订单 |
| `pending` | user_cancel | `cancelled` | 用户取消 |
| `pending` | pay_success | `paid` | 支付成功 |
| `paid` | merchant_confirm | `processing` | 商家接单 |
| `paid` | admin_cancel | `cancelled` | 管理员取消 |
| `paid` | refund_request | `refunding` | 申请退款 |
| `processing` | merchant_ship | `shipped` | 商家发货 |
| `processing` | merchant_cancel | `cancelled` | 商家取消 |
| `shipped` | user_confirm | `delivered` | 用户确认收货 |
| `shipped` | refund_request | `refunding` | 申请退款 |
| `delivered` | auto_complete | `completed` | 自动完成 |
| `refunding` | refund_success | `refunded` | 退款成功 |

### 删除的状态转换

| 当前状态 | 事件 | 目标状态 | 删除原因 |
|---------|------|---------|---------|
| `pending` | user_confirm_payment | `pending_payment` | 不需要 |
| `pending` | timeout_cancel | `cancelled` | 不需要超时取消 |
| `pending_payment` | pay_success | `paid` | 不需要 |
| `pending_payment` | user_cancel | `cancelled` | 不需要 |
| `pending_payment` | timeout_cancel | `cancelled` | 不需要 |

---

## 七、最终流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           简化后的订单流程                                   │
└─────────────────────────────────────────────────────────────────────────────┘

[商品详情页]
    ↓ 点击"立即购买"
┌───────────────────────────┐
│   快速订单页               │
│   order_status = pending  │
└───────────────────────────┘
    │
    ├── 填写地址/优惠券
    ├── 选择支付方式
    │
    ├── 点击"提交订单" ──→ [PayPal/Stripe/Alipay] ──→ [支付成功] ──→ paid
    │
    └── 点击"取消订单" ──→ cancelled

未支付订单（pending）可以随时回来继续支付
```

---

## 八、预期效果

### ✅ 用户体验提升
1. 减少一次页面跳转
2. 操作更直观
3. 未支付订单随时可继续支付

### ✅ 代码质量提升
1. 删除 ~500 行无用代码
2. 减少状态转换复杂度
3. 提高代码可维护性

### ✅ 系统稳定性提升
1. 去掉超时取消逻辑
2. 减少定时任务依赖
3. 降低系统复杂度

---

## 九、执行确认

**请确认以下修改计划是否符合预期：**

- [ ] Phase 1-6 的修改内容
- [ ] 需要删除的文件
- [ ] 需要清理的数据库数据
- [ ] 最终的状态转换配置

**确认后回复 "OK，开始执行" 逐步进行修改。**

---

## 版本历史

| 版本 | 日期 | 修改内容 |
|------|------|---------|
| v1.0 | 2026-04-25 | 初始版本（订单号统一问题） |
| v2.0 | 2026-04-25 | 简化流程，去掉确认页面，删除 pending_payment 状态 |
