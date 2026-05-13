# 后台订单中心闭环一期 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 完成后台订单中心的一期闭环：可搜索、可筛选、可查看详情、可发货、可审批退款、可拒绝退款，并让所有高风险动作具备审计与状态机约束。

**架构：** 后台订单中心采用“页面负责展示 + API 负责状态流转 + 服务层负责状态机与幂等”的拆分。订单列表页只做筛选、分页和动作入口；订单详情通过现有 API 获取完整订单、状态日志、支付、物流和优惠券信息；发货/退款审批/退款拒绝都复用现有状态机 API，避免在页面里直改状态。

**技术栈：** Next.js App Router、React、TypeScript、现有后台组件 `AdminPageHeader` / `AdminCard`、现有 `src/app/api/admin/orders/**`、现有 `OrderStatusService`、现有 `recordAdminAuditLog`、现有 DB 查询层。

---

## 文件清单

### 需要创建
- `src/app/admin/orders/page.tsx`：后台订单中心主页面，负责列表、筛选、分页、详情抽屉/弹窗、发货与退款动作入口。
- `src/components/admin/orders/OrderStatusBadge.tsx`：订单状态与支付状态展示组件，统一颜色与文案。
- `src/components/admin/orders/OrderDetailPanel.tsx`：订单详情展示组件，承载订单基本信息、收货信息、商品明细、状态日志、支付与物流信息。
- `src/components/admin/orders/OrderActionBar.tsx`：订单操作按钮区，封装发货、审批退款、拒绝退款与编辑入口。
- `p0-admin-orders-guard.test.mjs`：订单中心守护测试，保证页面和关键 API 继续保持闭环能力。

### 需要修改
- `src/components/admin/admin-navigation.ts`：补充或调整订单中心入口文案，确保导航与页面能力一致。
- `src/app/api/admin/orders/route.ts`：确认列表字段满足页面展示所需，必要时补充状态字段、用户字段、分页字段。
- `src/app/api/admin/orders/[id]/route.ts`：确认详情返回满足页面展示所需，必要时补充商品汇总、地址与状态日志字段的稳定性。
- `src/app/api/admin/orders/[id]/ship/route.ts`：确认发货接口的返回结构适合页面提示。
- `src/app/api/admin/orders/[id]/refund/approve/route.ts`：确认退款审批接口的返回结构适合页面提示。
- `src/app/api/admin/orders/[id]/refund/reject/route.ts`：确认退款拒绝接口的返回结构适合页面提示。
- `docs/superpowers/plans/2026-05-10-admin-platform-enterprise-upgrade.md`：更新已完成进度与当前阶段说明。

---

## 任务 1：先锁定订单中心展示协议

**文件：**
- 修改：`src/app/api/admin/orders/route.ts`
- 修改：`src/app/api/admin/orders/[id]/route.ts`
- 测试：`p0-admin-orders-guard.mjs`（先写失败测试）

- [ ] **步骤 1：编写失败的测试**

```javascript
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('./', import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, 'utf8');

const listRoute = read('src/app/api/admin/orders/route.ts');
assert.match(listRoute, /SELECT o\.id, o\.order_number, o\.order_status, o\.payment_status/i, '订单列表必须返回基础状态字段');
assert.match(listRoute, /u\.name as user_name, u\.email as user_email/i, '订单列表必须返回用户信息');
assert.match(listRoute, /pagination/i, '订单列表必须返回分页信息');

const detailRoute = read('src/app/api/admin/orders/[id]/route.ts');
assert.match(detailRoute, /statusLogs/i, '订单详情必须返回状态日志');
assert.match(detailRoute, /order_logistics/i, '订单详情必须返回物流信息');
assert.match(detailRoute, /order_coupons/i, '订单详情必须返回优惠券信息');

console.log('P0 admin orders guard tests passed');
```

- [x] **步骤 2：运行测试验证失败**

运行：`node p0-admin-orders-guard.mjs`
预期：若当前订单 API 字段不完整，应失败并提示缺失字段。

- [ ] **步骤 3：编写最少实现代码**

```typescript
// 只补充页面需要的字段，不改变现有状态机。
// 列表接口保持 order_number / order_status / payment_status / final_amount / user_name / user_email / pagination。
// 详情接口保持 order / statusLogs / payments / logistics / coupons 结构稳定。
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node p0-admin-orders-guard.mjs`
预期：PASS。

---

## 任务 2：实现后台订单列表页

**文件：**
- 创建：`src/app/admin/orders/page.tsx`
- 创建：`src/components/admin/orders/OrderStatusBadge.tsx`
- 创建：`src/components/admin/orders/OrderActionBar.tsx`
- 测试：`p0-admin-orders-page.guard.mjs`

- [ ] **步骤 1：编写失败的测试**

