# 订单数量主真相与统一金额服务一次性实施计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 把订单商品数量与订单金额统一收口到唯一主真相，彻底消除 quick-order、订单详情、购物车建单、支付前准备、订单列表、支付结果页各算各的情况。

**架构：** 订单商品数量唯一认 `order_items.quantity`。订单金额唯一通过统一金额服务计算，分为 `estimate`（只预览不落库）和 `commit`（计算后回写 `orders`）两种模式。所有展示层、接口层、支付准备层都只能消费这套结果，不能再自行计算金额。

**技术栈：** Next.js App Router、TypeScript、SQLite、现有订单/优惠券/库存/支付适配层。

---

## 一、最终业务规则（已定稿）

### 1. 订单商品数量唯一主真相

```text
order_items.quantity
```

任何地方都不允许再把：
- 页面本地数量
- URL 里的 quantity
- 支付回跳页临时数量
- 订单表冗余字段

当成订单商品真实数量。

### 2. 订单金额唯一公式

```text
商品原价小计
- 商品促销优惠
= 商品促销后小计

商品促销后小计
- 优惠券优惠
+ 邮费
= final_amount
```

### 3. 字段含义固定

```text
total_original_price           = 商品原价小计
total_promotions_discount_amount = 商品促销优惠总额
total_after_promotions_amount = 商品促销后小计
total_coupon_discount         = 优惠券优惠总额
order_final_discount_amount   = 订单总优惠额（商品促销优惠 + 优惠券优惠）
shipping_fee                  = 邮费
final_amount                  = 最终应付
```

**特别强调：**
- `total_promotions_discount_amount` 只表示「商品促销优惠总额」
- `total_coupon_discount` 只表示「优惠券优惠总额」
- `order_final_discount_amount = total_promotions_discount_amount + total_coupon_discount`
- 页面展示时必须拆开展示「商品促销优惠」和「优惠券优惠」，不能只展示总优惠后隐藏明细

### 4. 统一金额服务职责

统一金额服务只做 4 件事：
1. 读取订单商品
2. 统一计算金额
3. 返回展示明细
4. 必要时回写 `orders` 金额字段

### 5. 统一金额服务两个模式

#### estimate

```text
只返回结果，不落库
```

#### commit

```text
计算后回写订单金额字段
```

### 6. 禁止自行算钱的范围

以下场景只能调统一金额服务，不能再自己算：
1. quick-order 价格预览
2. quick-order 提交
3. 订单详情预估
4. 购物车生成订单
5. 支付前准备
6. 订单列表展示
7. 支付结果页展示

### 7. 页面统一展示顺序

1. 商品原价小计
2. 商品促销优惠
3. 优惠券优惠
4. 邮费
5. 最终应付

### 8. 促销与优惠券展示要求

#### 促销
- 显示促销标签
- 显示促销减了多少钱

#### 优惠券
- 显示缩略优惠券样式
- 显示名称
- 显示优惠力度
- 显示实际优惠金额

---

## 二、这次一次性改动的总策略

本次不做零碎修补，直接一次性收口成 3 条主线：

### 主线 A：数量主真相收口
- 所有订单数量只认 `order_items.quantity`
- quick-order 加减数量时必须同步它
- 页面展示、支付结果页、取消返库都从它读取

### 主线 B：金额主真相收口
- 只保留一个统一金额服务
- 所有金额字段都由它产出
- 页面和接口只展示结果，不参与计算

### 主线 C：支付前准备收口
- 支付前必须先 `commit`
- 支付通道只能读取订单表中的最终金额
- 前端禁止再传 `amount/items` 当主真相

---

## 三、文件改动总表

### 核心修改文件

- 修改：`/Users/davis/zisha-ecommerce/src/lib/order-pricing-service.ts`
  - 升级为唯一金额服务
  - 明确 `estimate / commit` 双模式语义
  - 修正 `order_final_discount_amount` 含义

- 修改：`/Users/davis/zisha-ecommerce/src/app/api/quick-order/calculate/route.ts`
  - 只走 `estimate`
  - 返回标准展示字段

