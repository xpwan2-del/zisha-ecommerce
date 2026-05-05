# 项目跟踪总表 / Project Tracker

## 1. 文档说明

- **项目名称：** 紫砂电商项目
- **文档用途：** 记录项目进度、问题、修改历史和重要沟通决策，作为长期协作的主入口。
- **主要使用人：** 项目负责人 + AI 助手
- **当前阶段：** 项目生产环境风险分析与整改规划
- **最后更新时间：** 2026-05-05
- **当前总体状态：** 进行中

### 1.1 使用原则

1. 本文档是项目长期沟通和进度跟踪的主文档。
2. 每次开启新对话前，优先让 AI 查看本文档。
3. 每完成一个重要分析、修复、测试或决策，都更新本文档。
4. 问题必须编号，任务必须标记状态，重要决定必须写入沟通记录。
5. 本文档不替代代码注释、API 文档和数据库文档，它只负责回答：现在做到哪了、有什么问题、下一步做什么。

---

## 2. 状态标记规范

### 2.1 任务状态

- **未开始：** 还没有开始处理
- **进行中：** 正在处理
- **已完成：** 已完成并确认
- **已暂停：** 暂时停止，后续继续
- **待确认：** 已有结论，但还需要你确认
- **已取消：** 确认不再继续

### 2.2 问题状态

- **未解决：** 已发现，但还没有解决
- **分析中：** 正在定位原因或评估方案
- **待验证：** 已提出方案，等待测试或确认
- **已解决：** 已修复并确认
- **已关闭：** 不再继续处理

### 2.3 严重级别

- **低：** 对主流程影响较小
- **中：** 会影响局部功能或用户体验
- **高：** 会影响核心业务流程
- **最高：** 会影响上线、支付、订单、库存、数据安全等关键能力

---

## 3. 项目总览

### 3.1 当前目标

- 全面分析当前项目的核心问题。
- 优先确认影响生产环境上线的关键风险。
- 建立长期可持续的项目沟通与跟踪机制。
- 逐步推进整改，而不是盲目堆叠新功能。

### 3.2 当前阶段重点

1. 支付链路可信性
2. 订单金额一致性
3. 优惠券业务规则完整性
4. 库存预留与释放一致性
5. 认证稳定性与安全性
6. 数据库生产可用性

### 3.3 当前项目状态摘要

- 项目主业务流程已具备雏形。
- 当前更适合继续分析、测试与整改。
- 暂不建议直接进入正式生产运营。
- 当前最大问题不是功能太少，而是核心交易链路还不够稳。

---

## 4. 任务进度跟踪

### 4.1 模块任务总表

| 模块 | 当前状态 | 优先级 | 当前问题 | 下一步 |
|------|----------|--------|----------|--------|
| auth | 进行中 | 高 | 登录态恢复、Cookie 策略和安全性仍需收口 | 梳理 token、Cookie、刷新逻辑 |
| payments | 进行中 | 最高 | 已完成全量问题拆解与代码映射，确认支付确认权、金额真相、回调职责和副作用编排均需收口 | 以 payments 全量问题清单为基线推进后续整改 |
| orders | 进行中 | 高 | 金额校验和状态流转需统一 | 梳理订单状态机 |
| coupons | 未开始 | 高 | 规则可能不完整 | 审查后端优惠券规则 |
| inventory | 未开始 | 高 | 预留与释放可能不一致 | 梳理库存生命周期 |
| database | 进行中 | 最高 | 当前数据库架构不适合真实生产 | 评估生产数据库方案 |
| frontend | 进行中 | 中 | 交互与错误恢复机制不足 | 审查关键页面流程 |
| admin | 未开始 | 中 | 后台权限、审计和危险操作控制不足 | 梳理后台权限边界 |

### 4.2 当前进行中的任务

#### TASK-001：全项目生产风险分析

- **状态：** 进行中
- **开始时间：** 2026-05-05
- **负责人：** 项目负责人 + AI 助手
- **目标：** 梳理当前项目上线前的主要风险
- **当前进展：**
  - 已完成整体风险初步分析
  - 已识别支付、订单、优惠券、库存、认证、数据库等核心问题
  - 已确定先采用方案 A：按模块逐个深入分析
  - 已完成 payments 模块第一轮深挖，并形成整改蓝图
  - 已完成 payments 模块全量问题拆解，并映射到具体代码文件
- **下一步：**
  - 以 payments 全量问题清单为基线，继续判断整改入口和实施顺序
  - 然后分析 orders 与 coupons 模块
  - 再分析 inventory、auth、database 模块

