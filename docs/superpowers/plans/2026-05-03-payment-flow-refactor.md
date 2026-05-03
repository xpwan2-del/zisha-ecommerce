# 支付流程重构 — 订单中心化改造 实现计划（v2）

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 修复支付取消/失败后的重新支付流程，建立以订单为中心的架构，消除重复订单问题

**架构：** 参考 Amazon/淘宝/京东等主流电商平台的"订单中心化"设计——订单一旦创建，所有后续操作（支付、取消、查看）都在订单上进行，不会重复创建。支付结果页只做展示和跳转，订单详情页成为重新支付的唯一入口。

**技术栈：** Next.js App Router, React, sql.js (SQLite), PayPal/Alipay/Stripe SDK

---

## 一、现有代码资产盘点

### 已有的订单管理页面

| 页面 | 路径 | 状态 | 说明 |
|------|------|------|------|
| Account 页面 | `/account?tab=orders` | ✅ 已有完整 UI | 有 OrderCard、Tab 筛选、订单详情展开 |
| 订单详情页 | `/orders/[id]` | ⚠️ 需要重写 | 有基础展示，但支付按钮逻辑错误 |
| 支付结果页 | `/payment-result` | ⚠️ 需要修改 | handleRetry 跳转逻辑有 Bug |

### Account 页面已有功能（`src/app/account/page.tsx`）

| 功能 | 状态 | 说明 |
|------|------|------|
| 订单列表展示 | ✅ 正常 | 调用 `/api/orders-list?limit=200` |
| Tab 筛选 | ✅ 正常 | all/pending/paid/shipped/reviewing/refund |
| OrderCard 组件 | ✅ 正常 | 展示订单摘要、可展开详情 |
| 收货地址编辑 | ✅ 正常 | "修改地址"按钮已有 onClick |
| "立即支付"按钮 | ❌ **无 onClick** | 按钮存在但点击无反应 |
| "取消订单"按钮 | ❌ **无 onClick** | 按钮存在但点击无反应 |
| "申请退款"按钮 | ❌ **无 onClick** | 按钮存在但点击无反应 |
| 订单详情展开 | ✅ 正常 | 商品列表、费用明细、地址信息 |

### 订单详情页已有功能（`src/app/orders/[id]/page.tsx`）

| 功能 | 状态 | 说明 |
|------|------|------|
| 订单信息展示 | ✅ 正常 | 订单号、支付方式、时间 |
| 收货地址展示 | ✅ 正常 | 姓名、电话、地址 |
| 商品信息展示 | ✅ 正常 | 图片、名称、数量、价格 |
| 金额明细展示 | ✅ 正常 | 原价、折扣、优惠券、运费、应付 |
| 支付记录展示 | ✅ 正常 | 从 payment_logs 表读取 |
| "重新支付"按钮 | ❌ **逻辑错误** | handleRepay 跳转到 `/quick-order?order_id={数字}`，参数错误 |
| "取消订单"按钮 | ❌ **不存在** | 没有取消功能 |

### API 现状

| API | 状态 | 说明 |
|-----|------|------|
| `GET /api/orders/[id]` | ✅ 正常 | 返回订单详情+items+payment_logs |
| `PATCH /api/orders/[id]` | ❌ **不存在** | 没有取消订单的接口 |
| `GET /api/orders-list` | ⚠️ 缺功能 | 不支持 order_number 查询参数 |
| `POST /api/payments/paypal` | ✅ 正常 | 只创建支付会话，不创建订单 |
| `POST /api/payments/alipay` | ✅ 正常 | 只创建支付会话，不创建订单 |
| `POST /api/payments/stripe` | ✅ 正常 | 只创建支付会话，不创建订单 |
| `GET /api/payments/result` | ⚠️ 缺功能 | cancel 时不归还库存，不传 order_id |
| 三个 cancel 路由 | ❌ 死代码 | 从未被调用 |

---

## 二、核心问题诊断

### 问题 1：payment-result 的 handleRetry 跳转错误

