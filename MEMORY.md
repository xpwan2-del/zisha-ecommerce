# Zisha Ecommerce 项目记忆文件 (MEMORY.md)

## 项目当前状态 (截至 2026-05-10)

### 1. 核心功能与架构决策
- **价格计算 (SSOT)**: 统一使用 `OrderPriceBreakdown` 组件展示价格明细。后端接口 `/api/orders/[id]/estimate` 用于实时计算价格。
- **全局 Loading 标准**: 
  - 样式: 蓝色圆圈 (Spinner)。
  - 颜色变量: `var(--loading-color)`。
  - 实现方式: `GlobalLoadingOverlay` 用于页面跳转保护。
- **身份校验**: 通过 `AuthContext` 维护登录状态及全局导航锁定。

### 2. UI/UX 规范
- **加载动画**: 全站统一使用标准 Spinner，避免 `border-accent` 或其他硬编码颜色。
- **订单详情**: 价格汇总区必须置于支付方式选择器下方，且与购物车样式完全一致。

### 3. 已知问题与待办事项 (TODO)
- [ ] **Loading 统一性**: 检查并修复仍为黄色或大小不一的 Loading 圈。
- [ ] **Order 192 审计**: 深入调查订单 192 的价格计算逻辑、优惠券应用、库存流水及支付平台金额校验。
- [ ] **交互修复**: 修复购物车点击加减时的页面闪烁。
- [ ] **状态流转**: 优化支付结果页的校验逻辑，防止手动修改 URL 参数绕过逻辑。
- [ ] **冗余清理**: 根据审计报告（16个无用 API，5个空壳页面，5个未引用组件）执行删除。

### 4. 工作区与分支规则
- **强制规则：所有后续开发、测试、文件修改都必须在主工作区 `/Users/davis/zisha-ecommerce` 执行。**
- **禁止规则：不要再新建或使用 `.worktrees/*` 进行本项目开发，除非用户明确要求。**
- **执行前检查：涉及代码修改、测试脚本、页面联调、合并前，必须先确认当前目录是主工作区，不是 worktree。**
- **原因：当前项目大量前端、后台、支付、订单状态机改动都集中在主工作区未提交状态，worktree 会导致上下文分裂和遗漏。**

### 5. 关键文件路径
- 全局样式: `src/app/globals.css`
- 价格组件: `src/components/order/OrderPriceBreakdown.tsx`
- 快速下单: `src/app/quick-order/page.tsx`
- 订单详情: `src/app/orders/[id]/page.tsx`
- 全局加载: `src/components/common/GlobalLoadingOverlay.tsx`

---
*此文件由 GPT-5.5 自动维护，用于持久化项目决策和进度。*
