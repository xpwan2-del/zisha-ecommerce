# 订单与商品评价内嵌交互改造 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将订单评价、商品回复、商品追评全部从弹窗改为页面内嵌展开式交互，并支持订单列表点击后精确跳转到对应商品评价区。

**架构：** 订单列表只负责“入口跳转”，订单详情页负责“定位并展开评价表单”，商品详情页负责“在对应评价下方展开回复/追评表单”。评价能力抽成可复用的内嵌组件，统一管理星级、文本、图片上传、提交状态与回调，避免在页面中重复堆叠弹窗逻辑。

**技术栈：** Next.js App Router、React Hooks、TypeScript、`next/image`、现有 `/api/reviews/*` 接口、现有 `/api/orders/[id]` 订单详情数据。

---

## 文件职责

- 创建：`src/components/reviews/InlineReviewForm.tsx`
  - 订单商品评价内嵌表单，负责星级、内容、图片上传、提交、取消、回调。
- 创建：`src/components/reviews/InlineReviewReplyForm.tsx`
  - 商品评价回复内嵌表单，负责回复内容、提交、取消、回调。
- 创建：`src/components/reviews/InlineReviewFollowUpForm.tsx`
  - 商品评价追评内嵌表单，负责追评内容、图片上传、提交、取消、回调。
- 创建：`src/components/reviews/ReviewImageUploader.tsx`
  - 复用的图片上传与预览区，给评价与追评表单共用。
- 修改：`src/app/orders/[id]/page.tsx`
  - 去掉弹窗评价逻辑，改成 query 驱动的商品下方内嵌评价区；保留 `order_item_id` 精确定位与自动滚动。
- 修改：`src/app/products/[id]/page.tsx`
  - 去掉回复/追评弹窗，改成每条评价下方的内嵌展开区；支持一次只打开一个表单。
- 修改：`src/app/account/page.tsx`
  - 将“去评价”入口统一跳转到订单详情页并带 `review_item` 参数，避免在账户页直接承载评价表单。
- 修改：`review-interaction.guard.test.mjs`
  - 调整守护测试，改为校验内嵌展开结构与跳转定位，而不是弹窗字符串。
- 修改：`review-system.guard.test.mjs`
  - 如有必要，补充对订单列表入口与内嵌评价区的断言。

---

### 任务 1：抽出可复用的内嵌评价组件

**文件：**
- 创建：`src/components/reviews/ReviewImageUploader.tsx`
- 创建：`src/components/reviews/InlineReviewForm.tsx`
- 创建：`src/components/reviews/InlineReviewReplyForm.tsx`
- 创建：`src/components/reviews/InlineReviewFollowUpForm.tsx`

- [ ] **步骤 1：编写失败的测试**

```ts
// 断言评价组件在内嵌模式下存在星级、文本域、图片上传和提交按钮
// 断言回复/追评组件在内嵌模式下存在内容输入和提交按钮
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node review-interaction.guard.test.mjs`
预期：失败，提示当前仍存在弹窗或未命中内嵌结构。

- [ ] **步骤 3：编写最少实现代码**

```tsx
type InlineReviewFormProps = {
  orderId: number;
  orderItemId: number;
  productId: number;
  productName?: string;
  onCancel: () => void;
  onSubmitted: () => void;
};
```

```tsx
export function ReviewImageUploader({ images, uploading, onChange, onRemove }) {
  return (
    <div>
      <input type="file" accept="image/*" multiple onChange={(e) => onChange(e.target.files)} />
      {uploading && <p>图片上传中...</p>}
      {images.length > 0 && images.map((image) => <button key={image} onClick={() => onRemove(image)}>×</button>)}
    </div>
  );
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node review-interaction.guard.test.mjs`
预期：通过，说明内嵌组件结构与交互入口已具备。

- [ ] **步骤 5：Commit**

```bash
git add src/components/reviews/ReviewImageUploader.tsx src/components/reviews/InlineReviewForm.tsx src/components/reviews/InlineReviewReplyForm.tsx src/components/reviews/InlineReviewFollowUpForm.tsx
git commit -m "feat: add inline review form components"
```

### 任务 2：改造订单详情页为 query 驱动的内嵌评价

**文件：**
- 修改：`src/app/orders/[id]/page.tsx`

- [ ] **步骤 1：编写失败的测试**

```ts
// 断言订单详情页读取 review_item 并自动展开对应商品下方的评价区
// 断言评价表单不再使用弹窗结构
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node review-interaction.guard.test.mjs`
预期：失败，提示仍存在弹窗或未检测到 query 定位逻辑。

- [ ] **步骤 3：编写最少实现代码**

```tsx
const reviewItemId = Number(searchParams.get('review_item')) || null;
const [activeReviewItemId, setActiveReviewItemId] = useState<number | null>(null);
```

```tsx
useEffect(() => {
  if (reviewItemId) {
    setActiveReviewItemId(reviewItemId);
    document.getElementById(`order-item-${reviewItemId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}, [reviewItemId, order?.items]);
