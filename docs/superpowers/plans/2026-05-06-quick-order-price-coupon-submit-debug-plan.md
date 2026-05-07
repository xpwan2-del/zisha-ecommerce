# quick-order 价格/优惠券/提交流程问题排查与修改计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 查清并修复 quick-order 页面中价格明细错误、优惠券切换不生效、提交订单无响应的问题，统一订单金额来源与支付入口行为。

**架构：** 以 `order-pricing-service.ts` 作为订单金额唯一真相，以 `getPaymentOrderData()` 作为支付金额唯一真相。quick-order 页面只展示后端统一计算结果，不再混用初始化临时价格、前端硬编码兜底和支付通道自算金额。

**技术栈：** Next.js App Router、TypeScript、SQLite、现有支付适配层、订单/优惠券/库存服务。

---

## 一、已确认的根因

### 根因 1：quick-order 初始化接口在 `product_id` 模式下返回了假的订单 ID

**位置：** [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/quick-order/route.ts#L474-L478)

```ts
return NextResponse.json({
  success: true,
  data: {
    order_id: product.id,
    order_number: `PRODUCT_${productId}_${quantity}`,
```

**影响：**
- 前端把 `product.id` 当成 `currentOrderDbId`
- `/api/quick-order/calculate` 和 `/api/quick-order/create` 都要求真实 `orders.id`
- 导致价格计算失败、提交失败、页面看起来“没反应”

### 根因 2：页面价格展示混入了硬编码兜底金额

**位置：** [page.tsx](file:///Users/davis/zisha-ecommerce/src/app/quick-order/page.tsx#L184-L196)、[page.tsx](file:///Users/davis/zisha-ecommerce/src/app/quick-order/page.tsx#L236-L245)

```ts
original_subtotal: d.original_subtotal_usd ?? d.original_subtotal ?? d.original_price ?? 84.47,
subtotal: d.subtotal_usd ?? d.subtotal ?? 59.13,
product_discount: d.discount_amount ?? d.product_discount ?? 25.34,
```

**影响：**
- 后端字段缺失或计算失败时，页面仍显示看似正常但完全错误的业务金额
- 掩盖真实错误，造成“价格完全不对但没有报错”的错觉

### 根因 3：quick-order 初始化价格与统一金额服务使用了两套促销计算逻辑

**位置：**
- [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/quick-order/route.ts#L53-L120)
- [order-pricing-service.ts](file:///Users/davis/zisha-ecommerce/src/lib/order-pricing-service.ts#L248-L282)

**影响：**
- 页面初始加载价格来自 `calculateProductPrice`
- 重新计算和提交落库来自 `calculateOrderPricing`
- 同一个商品可能出现初始化价格、重新计算价格、最终订单价格三者不一致

### 根因 4：PayPal 支付链路没有接入统一支付金额服务

**位置：** [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/paypal/route.ts#L198-L244)

```ts
const { amount, currency = 'USD', items, order_number, source = 'cart' } = body;
...
const { valid, errors } = await verifyPrices(items);
...
const calculatedItems = await Promise.all(items.map(async (item: any) => {
```

**影响：**
- PayPal 仍依赖前端传入 `amount/items`
- 又在支付接口内部重新查商品、重新算促销
- 没有使用订单 DB 中已持久化的 `final_amount`
- 优惠券、运费、促销后金额可能与页面和订单表都不一致

### 根因 5：领取优惠券后的刷新逻辑遗漏 `order_number` 分支

**位置：** [page.tsx](file:///Users/davis/zisha-ecommerce/src/app/quick-order/page.tsx#L360-L369)

```ts
if (orderId) {
  url += `order_id=${orderId}`;
} else {
  url += `product_id=${productId}&quantity=${qty}`;
}
```

**影响：**
- 初始进入支持 `order_number`
- 领取优惠券后重新拉取 quick-order 数据时却不支持 `order_number`
- 可能刷新到错误入口，导致优惠券列表和价格状态不一致

### 根因 6：提交订单阶段过早把优惠券状态改为 `used`

**位置：** [order-pricing-service.ts](file:///Users/davis/zisha-ecommerce/src/lib/order-pricing-service.ts#L319-L330)

```ts
UPDATE user_coupons SET status = 'used', used_order_id = ? WHERE id = ? AND user_id = ?
```

**影响：**
- 用户一点击提交但尚未支付成功，优惠券就可能从“可用”变“已使用”
- 支付失败、取消支付、关闭页面后，用户会感觉优惠券丢失或刷新异常

### 根因 7：calculate / inventory / create 的错误多数被前端静默吞掉

**位置：**
- [page.tsx](file:///Users/davis/zisha-ecommerce/src/app/quick-order/page.tsx#L233-L249)
- [page.tsx](file:///Users/davis/zisha-ecommerce/src/app/quick-order/page.tsx#L282-L287)
- [page.tsx](file:///Users/davis/zisha-ecommerce/src/app/quick-order/page.tsx#L308-L313)

**影响：**
- 接口失败后页面不更新，也不提示具体原因
- 用户感知就是“价格不变”“提交无反应”“按钮点了没效果”

### 根因 8：价格明细 UI 公式和真实金额关系已经明显对不上

用户现场数据：
- 商品总价：`506.82`
- 促销优惠：`25.34`
- 促销后小计实际应为：`481.48`
- 页面却显示：`354.77`
- 合计却显示：`59.13`

这说明不是单纯的四舍五入问题，而是**字段源错位 / 展示字段串位 / 回退值污染**。

---

## 二、修改范围与职责

### 需要修改的文件

- 修改：`/Users/davis/zisha-ecommerce/src/app/api/quick-order/route.ts`
  - 清理 fake `order_id`
  - 统一 quick-order 初始化数据来源
  - 优惠券可用性与订单金额关系对齐

- 修改：`/Users/davis/zisha-ecommerce/src/app/quick-order/page.tsx`
  - 去掉价格硬编码兜底
  - 补全 `order_number` 刷新分支
  - 所有 calculate / inventory / create 错误显式反馈
  - 页面只消费统一返回字段

- 修改：`/Users/davis/zisha-ecommerce/src/app/api/quick-order/calculate/route.ts`
  - 明确约束真实 `order_id`
  - 返回统一且完整的价格字段
  - 失败时返回清晰错误码

- 修改：`/Users/davis/zisha-ecommerce/src/app/api/quick-order/create/route.ts`
  - 明确提交前置条件
  - 与页面提交行为保持一致

- 修改：`/Users/davis/zisha-ecommerce/src/lib/order-pricing-service.ts`
  - 保持订单金额唯一真相
  - 调整优惠券状态流转，避免支付前直接 `used`

- 修改：`/Users/davis/zisha-ecommerce/src/app/api/payments/paypal/route.ts`
  - 改成只接 `order_number`
  - 改用 `getPaymentOrderData(order_number, 'paypal')`
  - 移除前端金额校验与本地重算

- 参考但尽量少改：`/Users/davis/zisha-ecommerce/src/lib/payment/order-data-service.ts`
  - 如有必要，仅补充 PayPal 所需字段映射

### 需要验证的关联文件

- 验证：`/Users/davis/zisha-ecommerce/src/app/api/payments/alipay/route.ts`
- 验证：`/Users/davis/zisha-ecommerce/src/app/api/payments/stripe/route.ts`
- 验证：`/Users/davis/zisha-ecommerce/src/app/api/quick-order/inventory/route.ts`

---

## 三、实施任务

### 任务 1：建立 quick-order 自查回归脚本

**文件：**
- 创建：`/tmp/quick_order_root_cause_check.ts`
- 测试：本地 `node` / `tsx` 脚本

- [ ] **步骤 1：写失败脚本，覆盖当前 3 类问题场景**

```ts
import assert from 'node:assert';

const scenarios = [
  'product_id 进入 quick-order 时必须拿到真实 order_id 或明确报错',
  '切换 coupon_ids 后 total_usd 必须发生变化',
  '提交订单后 PayPal 只能使用 order_number 从 DB 读取金额',
];

for (const scenario of scenarios) {
  assert.ok(scenario.length > 0);
}
```

- [ ] **步骤 2：运行脚本确认当前行为无法满足要求**

运行：
```bash
node /tmp/quick_order_root_cause_check.ts
```

预期：
- 需要补充真实接口断言后，当前实现会失败或暴露结构不一致

- [ ] **步骤 3：把脚本扩展为读取关键文件的结构检查**

```ts
import fs from 'node:fs';

const quickOrderRoute = fs.readFileSync('/Users/davis/zisha-ecommerce/src/app/api/quick-order/route.ts', 'utf8');
const paypalRoute = fs.readFileSync('/Users/davis/zisha-ecommerce/src/app/api/payments/paypal/route.ts', 'utf8');

if (quickOrderRoute.includes('order_id: product.id')) {
  throw new Error('quick-order 初始化仍在伪造 order_id');
}

if (paypalRoute.includes('const { amount, currency = \'USD\', items, order_number')) {
  throw new Error('PayPal 仍在依赖前端 amount/items');
}
```

- [ ] **步骤 4：再次运行脚本，确认旧实现先失败**

运行：
```bash
node /tmp/quick_order_root_cause_check.ts
```

预期：FAIL，并明确提示哪一段旧逻辑仍存在。

- [ ] **步骤 5：Commit**

```bash
git add /tmp/quick_order_root_cause_check.ts
git commit -m "test: add quick-order root cause checks"
```

### 任务 2：修正 quick-order 初始化入口与订单 ID 真相

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/app/api/quick-order/route.ts`
- 修改：`/Users/davis/zisha-ecommerce/src/app/quick-order/page.tsx`

- [ ] **步骤 1：先写一个最小断言，禁止 `product.id` 冒充 `order_id`**

```ts
if (mode === 'product-preview') {
  return NextResponse.json({
    success: false,
    error: 'ORDER_CONTEXT_REQUIRED'
  }, { status: 400 });
}
```

- [ ] **步骤 2：页面提交前如果没有真实 DB 订单 ID，必须明确提示且不进入支付流程**

```ts
if (!currentOrderDbId) {
  setError('当前订单上下文无效，请从商品详情页重新发起立即购买');
  setIsCreating(false);
  return;
}
```

- [ ] **步骤 3：统一 quick-order 初始加载只接受真实订单上下文**

```ts
const orderNumber = searchParams.get('order_number');
if (!orderNumber) {
  setError('缺少订单号，请从商品详情页重新下单');
  setIsLoading(false);
  return;
}
```

- [ ] **步骤 4：运行页面链路验证，确认 calculate/create 拿到的都是 `orders.id`**

运行：
```bash
curl -I http://localhost:3000
```

并手动验证：
- 只能从真实 pending 订单进入 quick-order
- 页面中的 `currentOrderDbId` 对应真实 `orders.id`

- [ ] **步骤 5：Commit**

```bash
git add src/app/api/quick-order/route.ts src/app/quick-order/page.tsx
git commit -m "fix: require real quick-order order context"
```

### 任务 3：统一 quick-order 页面价格字段来源

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/app/quick-order/page.tsx`
- 修改：`/Users/davis/zisha-ecommerce/src/app/api/quick-order/calculate/route.ts`

- [ ] **步骤 1：删除页面中的业务金额硬编码兜底**

```ts
setPriceData({
  original_subtotal: d.original_subtotal_usd ?? 0,
  subtotal: d.subtotal_usd ?? 0,
  original_price: d.original_subtotal_usd ?? 0,
  product_discount: d.product_discount_usd ?? 0,
  coupon_discount: d.coupon_discount_usd ?? 0,
  shipping_fee: d.shipping_fee_usd ?? 0,
  total_usd: d.total_usd ?? 0,
  total_cny: d.total_cny ?? 0,
  total_aed: d.total_aed ?? 0,
  coupon: d.coupon,
  promotions: d.product_promotions || []
});
```

- [ ] **步骤 2：calculate 接口返回页面所需的完整字段，不让页面再猜字段名**

```ts
return NextResponse.json({
  success: true,
  data: {
    original_subtotal_usd: pricing.original_total,
    subtotal_usd: pricing.subtotal,
    product_discount_usd: pricing.product_discount,
    coupon_discount_usd: pricing.coupon_discount,
    shipping_fee_usd: pricing.shipping_fee,
    total_usd: pricing.total_usd,
    total_cny: pricing.total_cny,
    total_aed: pricing.total_aed,
    coupon: couponIds.length ? {
      ids: couponIds,
      discount: pricing.coupon_discount,
      details: pricing.coupon_details,
    } : undefined,
    product_promotions: promotions,
  }
});
```

- [ ] **步骤 3：页面价格明细只按以下公式展示**

```ts
商品总价 = original_subtotal
促销后小计 = subtotal
券后小计 = subtotal - coupon_discount
合计 = subtotal - coupon_discount + shipping_fee
```

- [ ] **步骤 4：写回归检查，验证用户给出的示例不再出现字段串位**

```ts
const original = 506.82;
const productDiscount = 25.34;
const subtotal = 481.48;
const couponDiscount = 0;
const shipping = 0;
const total = 481.48;
```

- [ ] **步骤 5：Commit**

```bash
git add src/app/quick-order/page.tsx src/app/api/quick-order/calculate/route.ts
git commit -m "fix: align quick-order price detail fields"
```

### 任务 4：收口 quick-order 初始化价格逻辑

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/app/api/quick-order/route.ts`
- 参考：`/Users/davis/zisha-ecommerce/src/lib/order-pricing-service.ts`

- [ ] **步骤 1：删除 quick-order 初始化接口中重复促销算法的主导地位**

```ts
// 不再把 calculateProductPrice 作为最终金额真相
// 初始化接口只返回基础商品信息与订单上下文
```

- [ ] **步骤 2：如必须展示初始价格，统一使用真实订单上下文 + calculateOrderPricing**

```ts
const pricing = await calculateOrderPricing({
  orderId: order.id,
  userId,
  addressId: defaultAddressId,
  couponIds: [],
});
```

- [ ] **步骤 3：确认初始化、calculate、create 三处看到的金额来自同一服务**

运行：
```bash
npx tsc --noEmit
```

预期：PASS

- [ ] **步骤 4：Commit**

```bash
git add src/app/api/quick-order/route.ts src/lib/order-pricing-service.ts
git commit -m "refactor: unify quick-order initial pricing source"
```

### 任务 5：修复优惠券刷新与状态流转

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/app/quick-order/page.tsx`
- 修改：`/Users/davis/zisha-ecommerce/src/app/api/quick-order/route.ts`
- 修改：`/Users/davis/zisha-ecommerce/src/lib/order-pricing-service.ts`

- [ ] **步骤 1：领取优惠券后刷新逻辑补齐 `order_number` 分支**

```ts
const orderId = searchParams.get('order_id');
const orderNumber = searchParams.get('order_number');
const productId = searchParams.get('product_id');

if (orderNumber) {
  url += `order_number=${orderNumber}`;
} else if (orderId) {
  url += `order_id=${orderId}`;
} else {
  url += `product_id=${productId}&quantity=${qty}`;
}
```

- [ ] **步骤 2：优惠券列表查询按当前订单金额过滤可用券**

```ts
async function getUserCoupons(userId: string, orderAmount: number) {
  // 结合最小使用门槛、有效期、状态过滤
}
```

- [ ] **步骤 3：提交订单时不要直接把券改成最终 `used`，改成“已应用/已锁定”语义**

```ts
UPDATE user_coupons
SET status = 'active'
```

或在现有状态机不扩表的前提下：
```ts
// pending 阶段只写 order_coupons，不动 user_coupons.status = 'used'
```

- [ ] **步骤 4：支付取消 / 订单取消 / 超时取消时验证优惠券会正确回到可用态**

运行：
```bash
npx tsc --noEmit
```

并手动验证：
- 选择优惠券后价格立即变化
- 取消支付后优惠券仍可再次使用

- [ ] **步骤 5：Commit**

```bash
git add src/app/quick-order/page.tsx src/app/api/quick-order/route.ts src/lib/order-pricing-service.ts
git commit -m "fix: refresh and preserve quick-order coupons correctly"
```

### 任务 6：把 PayPal 改回统一支付架构

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/app/api/payments/paypal/route.ts`
- 参考：`/Users/davis/zisha-ecommerce/src/lib/payment/order-data-service.ts`
- 参考：`/Users/davis/zisha-ecommerce/src/app/api/payments/alipay/route.ts`
- 参考：`/Users/davis/zisha-ecommerce/src/app/api/payments/stripe/route.ts`

- [ ] **步骤 1：写失败断言，禁止 PayPal 接收前端金额与 items**

```ts
interface PayPalRequestBody {
  order_number: string;
  source?: string;
}
```

- [ ] **步骤 2：在 PayPal 路由中接入统一订单读取服务**

```ts
const { order_number, source = 'cart' } = body;
const orderData = await getPaymentOrderData(order_number, 'paypal');
```

- [ ] **步骤 3：基于 DB 中的订单金额和订单商品构建 PayPal purchase_units**

```ts
const verifiedAmount = orderData.finalAmount;
const itemTotal = orderData.itemTotal;
const shippingFee = orderData.shippingFee;
```

- [ ] **步骤 4：删除旧的 `verifyPrices()` 与 `calculateItemPrice()` 参与主流程**

```ts
// 不再验证前端 items
// 不再使用前端 amount
```

- [ ] **步骤 5：验证 PayPal / Alipay / Stripe 三通道都只吃 `order_number`**

运行：
```bash
npx tsc --noEmit
```

预期：PASS

- [ ] **步骤 6：Commit**

```bash
git add src/app/api/payments/paypal/route.ts
git commit -m "refactor: make paypal use unified order payment data"
```

### 任务 7：补齐前端错误可见性，解决“没反应”感知

**文件：**
- 修改：`/Users/davis/zisha-ecommerce/src/app/quick-order/page.tsx`

- [ ] **步骤 1：calculate 失败时把后端错误展示给用户**

```ts
if (!response.ok || !data.success) {
  setError(data.error || '价格计算失败，请刷新重试');
  return;
}
```

- [ ] **步骤 2：inventory 加减失败时展示具体原因**

```ts
if (!data.success) {
  setError(data.error || '库存调整失败');
  return;
}
```

- [ ] **步骤 3：create 失败时保留原错误信息，不要只显示模糊提示**

```ts
setError(updateData.message || updateData.error || '订单更新失败');
```

- [ ] **步骤 4：提交按钮的禁用原因要和页面提示一致**

```ts
disabled={!selectedAddressId || isCreating || isCalculating || !currentOrderDbId}
```

- [ ] **步骤 5：Commit**

```bash
git add src/app/quick-order/page.tsx
git commit -m "fix: surface quick-order request errors to users"
```

### 任务 8：最终验证

**文件：**
- 验证：`/Users/davis/zisha-ecommerce/src/app/quick-order/page.tsx`
- 验证：`/Users/davis/zisha-ecommerce/src/app/api/quick-order/*.ts`
- 验证：`/Users/davis/zisha-ecommerce/src/app/api/payments/*.ts`
- 验证：`/Users/davis/zisha-ecommerce/src/lib/order-pricing-service.ts`

- [ ] **步骤 1：运行 TypeScript 校验**

运行：
```bash
npx tsc --noEmit
```

预期：PASS

- [ ] **步骤 2：运行项目 lint**

运行：
```bash
npm run lint
```

预期：
- 与本次改动相关文件无新增错误
- 如有历史遗留错误，单独记录，不和本次逻辑问题混淆

- [ ] **步骤 3：真实回归 quick-order 三个场景**

场景 A：无优惠券
- 从真实 pending 订单进入 quick-order
- 检查「商品总价 / 促销后小计 / 运费 / 合计」公式正确

场景 B：选择优惠券
- 勾选单张券
- 检查「优惠券优惠 / 券后小计 / 合计」立即变化

场景 C：提交到 PayPal 再取消
- 点击提交订单
- 跳转 PayPal
- 取消返回
- 检查订单金额仍正确、优惠券未丢失、页面可继续支付或取消订单

- [ ] **步骤 4：记录验证结果**

```md
- 价格明细正确
- 优惠券切换生效
- 提交订单会正确跳转支付
- PayPal 取消返回后订单和优惠券状态正确
```

- [ ] **步骤 5：Commit**

```bash
git add .
git commit -m "test: verify quick-order pricing and payment flow"
```

---

## 四、自检结论

### 规格覆盖度

本计划已覆盖：
- 价格明细完全错误
- 选择优惠券价格不变化
- 提交订单没反应
- PayPal 与统一支付架构不一致
- 优惠券状态流转过早
- quick-order 入口订单上下文不真实

### 关键原则

- 不新增无必要文件到项目内
- 优先修改现有文件
- 不做数据库写操作方案之外的额外动作
- 先统一真相，再修 UI 表现
- 先修根因，不做症状级补丁

### 实施顺序建议

严格按以下顺序执行：
1. 订单上下文真相
2. 页面价格字段真相
3. 优惠券刷新与状态流转
4. PayPal 支付架构收口
5. 错误提示与最终回归