- 修改：`/Users/davis/zisha-ecommerce/src/app/api/quick-order/create/route.ts`
  - 只走 `commit`
  - 回写订单金额并返回可支付结果

- 修改：`/Users/davis/zisha-ecommerce/src/app/api/orders/[id]/estimate/route.ts`
  - 只走 `estimate`

- 修改：`/Users/davis/zisha-ecommerce/src/app/api/cart/create-order/route.ts`
  - 建单后只走 `commit`

- 修改：`/Users/davis/zisha-ecommerce/src/app/quick-order/page.tsx`
  - 页面不再自己算金额
  - 页面只展示统一字段
  - 去掉业务金额硬编码兜底

### 第二批联动修改文件

- 修改：`/Users/davis/zisha-ecommerce/src/app/api/quick-order/route.ts`
  - 统一 quick-order 初始化返回结构
  - 清理假 `order_id`

- 修改：`/Users/davis/zisha-ecommerce/src/app/api/payments/paypal/route.ts`
  - 改成只吃 `order_number`
  - 支付前金额只从 DB 读取

- 验证：`/Users/davis/zisha-ecommerce/src/lib/payment/order-data-service.ts`
  - 确认支付统一读数逻辑满足 PayPal

- 验证：`/Users/davis/zisha-ecommerce/src/app/api/payments/alipay/route.ts`
- 验证：`/Users/davis/zisha-ecommerce/src/app/api/payments/stripe/route.ts`
- 验证：`/Users/davis/zisha-ecommerce/src/app/payment-result/page.tsx`
- 验证：`/Users/davis/zisha-ecommerce/src/app/api/orders/[id]/route.ts`

---

## 四、实施任务

### 任务 1：重构统一金额服务的数据语义

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/lib/order-pricing-service.ts`

- [ ] **步骤 1：先写失败断言，固定字段语义**

```ts
const expected = {
  total_original_price: 506.82,
  total_promotions_discount_amount: 25.34,
  total_after_promotions_amount: 481.48,
  total_coupon_discount: 30,
  order_final_discount_amount: 55.34,
  shipping_fee: 0,
  final_amount: 451.48,
};
```

- [ ] **步骤 2：运行最小检查，确认当前实现不满足“促销优惠与优惠券优惠分离”**

运行：
```bash
npx tsc --noEmit
```

预期：
- 代码虽可通过类型检查，但业务语义仍不满足本计划，需继续实现

- [ ] **步骤 3：把统一金额服务返回字段名称与业务语义完全对齐**

```ts
export interface OrderPricingResult {
  order_id: number;
  total_original_price: number;
  order_final_discount_amount: number;
  total_after_promotions_amount: number;
  total_coupon_discount: number;
  shipping_fee: number;
  final_amount: number;
  total_usd: number;
  total_cny: number;
  total_aed: number;
  coupon_details: PricingCouponDetail[];
  items: PricingItemDetail[];
  address: AddressDetail | null;
}
```

- [ ] **步骤 4：统一内部公式实现**

```ts
const totalOriginalPrice = round2(items.reduce((sum, item) => sum + item.original_price_usd * item.quantity, 0));
const totalAfterPromotionsAmount = round2(items.reduce((sum, item) => sum + item.final_price_usd * item.quantity, 0));
const orderFinalDiscountAmount = round2(Math.max(0, totalOriginalPrice - totalAfterPromotionsAmount));
const totalCouponDiscount = round2(Math.min(totalDiscount, totalAfterPromotionsAmount));
const finalAmount = round2(Math.max(0, totalAfterPromotionsAmount - totalCouponDiscount + shippingFee));
```

- [ ] **步骤 5：把旧别名字段统一迁移或兼容到新语义**

```ts
return {
  order_id: orderId,
  total_original_price: totalOriginalPrice,
  order_final_discount_amount: orderFinalDiscountAmount,
  total_after_promotions_amount: totalAfterPromotionsAmount,
  total_coupon_discount: totalCouponDiscount,
  shipping_fee: shippingFee,
  final_amount: finalAmount,
  total_usd: finalAmount,
  total_cny: round2(finalAmount * USD_TO_CNY),
  total_aed: round2(finalAmount * USD_TO_AED),
  coupon_details: couponDetails,
  items,
  address,
};
```

- [ ] **步骤 6：Commit**

```bash
git add src/lib/order-pricing-service.ts
git commit -m "refactor: align unified order pricing field semantics"
```

### 任务 2：明确 estimate / commit 双模式

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/lib/order-pricing-service.ts`