```

```tsx
{activeReviewItemId === item.order_item_id && (
  <InlineReviewForm
    orderId={order.id}
    orderItemId={item.order_item_id}
    productId={item.product_id}
    productName={item.product_name}
    onCancel={() => setActiveReviewItemId(null)}
    onSubmitted={() => {
      setActiveReviewItemId(null);
      fetchOrder();
    }}
  />
)}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node review-interaction.guard.test.mjs`
预期：通过，订单详情页可根据 `review_item` 自动定位并展开评价。

- [ ] **步骤 5：Commit**

```bash
git add src/app/orders/[id]/page.tsx
git commit -m "feat: inline order review form"
```

### 任务 3：改造商品详情页为内嵌回复/追评

**文件：**
- 修改：`src/app/products/[id]/page.tsx`

- [ ] **步骤 1：编写失败的测试**

```ts
// 断言商品详情页在每条评价下方展示回复/追评入口
// 断言回复/追评表单在当前评价下方展开，不再使用弹窗
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node review-interaction.guard.test.mjs`
预期：失败，提示回复/追评仍是弹窗结构或未命中内嵌模式。

- [ ] **步骤 3：编写最少实现代码**

```tsx
const [activeReplyReviewId, setActiveReplyReviewId] = useState<number | null>(null);
const [activeFollowUpReviewId, setActiveFollowUpReviewId] = useState<number | null>(null);
```

```tsx
{activeReplyReviewId === review.id && (
  <InlineReviewReplyForm
    reviewId={review.id}
    onCancel={() => setActiveReplyReviewId(null)}
    onSubmitted={() => {
      setActiveReplyReviewId(null);
      fetchReviews();
    }}
  />
)}
```

```tsx
{activeFollowUpReviewId === review.id && (
  <InlineReviewFollowUpForm
    reviewId={review.id}
    onCancel={() => setActiveFollowUpReviewId(null)}
    onSubmitted={() => {
      setActiveFollowUpReviewId(null);
      fetchReviews();
    }}
  />
)}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node review-interaction.guard.test.mjs`
预期：通过，商品详情页回复/追评可在评价下方展开。

- [ ] **步骤 5：Commit**

```bash
git add src/app/products/[id]/page.tsx
git commit -m "feat: inline product review reply and follow-up"
```

### 任务 4：统一入口跳转与账户页评价入口

**文件：**
- 修改：`src/app/account/page.tsx`
- 修改：`src/app/orders/[id]/page.tsx` 中的按钮跳转逻辑

- [ ] **步骤 1：编写失败的测试**

```ts
// 断言“去评价”跳转到 /orders/[id]?review_item=[order_item_id]
// 断言账户页不再直接承载弹窗评价逻辑
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node review-system.guard.test.mjs`
预期：失败，提示账户页或订单入口仍未使用统一跳转结构。

- [ ] **步骤 3：编写最少实现代码**

```tsx
router.push(`/orders/${order.id}?review_item=${item.order_item_id}`);
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node review-system.guard.test.mjs`
预期：通过，入口跳转统一且不承载表单本体。

- [ ] **步骤 5：Commit**

```bash
git add src/app/account/page.tsx src/app/orders/[id]/page.tsx
git commit -m "feat: unify review entry navigation"
```

### 任务 5：验证与回归

**文件：**
- 修改：`review-interaction.guard.test.mjs`
- 修改：`review-system.guard.test.mjs`

- [ ] **步骤 1：编写失败的测试**

```js
// 校验订单详情页存在 review_item 定位逻辑
// 校验商品详情页存在内嵌回复/追评逻辑
// 校验评价组件不再包含弹窗选择器
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node review-interaction.guard.test.mjs && node review-system.guard.test.mjs`
预期：在改造完成前，至少一个断言失败。

- [ ] **步骤 3：编写最少实现代码**

```js
assert.match(orderPage, /review_item/,
  '订单详情页必须支持 review_item 定位');
assert.doesNotMatch(orderPage, /fixed inset-0 z-50/,
  '订单详情页评价必须不是弹窗');
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node review-interaction.guard.test.mjs && node review-system.guard.test.mjs && npm run lint && npm run build`
预期：全部通过，且 lint/build 无错误。

- [ ] **步骤 5：Commit**

```bash
git add review-interaction.guard.test.mjs review-system.guard.test.mjs
git commit -m "test: align review guards with inline review flow"
```

---

## 自检

1. **规格覆盖度：**
   - 订单列表入口跳转：任务 4
   - 订单详情页自动展开：任务 2
   - 多商品订单定位：任务 2
   - 图片上传与星级评分内嵌：任务 1、2
   - 商品详情页回复/追评内嵌：任务 3
   - 可复用封装：任务 1
   - 验证与回归：任务 5

2. **占位符扫描：**
   - 未使用“待定 / TODO / 后续实现”等占位词。
   - 每个测试步骤都给出了具体命令和可执行断言方向。

3. **类型一致性：**
   - 全部任务统一使用 `order_item_id` 作为订单商品定位键。
   - 商品详情页统一使用 `review.id` 作为回复/追评定位键。
   - 组件 props 统一采用 `orderId / orderItemId / productId` 与 `reviewId`。