#### TASK-002：建立项目长期跟踪文档

- **状态：** 已完成
- **开始时间：** 2026-05-05
- **完成时间：** 2026-05-05
- **负责人：** 项目负责人 + AI 助手
- **目标：** 建立一个长期维护的项目主文档，避免新对话丢失上下文
- **结果：** 已创建 `docs/PROJECT_TRACKER.md`

### 4.3 待完成任务列表

- [ ] 按模块审查 orders
- [ ] 按模块审查 coupons
- [ ] 按模块审查 inventory
- [ ] 按模块审查 auth
- [ ] 梳理数据库表结构风险
- [ ] 制定上线前整改优先级

### 4.4 已完成任务列表

- [x] 完成项目整体生产环境初步审查
- [x] 识别支付、订单、优惠券、库存、认证、数据库等核心风险方向
- [x] 建立项目主跟踪文档机制
- [x] 完成 payments 模块第一轮深挖分析
- [x] 形成 payments 模块整改蓝图
- [x] 完成 payments 模块全量问题拆解与代码映射

---

## 5. 问题记录与解决

### 5.1 问题总表

| 编号 | 问题标题 | 所属模块 | 状态 | 严重级别 | 发现时间 |
|------|----------|----------|------|----------|----------|
| ISSUE-001 | 支付成功确认权不够单一 | payments | 未解决 | 高 | 2026-05-05 |
| ISSUE-002 | PRICE_VERIFICATION_FAILED | orders / payments | 未解决 | 高 | 2026-05-05 |
| ISSUE-003 | 优惠券规则可能不完整 | coupons | 未解决 | 高 | 2026-05-05 |
| ISSUE-004 | 库存预留与释放一致性风险 | inventory | 未解决 | 高 | 2026-05-05 |
| ISSUE-005 | 数据库架构不适合生产 | database | 未解决 | 最高 | 2026-05-05 |
| ISSUE-006 | 登录态恢复与安全策略仍需收口 | auth | 未解决 | 高 | 2026-05-05 |
| ISSUE-007 | 前端状态存在多份真相 | frontend | 未解决 | 中 | 2026-05-05 |

### ISSUE-001：支付成功确认权不够单一

- **状态：** ✅ 已解决
- **所属模块：** payments
- **严重级别：** 高
- **发现时间：** 2026-05-05
- **解决时间：** 2026-05-06
- **问题描述：**
  当前支付成功确认链路中，前端回跳结果参与度偏高，服务端可信确认边界不够清晰。
- **影响范围：**
  - 订单状态
  - 支付状态
  - 用户支付体验
  - 财务对账准确性
- **解决方案：**
  - 浏览器回跳（`/payment-result`）只做结果展示，不触发任何订单状态变更
  - 订单状态变更统一由支付平台 Webhook 服务端回调（PayPal/Stripe/Alipay notify）
  - 支付路由只从数据库读取金额，不接受前端参数（PAYMENT-003）
- **是否已解决：** 是

### ISSUE-002：PRICE_VERIFICATION_FAILED

- **状态：** 已解决 ✅
- **所属模块：** orders / payments
- **严重级别：** 高
- **发现时间：** 2026-05-05
- **解决时间：** 2026-05-05
- **问题描述：**
  订单金额、商品明细、支付前重算结果之间还没有完全形成唯一真相，导致支付前校验失败。
- **根因分析：**
  PayPal 路由的 `verifyPrices()` 用 `calculateItemPrice()` 从 `product_prices` 表实时查价，与前端传来的 `order_items.original_price`（订单价格快照）比较。两个不同的价格来源（实时价 vs 快照价）必然不一致，导致 `PRICE_VERIFICATION_FAILED`。这与 PAYMENT-003 同根同源。
- **解决方案：**
  PayPal 路由不再接受前端传来的 `amount` 和 `items`，仅接受 `order_number`。所有金额数据直接从 `orders` 表和 `order_items` 表读取，以数据库作为唯一真相来源。
  具体改动：
  1. 删除 `calculateItemPrice()` 函数（不再从 `product_prices` 实时查价）
  2. 删除 `verifyPrices()` 函数（不再做无意义的前端 vs product_prices 比对）
  3. POST 处理器改为：接收 `order_number` → 查 `orders` 表获取 `final_amount`/`shipping_fee`/`order_final_discount_amount`/`total_original_price` → 查 `order_items` 获取商品明细 → 用数据库值构建 PayPal 请求
  4. PayPal breakdown：`item_total` = 商品原价总和，`discount` = 订单折扣总额，`shipping` = 运费，`value` = `final_amount`
