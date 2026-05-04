# 紫砂电商 Admin 后台全面重构计划

> **分析日期**: 2026-05-04
> **分析范围**: `/src/app/admin/` 所有页面 + `/src/app/api/admin/` 所有 API + 完整数据库 schema
> **核心原则**: 只读数据库，不改表结构。基于现有字段做最完整的后台管理。

---

## 目录

1. [总体评估](#一总体评估)
2. [P0-紧急：完全缺失的核心页面](#二p0-紧急完全缺失的核心页面)
3. [P1-严重：已有页面存在的重大问题](#三p1-严重已有页面存在的重大问题)
4. [P2-重要：架构层面问题](#四p2-重要架构层面问题)
5. [P3-改进：CSS/UI一致性问题](#五p3-改进cssui一致性问题)
6. [完整模块整改清单（18个模块）](#六完整模块整改清单)
7. [实施路线图](#七实施路线图)

---

## 一、总体评估

### 1.1 当前状态总览

| 类别 | 总数 | 已实现 | 部分实现 | 完全缺失 |
|------|------|--------|----------|----------|
| Admin 页面 | 18 | 5 | 10 | 6 |
| Admin API | 18 | 2 | 1 | 15 |
| 导航菜单项 | 17 | 5 | 9 | 6 |

### 1.2 数据库表统计

共 **50+ 张表**，关键业务表：

| 模块 | 相关表 |
|------|--------|
| 商品 | products, product_prices, product_features, product_activities, product_activity_logs, product_promotions, product_logs |
| 订单 | orders, order_items(未见表), order_coupons, order_payments, order_logistics, order_status_logs, order_status_transitions |
| 用户 | users, user_coupons, user_favorites, user_browse_history, user_logs, points_logs, addresses |
| 库存 | inventory, inventory_transactions, inventory_checks, inventory_check_items, inventory_alerts, inventory_status, transaction_type |
| 营销 | coupons, promotions, promotion_stats, product_promotions, activity_categories |
| 支付 | payment_config, payment_error_codes, payment_logs, exchange_rates |
| 内容 | about, contact, translations, theme_color_configs, home modules(未见独立表) |
| 系统 | audit_logs, system_configs, reference_types |
| 功能 | feature_categories, feature_templates, feature_template_categories, product_features |
| 评价 | reviews, review_replies, review_helpful, review_stats(view) |
| 其他 | lucky_draws, lucky_draw_orders, custom_orders, materials, teapot_types, recommendations |

### 1.3 行业标准 Admin 功能对照

一个成熟的电商后台应包含：

| 标准功能 | 当前状态 |
|----------|----------|
| Dashboard（数据概览） | ⚠️ 存在但数据是静态假数据 |
| 商品管理（CRUD+上下架） | ⚠️ 列表页存在，无详情编辑页，使用公共API |
| 订单管理（全生命周期） | ❌ **完全缺失** |
| 用户管理（角色权限） | ⚠️ 存在但使用公共API，界面简陋 |
| 库存管理（流水+盘点+预警） | ⚠️ 存在但用通用DB API操作 |
| 分类管理 | ⚠️ 存在但前端硬编码假数据+不调用真实API |
| 营销-促销管理 | ⚠️ 存在但用公共API |
| 营销-优惠券管理 | ❌ **完全缺失** |
| 评价管理 | ❌ **完全缺失** |
| 系统设置 | ❌ **完全缺失** |
| 数据分析 | ❌ **完全缺失** |
| 物流/退款管理 | ❌ **完全缺失** |
| 主题配置 | ⚠️ 颜色页较完善，主题页CSS有问题 |
| 翻译/多语言 | ✅ 最完善的页面 |
| 内容管理(关于/联系/首页) | ✅ 较完善 |
| 管理员登录 | ⚠️ 页面存在但无路由保护 |
| 操作审计日志 | ❌ 有audit_logs表但无管理页面 |
| 支付配置 | ❌ 有payment_config表但无管理页面 |

---

## 二、P0-紧急：完全缺失的核心页面

### 2.1 订单管理 `/admin/orders` 🔴

**缺失程度**: 页面文件 `src/app/admin/orders/page.tsx` **不存在！** 但导航菜单第一项就是它。

**需要实现的功能**:

```
订单管理页面：
├── 订单列表（表格视图）
│   ├── 搜索框：订单号/用户邮箱/商品名
│   ├── 筛选器：订单状态、支付状态、日期范围
│   ├── 排序：按金额/日期
│   ├── 列：订单号、用户、商品数、原价、优惠后金额、运费、最终金额
│   │       支付方式、订单状态、支付状态、创建时间、操作
│   └── 分页
├── 订单详情（抽屉/侧边栏/弹窗）
│   ├── 基本信息：订单号、状态、创建时间
│   ├── 用户信息：姓名、邮箱
│   ├── 商品明细：商品名、数量、单价、小计
│   ├── 优惠信息：使用的优惠券、促销活动
│   ├── 金额明细：原价→促销折扣→优惠券折扣→运费→最终金额
│   ├── 收货地址
│   ├── 支付信息：支付方式、交易号、支付时间
│   ├── 物流信息（如有）
│   ├── 状态时间线
│   └── 操作按钮：
│       ├── 标记已支付（手动确认）
│       ├── 标记已发货（填写物流）
│       ├── 处理退款申请
│       ├── 取消订单
│       └── 修改收货地址
└── 批量操作：导出CSV、批量改状态
```

**关联数据库表**: `orders`, `order_coupons`, `order_payments`, `order_status_logs`, `order_status_transitions`, `addresses`, `users`

**需要的 Admin API**:
- `GET /api/admin/orders` — 订单列表（分页+搜索+筛选+排序）
- `GET /api/admin/orders/[id]` — 订单完整详情（含商品、优惠、支付、物流、地址）
- `PUT /api/admin/orders/[id]` — 更新订单（状态、物流等）
- `POST /api/admin/orders/[id]/ship` — 发货操作
- `POST /api/admin/orders/[id]/refund/approve` — 同意退款
- `POST /api/admin/orders/[id]/refund/reject` — 拒绝退款
- `GET /api/admin/orders/export` — 导出CSV

---

### 2.2 优惠券管理 `/admin/coupons` 🔴

**缺失程度**: 页面文件 **不存在**，但有 `POST /api/admin/coupons` API。

**需要实现的功能**:

```
优惠券管理页面：
├── 优惠券列表（表格）
│   ├── 列：代码、名称、类型(百分比/固定)、面值、有效期、
│   │       领取/使用限制、是否可叠加、状态、创建时间、操作
│   ├── 搜索/筛选：代码、名称、状态、类型
│   └── 分页
├── 创建优惠券（弹窗/表单）
│   ├── 基本信息：代码、名称、类型、面值
│   ├── 时间设置：开始/结束日期、永久有效开关
│   ├── 使用限制：领取上限、每人限领
│   ├── 叠加设置：是否可叠加
│   └── 描述
├── 编辑优惠券
├── 启用/禁用优惠券
├── 删除优惠券（软删除）
└── 优惠券使用统计：领取量、使用量、带来的订单数、折扣总额
```

**关联数据库表**: `coupons`, `user_coupons`, `order_coupons`

**需要的 Admin API**:
- `GET /api/admin/coupons` — 优惠券列表
- `GET /api/admin/coupons/[id]` — 优惠券详情+统计
- `PUT /api/admin/coupons/[id]` — 编辑优惠券（已有POST创建）
- `DELETE /api/admin/coupons/[id]` — 删除
- `PUT /api/admin/coupons/[id]/toggle` — 启用/禁用

---

### 2.3 评价管理 `/admin/reviews` 🔴

**缺失程度**: 页面文件 **不存在**。但 `reviews` 相关表非常完善（6张表+1个视图）。

**需要实现的功能**:

```
评价管理页面：
├── 评价列表（表格）
│   ├── 列：商品、用户、评分(⭐)、内容摘要、状态、时间、操作
│   ├── 筛选：状态(待审核/已通过/已拒绝)、评分、日期
│   ├── 搜索：商品名、用户名
│   └── 分页
├── 评价详情（弹窗）
│   ├── 完整评价内容（多语言）
│   ├── 评分星级
│   ├── 用户信息
│   ├── 商品信息
│   ├── 有用/无用统计
│   ├── 管理员回复列表
│   └── 操作：通过/拒绝/删除
├── 回复管理
│   ├── 添加回复（多语言）
│   ├── 编辑回复
│   └── 删除回复
├── 评价审核（批量操作）
└── 评价统计面板
    ├── 总评价数、平均评分
    ├── 评分分布图
    └── 最新评价
```

**关联数据库表**: `reviews`, `review_replies`, `review_helpful`, `review_stats`(view)

**需要的 Admin API**:
- `GET /api/admin/reviews` — 评价列表
- `GET /api/admin/reviews/[id]` — 评价详情
- `PUT /api/admin/reviews/[id]` — 审核评价(通过/拒绝)
- `DELETE /api/admin/reviews/[id]` — 删除评价
- `POST /api/admin/reviews/[id]/reply` — 添加回复
- `PUT /api/admin/reviews/[id]/reply/[replyId]` — 编辑回复
- `DELETE /api/admin/reviews/[id]/reply/[replyId]` — 删除回复

---

### 2.4 系统设置 `/admin/settings` 🔴

**缺失程度**: 页面文件 **不存在**。但 `system_configs`、`payment_config`、`exchange_rates` 表都存在。

**需要实现的功能**:

```
系统设置页面：
├── 支付配置
│   ├── PayPal 配置：client_id, secret, sandbox开关
│   ├── Alipay 配置：app_id, private_key, sandbox开关
│   ├── Stripe 配置：publishable_key, secret_key, sandbox开关
│   └── 各支付方式启用/禁用
├── 货币汇率管理
│   ├── 汇率列表：币种、兑USD汇率
│   ├── 添加/编辑汇率
│   └── 刷新汇率（手动触发）
├── 通用设置
│   ├── 站点名称
│   ├── 默认语言
│   ├── 默认货币
│   ├── 联系邮箱
│   └── 维护模式开关
├── 支付错误码管理
│   ├── 错误码列表：平台、原始码、统一码、多语言消息
│   ├── 添加/编辑/删除
│   └── 启用/禁用
└── 操作日志
    └── 审计日志查看（audit_logs表）
```

**关联数据库表**: `payment_config`, `payment_error_codes`, `exchange_rates`, `system_configs`, `audit_logs`

**需要的 Admin API**:
- `GET/PUT /api/admin/settings/payment` — 支付配置
- `GET/PUT /api/admin/settings/exchange-rates` — 汇率管理
- `GET/PUT /api/admin/settings/general` — 通用设置
- `GET /api/admin/settings/audit-logs` — 审计日志

---

### 2.5 数据分析 `/admin/analytics` 🔴

**缺失程度**: 页面文件 **不存在**。

**需要实现的功能**:

```
数据分析页面：
├── 核心指标卡片
│   ├── 今日订单数/金额
│   ├── 本月订单数/金额
│   ├── 新增用户
│   └── 转化率
├── 销售趋势图
│   ├── 按日/周/月
│   └── 折线图/柱状图
├── 商品销售排行
│   └── TOP 10/20 商品
├── 用户分析
│   ├── 新增用户趋势
│   └── 用户地域分布
├── 支付方式分析
│   └── 各支付方式占比
└── 优惠券/促销效果分析
    ├── 使用率
    └── 带来的销售额
```

**关联数据库表**: `orders`, `order_payments`, `users`, `promotion_stats`

**需要的 Admin API**:
- `GET /api/admin/analytics/dashboard` — 仪表盘数据
- `GET /api/admin/analytics/sales` — 销售趋势
- `GET /api/admin/analytics/products` — 商品排行
- `GET /api/admin/analytics/users` — 用户分析

---

### 2.6 物流/退款管理 `/admin/deliver-refund` 🔴

**缺失程度**: 页面文件 **不存在**。但导航菜单有此条目。

**需要实现的功能**:

```
物流/退款管理页面：
├── 待发货订单列表
│   └── 操作：填写物流单号、快递公司
├── 已发货订单列表
│   └── 查看物流状态
├── 退款申请列表
│   ├── 待处理退款
│   ├── 已同意/已拒绝
│   └── 操作：同意/拒绝退款
└── 退货管理
    ├── 退货申请列表
    └── 操作：确认收货、完成退款
```

**关联数据库表**: `orders`, `order_logistics`, `order_payments`, `order_status_logs`

**需要的 Admin API**:
- `GET /api/admin/orders/shipping/pending` — 待发货
- `POST /api/admin/orders/[id]/ship` — 发货
- `GET /api/admin/orders/refund/pending` — 待退款
- `POST /api/admin/orders/[id]/refund/approve` — 同意退款
- `POST /api/admin/orders/[id]/refund/reject` — 拒绝退款

---

## 三、P1-严重：已有页面存在的重大问题

### 3.1 Dashboard 仪表盘 ⚠️

**文件**: `admin/dashboard/page.tsx`

**问题清单**:

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 1 | 数据全是静态假数据 | 严重 | 没有任何真实API调用 |
| 2 | 无今日/本月/总计统计 | 严重 | 仪表盘最核心的功能缺失 |
| 3 | 无趋势图表 | 中等 | 无任何可视化图表 |
| 4 | 无最近订单列表 | 中等 | 运营需要快速查看最新订单 |
| 5 | 无库存预警提醒 | 中等 | 低库存商品应该有显眼提示 |

**整改方案**:
- 创建 `GET /api/admin/dashboard` API，返回：今日订单数/金额、本月订单数/金额、总用户数、总商品数、低库存商品数、待处理订单数、待处理退款数
- 添加「最近订单」表格（最新10条）
- 添加「库存预警」卡片
- 添加「销售趋势」简易折线图

---

### 3.2 商品管理 ⚠️

**文件**: `admin/products/page.tsx`

**问题清单**:

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 1 | 调用公共 `/api/products` 而非 admin API | **严重** | 虽然 admin/products API 写得很好(457行)，但页面没调用它！页面用的是 `/api/products` |
| 2 | 没有商品详情/编辑页 `admin/products/[id]` | **严重** | 无法在后台编辑单个商品 |
| 3 | 新建商品可能功能不全 | 中等 | 需核实表单是否包含价格、促销关联、活动关联、规格参数 |

**整改方案**:
- 商品列表页改用 `GET /api/admin/products`（该API已实现得非常好，支持搜索/筛选/排序/分页/关联数据）
- 创建 `admin/products/[id]/page.tsx` 商品编辑页：
  - 基本信息编辑（名称、描述多语言、图片、视频、分类）
  - 价格管理（多币种）
  - 库存管理（查看库存、库存流水）
  - 促销关联（关联/取消促销活动）
  - 活动标签（关联/取消活动分类）
  - 规格参数（产品特性 feature）
  - 显示模式切换（单列/双列）

---

### 3.3 用户管理 ⚠️

**文件**: `admin/users/page.tsx` (289行)

**问题清单**:

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 1 | 调用公共 `/api/users` 而非 admin API | 严重 | 没有走 requireAdmin 验证的API |
| 2 | 前端类型使用 `_id`（MongoDB风格） | 严重 | 数据库用的是 `id` INTEGER |
| 3 | `setUsers(data)` 直接赋值 | 严重 | 公共API返回 `{ success: true, data: [...] }`，没有解包 |
| 4 | 全英文界面 | 中等 | 紫砂电商面向中文市场，应该中文优先 |
| 5 | 没有用户详情页 | 中等 | 无法查看用户订单历史、优惠券、收藏等 |
| 6 | 没有角色管理 | 中等 | 只能设 admin/user，没有更细粒度权限 |
| 7 | CSS使用 `bg-primary` | 中等 | 不确定是否与项目CSS变量系统兼容 |
| 8 | 删除使用 `?id=` 查询参数 | 低 | 不太RESTful但这属于偏好 |

**整改方案**:
- 创建 `GET /api/admin/users` 用户列表API（含搜索、分页、角色筛选）
- 创建 `GET /api/admin/users/[id]` 用户详情API（含订单历史、优惠券、收藏统计）
- `PUT /api/admin/users/[id]` 更新用户（角色、状态）
- 页面UI改为中文
- 修复数据类型 `_id` → `id`
- 正确解析API响应 `data.data` 或 `data.users`

---

### 3.4 分类管理 ⚠️

**文件**: `admin/categories/page.tsx` (278行)

**问题清单**:

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 1 | 硬编码假数据作fallback | **严重** | API失败时显示的是虚构分类（Teapots, Cups等），会误导 |
| 2 | 删除操作纯前端，不调API | **严重** | `handleDelete` 只做 `setCategories(filter)` |
| 3 | 新增/编辑也是纯前端状态 | **严重** | `handleSubmit` 只修改 `categories` 状态，没有POST/PUT请求 |
| 4 | 使用 `id: Date.now().toString()` | 严重 | 不是数据库ID格式 |
| 5 | 没有调用真实的categories API | 严重 | 虽然有 `/api/categories` 但它似乎没有被这个页面使用 |

**整改方案**:
- 完全重写分类管理页，改为调用真实API
- `GET /api/admin/categories` 列表
- `POST /api/admin/categories` 创建
- `PUT /api/admin/categories/[id]` 编辑
- `DELETE /api/admin/categories/[id]` 删除（检查是否有商品关联）
- 去掉所有硬编码假数据
- 添加分类优先级排序（拖拽或上下移动）

---

### 3.5 促销管理 ⚠️

**文件**: `admin/promotions/page.tsx` (323行)

**问题清单**:

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 1 | 调用公共 `/api/promotions` 而非 admin API | 严重 | 公共API可能有权限问题 |
| 2 | 前端类型使用 `_id`（MongoDB风格） | 严重 | 数据库用 `id` INTEGER |
| 3 | `setPromotions(data)` 直接赋值无解包 | 严重 | API返回 `{ success: true, data: [...] }` |
| 4 | `discount`字段名不匹配 | 中等 | 数据库 `promotions` 表无 `discount` 字段，是 `discount_type` + `discount_value` |
| 5 | 卡片布局不适合大量数据 | 低 | 促销多了应该用表格视图 |

**整改方案**:
- 创建 `GET/POST /api/admin/promotions` 
- 创建 `PUT/DELETE /api/admin/promotions/[id]`
- 添加促销统计（关联 `promotion_stats` 表）
- 商品关联管理（`product_promotions` 表）
- 修复所有字段名以匹配数据库结构
- 添加表格/卡片视图切换

---

### 3.6 库存管理 ⚠️

**文件**: `admin/inventory/page.tsx` (376行)

**问题清单**:

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 1 | 库存列表从 `/api/products` 获取 | 中等 | 应该从 `/api/inventory` 获取 |
| 2 | 调整库存调用 `/api/inventory` POST | 中等 | API路由存在，但需确认逻辑正确 |
| 3 | 交易流水从 `/api/inventory` 获取 | 中等 | 需要验证API返回格式是否匹配 |
| 4 | 交易类型标签 `getTransactionTypeLabel` | 低 | 硬编码，应该从 `transaction_type` 表读取 |
| 5 | 库存状态用 `statusId` 判断 | 低 | 应该从 `inventory_status` 表读取 |

**整体评价**: inventory模块的页面算是最功能齐全的之一，有库存列表+交易流水+调整弹窗，但仍需规范化为admin API调用。

**整改方案**:
- 创建 `GET /api/admin/inventory` 库存列表
- 创建 `POST /api/admin/inventory/adjust` 库存调整（带原因、操作人）
- 从 `transaction_type` 和 `inventory_status` 表读取标签

---

### 3.7 主题管理 ⚠️

**文件**: `admin/themes/page.tsx`

**问题清单**:

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 1 | 使用不存在的CSS类名 | **严重** | `btn-primary`、`text-muted` 在项目CSS系统中不存在，项目使用CSS变量 `var(--primary)`、`var(--text-muted)` |
| 2 | 颜色预览器无实时生效 | 中等 | 修改主题后需刷新才能看到效果 |

**整改方案**:
- 修复所有CSS类名，改为使用项目的CSS变量系统
- 添加实时预览功能

---

## 四、P2-重要：架构层面问题

### 4.1 缺少 Admin API 层

**现状**: 只有 3 个 admin API 文件：
- `api/admin/products/route.ts`
- `api/admin/products/[id]/route.ts`
- `api/admin/coupons/route.ts`

其他 15 个模块的 admin 页面都直接调用公共 API。

**问题**: 
- 公共API可能缺少管理员专属功能（如批量操作、强制覆盖）
- 公共API的 `requireAuth` 和 admin 需要的 `requireAdmin` 权限模型不同
- 日志审计混乱，无法区分管理操作和用户操作

**整改**: 所有 admin 页面必须调用 `/api/admin/*` 路径的 API，建立完整的 admin API 层。

### 4.2 缺少 Admin 路由保护

**现状**: `middleware.ts` 只记录日志，没有拦截非管理员访问 `/admin/*`。

```typescript
// 当前 middleware.ts 只做：
logMonitor('ROUTER', 'REQUEST', ...)
logMonitor('ROUTER', 'RESPONSE', ...)
// 没有任何 auth 检查！
```

**整改方案**:
- 在 middleware 中添加 `/admin/*` 路由检查
- 未登录 → 重定向到 `/admin/login`
- 已登录但非 admin → 返回 403 或重定向

### 4.3 管理员登录流程不完整

**现状**: `admin/login/page.tsx` 存在，但：
- 登录成功后的 token 存储和跳转逻辑需要验证
- 没有 logout 功能
- admin layout 中没有显示当前登录用户信息

**整改方案**:
- 完善登录 → JWT token 存储 → 跳转 dashboard 流程
- admin layout 右上角添加用户信息+退出按钮
- token 过期自动跳转登录页

### 4.4 通用 DB API 滥用

**现状**: `api/db/table/[table]/route.ts` 等通用接口被 `alerts`、`checks`、`database` 页面大量使用。

**问题**: 
- 直接操作表绕过了业务逻辑校验
- 没有关联数据处理（如删除分类时检查商品）
- 容易出现数据不一致

**整改**: 
- 保留通用DB管理页面（database/page.tsx）用于紧急运维
- 但业务管理页面（alerts, checks）应该调用专用业务API

### 4.5 API 规范不统一

**现状**: 
- 部分API有完整的 logMonitor 监听（如 products），部分完全没有
- 错误响应格式不统一（有的有lang参数，有的没有）
- 多语言支持参差不齐

**整改**: 所有 admin API 严格遵循 `/trae/rules/API-DEV-GUIDE.md` 规范。

---

## 五、P3-改进：CSS/UI一致性问题

### 5.1 CSS变量系统

项目使用自定义CSS变量：`--primary`, `--accent`, `--secondary`, `--background`, `--text`, `--text-muted`, `--border`, `--card`, `--color-green`, `--color-red`, `--color-blue`, `--color-yellow`, `--color-orange`

**问题**: 多个页面混用不兼容的类名：

| 页面 | 错误用法 | 正确用法 |
|------|----------|----------|
| themes | `btn-primary` | `style={{ backgroundColor: 'var(--primary)' }}` |
| themes | `text-muted` | `style={{ color: 'var(--text-muted)' }}` |
| users | `bg-primary` | 需确认Tailwind是否已配置 |
| users | `dark:bg-dark/80` | 需确认是否定义了 dark 变量 |
| promotions | `bg-primary`, `dark:bg-dark/80` | 同上 |

### 5.2 统一 Admin UI 规范

**整改**:
- 所有 admin 页面统一使用 CSS 变量
- 统一页面布局：紫色渐变header + 白色内容卡片
- 统一表格样式
- 统一弹窗/Modal样式
- 统一按钮样式（主按钮accent色，危险按钮red色）
- 提取共享组件：AdminTable, AdminModal, AdminPageHeader, StatusBadge, SearchBar, Pagination

---

## 六、完整模块整改清单

### 模块总览（18个模块）

| # | 模块 | 当前状态 | 优先级 | 需要新建的API | 需要新建/重写的页面 |
|---|------|----------|--------|---------------|---------------------|
| 1 | Dashboard | ⚠️ 假数据 | P1 | `GET /api/admin/dashboard` | 重写 dashboard/page.tsx |
| 2 | 商品管理 | ⚠️ 用公共API | P1 | (已有) | 新建 products/[id]/page.tsx |
| 3 | 订单管理 | ❌ 缺失 | P0 | 6个API | 新建 orders/page.tsx |
| 4 | 用户管理 | ⚠️ 多问题 | P1 | 3个API | 重写 users/page.tsx |
| 5 | 库存管理 | ⚠️ 需规范化 | P1 | 2个API | 改进 inventory/page.tsx |
| 6 | 分类管理 | ⚠️ 假操作 | P1 | 4个API | 重写 categories/page.tsx |
| 7 | 促销管理 | ⚠️ 字段不匹配 | P1 | 4个API | 重写 promotions/page.tsx |
| 8 | 优惠券管理 | ❌ 缺失 | P0 | 4个API | 新建 coupons/page.tsx |
| 9 | 评价管理 | ❌ 缺失 | P0 | 7个API | 新建 reviews/page.tsx |
| 10 | 主题配置 | ⚠️ CSS问题 | P2 | (已有theme-colors) | 修复 themes/page.tsx |
| 11 | 翻译管理 | ✅ 最完善 | P3 | (已有translations) | 微调 |
| 12 | 系统设置 | ❌ 缺失 | P0 | 4个API | 新建 settings/page.tsx |
| 13 | 数据分析 | ❌ 缺失 | P0 | 4个API | 新建 analytics/page.tsx |
| 14 | 物流/退款 | ❌ 缺失 | P0 | 4个API | 新建 deliver-refund/page.tsx |
| 15 | 首页模块 | ✅ 较完善 | P3 | (已有) | 微调 |
| 16 | 关于我们 | ✅ 较完善 | P3 | (已有) | 微调 |
| 17 | 联系我们 | ✅ 较完善 | P3 | (已有) | 微调 |
| 18 | 数据库管理 | ⚠️ 运维用 | P2 | (已有db/table) | 保留现状 |

### 6.1 Dashboard 仪表盘 🔴 P1

**需要创建的 API**:
```
GET /api/admin/dashboard/route.ts
  返回:
  {
    today_orders: { count, amount },
    month_orders: { count, amount },
    total_users, total_products,
    low_stock_count,        // quantity <= 5
    pending_orders_count,   // order_status = 'pending'
    pending_refunds_count,  // order_status = 'refunding'
    recent_orders: [{ id, order_number, user_name, total, status, created_at }] (最新10条)
  }
```

**页面改造**:
- 6个统计卡片（今日订单、今日金额、本月订单、本月金额、总用户、总商品）
- 低库存预警卡片（红色醒目）
- 最近订单表格（最新10条，可点击跳转详情）
- 简易销售趋势（本周每日订单数柱状图）

---

### 6.2 商品管理 🔴 P1

**页面改造**:
- 列表页 `products/page.tsx` 改用 `GET /api/admin/products`
- 新建 `products/[id]/page.tsx` 商品编辑页

**编辑页结构**:
```
商品编辑页（products/[id]/page.tsx）
├── Tab 1: 基本信息
│   ├── 商品名称（zh/en/ar）
│   ├── 商品描述（zh/en/ar）
│   ├── 主图 + 多图 + 视频
│   ├── 分类选择（下拉）
│   └── 显示模式（单列/双列）
├── Tab 2: 价格管理
│   ├── USD 价格
│   └── 其他币种价格
├── Tab 3: 库存管理（只读展示+流水）
│   ├── 当前库存数量+状态
│   └── 库存流水列表
├── Tab 4: 营销关联
│   ├── 关联促销活动（多选+时间+优先级+可叠加）
│   └── 关联活动标签（多选+时间）
└── Tab 5: 商品参数
    └── 规格参数（feature key-value）
```

---

### 6.3 订单管理 🔴 P0

**需要创建的 API**:
```
GET    /api/admin/orders              订单列表
GET    /api/admin/orders/[id]         订单详情
PUT    /api/admin/orders/[id]         更新订单
POST   /api/admin/orders/[id]/ship    发货
POST   /api/admin/orders/[id]/refund/approve  同意退款
POST   /api/admin/orders/[id]/refund/reject   拒绝退款
GET    /api/admin/orders/export       导出CSV
```

**页面**: 见上方 2.1 节的详细设计。

---

### 6.4 用户管理 🔴 P1

**需要创建的 API**:
```
GET    /api/admin/users              用户列表
GET    /api/admin/users/[id]         用户详情
PUT    /api/admin/users/[id]         更新用户
```

**页面改造**:
- 中文界面
- 修复数据类型（`_id` → `id`）
- 修复API响应解析
- 添加搜索（姓名/邮箱）
- 添加角色筛选
- 添加用户详情抽屉（订单历史、优惠券、收藏数、积分）

---

### 6.5 库存管理 🔴 P1

**需要创建的 API**:
```
GET    /api/admin/inventory          库存列表（含状态名）
POST   /api/admin/inventory/adjust   库存调整（含校验）
```

**页面改造**:
- 从 `inventory_status` 表读取状态显示名
- 从 `transaction_type` 表读取交易类型名
- 改进调整弹窗（增加备注、操作人日志）

---

### 6.6 分类管理 🔴 P1

**需要创建的 API**:
```
GET    /api/admin/categories         分类列表
POST   /api/admin/categories         创建分类
PUT    /api/admin/categories/[id]    编辑分类
DELETE /api/admin/categories/[id]    删除分类（检查关联）
```

**页面重写**:
- 移除所有硬编码假数据
- 真实API调用（创建/编辑/删除）
- 优先级排序功能
- 分类商品数量统计

---

### 6.7 促销管理 🔴 P1

**需要创建的 API**:
```
GET    /api/admin/promotions         促销列表+统计
POST   /api/admin/promotions         创建促销
PUT    /api/admin/promotions/[id]    编辑促销
DELETE /api/admin/promotions/[id]    删除促销
```

**页面重写**:
- 修复字段映射到数据库结构：
  - `promotions` 表字段: id, name, name_en, name_ar, description, description_en, description_ar, discount_type, discount_value, start_date, end_date, is_active, priority, image, banner_image, usage_limit, minimum_order, coupon_code, is_stackable, created_at, updated_at
- 关联 `product_promotions` 展示关联商品
- 关联 `promotion_stats` 展示效果统计
- 表格/卡片视图切换

---

### 6.8 优惠券管理 🔴 P0

需要创建页面和5个API。详见 2.2 节。

---

### 6.9 评价管理 🔴 P0

需要创建页面和7个API。详见 2.3 节。

---

### 6.10 系统设置 🔴 P0

需要创建页面和4个API。详见 2.4 节。

---

### 6.11 数据分析 🔴 P0

需要创建页面和4个API。详见 2.5 节。

---

### 6.12 物流/退款管理 🔴 P0

需要创建页面和4个API。详见 2.6 节。

---

## 七、实施路线图

### 阶段一：基础设施（预计先做，1-2天）
```
1.1 创建 admin middleware 路由保护
1.2 完善 admin login/logout 流程
1.3 提取共享组件（AdminTable, AdminModal, AdminPageHeader, StatusBadge, Pagination）
1.4 创建统一的 admin API 响应辅助函数
```

### 阶段二：P0 缺失页面 - 订单+优惠券（核心业务流程）
```
2.1 创建 /api/admin/orders/* 全部 API (6个)
2.2 创建 /api/admin/coupons/* 全部 API (4个)
2.3 创建 /admin/orders 页面（订单管理）
2.4 创建 /admin/coupons 页面（优惠券管理）
```

### 阶段三：P0 缺失页面 - 评价+设置+分析+物流
```
3.1 创建 /api/admin/reviews/* 全部 API (7个)
3.2 创建 /api/admin/settings/* 全部 API (4个)
3.3 创建 /api/admin/analytics/* 全部 API (4个)
3.4 创建 /admin/reviews 页面（评价管理）
3.5 创建 /admin/settings 页面（系统设置）
3.6 创建 /admin/analytics 页面（数据分析）
3.7 创建 /admin/deliver-refund 页面（物流/退款）
```

### 阶段四：P1 已有页面重写
```
4.1 重写 Dashboard（真实数据+图表）
4.2 创建 /admin/products/[id] 商品编辑页
4.3 重写用户管理页
4.4 重写分类管理页
4.5 重写促销管理页
4.6 改进库存管理页
```

### 阶段五：P2/P3 优化
```
5.1 修复主题管理CSS
5.2 统一所有页面的CSS变量使用
5.3 所有 admin API 加入 logMonitor 监听
5.4 统一错误处理和多语言
5.5 翻译管理页微调
```

---

## 附录

### A. 需要创建的完整 API 清单

```
/api/admin/dashboard/route.ts                    (GET)
/api/admin/orders/route.ts                       (GET)
/api/admin/orders/[id]/route.ts                  (GET, PUT)
/api/admin/orders/[id]/ship/route.ts             (POST)
/api/admin/orders/[id]/refund/approve/route.ts   (POST)
/api/admin/orders/[id]/refund/reject/route.ts    (POST)
/api/admin/orders/export/route.ts                (GET)
/api/admin/coupons/route.ts                      (GET) [已有POST]
/api/admin/coupons/[id]/route.ts                 (GET, PUT, DELETE)
/api/admin/coupons/[id]/toggle/route.ts          (PUT)
/api/admin/reviews/route.ts                      (GET)
/api/admin/reviews/[id]/route.ts                 (GET, PUT, DELETE)
/api/admin/reviews/[id]/reply/route.ts           (POST)
/api/admin/reviews/[id]/reply/[replyId]/route.ts (PUT, DELETE)
/api/admin/settings/payment/route.ts             (GET, PUT)
/api/admin/settings/exchange-rates/route.ts      (GET, POST, PUT, DELETE)
/api/admin/settings/general/route.ts             (GET, PUT)
/api/admin/settings/audit-logs/route.ts          (GET)
/api/admin/analytics/dashboard/route.ts          (GET)
/api/admin/analytics/sales/route.ts              (GET)
/api/admin/analytics/products/route.ts           (GET)
/api/admin/analytics/users/route.ts              (GET)
/api/admin/users/route.ts                        (GET)
/api/admin/users/[id]/route.ts                   (GET, PUT)
/api/admin/categories/route.ts                   (GET, POST)
/api/admin/categories/[id]/route.ts              (PUT, DELETE)
/api/admin/promotions/route.ts                   (GET, POST)
/api/admin/promotions/[id]/route.ts              (GET, PUT, DELETE)
/api/admin/inventory/route.ts                    (GET)
/api/admin/inventory/adjust/route.ts             (POST)
```

共计约 **35 个新 API 路由文件**。

### B. 需要新建/重写的页面清单

```
新建:
  /admin/orders/page.tsx                         (P0)
  /admin/coupons/page.tsx                        (P0)
  /admin/reviews/page.tsx                        (P0)
  /admin/settings/page.tsx                       (P0)
  /admin/analytics/page.tsx                      (P0)
  /admin/deliver-refund/page.tsx                 (P0)
  /admin/products/[id]/page.tsx                  (P1)

重写:
  /admin/dashboard/page.tsx                      (P1)
  /admin/users/page.tsx                          (P1)
  /admin/categories/page.tsx                     (P1)
  /admin/promotions/page.tsx                     (P1)

改进:
  /admin/inventory/page.tsx                      (P1)
  /admin/themes/page.tsx                         (P2)
```

### C. 数据库字段速查（关键表）

<details>
<summary>products 表</summary>

```sql
id INTEGER PRIMARY KEY,
name TEXT, name_en TEXT, name_ar TEXT,
description TEXT, description_en TEXT, description_ar TEXT,
image TEXT, images TEXT, video TEXT,
category_id INTEGER,
is_limited INTEGER DEFAULT 0,
display_mode TEXT DEFAULT 'double',
specifications TEXT, shipping TEXT, after_sale TEXT,
created_at TIMESTAMP, updated_at TIMESTAMP
```
</details>

<details>
<summary>orders 表</summary>

```sql
id INTEGER PRIMARY KEY,
user_id INTEGER,
order_number TEXT UNIQUE,
total_after_promotions_amount NUMERIC,
total_original_price REAL,
shipping_fee NUMERIC,
order_final_discount_amount NUMERIC,
payment_method TEXT,
payment_status TEXT,
order_status TEXT,
shipping_address_id INTEGER,
coupon_ids TEXT,
total_coupon_discount REAL,
final_amount NUMERIC,
notes TEXT,
reference_id VARCHAR(100),
paid_at TEXT,
created_at TIMESTAMP, updated_at TIMESTAMP
```
</details>

<details>
<summary>coupons 表</summary>

```sql
id INTEGER PRIMARY KEY,
code VARCHAR(50) UNIQUE NOT NULL,
name VARCHAR(100) NOT NULL,
type VARCHAR(20) NOT NULL,             -- 'percentage' | 'fixed'
value DECIMAL(10,2) NOT NULL,
start_date TIMESTAMP NOT NULL,
end_date TIMESTAMP NOT NULL,
usage_limit INTEGER,
user_limit BOOLEAN DEFAULT 1,
is_active BOOLEAN DEFAULT 1,
is_permanent BOOLEAN DEFAULT 0,
permanent_days INTEGER DEFAULT 0,
is_stackable BOOLEAN DEFAULT 0,
description TEXT,
created_at TIMESTAMP
```
</details>

<details>
<summary>promotions 表</summary>

```sql
-- 需要在数据库中查看完整字段，目前从代码推断：
id, name, name_en, name_ar,
description, description_en, description_ar,
discount_type, discount_value,
start_date, end_date, is_active, priority,
image, banner_image, usage_limit,
minimum_order, coupon_code, is_stackable,
created_at, updated_at
```
</details>

<details>
<summary>reviews 表</summary>

```sql
id INTEGER PRIMARY KEY,
product_id INTEGER,
user_id INTEGER,
order_id INTEGER,
rating INTEGER,       -- 1-5
title TEXT,
content TEXT, content_en TEXT, content_ar TEXT,
status VARCHAR(20),   -- 'pending' | 'approved' | 'rejected'
is_verified BOOLEAN,
created_at TIMESTAMP, updated_at TIMESTAMP
```
</details>

<details>
<summary>payment_config 表</summary>

```sql
id INTEGER PRIMARY KEY,
payment_method VARCHAR(50) UNIQUE NOT NULL,   -- 'paypal' | 'alipay' | 'stripe'
display_name VARCHAR(100) NOT NULL,
is_enabled BOOLEAN DEFAULT 1,
is_sandbox BOOLEAN DEFAULT 1,
config_json TEXT,                              -- JSON配置
sort_order INTEGER DEFAULT 0,
created_at TIMESTAMP, updated_at TIMESTAMP
```
</details>

<details>
<summary>users 表</summary>

```sql
id INTEGER PRIMARY KEY,
name VARCHAR(100),
email VARCHAR(255) UNIQUE NOT NULL,
password VARCHAR(255) NOT NULL,
role VARCHAR(20) DEFAULT 'user',        -- 'admin' | 'user'
phone VARCHAR(30),
avatar VARCHAR(500),
is_active BOOLEAN DEFAULT 1,
points INTEGER DEFAULT 0,
created_at TIMESTAMP, updated_at TIMESTAMP
-- 可能还有 last_login, last_login_ip 等字段
```
</details>

---

> **编写完成时间**: 2026-05-04
> **下一步**: 用户确认后开始按路线图实施