- [ ] **步骤 1：保留只计算不落库的 estimate 入口**

```ts
export async function estimateOrderPricing(input: CalculateOrderPricingInput): Promise<OrderPricingResult> {
  return calculateOrderPricing(input);
}
```

- [ ] **步骤 2：把 commit 入口语义固定为“计算并回写订单字段”**

```ts
export async function commitOrderPricing(input: PersistOrderPricingInput) {
  const pricing = await estimateOrderPricing(input);
  // update orders
  return pricing;
}
```

- [ ] **步骤 3：修正 orders 回写字段映射**

```ts
await query(
  `UPDATE orders SET
     payment_method = COALESCE(?, payment_method),
     shipping_address_id = ?,
     shipping_fee = ?,
     coupon_ids = ?,
     total_coupon_discount = ?,
     total_original_price = ?,
     total_after_promotions_amount = ?,
     order_final_discount_amount = ?,
     final_amount = ?,
     updated_at = datetime('now')
   WHERE id = ? AND user_id = ?`,
  [
    paymentMethod || null,
    addressId || null,
    pricing.shipping_fee,
    JSON.stringify(couponIds),
    pricing.total_coupon_discount,
    pricing.total_original_price,
    pricing.total_after_promotions_amount,
    pricing.order_final_discount_amount,
    pricing.final_amount,
    orderId,
    userId,
  ]
);
```

- [ ] **步骤 4：取消“把商品促销优惠 + 优惠券优惠混写到 order_final_discount_amount”旧逻辑**

```ts
// 删除旧逻辑：round2(pricing.product_discount + pricing.coupon_discount)
```

- [ ] **步骤 5：Commit**

```bash
git add src/lib/order-pricing-service.ts
git commit -m "refactor: split estimate and commit pricing flows"
```

### 任务 3：quick-order/calculate 改成纯 estimate

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/app/api/quick-order/calculate/route.ts`

- [ ] **步骤 1：把路由调用统一改成 estimate**

```ts
const pricing = await estimateOrderPricing({
  orderId: Number(order_id),
  userId: authResult.user.userId,
  addressId: address_id,
  couponIds: coupon_ids || [],
});
```

- [ ] **步骤 2：返回页面标准字段，不再让前端猜**

```ts
return NextResponse.json({
  success: true,
  data: {
    total_original_price: pricing.total_original_price,
    order_final_discount_amount: pricing.order_final_discount_amount,
    total_after_promotions_amount: pricing.total_after_promotions_amount,
    total_coupon_discount: pricing.total_coupon_discount,
    shipping_fee: pricing.shipping_fee,
    final_amount: pricing.final_amount,
    total_usd: pricing.total_usd,
    total_cny: pricing.total_cny,
    total_aed: pricing.total_aed,
    coupon_details: pricing.coupon_details,
    product_promotions: promotions,
    address: pricing.address,
    payment_method,
  }
});
```

- [ ] **步骤 3：把 quantity 校验保留为“只认 order_items.quantity”**

```ts
if (Number(orderItemResult.rows[0].quantity) !== Number(quantity)) {
  return NextResponse.json({ success: false, error: 'QUANTITY_MISMATCH' }, { status: 400 });
}
```

- [ ] **步骤 4：Commit**

```bash
git add src/app/api/quick-order/calculate/route.ts
git commit -m "refactor: make quick-order calculate use estimate pricing"
```

### 任务 4：quick-order/create 改成纯 commit

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/app/api/quick-order/create/route.ts`

- [ ] **步骤 1：提交接口只调用 commit，不再自行拼金额**

```ts
const pricing = await commitOrderPricing({
  orderId: order_id,
  userId,
  addressId: address_id,
  couponIds: coupon_ids || [],
  paymentMethod: payment_method,
});
```

- [ ] **步骤 2：返回标准确认结果**