**当前代码（`payment-result/page.tsx` 第 101-115 行）：**
```typescript
const handleRetry = () => {
  if (source === 'cart') {
    router.push('/cart');                    // ← 回到购物车，再下单会创建新订单！
  } else {
    if (orderInfo?.id && status === 'cancel') {
      router.push(`/quick-order?product_id=${...}`);  // ← 回到购买页，会创建新订单！
    } else if (orderInfo?.id) {
      router.push(`/quick-order?order_id=${orderInfo.id}`);
    }
  }
};
```

**问题：** 无论 cart 还是 quick-order，都回到购买页面，再次操作会创建新订单。

### 问题 2：orders-list API 不支持 order_number 查询

**当前代码（`api/orders-list/route.ts`）：**
- 只支持 `order_status` 筛选
- 忽略 `order_number` 参数
- payment-result 页面用 `order_number` 查询，碰巧返回正确结果是因为按时间排序

### 问题 3：orders/[id] 的 handleRepay 参数错误

**当前代码（`orders/[id]/page.tsx` 第 103-106 行）：**
```typescript
const handleRepay = () => {
  if (!order) return;
  router.push(`/quick-order?order_id=${order.id}`);  // ← 传的是数字 ID，不是 order_number
};
```

**问题：** quick-order 页面期望的是 `order_number`（如 "ORD1777..."），不是数字 ID。

### 问题 4：Account 页面的按钮没有功能

**当前代码（`account/page.tsx` 第 284 行）：**
```typescript
<button style={{ background: 'var(--accent)', color: '#fff' }}>立即支付</button>
<button className="bg-gray-100 text-gray-600">取消订单</button>
```

**问题：** 两个按钮都没有 onClick 处理函数，点击无反应。

### 问题 5：支付取消时库存不归还

**当前代码（`api/payments/result/route.ts` 第 106-128 行）：**
- cancel 时只更新订单状态为 cancelled
- 不归还库存（依赖 30 分钟超时释放）

### 问题 6：payment-result 不传 order_id

**当前代码（`api/payments/result/route.ts`）：**
- 重定向到 `/payment-result` 时只有 `order_number`，没有 `order_id`
- 导致无法直接跳转到 `/orders/{id}`

### 问题 7：三个死代码 cancel 路由

- `src/app/api/payments/paypal/cancel/route.ts` — 从未被调用
- `src/app/api/payments/alipay/cancel/route.ts` — 从未被调用
- `src/app/api/payments/stripe/cancel/route.ts` — 从未被调用

---

## 三、目标流程设计

### 用户视角的完整流程

```
【首次购买】
商品页 → quick-order/cart → 创建订单 → 跳转支付平台
  → 支付成功 → /payment-result?status=success → "查看订单" → /orders/{id}
  → 支付取消 → /payment-result?status=cancel → "查看订单" → /orders/{id}
  → 支付失败 → /payment-result?status=fail → "查看订单" → /orders/{id}

【重新支付】
方式 A：/payment-result → "重新支付" → /orders/{id} → 选择支付方式 → 跳转支付平台
方式 B：/account?tab=orders → "立即支付" → /orders/{id} → 选择支付方式 → 跳转支付平台

【取消订单】
方式 A：/orders/{id} → "取消订单" → 确认 → 库存归还 → 状态变更为 cancelled
方式 B：/account?tab=orders → "取消订单" → 确认 → 库存归还 → 状态变更为 cancelled
```

### 架构原则

1. **订单一旦创建，永不重复**：支付 API 只用已有 order_number 创建支付会话
2. **订单详情页是支付入口**：所有"重新支付"都跳到 `/orders/{id}`
3. **Account 页面是管理入口**：查看列表、快速操作（支付/取消）
4. **取消即归还库存**：不依赖超时释放

---

## 四、任务分解

### 任务 1：修复 payment-result 页面的跳转逻辑

**文件：** `src/app/payment-result/page.tsx`

