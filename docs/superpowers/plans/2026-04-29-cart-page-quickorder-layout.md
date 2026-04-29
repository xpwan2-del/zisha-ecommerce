# 购物车页对齐 Quick-Order 布局 + 地址/优惠券/支付/下单 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：**
- 仅修改购物车页面 [cart/page.tsx](file:///Users/davis/zisha-ecommerce/src/app/cart/page.tsx) 的页面结构与交互，使其布局顺序与 quick-order 一致：购物车列表 → 地址选择 → 优惠券选择 → 结算明细 → 提交订单/取消按钮。
- “提交订单”直接调用后端创建订单接口（类似 quick-order 的提交方式），成功后进入支付（依据后台启用的支付方式，客户可选择）。

**架构：**
- 前端：将购物车页重排为纵向模块卡片布局（与 quick-order 同风格），在同一个页面内拉取地址、优惠券、支付方式并完成选择，最后提交订单。
- 后端：新增一个 cart 专用“创建订单”接口（不修改 quick-order），负责将“选中购物车项 + 地址 + 优惠券 + 支付方式”落单并返回支付所需数据。

**技术栈：**
- Next.js App Router（Route Handlers + Client Components）
- SQLite（`query`）
- 既有支付接口：`/api/payments/*`、`/api/payments/methods`

---

## 文件清单（变更边界）

**仅修改：**
- [cart/page.tsx](file:///Users/davis/zisha-ecommerce/src/app/cart/page.tsx)

**新增（为“提交订单”提供后端能力，不改现有逻辑/页面）：**
- `src/app/api/cart/create-order/route.ts`

---

## 任务 1：梳理 cart 页数据模型与模块拆分（仍在同一个文件内完成）

**文件：**
- 修改：[cart/page.tsx](file:///Users/davis/zisha-ecommerce/src/app/cart/page.tsx)

- [ ] **步骤 1：把页面主体改为纵向模块布局骨架**

目标 DOM 顺序（与 quick-order 一致）：
1. Cart Items 模块（购物车列表）
2. Shipping Address 模块（地址选择）
3. Coupons 模块（优惠券选择）
4. Summary 模块（结算明细：Subtotal / Shipping / Coupon Discount / Total）
5. Actions 模块（提交订单 / 取消）

实现方式：
- 将当前 “左列表 + 右侧栏” 的 grid 布局改为 `max-w-4xl mx-auto space-y-6` 的纵向排列（参考 quick-order 的多卡片结构）。
- 每个模块使用相同的卡片结构：
  - 外层：`bg-[var(--card)]/80 rounded-lg shadow-md border border-[var(--border)] overflow-hidden`
  - Header：`px-6 py-4 border-b border-[var(--border)]` + 标题
  - Body：`p-6`

- [ ] **步骤 2：把“优惠券面板”从 Summary 内部拆成独立模块**

说明：
- 当前优惠券 UI 已写在 Summary 区块内部，需要挪到独立模块（不改变逻辑，只移动渲染位置与少量样式）。

- [ ] **步骤 3：把“Coupon Discount / Total after coupon”从优惠券模块挪回 Summary 模块**

说明：
- 优惠券模块只负责“选择”，Summary 模块负责“展示金额变化”。

---

## 任务 2：在 cart 页实现 quick-order 同款“地址选择”模块（页面内拉取 /api/addresses）

**文件：**
- 修改：[cart/page.tsx](file:///Users/davis/zisha-ecommerce/src/app/cart/page.tsx)

- [ ] **步骤 1：添加 Address 类型与 state**

在 cart 页添加与 quick-order 对齐的 Address 类型（字段名一致，便于复用同款 UI）：

```ts
interface Address {
  id: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  is_default: number;
}
```

添加 state：
```ts
const [addresses, setAddresses] = useState<Address[]>([]);
const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
```

- [ ] **步骤 2：实现 fetchAddresses（仅在登录后执行）**

用 `/api/addresses` 拉取数据，并 map 为 quick-order Address 结构：
- `name <- contact_name`
- `address <- street_address`（或拼上 street_address_2）
- `country <- country_name`
- `is_default <- is_default ? 1 : 0`

默认选中规则对齐 quick-order：
- 有默认地址选默认
- 否则选第一条

- [ ] **步骤 3：渲染地址选择 UI（样式/交互参照 quick-order）**

渲染逻辑参照 quick-order 的地址卡片列表：
- 没地址：按钮跳转 `/addresses/new?redirect=/cart`
- 有地址：点击卡片设置 `selectedAddressId`

参考样式实现片段（直接搬 quick-order 的结构）：
- 选中态：`border-[var(--accent)] bg-[var(--accent)]/5`
- 未选中：`border-[var(--border)] hover:border-[var(--accent)]/40`

---

## 任务 3：在 cart 页实现“支付方式选择”（来源为后台配置 /api/payments/methods）

**文件：**
- 修改：[cart/page.tsx](file:///Users/davis/zisha-ecommerce/src/app/cart/page.tsx)

- [ ] **步骤 1：添加 PaymentMethod 类型与 state**

```ts
interface PaymentMethod {
  code: string;
  name: string;
  isSandbox: boolean;
  isEnabled: boolean;
}
```

state：
```ts
const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
```

- [ ] **步骤 2：实现 fetchPaymentMethods**

调用 `/api/payments/methods`，过滤 `isEnabled === true` 作为可选列表。

默认选中：
- 如果当前 `selectedPaymentMethod` 为空，默认选第一条 enabled 的 method。

- [ ] **步骤 3：渲染支付方式选择模块**

UI 结构参照 quick-order 的支付方式选择（radio 卡片）。

注意事项（与现有支付接口匹配）：
- paypal：使用 USD 金额走 `/api/payments/paypal`（需要 items 列表）
- alipay：使用 CNY 金额走 `/api/payments/alipay`
- stripe：现有 `/api/payments/stripe` 服务端价格校验依赖 `products.price`，若后台启用 stripe，可能在当前数据库结构下失败；如需支持则必须允许修复该接口（此项不在“仅改 cart 页”范围内，需额外确认）

---

## 任务 4：新增“购物车创建订单”后端接口（类似 quick-order 的提交，但面向 cart 多商品）

**文件：**
- 创建：`src/app/api/cart/create-order/route.ts`

### 4.1 接口定义

- Method：POST `/api/cart/create-order`
- 入参：
```json
{
  "cart_item_ids": [1,2,3],
  "address_id": 10,
  "coupon_ids": [15,16],
  "payment_method": "paypal"
}
```

- 出参（供前端发起支付）：
```json
{
  "success": true,
  "data": {
    "order_id": 123,
    "order_number": "ORD....",
    "payment_method": "paypal",
    "amount_usd": 123.45,
    "amount_cny": 888.88,
    "amount_aed": 456.78,
    "items": [
      { "product_id": 1, "name": "xxx", "image": "/...", "price_usd": 12.34, "quantity": 2 }
    ]
  }
}
```

### 4.2 核心业务逻辑（对齐 quick-order）

- [ ] **步骤 1：鉴权 + 参数校验**
- [ ] **步骤 2：查询地址并计算运费**
  - 复制 quick-order 的 `calculateShipping(city)` 逻辑（从 `shipping_rates` 查城市费率 → default → 0）
- [ ] **步骤 3：读取并校验 cart items（必须属于当前用户）**
  - 根据 `cart_item_ids` 查询 `cart_items`，并 join `products`/`inventory`/`product_prices`/`product_promotions` 得到：
    - `price_usd/price_cny/price_aed`
    - 促销列表（用于计算 final_price_*）
  - 库存校验：每个 item.quantity <= inventory.quantity（不足直接返回错误）
- [ ] **步骤 4：计算商品促销后的小计（三币种）**
  - 促销计算规则沿用现有购物车：独占优先，否则叠加 multiplier（与 PayPal 价格校验逻辑保持一致）
  - 得到 `subtotal_usd/subtotal_cny/subtotal_aed`
- [ ] **步骤 5：应用优惠券（完全照搬 quick-order create 的优惠券使用方式）**
  - 复用 quick-order/create 的 `applyCouponDiscount(couponId, userId, subtotal)`，对每个 `couponId` 逐个累加 discount
  - 将 coupon 的使用记录写入：
    - `orders.coupon_ids`（JSON 字符串）
    - `orders.total_coupon_discount`
    - `user_coupons.status = 'used'`
    - `order_coupons` 插入 applied 记录
  - 三币种折扣显示规则与现有 cart coupon calculate 保持一致：`coupon_discount_usd/cny/aed` 使用同一 discount 数值（不做换算，确保“逻辑照搬”一致）
- [ ] **步骤 6：创建订单 + 写入订单项 + 扣库存（复制 /api/orders 的事务与库存扣减方式）**
  - `BEGIN TRANSACTION`
  - `INSERT INTO orders(...)`（payment_method、shipping_address_id、shipping_fee、total_amount、final_amount、order_final_discount_amount 等字段）
  - 循环写 `order_items`：
    - `price` / `original_price` 建议写入 AED 口径（与 orders 表一致）
    - `promotion_ids`（JSON）
    - `discount_amount`
  - 参照 [/api/orders](file:///Users/davis/zisha-ecommerce/src/app/api/orders/route.ts#L261-L364) 的库存 optimistic lock 扣减与流水写入
  - 从 `cart_items` 删除已下单项（避免重复下单）
  - `COMMIT`

---

## 任务 5：cart 页实现“提交订单/取消”按钮区 + 支付跳转

**文件：**
- 修改：[cart/page.tsx](file:///Users/davis/zisha-ecommerce/src/app/cart/page.tsx)

- [ ] **步骤 1：实现 handleSubmitOrder**

校验条件：
- `selectedItems.length > 0`
- `selectedAddressId != null`
- `selectedPaymentMethod != null`

流程（对齐 quick-order handleCreateOrder）：
1. POST `/api/cart/create-order`
2. 根据 `selectedPaymentMethod` 调起支付接口并跳转：
   - paypal：POST `/api/payments/paypal`，body：
     ```json
     {
       "order_number": "...",
       "amount": "xx.xx",
       "currency": "USD",
       "items": [{ "product_id": 1, "name": "...", "price": 12.34, "quantity": 2, "image": "/..." }]
     }
     ```
     成功：`window.location.href = data.data.redirect_url`
   - alipay：POST `/api/payments/alipay`，body：
     ```json
     { "order_number": "...", "amount": "xx.xx", "currency": "CNY" }
     ```
     成功：`window.location.href = data.data.payment_url`
   - stripe：POST `/api/payments/stripe`（若后台启用且可用），成功：跳转 `data.data.redirect_url`

- [ ] **步骤 2：实现 handleCancel**

`router.back()`

- [ ] **步骤 3：按钮区 UI（提交/取消）**

放在页面最底部一个卡片或固定区域内，参照 quick-order 的按钮风格：
- 提交按钮 disabled 状态：缺地址/缺商品/提交中
- 取消按钮：永远可点

---

## 任务 6：验证清单（必须可复现）

- [ ] **步骤 1：API 冒烟**
运行：
```bash
curl -sS http://localhost:3000/api/cart/coupons | cat
curl -sS http://localhost:3000/api/payments/methods | cat
```

- [ ] **步骤 2：前端交互验证**
1. 打开 `/cart`
2. 选中商品 → 地址选择 → 选择优惠券 → 选择支付方式
3. 点击“提交订单”：
   - 创建订单成功
   - 进入对应支付跳转链接
4. 点击“取消”：
   - 触发 `router.back()`

- [ ] **步骤 3：构建验证**
运行：
```bash
npm run build
```
预期：`✓ Compiled successfully`

---

## 执行交接

计划已完成并保存到：
- [2026-04-29-cart-page-quickorder-layout.md](file:///Users/davis/zisha-ecommerce/docs/superpowers/plans/2026-04-29-cart-page-quickorder-layout.md)

两种执行方式：
1. 子代理驱动（推荐）— 使用 superpowers:subagent-driven-development
2. 当前会话内联执行 — 使用 superpowers:executing-plans

选哪种方式执行？