```ts
return createSuccessResponse({
  order_id,
  order_number: refreshedOrder.order_number,
  payment_method,
  total_original_price: pricing.total_original_price,
  order_final_discount_amount: pricing.order_final_discount_amount,
  total_after_promotions_amount: pricing.total_after_promotions_amount,
  total_coupon_discount: pricing.total_coupon_discount,
  shipping_fee: pricing.shipping_fee,
  final_amount: pricing.final_amount,
  amount_usd: pricing.total_usd,
  amount_cny: pricing.total_cny,
  amount_aed: pricing.total_aed,
});
```

- [ ] **步骤 3：页面提交前置条件校验保持严格**

```ts
// 必须有真实 order_id
// 必须有 address_id
// payment_method 必须合法
```

- [ ] **步骤 4：Commit**

```bash
git add src/app/api/quick-order/create/route.ts
git commit -m "refactor: make quick-order create use commit pricing"
```

### 任务 5：orders/[id]/estimate 改成纯 estimate

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/app/api/orders/[id]/estimate/route.ts`

- [ ] **步骤 1：统一调用 estimate**

```ts
const pricing = await estimateOrderPricing({
  orderId: Number(orderId),
  userId,
  addressId: address_id,
  couponIds: coupon_ids || [],
});
```

- [ ] **步骤 2：返回标准金额字段**

```ts
return createSuccessResponse({
  order_id: Number(orderId),
  order_number: order.order_number,
  total_original_price: pricing.total_original_price,
  order_final_discount_amount: pricing.order_final_discount_amount,
  total_after_promotions_amount: pricing.total_after_promotions_amount,
  total_coupon_discount: pricing.total_coupon_discount,
  shipping_fee: pricing.shipping_fee,
  final_amount: pricing.final_amount,
  total_usd: pricing.total_usd,
  total_cny: pricing.total_cny,
  total_aed: pricing.total_aed,
  coupon_details: pricing.coupon_details,
});
```

- [ ] **步骤 3：Commit**

```bash
git add src/app/api/orders/[id]/estimate/route.ts
git commit -m "refactor: unify order estimate pricing output"
```

### 任务 6：cart/create-order 建单后只走 commit

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/app/api/cart/create-order/route.ts`

- [ ] **步骤 1：订单商品入库后不再自己算钱，只调用 commit**

```ts
const pricing = await commitOrderPricing({
  orderId,
  userId,
  addressId,
  couponIds,
  paymentMethod,
});
```

- [ ] **步骤 2：返回标准金额字段**

```ts
return NextResponse.json({
  success: true,
  data: {
    order_id: orderId,
    order_number: orderNumber,
    payment_method: paymentMethod,
    total_original_price: pricing.total_original_price,
    order_final_discount_amount: pricing.order_final_discount_amount,
    total_after_promotions_amount: pricing.total_after_promotions_amount,
    total_coupon_discount: pricing.total_coupon_discount,
    shipping_fee: pricing.shipping_fee,
    final_amount: pricing.final_amount,
    amount_usd: pricing.total_usd,
    amount_cny: pricing.total_cny,
    amount_aed: pricing.total_aed,
  }
});
```

- [ ] **步骤 3：Commit**

```bash
git add src/app/api/cart/create-order/route.ts
git commit -m "refactor: make cart create-order use commit pricing"
```

