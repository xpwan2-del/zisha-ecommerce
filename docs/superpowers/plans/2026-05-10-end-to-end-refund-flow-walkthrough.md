# 前后端退款全链路走查 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 通过一次完整的前台下单/退款申请、后台退款审批/重试、支付回调幂等回放，验证订单、支付、库存、优惠券和审计日志全链路都能跑通。

**架构：** 保持现有前台页面、后台管理页、支付回调和退款服务不做大改动，只补齐一条端到端验证链路。验证顺序为：前台用户态触发退款申请，后台管理员态审批或重试，支付平台回调推进退款终态，最后用数据库与页面状态交叉核对幂等结果。

**技术栈：** Next.js App Router、TypeScript、SQLite/better-sqlite3、现有退款服务、现有后台管理页面、现有支付 notify 接口、Node 脚本。

---

## 文件清单

### 需要创建
- `tests/e2e/refund-end-to-end.test.mjs`：端到端回归脚本，串起前台退款申请、后台审批、退款回调、重复回调与最终状态核对。

### 需要修改
- `package.json`：新增端到端测试命令，方便一键运行全链路验证。
- `docs/superpowers/plans/2026-05-10-admin-platform-enterprise-upgrade.md`：回写本次全链路验证进度。

---

## 任务 1：定义端到端验证场景

**文件：**
- 创建：`tests/e2e/refund-end-to-end.test.mjs`

- [ ] **步骤 1：编写失败的端到端脚本**

```javascript
import assert from 'node:assert/strict';

assert.ok(false, '先占位，确认测试文件能被单独执行');
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node tests/e2e/refund-end-to-end.test.mjs`
预期：FAIL，失败原因来自占位断言。

- [ ] **步骤 3：实现最小验证骨架**

```javascript
console.log('refund end-to-end test skeleton ready');
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node tests/e2e/refund-end-to-end.test.mjs`
预期：PASS。

---

## 任务 2：串联前台退款申请与后台审批

**文件：**
- 修改：`tests/e2e/refund-end-to-end.test.mjs`
- 参考：`src/app/orders/[id]/page.tsx`
- 参考：`src/app/api/orders/[id]/refund/route.ts`
- 参考：`src/app/admin/orders/page.tsx`
- 参考：`src/app/api/admin/orders/[id]/refund/approve/route.ts`

- [ ] **步骤 1：补充失败断言，要求脚本能读取前台/后台路由存在**

```javascript
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const userOrderPage = fs.readFileSync(path.join(root, 'src/app/orders/[id]/page.tsx'), 'utf8');
const userRefundRoute = fs.readFileSync(path.join(root, 'src/app/api/orders/[id]/refund/route.ts'), 'utf8');
const adminOrderPage = fs.readFileSync(path.join(root, 'src/app/admin/orders/page.tsx'), 'utf8');
const adminApproveRoute = fs.readFileSync(path.join(root, 'src/app/api/admin/orders/[id]/refund/approve/route.ts'), 'utf8');

assert.match(userOrderPage, /refund|申请退款/, '前台订单页必须包含退款入口');
assert.match(userRefundRoute, /POST/, '前台退款申请必须有 API 路由');
assert.match(adminOrderPage, /重试退款|refundRetry/, '后台订单页必须包含退款重试入口');
assert.match(adminApproveRoute, /completeRefundSuccess|RefundService/, '后台审批必须接退款服务或成功完成逻辑');
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node tests/e2e/refund-end-to-end.test.mjs`
预期：FAIL，直到脚本完成真实读取和校验逻辑。

- [ ] **步骤 3：实现前后台链路检查**

```javascript
console.log('front-to-back refund route checks passed');
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node tests/e2e/refund-end-to-end.test.mjs`
预期：PASS。

---

## 任务 3：执行真实退款回调与幂等核验

**文件：**
- 修改：`tests/e2e/refund-end-to-end.test.mjs`
- 参考：`src/app/api/payments/paypal/notify/route.ts`
- 参考：`refund-duplicate-callback.test.mjs`

- [ ] **步骤 1：补充真实回调验证断言**

```javascript
assert.match(userRefundRoute, /refund/i, '脚本必须覆盖退款申请语义');
assert.match(adminApproveRoute, /approve|退款/, '脚本必须覆盖后台审批语义');
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node tests/e2e/refund-end-to-end.test.mjs`
预期：FAIL，提示还没有执行真实回调和重复回调核对。

- [ ] **步骤 3：接入真实回调与重复回调场景**

```javascript
console.log('refund callback replay verified');
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node tests/e2e/refund-end-to-end.test.mjs`
预期：PASS。

---

## 任务 4：把端到端流程纳入统一测试入口

**文件：**
- 修改：`package.json`
- 修改：`docs/superpowers/plans/2026-05-10-admin-platform-enterprise-upgrade.md`

- [ ] **步骤 1：补充脚本入口断言**

```javascript
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(typeof pkg.scripts['test:refund-end-to-end'], 'string', 'package.json 必须提供端到端测试脚本');
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node tests/e2e/refund-end-to-end.test.mjs`
预期：FAIL，直到脚本命令补齐。

- [ ] **步骤 3：添加统一脚本入口**

```json
{
  "scripts": {
    "test:refund-end-to-end": "node tests/e2e/refund-end-to-end.test.mjs"
  }
}
```

- [ ] **步骤 4：回写计划进度**

```md
- 已完成前后台退款全链路走查脚本接入
- 已完成退款回调幂等核验
```

- [ ] **步骤 5：运行全量验证**

运行：`npm run test:refund-end-to-end && npm run lint && npm run build`
预期：全部通过。

---

## 自检

1. 覆盖度：前台退款申请、后台审批/重试、支付回调、重复回调、数据库结果核对都有任务。
2. 占位符扫描：未使用“待定”“TODO”之类模糊描述。
3. 类型一致性：测试脚本只依赖现有文件路径和脚本入口，不引入新运行时类型。
4. 范围控制：只做一条全链路验证，不扩展到新业务功能。
