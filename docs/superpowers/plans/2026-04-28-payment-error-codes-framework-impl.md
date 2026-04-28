# 支付错误码框架（PayPal 首批落地）实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 或在当前会话内按任务逐步实现。步骤使用复选框（`- [ ]`）跟踪进度。

**目标：**
- 建立多支付平台通用的错误码落库与映射机制，统一沉淀到 `payment_error_codes`。
- 首批落地 PayPal：统一 create / notify 链路的错误码映射来源，支持 `NAME:` / `ISSUE:` / `HTTP_` 前缀，并实现运行时兜底“只补齐空字段”。

**架构：**
- 新增一个通用模块负责：从平台错误结构抽取 `name` / `issues`，生成 `original_code` 候选列表，按 `priority` 命中最佳映射；对未知码执行 UPSERT（仅补齐空字段）。
- 新增一个导入脚本：从 `scripts/payment_error_sources/*.json` 导入预置错误码，使用 UPSERT 覆盖旧数据。

**技术栈：**
- Next.js Route Handlers、SQLite、现有 `query()` 工具函数、Node.js 脚本（sqlite3）。

---

## 文件清单与职责

**新增：**
- `src/lib/payment/errorCodeMapper.ts`：通用错误码提取、查询、兜底入库（C 策略）、选择最佳提示。
- `scripts/payment_error_sources/paypal_error_codes.json`：PayPal 预置错误码源文件（NAME + ISSUE）。
- `scripts/import_payment_error_codes.js`：导入所有平台源文件到 `payment_error_codes`（UPSERT 覆盖）。

**修改：**
- `src/app/api/payments/paypal/route.ts`：移除 `paypal_error_codes` 依赖，统一走 `payment_error_codes`。
- `src/app/api/payments/paypal/notify/route.ts`：错误映射改为通用模块（issue 优先），并触发兜底入库。

---

## 任务 1：实现通用错误码映射模块

**文件：**
- 创建：`src/lib/payment/errorCodeMapper.ts`

- [ ] 设计 TypeScript 接口：输入 `platform`、`lang`、`httpStatus?`、`name?`、`details?`，输出 `{ unifiedCode, errorType, message, matchedOriginalCode }`
- [ ] 实现 `toOriginalCodes()`：生成 `ISSUE:`/`NAME:`/`HTTP_` 候选列表
- [ ] 实现 `ensureCodesExistFillEmpty()`：对候选码执行 UPSERT（仅补齐 message_* 空字段）
- [ ] 实现 `pickBestMapping()`：对候选码查询 `payment_error_codes`，按 issue 优先 + priority 最大选一条

**验证：**
- [ ] 写一个一次性 node 脚本片段（或在 route 内临时调用）验证：传入一个不存在的 `ISSUE:FOO` 会被插入到表中

---

## 任务 2：添加 PayPal 预置错误码源文件 + 导入脚本

**文件：**
- 创建：`scripts/payment_error_sources/paypal_error_codes.json`
- 创建：`scripts/import_payment_error_codes.js`

- [ ] `paypal_error_codes.json` 至少包含现有 init 脚本里的常见码，且同时提供 `NAME:` 与 `ISSUE:` 两类
- [ ] `import_payment_error_codes.js`：
  - 扫描 `scripts/payment_error_sources/*.json`
  - 将每条记录写入 `payment_error_codes`（UPSERT 覆盖）
  - `original_code` 按 `code_kind` 拼接为 `NAME:`/`ISSUE:`

**验证：**
- [ ] 运行：`node scripts/import_payment_error_codes.js`
- [ ] 运行 SQL 统计：`select platform, count(*) from payment_error_codes group by platform`

---

## 任务 3：PayPal create 链路统一走 payment_error_codes

**文件：**
- 修改：`src/app/api/payments/paypal/route.ts`

- [ ] 替换原 `getPayPalErrorInfo()`（paypal_error_codes）为通用模块
- [ ] PayPal API 非 2xx 时：解析 `name` + `details[]`，映射出 `unified_code/error_type/message`，并触发兜底入库（仅补齐空字段）
- [ ] API 返回维持统一格式：`{ success:false, error, error_type, message }`

**验证：**
- [ ] 手动制造一个 PayPal 错误（例如配置缺失/无效），确认返回的 `error` 是统一码且 message 可控

---

## 任务 4：PayPal notify/capture 链路统一映射与兜底入库

**文件：**
- 修改：`src/app/api/payments/paypal/notify/route.ts`

- [ ] 捕获失败时：解析 PayPal 失败响应 `name/details`，用通用模块映射
- [ ] 支付日志落库：保存 `platform_order_id`、`error_code`（统一码）、`raw_response`

**验证：**
- [ ] 正常支付一次（或用已支付订单触发 ORDER_ALREADY_CAPTURED），确认日志写入与状态更新正常

---

## 任务 5：回归验证

- [ ] `npm run build`
- [ ] 本地走一次 quick-order → PayPal 下单 → 回跳 → notify
- [ ] 检查 `payment_error_codes` 是否因运行时兜底新增了记录（只补齐空字段，不覆盖人工字段）