### 任务 7：quick-order 页面彻底停止自行算钱

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/app/quick-order/page.tsx`

- [ ] **步骤 1：删除业务金额硬编码兜底**

```ts
setPriceData({
  total_original_price: d.total_original_price ?? 0,
  order_final_discount_amount: d.order_final_discount_amount ?? 0,
  total_after_promotions_amount: d.total_after_promotions_amount ?? 0,
  total_coupon_discount: d.total_coupon_discount ?? 0,
  shipping_fee: d.shipping_fee ?? 0,
  final_amount: d.final_amount ?? 0,
  total_usd: d.total_usd ?? 0,
  total_cny: d.total_cny ?? 0,
  total_aed: d.total_aed ?? 0,
  coupon_details: d.coupon_details ?? [],
  promotions: d.product_promotions ?? [],
});
```

- [ ] **步骤 2：价格展示顺序固定为业务要求顺序**

```ts
商品原价小计 -> total_original_price
商品促销优惠 -> order_final_discount_amount
优惠券优惠 -> total_coupon_discount
邮费 -> shipping_fee
最终应付 -> final_amount
```

- [ ] **步骤 3：页面公式只展示后端结果，不再自己推导第二套金额**

```ts
// 页面只负责渲染，不再通过 subtotal / quantity / price 再算一遍
```

- [ ] **步骤 4：领取优惠券后刷新逻辑补全 `order_number` 分支**

```ts
if (orderNumber) {
  url += `order_number=${orderNumber}`;
} else if (orderId) {
  url += `order_id=${orderId}`;
} else {
  url += `product_id=${productId}&quantity=${qty}`;
}
```

- [ ] **步骤 5：所有失败都显式报错，不再静默吞掉**

```ts
if (!response.ok || !data.success) {
  setError(data.error || data.message || '价格计算失败');
  return;
}
```

- [ ] **步骤 6：Commit**

```bash
git add src/app/quick-order/page.tsx
git commit -m "fix: make quick-order page render unified pricing only"
```

### 任务 8：quick-order 初始化入口收口

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/app/api/quick-order/route.ts`

- [ ] **步骤 1：禁止把 `product.id` 当成 `order_id` 返回**

```ts
if (productMode) {
  return NextResponse.json({
    success: false,
    error: 'ORDER_CONTEXT_REQUIRED'
  }, { status: 400 });
}
```

- [ ] **步骤 2：只接受真实 pending 订单上下文进入后续 calculate/create**

```ts
const order = await query(`SELECT id, order_number FROM orders WHERE order_number = ? AND user_id = ?`, [orderNumber, userId]);
```

- [ ] **步骤 3：Commit**

```bash
git add src/app/api/quick-order/route.ts
git commit -m "fix: require real order context for quick-order"
```

### 任务 9：支付前准备统一收口到 commit 结果

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/app/api/payments/paypal/route.ts`
- 验证：`/Users/davis/zisha-ecommerce/src/lib/payment/order-data-service.ts`
- 验证：`/Users/davis/zisha-ecommerce/src/app/api/payments/alipay/route.ts`
- 验证：`/Users/davis/zisha-ecommerce/src/app/api/payments/stripe/route.ts`

- [ ] **步骤 1：PayPal 改成只接 `order_number`**

```ts
const { order_number, source = 'quick-order' } = body;
```

- [ ] **步骤 2：PayPal 统一从 DB 读取订单金额**

```ts
const orderData = await getPaymentOrderData(order_number, 'paypal');
```

- [ ] **步骤 3：删除前端 `amount/items` 主流程依赖**

```ts
// 删除 verifyPrices(items)
// 删除基于前端 items 的 calculateItemPrice 主流程
```

- [ ] **步骤 4：确保三支付通道一致**

```ts
PayPal   -> getPaymentOrderData(order_number, 'paypal')
Alipay   -> getPaymentOrderData(order_number, 'alipay')
Stripe   -> getPaymentOrderData(order_number, 'stripe')
```

- [ ] **步骤 5：Commit**

```bash
git add src/app/api/payments/paypal/route.ts
git commit -m "refactor: unify paypal payment preparation with order data service"
```

### 任务 10：订单列表与支付结果页只读统一字段

**文件：**
- 验证并按需修改：`/Users/davis/zisha-ecommerce/src/app/payment-result/page.tsx`
- 验证并按需修改：`/Users/davis/zisha-ecommerce/src/app/api/orders/[id]/route.ts`
- 验证并按需修改：订单列表相关页面/接口

- [ ] **步骤 1：确认展示来源只读 `orders` 已落库字段**

```ts
total_original_price
order_final_discount_amount
total_after_promotions_amount
total_coupon_discount
shipping_fee
final_amount
```

- [ ] **步骤 2：确认数量展示只读 `order_items.quantity`**

```ts
SELECT quantity FROM order_items WHERE order_id = ?
```

- [ ] **步骤 3：修正任何残留的页面自行计算逻辑**

```ts
// 删除页面端 subtotal = price * quantity 等二次真相
```

- [ ] **步骤 4：Commit**

```bash
git add src/app/payment-result/page.tsx src/app/api/orders/[id]/route.ts
git commit -m "fix: make order display pages read persisted pricing truth"
```

### 任务 11：优惠券状态流转校正

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/lib/order-pricing-service.ts`
- 验证：订单取消/支付取消/超时取消相关链路