- **影响范围：**
  - 提交订单 ✅ 已修复
  - 支付流程 ✅ 已修复
  - 用户信任 ✅ 已修复
  - 对账准确性 ✅ 已修复
- **当前结论：**
  PayPal 支付金额现在直接绑定后端锁定后的订单最终金额，不再受 `product_prices` 变化影响。
- **是否已解决：** 是 ✅
- **2026-05-05 补充修复（前端层）：**
  在支付后端恢复唯一真相后，发现前端仍存在以下问题：
  1. 支付卡片（PayPal/支付宝/Stripe）和提交按钮金额硬编码 `order.final_amount`，换券后不更新
  2. `fetchCoupons` 的 `useEffect` 错误监听了 `selectedCouponIds`，导致每次点券都重拉全量券列表（页面闪现）
  3. 支付通道卡和提交按钮之间缺少独立的"价格明细"卡片，用户看不到换券后实时变化
  4. 优惠券卡片样式与 quick-order 不统一
  - **前端修复：**
    - 4处金额从 `order.final_amount` 改为 `estimatedPrice?.final_amount ?? order.final_amount`
    - 删除 `fetchCoupons` 的 `selectedCouponIds` 依赖，消除闪烁
    - 插入独立价格明细卡片（copy quick-order 样式），含商品总价/促销优惠/促销后小计/优惠券优惠/券后小计/运费/应付总额
    - 券卡片替换为 quick-order 风格（左边彩色渐变条 + 选中态角标 + 不可用状态提示）
  - **涉及文件：** [page.tsx](file:///Users/davis/zisha-ecommerce/src/app/orders/[id]/page.tsx)

### ISSUE-003：优惠券规则可能不完整

- **状态：** 未解决
- **所属模块：** coupons
- **严重级别：** 高
- **发现时间：** 2026-05-05
- **问题描述：**
  优惠券的门槛、适用范围、叠加规则、失效判断、用户归属校验可能还不完整。
- **影响范围：**
  - 订单金额
  - 营销活动
  - 用户权益
  - 财务对账
- **当前结论：**
  优惠券不能只依赖前端判断，必须以后端规则为最终依据。
- **建议方向：**
  建立统一的后端优惠券规则校验逻辑，并与订单金额重算打通。
- **是否已解决：** 否

### ISSUE-004：库存预留与释放一致性风险

- **状态：** 未解决
- **所属模块：** inventory
- **严重级别：** 高
- **发现时间：** 2026-05-05
- **问题描述：**
  加购物车、立即购买、快速订单、取消订单、支付失败、超时释放等场景中的库存变化路径较多，存在一致性风险。
- **影响范围：**
  - 商品库存
  - 用户下单
  - 支付成功后的履约
  - 后台库存管理
- **当前结论：**
  库存系统需要统一预留、扣减、释放、回滚和幂等处理。
- **建议方向：**
  梳理库存生命周期，确保订单状态变化和库存变化具备一致性。
- **是否已解决：** 否

### ISSUE-005：数据库架构不适合生产

- **状态：** 未解决
- **所属模块：** database
- **严重级别：** 最高
- **发现时间：** 2026-05-05
- **问题描述：**
  当前数据库架构更适合本地开发和内部测试，不适合作为真实生产环境的核心持久化方案。
- **影响范围：**
  - 数据安全
  - 并发写入
  - 事务一致性
  - 备份与恢复
  - 长期运维
- **当前结论：**
  当前底层数据库方案是项目上线前必须重点评估和整改的内容。
- **建议方向：**
  评估迁移到 PostgreSQL、MySQL 或其他更适合生产的数据库体系。
- **是否已解决：** 否

### ISSUE-006：登录态恢复与安全策略仍需收口

- **状态：** 未解决
- **所属模块：** auth
- **严重级别：** 高
- **发现时间：** 2026-05-05
- **问题描述：**
  登录后刷新、页面跳转、支付回跳、订单访问等场景中，登录态恢复和权限校验需要进一步统一。
- **影响范围：**
  - 用户登录体验
  - 订单访问权限
  - 支付回跳后的用户识别
  - API 安全性
- **当前结论：**
  认证系统可以运行，但还需要体系化收口。
- **建议方向：**
  统一 access token、refresh token、Cookie 策略、CSRF 防护和受保护 API 鉴权方式。
- **是否已解决：** 否

### ISSUE-007：前端状态存在多份真相

- **状态：** 未解决
- **所属模块：** frontend
- **严重级别：** 中
- **发现时间：** 2026-05-05
- **问题描述：**
  购物车、订单、登录态等数据可能同时存在于 Context、页面 state、接口返回和本地存储中。
- **影响范围：**
  - 页面展示一致性
  - 操作反馈
  - 状态同步
  - 问题排查难度
- **当前结论：**
  前端部分核心域缺少单一真相来源。
- **建议方向：**
  为购物车、用户态、订单态分别建立清晰的状态来源和同步机制。
- **是否已解决：** 否

---

## 6. 修改历史

| 日期时间 | 修改人 | 修改内容 | 状态 |
|----------|--------|----------|------|
| 2026-05-05 | 项目负责人 + AI 助手 | 创建项目主跟踪文档初稿 | 已完成 |
| 2026-05-05 | 项目负责人 + AI 助手 | 初始化项目总览、任务跟踪、问题清单和沟通机制 | 已完成 |
| 2026-05-05 | 项目负责人 + AI 助手 | 完成 payments 模块第一轮深挖，并写入整改蓝图 | 已完成 |
| 2026-05-05 | 项目负责人 + AI 助手 | 基于确认后的优惠券业务规则与字段命名原则，修正 PAYMENT-001 / PAYMENT-002 的问题定义 | 已完成 |
| 2026-05-05 | 项目负责人 + AI 助手 | 已在真实超时关闭入口补上“订单超时关闭 → 自动返券”，并接入 timeout_cancel 状态事件 | 已完成 |
| 2026-05-05 | 项目负责人 + AI 助手 | 已将"手动取消订单"与"超时关闭订单"的库存归还、库存流水、优惠券返还收口到统一释放服务，降低链路分叉遗漏风险 | 已完成 |
| 2026-05-05 | 项目负责人 + AI 助手 | 修复 ISSUE-002 / PAYMENT-003：PayPal 路由重构为以数据库为唯一真相来源，删除 calculateItemPrice/verifyPrices，不再接受前端金额数据 | 已完成 |
| 2026-05-05 | 项目负责人 + AI 助手 | 修复订单详情页换券后价格不更新、页面闪现、缺价格明细卡、券样式不统一四个前端问题 | 已完成 |

---

## 7. 沟通记录

### 记录 001

- **时间：** 2026-05-05
- **主题：** 建立项目主跟踪文档机制
- **沟通结论：**
  项目采用单一主文档模式，作为长期沟通与进度跟踪核心工具。
- **原因：**
  当前阶段优先降低维护复杂度，避免因多文档分散而丢失上下文。
- **后续动作：**
  先长期使用 `docs/PROJECT_TRACKER.md`，后续如项目扩大再拆分。

### 记录 002

- **时间：** 2026-05-05
- **主题：** 当前分析优先级
- **沟通结论：**
  优先分析 payments、orders、coupons、inventory、auth、database 模块。
- **原因：**
  这些模块直接影响项目是否具备真实上线能力。
- **后续动作：**
  从 payments 模块开始逐个深挖。

### 记录 003

- **时间：** 2026-05-05
- **主题：** payments 模块分析结论沉淀
- **沟通结论：**
  payments 模块已完成第一轮深挖，当前应先统一服务端可信确认机制、订单金额唯一真相和支付后副作用编排，再进入代码整改。
- **原因：**
  当前风险不在支付渠道数量，而在支付成功确认边界不清、金额来源分散和多通道状态双写。
- **后续动作：**
  将 payments 模块整改蓝图写入项目主文档，作为后续分析和实施基线。

### 记录 004

- **时间：** 2026-05-05
- **主题：** payments 模块一次性全量问题拆解
- **沟通结论：**
  不再按 P0 / P1 / P2 分批更新 payments 文档，而是一次性完成全量问题清单与代码文件映射，后续整改统一以该清单为基线推进。
- **原因：**
  用户希望避免多轮增量修改造成文档结构混乱，也希望已完成的 payments 拆解任务立即从待办中移除。
- **后续动作：**
  将原"整改蓝图"章节升级为"全量问题拆解与代码映射"，同时同步更新任务状态、修改历史与沟通记录。

### 记录 005

- **时间：** 2026-05-05
- **主题：** ISSUE-002 / PAYMENT-003 分析与修复
- **沟通结论：**
  确认 PRICE_VERIFICATION_FAILED 的根因是 PayPal 路由用两个不同价格来源做校验：`product_prices`（实时价）vs `order_items.original_price`（快照价）。ISSUE-002 和 PAYMENT-003 是同根同源问题。
- **修复方案：**
  PayPal 路由改为只接受 `order_number`，所有金额从 `orders` 表和 `order_items` 表读取，以后端数据库为唯一真相来源。删除 `calculateItemPrice()` 和 `verifyPrices()` 两个函数。
- **后续动作：**
  1. PayPal 路由已修复完成 ✅
  2. Stripe 和 Alipay 存在同类问题（PAYMENT-004、PAYMENT-005），后续需同样整改
  3. 前端调 PayPal 的代码仍在传 `amount`/`items`，但后端已不再使用，前端后续可清理

### 记录 006

- **时间：** 2026-05-05
- **主题：** 订单详情页换券价格不更新 + 页面闪现 + 缺价格明细卡 + 优惠券样式统一
- **沟通结论：**
  在支付后端链路（ISSUE-002/PAYMENT-003）修复完成后，确认前端有四个问题需要同步修正：
  1. **价格不更新**：支付卡片和提交按钮硬编码 `order.final_amount`（不可变），用户换券后眼睛看到的金额完全不动。需改为 `estimatedPrice?.final_amount ?? order.final_amount`
  2. **页面闪现**：`fetchCoupons` 的 `useEffect` 依赖数组错误包含 `selectedCouponIds`，每次点券触发全量拉券（`isLoadingCoupons = true`），应只保留 `order?.id` 和 `order?.coupons`
  3. **缺价格明细卡**：支付通道和提交按钮之间没有独立的实时价格展现，用户换券后无法感知优惠变化
  4. **券样式不统一**：orders 页面券卡与 quick-order 不一致
- **修复方案：**
  - 4处金额改为 `estimatedPrice?.final_amount ?? order.final_amount`
  - 删除 `selectedCouponIds` 依赖
  - 做独立价格明细卡片（copy quick-order 样式，含完整阶梯明细）
  - 券卡片替换为 quick-order 风格（左彩色渐变条 + 选中角标）
- **后续动作：**
  1. ✅ 四项修改全部完成，TypeScript 编译零错误通过
  2. 给用户 8 分配了 8 张可用优惠券用于测试
  3. Stripe/Alipay（PAYMENT-004/005）作为下一步待确认

---

## 8. payments 全量问题拆解与代码映射

### 8.1 当前定位

- payments 模块已完成第一轮深挖分析。
- 当前阶段不是继续增加支付方式，而是先收口支付链路中的可信边界。
- 当前文档不再只保留方向性蓝图，而是一次性沉淀完整问题清单与代码文件映射。
- 后续所有 payments 整改都应以本章节作为统一基线。

### 8.2 当前总判断

当前 payments 模块的核心问题，不是单个支付渠道不可用，而是整条支付链路同时存在以下结构性风险：

1. 支付成功确认权不够单一。
2. 订单金额、支付金额和商品明细还没有形成唯一真相。
3. 浏览器回跳、成功页、notify 接口和服务端确认路径职责交叉。
4. 支付成功后的状态推进与副作用编排分散在多个入口。
5. 个别渠道仍然过度信任前端传参，或者在金额异常时只告警不阻断。
6. 文档、监控和接口语义也有不一致问题，增加了维护成本。

### 8.3 问题清单与代码映射

#### PAYMENT-001：订单确认占券后的返还与回显闭环不完整

- **状态：** 待验证
- **问题描述：**
  当前业务规则已确认：订单确认后优惠券即被订单占住，支付失败或取消支付不等于退券；只有订单取消、订单超时关闭或用户在 `prepare-payment` 改选其他券时，才应释放原先占用的券。现有代码已支持手动取消订单返券、换券回滚和重新支付历史选券回显；本次已继续补上“订单超时关闭 → 自动返券”链路。
- **影响：**
  - 订单超时关闭后，优惠券可能仍停留在已使用状态
  - 用户在重新支付时改选优惠券，旧券可能没有回滚返还
  - 支付失败后重新进入订单详情，页面无法自动勾选之前已占用的券
- **涉及文件：**
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/orders/[id]/prepare-payment/route.ts#L253-L315)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/orders/[id]/route.ts#L226-L251)
  - [page.tsx](file:///Users/davis/zisha-ecommerce/src/app/orders/[id]/page.tsx#L150-L233)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/inventory/release-expired/route.ts#L25-L202)
- **当前结论：**
  订单确认占券是正确业务语义，问题不在占券时机，而在返券、换券和重新支付回显链路没有收口。现在代码已把超时关闭返券补到真实执行入口，并接入 `timeout_cancel` 状态事件；同时已把“手动取消订单”和“超时关闭订单”的库存归还、库存流水、优惠券返还抽到统一释放服务，正在进行本地回归验证。

#### PAYMENT-002：支付前内部字段命名与数据库语义不一致

- **问题描述：**
  `order_items.original_price` 是订单成交时的商品价格快照，不能删除；它用于避免商品价格后续变化影响历史订单。当前真正需要整改的是支付前内部数据结构中出现 `unit_amount` 这类脱离数据库语义、业务含义不清的字段。`unit_amount` 可以只存在于 Stripe / PayPal SDK 请求体内部，但不能作为本系统订单支付链路的主语义字段。
- **影响：**
  - 维护者难以判断 `unit_amount` 表示商品原价、成交价、支付平台金额单位还是支付金额
  - `prepare-payment`、订单详情页 re-pay、PayPal、Stripe 之间字段契约不一致
  - 支付前商品明细模型与数据库字段认知不一致，增加金额排查难度
- **涉及文件：**
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/orders/[id]/prepare-payment/route.ts#L288-L304)
  - [page.tsx](file:///Users/davis/zisha-ecommerce/src/app/orders/[id]/page.tsx#L314-L327)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/paypal/route.ts#L74-L87)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/stripe/route.ts#L68-L82)
- **当前结论：**
  保留 `order_items.original_price` 作为订单价格快照；系统内部支付前链路统一使用 `price` / `original_price` 等业务字段，只有组装第三方支付平台请求时才转换为平台要求的 `unit_amount`。

#### PAYMENT-003：PayPal 创建支付金额没有使用订单最终金额

- **状态：** 已解决 ✅
- **解决时间：** 2026-05-05
- **问题描述：**
  `prepare-payment` 已经计算出 `final_amount`，但 PayPal 创建支付时仍按商品明细重新累加金额，没有把运费和优惠后的最终结果作为唯一依据。同时 `verifyPrices()` 用 `calculateItemPrice()` 从 `product_prices` 实时查价与前端传来的 `order_items.original_price` 快照比对，两个不同价格来源导致 `PRICE_VERIFICATION_FAILED`（同 ISSUE-002）。
- **解决方案：**
  PayPal 路由全面重构：
  1. 删除 `calculateItemPrice()` 和 `verifyPrices()` 两个函数
  2. POST 只接受 `order_number`（+ 可选 `currency`），不再信任前端传来的 `amount`/`items`
  3. 从 `orders` 表读取：`final_amount`、`shipping_fee`、`total_original_price`、`order_final_discount_amount`
  4. 从 `order_items` 表读取：商品明细（`product_id`、`product_name`、`quantity`、`original_price`）
  5. 用数据库值构建 PayPal 请求体：`item_total` = 原价总和、`discount` = 折扣总额、`shipping` = 运费、`value` = `final_amount`
- **影响：** ✅ 全部修复
  - 第三方实付金额 = 订单待支付金额
  - 对账口径统一
  - 优惠券与运费规则正确体现
- **涉及文件：**
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/paypal/route.ts) — 已重构，不再使用 product_prices 重算
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/orders/[id]/prepare-payment/route.ts#L246-L249) — prepare-payment 作为订单金额锁定入口（无变化）
- **当前结论：**
  PayPal 支付金额现在直接绑定后端锁定后的订单最终金额，以后端数据库为唯一真相来源。
- **2026-05-05 补充：前端价格显示修复**
  后端支付链路可信任后，前端页面也需要同步修正，否则用户换券后在页面上看不到价格变化，体验断裂。详见 ISSUE-002 补充修复。

#### PAYMENT-004：Stripe 创建支付同样没有以订单最终金额为准

- **问题描述：**
  Stripe Checkout Session 也是按商品项组装 line items，没有与订单 `final_amount`、运费、优惠后的结果严格对齐。后续即便 notify 发现金额不一致，也只是 warning。
- **影响：**
  - Stripe 金额真相与订单真相分离
  - 金额异常仍可能被记为支付成功
  - 线上对账和补偿复杂度升高
- **涉及文件：**
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/stripe/route.ts#L134-L161)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/stripe/notify/route.ts#L169-L181)
- **当前结论：**
  Stripe 不能只基于 line items 自行计算金额，必须与订单最终金额统一。

#### PAYMENT-005：Alipay 创建支付过度信任前端 amount / order_number

- **问题描述：**
  Alipay 路由在 GET / POST 中都直接使用前端传入的 `amount`、`order_number` 生成支付参数，没有严格回绑本地订单最终金额和订单号。
- **影响：**
  - 支付金额被错误构造
  - 订单号与支付记录可能错位
  - 入口参数可信边界过弱
- **涉及文件：**
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/alipay/route.ts#L28-L41)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/alipay/route.ts#L83-L101)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/alipay/route.ts#L136-L145)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/alipay/route.ts#L176-L186)
- **当前结论：**
  Alipay 创建支付应只接受订单标识，金额和订单号必须以后端订单记录为准。

#### PAYMENT-006：Alipay POST 缺少 payment_method 校验

- **问题描述：**
  Alipay GET 会校验订单支付方式是否为 `alipay`，但 POST 没有对应校验，接口族内部行为不一致。
- **影响：**
  - 错误订单入口可能被错误接受
  - 渠道路由职责不清
- **涉及文件：**
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/alipay/route.ts#L61-L68)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/alipay/route.ts#L153-L187)
- **当前结论：**
  同一支付入口的参数约束必须一致，不能出现 GET 和 POST 两套标准。

#### PAYMENT-007：兼容 success 路由丢失 order_number，可能打断统一结果链路

- **问题描述：**
  PayPal success 只转发 `token` / `PayerID`，Stripe success 只转发 `session_id`，但统一结果入口优先依赖 `order_number` 查本地订单。
- **影响：**
  - 兼容 success 路径无法稳定完成落单
  - 回跳链路依赖关系不清晰
- **涉及文件：**
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/paypal/success/route.ts#L27-L31)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/stripe/success/route.ts#L24-L27)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/result/route.ts#L74-L100)
- **当前结论：**
  所有回跳兼容入口都必须遵守统一结果链路的最小数据契约。

#### PAYMENT-008：统一 result 与各平台 notify 同时推进支付成功，存在双写状态风险

- **问题描述：**
  PayPal、Stripe、Alipay 都同时存在平台 notify 路径和统一 result 路径，且多个入口都可能推进订单状态、支付状态和支付记录。
- **影响：**
  - 重复写 payment logs
  - 重复写 order payments
  - 状态漂移
  - 成功链路无法收口
- **涉及文件：**
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/paypal/notify/route.ts#L186-L320)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/result/route.ts#L138-L171)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/stripe/notify/route.ts#L95-L241)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/result/route.ts#L172-L227)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/alipay/notify/route.ts#L108-L160)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/result/route.ts#L183-L186)
- **当前结论：**
  支付成功必须收敛到单一可信确认入口，其余路径只能做展示、跳转或转发。

#### PAYMENT-009：统一 result 对 Alipay 成功缺少真实性校验

- **问题描述：**
  在统一 result 路由中，Alipay 分支只要拿到 `trade_no` 就构造成功结果，没有验签、没有查单，也没有校验真实支付状态。
- **影响：**
  - Alipay 成功判断可信度过低
  - 可能错误推进订单为已支付
- **涉及文件：**
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/result/route.ts#L183-L186)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/result/route.ts#L200-L213)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/alipay/notify/route.ts#L13-L39)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/alipay/notify/route.ts#L70-L89)
- **当前结论：**
  Alipay 成功确认不能降低到“只要有 trade_no 就算成功”的级别。

#### PAYMENT-010：Stripe notify 注释语义与真实实现不一致

- **问题描述：**
  文件注释声称这是 Stripe Webhook 验签通知接口，但真实实现只是读取 JSON body 中的 `session_id` / `order_number` 后主动查询 session，不是标准 webhook 验签模型。
- **影响：**
  - 接口语义误导
  - 后续维护者容易错误判断安全边界
  - 与真实平台回调模型不一致
- **涉及文件：**
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/stripe/notify/route.ts#L7-L10)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/stripe/notify/route.ts#L75-L96)
- **当前结论：**
  Stripe notify 需要先统一“它到底是 webhook，还是服务端确认接口”的职责定义。

#### PAYMENT-011：Stripe notify 发现金额不一致后仍继续记为支付成功

- **问题描述：**
  Stripe notify 在发现 `paidAmount` 与 `order.final_amount` 不一致时，只记录 warning，随后仍继续改订单状态和插入支付记录。
- **影响：**
  - 金额异常单也会落为 paid
  - 财务风险与补偿复杂度升高
- **涉及文件：**
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/stripe/notify/route.ts#L169-L181)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/stripe/notify/route.ts#L183-L223)
- **当前结论：**
  金额异常必须优先阻断，而不是先成功落库再补救。

#### PAYMENT-012：payments/methods 的监控写法不符合当前规范

- **问题描述：**
  `payments/methods` 使用了 `PAYMENT` 与 `GET_METHODS` 这类不符合项目约定的监控写法，错误分支只有 `console.error`，没有统一监控。
- **影响：**
  - 该路由无法纳入统一 payments 监控模型
  - 错误排查一致性下降
- **涉及文件：**
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/methods/route.ts#L14-L25)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/methods/route.ts#L31-L36)
- **当前结论：**
  payments 模块的辅助路由也要遵守统一日志与错误处理规范。

#### PAYMENT-013：Alipay route 顶部 API 注释与真实行为不一致

- **问题描述：**
  头部注释把 POST 写成“支付宝支付成功回调”，但真实代码中 POST 仍然是创建支付数据，不是 success callback。
- **影响：**
  - 文档误导
  - 接口维护和接入成本上升
- **涉及文件：**
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/alipay/route.ts#L6-L16)
  - [route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/alipay/route.ts#L132-L187)
- **当前结论：**
  支付接口的注释、路由职责和真实实现必须完全一致。

### 8.4 涉及文件总表

- [prepare-payment/route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/orders/[id]/prepare-payment/route.ts)
- [orders/[id]/route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/orders/[id]/route.ts)
- [orders/[id]/page.tsx](file:///Users/davis/zisha-ecommerce/src/app/orders/[id]/page.tsx)
- [paypal/route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/paypal/route.ts)
- [paypal/notify/route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/paypal/notify/route.ts)
- [paypal/success/route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/paypal/success/route.ts)
- [stripe/route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/stripe/route.ts)
- [stripe/notify/route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/stripe/notify/route.ts)
- [stripe/success/route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/stripe/success/route.ts)
- [alipay/route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/alipay/route.ts)
- [alipay/notify/route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/alipay/notify/route.ts)
- [result/route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/result/route.ts)
- [methods/route.ts](file:///Users/davis/zisha-ecommerce/src/app/api/payments/methods/route.ts)

### 8.5 当前结论

- payments 模块已经不适合继续零散修补。
- 当前最重要的不是新增支付能力，而是统一支付确认权、金额真相和支付后副作用入口。
- 当前文档里的 payments 章节已经完成一次性全量问题拆解，后续整改应直接对照问题编号推进。
- 在这些问题没有收口前，不建议把 payments 判断为可直接上线。

---

## 9. 使用方法

### 9.1 什么时候更新

在以下情况发生后，建议更新本文档：

- 完成一个分析任务后
- 修复一个重要问题后
- 新发现一个问题后
- 确定一个技术方案后
- 阶段目标变化后
- 开启新一轮开发或测试前

### 9.2 怎么更新最简单

如果你不知道怎么写，可以按下面这个最简单的方法更新：

1. 在任务区修改状态
2. 在问题区新增或更新问题记录
3. 在修改历史里追加一行
4. 如果有重要结论，再补一条沟通记录

### 9.3 开新对话时怎么用

你可以直接对 AI 说：

```text
请先阅读 docs/PROJECT_TRACKER.md，然后根据文档继续当前任务。
```

或者：

```text
根据项目跟踪总表，继续分析下一个模块。
```

### 9.4 新手维护建议

- 不需要写得很复杂，先写清楚事实。
- 不确定的问题先标记为“分析中”。
- 没有验证的问题不要标记为“已解决”。
- 重要问题必须编号，例如 `ISSUE-008`。
- 重要任务必须编号，例如 `TASK-003`。
- 不要把所有技术细节都塞进本文档，本文档只记录进度、问题、结论和下一步。

---

## 10. 学习与下一步建议

### 10.1 当前最值得学习的主题

- 支付回调
- 订单状态机
- 库存预留与释放
- 优惠券规则
- 幂等性
- 生产环境数据库
- 认证与 Cookie 安全策略

### 10.2 当前不建议急着做的事情

- 在核心交易链路不稳定前继续堆新功能
- 未完成风险分析前直接上线
- 同时修改过多模块
- 在没有明确优先级前做大范围重构

### 10.3 建议下一步

1. 先基于 payments 全量问题清单，决定是否进入整改设计
2. 再分析 orders 与 coupons
3. 再分析 inventory
4. 再分析 auth 与 database
5. 最后形成上线前整改清单

---

## 11. 备注

- 本文档会长期维护。
- 后续所有重要分析和决策，都优先同步到本文档。
- 如果文档结构后期需要调整，可以在保留历史信息的前提下逐步优化。