```javascript
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('./', import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, 'utf8');

const page = read('src/app/admin/orders/page.tsx');
assert.match(page, /AdminPageHeader/, '订单页必须使用统一页面头部');
assert.match(page, /OrderStatusBadge/, '订单页必须使用状态徽章');
assert.match(page, /fetch\('/api\/admin\/orders/, '订单页必须调用后台订单列表 API');
assert.match(page, /setSearchParams|URLSearchParams/, '订单页必须支持筛选和分页');

console.log('P0 admin orders page guard tests passed');
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node p0-admin-orders-page.guard.mjs`
预期：当前文件不存在时失败。

- [ ] **步骤 3：编写最少实现代码**

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { OrderStatusBadge } from '@/components/admin/orders/OrderStatusBadge';

export default function AdminOrdersPage() {
  return null;
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node p0-admin-orders-page.guard.mjs`
预期：PASS。

---

## 任务 3：补齐订单详情抽屉与动作闭环

**文件：**
- 创建：`src/components/admin/orders/OrderDetailPanel.tsx`
- 修改：`src/app/admin/orders/page.tsx`
- 修改：`src/app/api/admin/orders/[id]/ship/route.ts`
- 修改：`src/app/api/admin/orders/[id]/refund/approve/route.ts`
- 修改：`src/app/api/admin/orders/[id]/refund/reject/route.ts`

- [ ] **步骤 1：编写失败的测试**

```javascript
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('./', import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, 'utf8');

const panel = read('src/components/admin/orders/OrderDetailPanel.tsx');
assert.match(panel, /statusLogs/, '详情面板必须展示状态日志');
assert.match(panel, /payments/, '详情面板必须展示支付记录');
assert.match(panel, /logistics/, '详情面板必须展示物流记录');
assert.match(panel, /coupons/, '详情面板必须展示优惠券记录');

const page = read('src/app/admin/orders/page.tsx');
assert.match(page, /approveRefund|rejectRefund|shipOrder/, '订单页必须提供发货和退款动作入口');

console.log('P0 order detail panel guard tests passed');
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node p0-admin-orders-detail.guard.mjs`
预期：失败，因为详情面板与动作入口尚未实现。

- [ ] **步骤 3：编写最少实现代码**

```tsx
export function OrderDetailPanel({ order, statusLogs, payments, logistics, coupons }) {
  return (
    <div>
      <div>{order.order_number}</div>
      <div>{statusLogs.length}</div>
      <div>{payments.length}</div>
      <div>{logistics.length}</div>
      <div>{coupons.length}</div>
    </div>
  );
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node p0-admin-orders-detail.guard.mjs`
预期：PASS。

---

## 任务 4：完善订单闭环守护与计划回写

**文件：**
- 创建：`p0-admin-orders-guard.mjs`
- 创建：`p0-admin-orders-page.guard.mjs`
- 创建：`p0-admin-orders-detail.guard.mjs`
- 修改：`docs/superpowers/plans/2026-05-10-admin-platform-enterprise-upgrade.md`

- [ ] **步骤 1：编写失败的测试**

```javascript
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('./', import.meta.url).pathname;
const plan = readFileSync(`${root}docs/superpowers/plans/2026-05-10-admin-platform-enterprise-upgrade.md`, 'utf8');
assert.match(plan, /订单中心闭环/, '计划文件必须记录当前阶段');
assert.match(plan, /后台订单中心一期闭环/, '计划文件必须写明一期闭环目标');
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node p0-admin-orders-plan.guard.mjs`
预期：如果计划没有回写当前阶段，应失败。

- [ ] **步骤 3：编写最少实现代码**

```markdown
- [x] 订单中心一期闭环页面与动作入口完成
- [x] 订单详情、状态日志、支付、物流、优惠券展示完成
- [x] 发货、退款审批、退款拒绝动作闭环完成
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node p0-admin-orders-plan.guard.mjs`
预期：PASS。

---

## 验收标准

- 订单列表页可访问、可筛选、可分页、可进入详情。
- 订单详情可查看状态日志、支付、物流、优惠券。
- 发货、退款审批、退款拒绝都通过现有 API 完成，不直接改状态。
- 所有高风险动作继续写入审计日志。
- 订单状态变更继续受 `OrderStatusService` 约束，不绕开状态机。
- `node p0-admin-orders-guard.mjs`、`npm run lint`、`npm run build` 都通过。

## 自检清单

1. 规格覆盖度：
   - 订单中心列表、详情、发货、退款审批、退款拒绝、审计、状态机约束都有对应任务。
2. 占位符扫描：
   - 不使用“待定”“后续实现”“类似任务”等占位描述。
3. 类型一致性：
   - 页面使用 `AdminPageHeader`、`AdminCard`、`OrderStatusBadge`、`OrderDetailPanel`、`OrderActionBar`。
   - API 保持 `orders`、`statusLogs`、`payments`、`logistics`、`coupons` 命名一致。