**问题：**
- handleRetry 跳回购买页面，会创建新订单
- orderInfo 从 orders-list 获取，该 API 不支持 order_number 查询
- "重新支付"和"更换支付方式"都调用 handleRetry，逻辑相同

**修改内容：**

1. **修改 orderInfo 获取逻辑**：优先从 URL 的 `order_id` 参数获取，调用 `/api/orders/{id}` API

2. **修改 handleRetry()**：统一跳转到 `/orders/{order_id}`（订单详情页，在那里选择支付方式）

3. **修改 handleViewOrder()**：跳转到 `/orders/{order_id}`

4. **修改 handleChangePayment()**：也跳转到 `/orders/{order_id}`（同上）

**修改后的关键代码：**
```typescript
// 从 URL 读取 order_id（任务 7 会在重定向时添加此参数）
const orderId = searchParams.get('order_id');

// 获取订单信息
useEffect(() => {
  if (orderId) {
    // 优先用 order_id 精确获取
    fetch(`/api/orders/${orderId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => { if (data.success) setOrderInfo(data.data); });
  } else if (orderNumber) {
    // 兼容：用 order_number 从列表获取
    fetch(`/api/orders-list?order_number=${orderNumber}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const orders = data.data?.orders || [];
        if (orders.length > 0) setOrderInfo(orders[0]);
      });
  }
}, [orderId, orderNumber]);

// 所有跳转都去订单详情页
const handleRetry = () => {
  const id = orderId || orderInfo?.id;
  if (id) {
    router.push(`/orders/${id}`);
  } else {
    router.push('/account?tab=orders');
  }
};

const handleViewOrder = () => {
  const id = orderId || orderInfo?.id;
  if (id) {
    router.push(`/orders/${id}`);
  } else {
    router.push('/account?tab=orders');
  }
};

const handleChangePayment = () => {
  handleRetry(); // 同样跳到订单详情页
};
```

**效果：** 无论支付成功/取消/失败，点击任何按钮都跳到订单详情页，不会回到购买页面。

---

### 任务 2：修复 orders-list API 支持 order_number 查询

**文件：** `src/app/api/orders-list/route.ts`

**问题：** API 忽略 `order_number` 查询参数，payment-result 页面依赖此参数获取订单信息

**修改内容：** 在 GET handler 的 WHERE 条件中添加 order_number 处理

**修改后的逻辑：**
```typescript
const orderNumber = searchParams.get('order_number');

// 现有条件
if (order_status) { ... }

// 新增条件
if (orderNumber) {
  ordersSql += ' AND o.order_number = ?';
  params.push(orderNumber);
}
```

**效果：** payment-result 页面可以通过 order_number 精确获取订单信息（作为 order_id 的 fallback）

---

### 任务 3：重写订单详情页 — 添加支付和取消功能

**文件：** `src/app/orders/[id]/page.tsx`

**问题：**
- handleRepay 传递 `order.id`（数字 51）到 quick-order 页面，参数错误
- 没有直接发起支付的能力，依赖跳转到 quick-order 页面
- 没有取消订单按钮

**修改内容：** 在现有页面基础上添加支付方式选择和取消功能

**页面结构（在现有内容底部，操作按钮区域）：**

```
+-------------------------------------------+
| （现有内容保持不变）                         |
| 订单信息、收货地址、商品信息、金额明细、支付记录 |
+-------------------------------------------+
| 操作按钮区（根据状态显示不同内容）             |
|                                            |
| [待支付状态]                                |
|   选择支付方式：                              |
|   [🅿️ PayPal] [¥ Alipay] [💳 Stripe]      |
|   [取消订单]  [返回订单列表]                  |
|                                            |
| [已取消状态]                                |
|   订单已取消，库存已归还                       |
|   [返回订单列表]  [继续购物]                  |
|                                            |
| [已支付状态]                                |
|   [返回订单列表]  [继续购物]                  |
+-------------------------------------------+
```

**重新支付逻辑（handleRepay）：**
```typescript
const handleRepay = async (paymentMethod: 'paypal' | 'alipay' | 'stripe') => {
  if (!order) return;
  setIsPaying(true);

  try {
    const paymentData = {
      amount: order.final_amount,
      currency: 'USD',
      order_number: order.order_number,  // PayPal/Stripe 用
      order_id: order.id,                // Alipay 用
      source: 're-pay',
      items: order.items.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        unit_amount: item.original_price
      }))
    };

    const res = await fetch(`/api/payments/${paymentMethod}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(paymentData)
    });
    const data = await res.json();

    if (data.success) {
      if (paymentMethod === 'paypal' && data.data?.redirect_url) {
        window.location.href = data.data.redirect_url;
      } else if (paymentMethod === 'alipay' && data.data?.payment_url) {
        window.location.href = data.data.payment_url;
      } else if (paymentMethod === 'stripe' && data.data?.redirect_url) {
        window.location.href = data.data.redirect_url;
      }
    } else {
      alert(data.error || '支付创建失败');
    }
  } catch (err) {
    alert('支付请求失败');
  } finally {
    setIsPaying(false);
  }
};
```

**取消订单逻辑（handleCancel）：**
```typescript
const handleCancel = async () => {
  if (!confirm('确定要取消这个订单吗？取消后库存将自动归还。')) return;

  setIsCancelling(true);
  try {
    const res = await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'cancel' })
    });
    const data = await res.json();

    if (data.success) {
      // 刷新订单数据
      fetchOrder();
    } else {
      alert(data.error || '取消失败');
    }
  } catch (err) {
    alert('取消请求失败');
  } finally {
    setIsCancelling(false);
  }
};
```

**效果：**
- 订单详情页可以直接选择支付方式发起支付，不需要跳转到 quick-order 页面
- 使用已有的 order_number，不会创建新订单
- 可以取消订单，库存自动归还

---

### 任务 4：给 orders API 添加取消订单功能

**文件：** `src/app/api/orders/[id]/route.ts`

**问题：** 当前只有 GET 方法，没有用户取消订单的接口

**修改内容：** 添加 PATCH 方法，允许用户取消自己的 pending 订单

**PATCH 逻辑：**
```
PATCH /api/orders/{id}
Body: { action: 'cancel' }