- [ ] **步骤 1：提交订单时不再把优惠券直接标成最终 `used`**

```ts
// pending 阶段只保留 order_coupons 关系
// user_coupons.status 不直接改成 used
```

- [ ] **步骤 2：支付成功时再进入最终已使用语义**

```ts
// 支付成功回调再改 used
```

- [ ] **步骤 3：取消支付 / 超时取消 / 手动取消时释放优惠券**

```ts
UPDATE user_coupons SET status = 'active', used_order_id = NULL WHERE ...
```

- [ ] **步骤 4：Commit**

```bash
git add src/lib/order-pricing-service.ts
git commit -m "fix: correct coupon lifecycle around pending orders"
```

### 任务 12：最终验证

**文件：**
- 验证全部本次改动文件

- [ ] **步骤 1：运行 TypeScript 校验**

运行：
```bash
npx tsc --noEmit
```

预期：PASS

- [ ] **步骤 2：运行 lint**

运行：
```bash
npm run lint
```

预期：
- 本次修改相关文件无新增 lint 问题
- 如有历史遗留问题，单独记录，不误判为本次引入

- [ ] **步骤 3：真实回归 quick-order 场景 A**

```text
无优惠券
检查：商品原价小计、商品促销优惠、邮费、最终应付
```

- [ ] **步骤 4：真实回归 quick-order 场景 B**

```text
选择优惠券
检查：优惠券优惠变化、最终应付变化、展示样式正确
```

- [ ] **步骤 5：真实回归 quick-order 场景 C**

```text
提交 PayPal -> 取消支付 -> 返回页面
检查：金额正确、数量正确、优惠券未丢失、订单仍可继续处理
```

- [ ] **步骤 6：真实回归购物车建单场景**

```text
cart/create-order 后 orders 字段值与统一公式一致
```

- [ ] **步骤 7：真实回归订单详情 estimate 场景**

```text
orders/[id]/estimate 返回值与 quick-order 一致
```

- [ ] **步骤 8：Commit**

```bash
git add .
git commit -m "test: verify unified order pricing and quantity truth"
```

---

## 五、实施顺序（必须严格按此顺序）

1. 统一金额服务字段语义
2. estimate / commit 双模式
3. quick-order/calculate
4. quick-order/create
5. orders/[id]/estimate
6. cart/create-order
7. quick-order 页面展示
8. quick-order 初始化入口
9. PayPal 支付前准备
10. 订单列表 / 支付结果页
11. 优惠券状态流转
12. 全链路回归

---

## 六、这次计划解决的结果

本计划执行完成后，系统会稳定成你要的结果：

### 数量层面
- 以后任何订单数量都只认 `order_items.quantity`

### 金额层面
- 以后任何金额都只认统一金额服务
- `estimate` 只预览
- `commit` 才落库

### 展示层面
- 页面只展示，不计算
- 页面公式固定
- 页面不会再出现离谱的错位金额

### 支付层面
- 支付前不再偷偷重算一套
- 三支付通道都从订单真相取值

### 订单后续链路
- 订单详情、订单列表、支付结果页都统一读同一套字段
- 优惠券状态不会再在 pending 阶段提前报废

---

## 七、自检

### 规格覆盖

已覆盖你确认的全部 10 条结果：
- 数量主真相
- 金额公式
- 字段含义
- 统一金额服务
- estimate / commit 双模式
- 禁止各处自行算钱
- 第一批要改接口
- 展示顺序
- 促销与优惠券展示
- 最关键禁止事项

### 范围控制

本轮只做与“订单数量主真相 + 统一金额主真相 + 支付前准备统一化”直接相关的改动，不顺手做无关重构。

### 风险控制

本轮不碰数据库结构，不做 schema 变更。只收口应用层逻辑与展示逻辑。