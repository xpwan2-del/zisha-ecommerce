# 管理后台库存商品支付补全实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 一次性补强库存中心后端闭环、商品中心后台完整度，并建立支付中心后台入口。

**架构：** 库存变更统一经过库存流水服务，商品后台继续复用现有管理 API，支付后台以现有支付配置 API 为核心，不改动前台支付创建主线。后台页面统一复用 AdminPageHeader、AdminCard、AdminTable、FilterBar、StatusBadge。

**技术栈：** Next.js App Router、React、TypeScript、SQLite 查询层、现有后台组件、Node 守护测试、npm lint/build。

---

## 文件结构

### 库存中心
- 修改：`src/lib/inventory-transactions.ts`，增加输入校验工具和交易类型白名单能力。
- 修改：`src/app/api/admin/inventory/adjust/route.ts`，加强调库参数校验、库存负数保护、审计日志。
- 修改：`src/app/api/inventory/checks/[id]/complete/route.ts`，检查盘点完成时是否严格写库存流水与审计日志。
- 修改：`src/app/api/inventory/alerts/[id]/resolve/route.ts`，处理预警时补充审计日志。

### 商品中心
- 修改：`src/app/admin/products/page.tsx`，增强商品运营中心 UI 与筛选视图。
- 修改：`src/app/api/admin/products/route.ts`，补强商品列表统计与筛选契约。
- 修改：`src/app/api/admin/products/[id]/route.ts`，补强商品编辑审计和库存流水一致性。

### 支付中心
- 创建：`src/app/admin/payments/page.tsx`，支付配置与通道健康中心。
- 创建：`src/app/admin/payments/orders/page.tsx`，支付订单/退款订单查询页。
- 创建：`src/app/admin/payments/logs/page.tsx`，支付回调日志页。
- 修改：`src/components/admin/admin-navigation.ts`，加入支付中心导航。
- 修改：`src/app/api/admin/settings/payment/route.ts`，加固支付配置更新响应和审计。

### 测试
- 创建或修改：`p2-admin-product-payment-guard.test.mjs`，验证商品中心与支付中心后台入口。
- 修改：`p1-inventory-guard.test.mjs`，增加库存服务层闭环检查。

---

## 任务 1：库存中心 API/服务层闭环加固

**文件：**
- 修改：`src/lib/inventory-transactions.ts`
- 修改：`src/app/api/admin/inventory/adjust/route.ts`
- 修改：`src/app/api/inventory/checks/[id]/complete/route.ts`
- 修改：`src/app/api/inventory/alerts/[id]/resolve/route.ts`
- 测试：`p1-inventory-guard.test.mjs`

- [ ] **步骤 1：编写库存守护测试**

检查以下契约：
- `inventory-transactions.ts` 导出 `assertInventoryTransactionInput`
- 调库 API 使用 `InventoryTransactionCode.ADMIN_ADJUST_INCREASE` / `ADMIN_ADJUST_REDUCE`
- 调库 API 记录 `recordAdminAuditLog`
- 盘点完成 API 使用 `STOCK_GAIN` / `STOCK_LOSE`
- 预警处理 API 记录审计日志

运行：`node p1-inventory-guard.test.mjs`
预期：如果实现缺失则失败。

- [ ] **步骤 2：实现库存流水输入校验**

在 `src/lib/inventory-transactions.ts` 增加 `assertInventoryTransactionInput`，校验商品 ID、库存前后数量、变更数量、交易类型 code。

- [ ] **步骤 3：加固调库 API**

在 `src/app/api/admin/inventory/adjust/route.ts` 中确保：
- 负库存被拒绝。
- set/increase/decrease 都能计算正确 `quantityChange`。
- 调库成功写库存流水。
- 调库成功和失败都写审计或错误日志。

- [ ] **步骤 4：加固盘点完成 API**

在 `src/app/api/inventory/checks/[id]/complete/route.ts` 中确保：
- 盘盈使用 `InventoryTransactionCode.STOCK_GAIN`。
- 盘亏使用 `InventoryTransactionCode.STOCK_LOSE`。
- 完成盘点后写审计日志。