1. 验证用户登录
2. 查询订单，验证属于当前用户
3. 验证订单状态是 'pending'（只有待支付订单可以取消）
4. 归还库存（遍历 order_items，UPDATE inventory SET quantity = quantity + ?）
5. 记录库存流水（transaction_type = 'order_cancel'）
6. 更新订单状态为 'cancelled'
7. 记录 payment_log（status = 'cancelled', error_code = 'USER_CANCEL'）
8. 返回成功
```

**库存归还逻辑：**
```typescript
for (const item of orderItems) {
  // 查询操作前库存
  const beforeResult = await query(
    'SELECT quantity FROM inventory WHERE product_id = ?',
    [item.product_id]
  );
  const beforeStock = beforeResult.rows[0]?.quantity || 0;

  // 归还库存
  await query(
    'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
    [item.quantity, item.product_id]
  );

  // 记录流水
  await query(
    `INSERT INTO inventory_transactions (
      product_id, product_name, transaction_type_id, quantity_change,
      quantity_before, quantity_after, reason, reference_type, reference_id,
      operator_id, operator_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      item.product_id, productName, cancelTypeId,
      item.quantity, beforeStock, beforeStock + item.quantity,
      '用户取消订单', 'order_cancel', orderId,
      userId, userName
    ]
  );
}
```

**效果：** 用户可以在订单详情页或 Account 页面取消待支付订单，库存自动归还

---

### 任务 5：给 Account 页面的 OrderCard 按钮添加功能

**文件：** `src/app/account/page.tsx`

**问题：** OrderCard 组件的"立即支付"和"取消订单"按钮没有 onClick 处理函数

**修改内容：**

1. **添加 handlePayNow 函数**：跳转到 `/orders/{id}`（订单详情页，在那里选择支付方式）

2. **添加 handleCancelOrder 函数**：调用 `PATCH /api/orders/{id}` 取消订单

3. **给按钮绑定 onClick**

**修改后的 getBtns 代码：**
```typescript
const handlePayNow = () => {
  router.push(`/orders/${order.id}`);
};

const handleCancelOrder = async () => {
  if (!confirm('确定要取消这个订单吗？取消后库存将自动归还。')) return;
  try {
    const res = await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'cancel' })
    });
    const data = await res.json();
    if (data.success) {
      onAddressUpdated?.(); // 刷新订单列表
    } else {
      alert(data.error || '取消失败');
    }
  } catch (err) {
    alert('取消请求失败');
  }
};

const getBtns = () => {
  switch (order.order_status) {
    case 'pending':
      return (
        <>
          <button onClick={handlePayNow} className="..." style={{ background: 'var(--accent)', color: '#fff' }}>
            立即支付
          </button>
          <button onClick={handleCancelOrder} className="bg-gray-100 text-gray-600 ...">
            取消订单
          </button>
          <button onClick={handleEditAddress} className="bg-blue-100 text-blue-600 ...">
            修改地址
          </button>
        </>
      );
    // ... 其他状态保持不变
  }
};
```

**效果：**
- Account 页面的"立即支付"按钮跳转到订单详情页
- Account 页面的"取消订单"按钮直接取消订单并归还库存

---

### 任务 6：清理三个死代码 cancel 路由

**文件：**
- `src/app/api/payments/paypal/cancel/route.ts`（删除）
- `src/app/api/payments/alipay/cancel/route.ts`（删除）
- `src/app/api/payments/stripe/cancel/route.ts`（删除）

**问题：** 当前支付流程的 cancel_url 指向 `/api/payments/result`，不经过这些路由

**修改：** 删除这三个文件。它们是遗留的死代码。

**验证：** 确认没有任何代码引用这三个路由。

**效果：** 代码库更干净，减少维护负担

---

### 任务 7：payment-result 页面传递 order_id 到 URL

**文件：** `src/app/api/payments/result/route.ts`

**问题：** 当前 `/payment-result` URL 中只有 `order_number`，没有 `order_id`，导致 payment-result 页面无法直接跳转到 `/orders/{id}`

**修改内容：** 在所有重定向中添加 `order_id` 参数

**修改后的重定向代码：**

```typescript
// 取消重定向（第 124-128 行）
const redirectUrl = new URL('/payment-result', request.url);
redirectUrl.searchParams.set('status', 'cancel');
redirectUrl.searchParams.set('order_number', orderNumber);
redirectUrl.searchParams.set('source', source);
redirectUrl.searchParams.set('order_id', String(orderId));  // 新增
return NextResponse.redirect(redirectUrl);

// 成功重定向（第 223-228 行）
const redirectUrl = new URL('/payment-result', request.url);
redirectUrl.searchParams.set('status', 'success');
redirectUrl.searchParams.set('order_number', orderNumber);
redirectUrl.searchParams.set('source', source);
redirectUrl.searchParams.set('platform', detectedPlatform);
redirectUrl.searchParams.set('order_id', String(orderId));  // 新增
return NextResponse.redirect(redirectUrl);

// 失败重定向（第 195-200 行 和 第 238-243 行）
redirectUrl.searchParams.set('order_id', String(orderId));  // 新增
```

**效果：** payment-result 页面可以直接从 URL 获取 order_id，跳转到订单详情页

---

### 任务 8：完善支付取消处理 — 库存归还

**文件：** `src/app/api/payments/result/route.ts`

**问题：** 当前 cancel 处理只更新订单状态为 cancelled，不归还库存

**修改内容：** 在 cancel 分支中添加库存归还逻辑

**修改后的 cancel 处理：**
```typescript
if (isCancel) {
  // 1. 更新订单状态
  await query(
    'UPDATE orders SET order_status = ?, payment_status = ?, updated_at = datetime(\'now\') WHERE id = ?',
    ['cancelled', 'cancelled', orderId]
  );

  // 2. 记录 payment_log
  await recordPaymentLog(
    orderId, orderNumber, platform || order.payment_method,
    'cancelled', 'USER_CANCEL', 'User cancelled payment',
    false, null, orderNumber, 'cancel',
    order.final_amount || 0, 'USD',
    { source, platform, cancelled_at: new Date().toISOString() }
  );

  // 3. 归还库存
  const itemsResult = await query(
    `SELECT oi.product_id, oi.quantity, p.name
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [orderId]
  );
  const cancelTypeResult = await query(
    'SELECT id FROM transaction_type WHERE code = ?', ['order_cancel']
  );
  const cancelTypeId = cancelTypeResult.rows[0]?.id || null;

  for (const item of itemsResult.rows) {
    const beforeResult = await query(
      'SELECT quantity FROM inventory WHERE product_id = ?', [item.product_id]
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
        [item.product_id, item.name, cancelTypeId, item.quantity,
         beforeStock, beforeStock + item.quantity,
         '支付取消，归还库存', 'payment_cancel', orderId, null, 'SYSTEM']
      );
    }
  }

  // 4. 重定向（带 order_id）
  const redirectUrl = new URL('/payment-result', request.url);
  redirectUrl.searchParams.set('status', 'cancel');
  redirectUrl.searchParams.set('order_number', orderNumber);
  redirectUrl.searchParams.set('source', source);
  redirectUrl.searchParams.set('order_id', String(orderId));
  return NextResponse.redirect(redirectUrl);
}
```

**效果：** 取消支付时库存立即归还（不再等30分钟超时）

---

### 任务 9：全面回归测试

**测试场景清单：**

1. **quick-order 首次购买成功**
   - 进入 /quick-order?product_id=2
   - 选择地址，点击 PayPal
   - 在 PayPal 完成支付
   - 验证：跳转到 /payment-result?status=success&order_id=xxx
   - 验证：订单状态为 paid
   - 验证：库存已扣减

2. **quick-order 取消支付后重新支付**
   - 进入 /quick-order?product_id=2
   - 选择地址，点击 PayPal
   - 在 PayPal 取消支付
   - 验证：跳转到 /payment-result?status=cancel&order_id=xxx
   - 验证：库存已归还
   - 点击"重新支付"
   - 验证：跳转到 /orders/{id}
   - 选择 PayPal 支付
   - 验证：跳转到 PayPal（使用已有的 order_number）
   - 在 PayPal 完成支付
   - 验证：订单状态变为 paid

3. **cart 首次购买成功**
   - 在购物车选择商品，点击 Place Order
   - 在 PayPal 完成支付
   - 验证：跳转到 /payment-result?status=success&order_id=xxx
   - 验证：订单状态为 paid

4. **cart 取消支付后重新支付**
   - 在购物车选择商品，点击 Place Order
   - 在 PayPal 取消支付
   - 验证：跳转到 /payment-result?status=cancel&order_id=xxx
   - 验证：库存已归还
   - 点击"重新支付"
   - 验证：跳转到 /orders/{id}
   - 选择支付方式完成支付
   - 验证：订单状态变为 paid

5. **Account 页面"立即支付"**
   - 进入 /account?tab=orders
   - 找到一个 pending 订单
   - 点击"立即支付"
   - 验证：跳转到 /orders/{id}
   - 选择支付方式完成支付
   - 验证：订单状态变为 paid

6. **Account 页面"取消订单"**
   - 进入 /account?tab=orders
   - 找到一个 pending 订单
   - 点击"取消订单"
   - 确认取消
   - 验证：订单状态变为 cancelled
   - 验证：库存已归还

7. **订单详情页取消订单**
   - 进入 /orders/{id}（pending 订单）
   - 点击"取消订单"
   - 确认取消
   - 验证：订单状态变为 cancelled
   - 验证：库存已归还

8. **Alipay 取消支付**
   - 使用 Alipay 支付
   - 取消支付
   - 验证：系统正确识别为取消（或走超时释放）
   - 验证：订单状态为 cancelled

---

## 五、文件修改总览

### 需要修改的文件

| # | 文件 | 操作 | 任务 |
|---|------|------|------|
| 1 | `src/app/payment-result/page.tsx` | 修改 | 任务 1 |
| 2 | `src/app/api/orders-list/route.ts` | 修改 | 任务 2 |
| 3 | `src/app/orders/[id]/page.tsx` | 重写 | 任务 3 |
| 4 | `src/app/api/orders/[id]/route.ts` | 修改 | 任务 4 |
| 5 | `src/app/account/page.tsx` | 修改 | 任务 5 |
| 6 | `src/app/api/payments/result/route.ts` | 修改 | 任务 7、8 |

### 需要删除的文件

| # | 文件 | 操作 | 任务 |
|---|------|------|------|
| 7 | `src/app/api/payments/paypal/cancel/route.ts` | 删除 | 任务 6 |
| 8 | `src/app/api/payments/alipay/cancel/route.ts` | 删除 | 任务 6 |
| 9 | `src/app/api/payments/stripe/cancel/route.ts` | 删除 | 任务 6 |

### 不需要修改的文件（确认安全）

| 文件 | 原因 |
|------|------|
| `src/app/api/payments/paypal/route.ts` | 已正确处理 order_number |
| `src/app/api/payments/alipay/route.ts` | 已正确处理 order_id |
| `src/app/api/payments/stripe/route.ts` | 已正确处理 order_number |
| `src/app/api/inventory/reserve/route.ts` | 创建订单逻辑正确 |
| `src/app/api/cart/create-order/route.ts` | 创建订单逻辑正确 |
| `src/app/quick-order/page.tsx` | 购买流程正确 |
| `src/app/cart/page.tsx` | 购买流程正确 |
| `src/app/api/inventory/release-expired/route.ts` | 超时释放逻辑正确（保留作为最后保障） |
| `src/components/payment/EnhancedPaymentResultCard.tsx` | 组件逻辑正确，通过 props 控制 |
| 数据库 | 不需要任何表结构修改 |

---

## 六、修改后达到的效果总结

### 用户视角

| 场景 | 修改前 | 修改后 |
|------|--------|--------|
| quick-order 取消支付 | 回到商品购买页，重新买会创建新订单 | 跳到支付结果页 → 订单详情页，可以看到订单信息 |
| cart 取消支付 | 回到购物车，再下单会创建重复订单 | 跳到支付结果页 → 订单详情页，可以看到订单信息 |
| 重新支付 | 不知道去哪里重新支付 | 支付结果页/Account 页面都有入口，跳到订单详情页选择支付方式 |
| Account 页面"立即支付" | 按钮点击无反应 | 跳到订单详情页选择支付方式 |
| Account 页面"取消订单" | 按钮点击无反应 | 直接取消订单，库存自动归还 |
| 取消后库存 | 等 30 分钟超时释放 | 立即归还 |

### 技术视角

| 指标 | 修改前 | 修改后 |
|------|--------|--------|
| 重复订单风险 | 高（每次重新支付都创建新订单） | 无（支付 API 只用已有订单号） |
| 库存管理 | 被动（30分钟超时释放） | 主动（取消时立即归还） |
| 代码质量 | 有死代码（3个cancel路由） | 干净（删除死代码） |
| 数据库修改 | 无 | 无（不需要任何表结构修改） |

---

## 七、风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 重新支付时库存不足 | 中 | 订单无法支付 | 支付 API 本身会检查库存，不足时返回错误 |
| 订单状态并发冲突 | 低 | 重复支付 | 支付回调有状态检查（已支付订单不重复处理） |
| Account 页面取消后列表未刷新 | 低 | 显示不一致 | 取消成功后调用 onAddressUpdated 刷新列表 |
| Alipay 取消无法检测 | 低 | 订单状态错误 | 保留超时释放作为最后保障 |
