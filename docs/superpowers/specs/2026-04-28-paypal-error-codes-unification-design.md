# 支付错误码全覆盖与统一映射设计（PayPal 首批落地）

> **面向 AI 代理的工作者：** 必需子技能：先完成本文档确认，再使用 superpowers:writing-plans 生成可执行实现计划。

**目标：**
- 建立一套面向多支付平台的统一错误码框架，将各平台的“错误大类 + 细粒度原因”沉淀到 `payment_error_codes`，实现错误码长期可运营、可扩展、可追踪。
- 首批落地 PayPal：将 PayPal 可能出现的 `name` + `details[].issue` 全量纳入 `payment_error_codes`（含预置 + 运行时兜底），确保错误码“永不漏”。
- 统一全项目 PayPal 错误映射逻辑只依赖 `payment_error_codes`，消除 `paypal_error_codes` 与 `payment_error_codes` 并存导致的覆盖不完整。
- 允许预置数据覆盖旧数据；运行时兜底仅补齐空字段，避免覆盖人工维护的中文/阿语文案与归一化映射。

**范围：**
- 通用框架：面向任意支付平台（PayPal、支付宝、Stripe，以及未来新增平台）的一致性建模与落库规则。
- 首批落地：PayPal（`platform='paypal'`）错误码采集与映射策略。
- 适用链路：下单（create）、回调确认（capture/notify）、取消（cancel）等链路中错误码映射的一致性。

---

## 现状问题

1. `payment_error_codes` 表中已有 PayPal 记录，但数量有限且不保证覆盖完整。
2. 代码中 PayPal 错误码来源不统一：
   - notify/cancel 走 `payment_error_codes`
   - create 仍存在对 `paypal_error_codes`（另一张表）的依赖路径
3. 当 PayPal 返回未知错误码时，系统无法给出可控的归一化错误码与多语言提示，也无法沉淀到 DB 形成“自进化”的错误码库。
4. 平台层面：系统除 PayPal 外还包含支付宝、Stripe，且未来会接入更多支付平台，若无统一框架会导致多平台错误码无法运营、无法复用工具链。

---

## 通用框架：目标响应与映射约定

### 错误码来源

支付平台错误通常具备“两层结构”（具体字段名因平台不同而不同）：
- 错误大类（Name）：用于表达请求层面的通用错误/分类（例如 PayPal 的 `name`）。
- 细粒度原因（Issue）：用于表达更具体的可运营错误原因（例如 PayPal 的 `details[].issue`）。

需要同时存储两类 key，且在显示/归一化时优先使用 Issue。

### `payment_error_codes` 中 `original_code` 命名规范（选项 3 落地）

为兼容现有唯一键 `UNIQUE(platform, original_code)`，并同时存储 name 与 issue，使用前缀区分：
- `NAME:<platform_name>`
  - 示例：`NAME:UNPROCESSABLE_ENTITY`
- `ISSUE:<platform_issue>`
  - 示例：`ISSUE:INSTRUMENT_DECLINED`
- HTTP 状态码保留现有风格：
  - 示例：`HTTP_422`

---

## 预置策略（尽量全）

### 权威源文件

在仓库内新增“权威源文件”，用于沉淀各支付平台官网/规范整理出来的错误码清单（可审计、可追踪）：
- 目录建议：`scripts/payment_error_sources/`
- 文件建议：`<platform>_error_codes.json`（例如 `paypal_error_codes.json`、`alipay_error_codes.json`、`stripe_error_codes.json`）

建议数据结构（示意）：

```json
[
  {
    "code_kind": "NAME",
    "code": "UNPROCESSABLE_ENTITY",
    "unified_code": "INVALID_REQUEST",
    "error_type": "fail",
    "priority": 10,
    "message_en": "The requested action could not be performed, semantically incorrect, or failed business validation."
  },
  {
    "code_kind": "ISSUE",
    "code": "INSTRUMENT_DECLINED",
    "unified_code": "CARD_DECLINED",
    "error_type": "fail",
    "priority": 40,
    "message_en": "Payment method was declined."
  }
]
```

### 导入/覆盖规则（允许覆盖旧数据）

新增导入脚本，将源文件批量写入 `payment_error_codes`：
- 以 `platform='<platform>'` 固定
- `original_code` 按规范拼接：`NAME:` / `ISSUE:`
- 采用 UPSERT（存在即更新），覆盖字段：
  - `unified_code`
  - `error_type`
  - `priority`
  - `message_en/message_zh/message_ar`（以源文件为准，可用于纠正旧数据）
  - `is_active`

---

## 运行时兜底策略（永不漏）

当某支付平台返回非 2xx 时，从响应体提取：
- Name → 生成 `NAME:<name>`
- Issue 列表 → 生成 `ISSUE:<issue>`（逐条）

### 兜底写库规则（只补齐空字段）

对每个生成的 `original_code`：
- 若记录不存在：插入新记录（`unified_code` 默认 `UNKNOWN_ERROR`，`error_type` 默认 `fail`，`priority=0`）
- 若记录存在：仅补齐空字段（C 策略）
  - `message_en/message_zh/message_ar` 仅在当前字段为空时填充
  - `unified_code/error_type/priority` 不覆盖（避免冲掉人工映射/预置）

message 来源优先级：
- `details[].description`（更具体）优先
- 其次 `message`（若有）

---

## 映射查询优先级（Issue 优先）

在需要把支付平台错误映射为系统统一错误码与用户提示时：

1. 如果响应包含 `details[].issue`：
   - 针对每个 issue 查 `payment_error_codes`：`original_code = ISSUE:<issue>`
   - 多条命中时选 `priority` 最大的一条
2. 否则/兜底：
   - 查 `original_code = NAME:<name>`
3. 仍未命中：
   - 触发运行时兜底入库（只补齐空字段）后返回 `UNKNOWN_ERROR`

---

## 代码侧统一策略（消除双表）

必须将 PayPal 全链路错误码映射统一到 `payment_error_codes`：
- 创建 PayPal 订单（create）不再依赖 `paypal_error_codes` 表
- notify/cancel 等链路保持并统一按上述规范查 `payment_error_codes`

---

## 验证与验收

### 功能验收

- 预置导入后：
  - `payment_error_codes` 中存在大量 PayPal 记录（NAME/ISSUE 前缀）
  - 旧记录可被纠正覆盖（以源文件为准）
- 运行时遇到未知 PayPal `name/issue`：
  - DB 自动新增记录或补齐空字段
  - 不覆盖人工维护字段（C 策略）
- 业务逻辑：
  - 映射优先使用 ISSUE，命中多条时以 priority 决定
  - 返回给前端的错误码与 message 可控且一致

### 日志验收（monitor）

- 记录“未知码入库”的监控事件（包含 original_code / order_number / paypal id / 是否新增或补齐）

---

## 非目标（本次不做）

- 不做 Stripe/支付宝 的全面错误码整理（本设计给出通用框架，后续按相同流程扩展预置源文件即可）
- 不做支付金额落库一致性修复（属于另一条链路问题）