- [ ] **步骤 5：加固预警处理 API**

在 `src/app/api/inventory/alerts/[id]/resolve/route.ts` 中确保：
- 只允许 active/pending 预警被处理。
- 写入 resolution_note。
- 写入 `recordAdminAuditLog`。

- [ ] **步骤 6：运行验证**

运行：`node p1-inventory-guard.test.mjs`
预期：PASS。

---

## 任务 2：商品中心后台能力升级

**文件：**
- 修改：`src/app/admin/products/page.tsx`
- 修改：`src/app/api/admin/products/route.ts`
- 修改：`src/app/api/admin/products/[id]/route.ts`
- 测试：`p2-admin-product-payment-guard.test.mjs`

- [ ] **步骤 1：编写商品中心守护测试**

验证：
- 商品页使用 `AdminPageHeader`、`AdminCard`、`AdminTable`、`FilterBar`、`StatusBadge`。
- 商品页包含“商品运营中心”、“库存风险”、“上架状态”、“批量运营”。
- 商品 API 查询包含库存状态、分类、价格、分页。
- 商品更新 API 写 `recordAdminAuditLog`。

- [ ] **步骤 2：增强商品列表页面**

在 `products/page.tsx` 增加商品运营指标卡、库存风险状态、上架状态筛选和批量运营入口。

- [ ] **步骤 3：增强商品 API 契约**

在商品列表 API 返回数据中保留分页、库存、分类、价格信息；在商品更新/删除中补充审计日志。

- [ ] **步骤 4：运行商品守护测试**

运行：`node p2-admin-product-payment-guard.test.mjs`
预期：商品中心部分 PASS。

---

## 任务 3：支付中心后台建立

**文件：**
- 创建：`src/app/admin/payments/page.tsx`
- 创建：`src/app/admin/payments/orders/page.tsx`
- 创建：`src/app/admin/payments/logs/page.tsx`
- 修改：`src/components/admin/admin-navigation.ts`
- 修改：`src/app/api/admin/settings/payment/route.ts`
- 测试：`p2-admin-product-payment-guard.test.mjs`

- [ ] **步骤 1：编写支付中心守护测试**

验证：
- 支付中心页面存在。
- 支付中心页面调用 `/api/admin/settings/payment`。
- 支付中心页面包含“支付中心”、“通道配置”、“沙箱模式”、“风险配置”。
- 支付订单页存在，包含“支付订单流水”。
- 支付日志页存在，包含“回调日志”。
- 导航包含支付中心入口。

- [ ] **步骤 2：新增支付中心主页**

创建 `src/app/admin/payments/page.tsx`，展示支付通道配置卡片、启用状态、沙箱状态、风险提示。

- [ ] **步骤 3：新增支付订单流水页**

创建 `src/app/admin/payments/orders/page.tsx`，基于订单表支付字段展示支付流水。

- [ ] **步骤 4：新增支付回调日志页**

创建 `src/app/admin/payments/logs/page.tsx`，基于审计日志展示支付相关操作。

- [ ] **步骤 5：加入后台导航**

修改 `src/components/admin/admin-navigation.ts`，添加支付中心菜单。

- [ ] **步骤 6：运行支付守护测试**

运行：`node p2-admin-product-payment-guard.test.mjs`
预期：支付中心部分 PASS。

---

## 任务 4：最终验证与文档同步

**文件：**
- 修改：`docs/superpowers/plans/2026-05-10-admin-platform-enterprise-upgrade.md`

- [ ] **步骤 1：运行所有守护测试**

运行：`node p1-inventory-guard.test.mjs && node p2-admin-product-payment-guard.test.mjs`
预期：PASS。

- [ ] **步骤 2：运行 lint 和 build**

运行：`npm run lint && npm run build`
预期：退出码 0。

- [ ] **步骤 3：更新计划文档**

把 P2/P3/P4 相关任务标记为已完成，并记录验证命令。
