# payment_config 表关联分析

## 📊 当前数据情况

### payment_config 表内容

| id | payment_method | display_name | is_enabled | is_sandbox | config_json |
|----|---------------|--------------|------------|------------|-------------|
| 1 | paypal | PayPal | 1 | 1 | {API credentials...} |
| 2 | alipay | 支付宝 | 1 | 1 | {} |
| 3 | stripe | Stripe | 0 | 1 | {} |

**注意**: Stripe 当前是禁用状态 (`is_enabled: 0`)

### payment_error_codes 表内容

| platform | original_code | unified_code | message_zh |
|----------|--------------|--------------|------------|
| paypal | USER_CANCEL | USER_CANCEL | 用户取消支付 |
| alipay | USER_CANCEL | USER_CANCEL | 用户取消支付 |
| stripe | USER_CANCEL | USER_CANCEL | 用户取消支付 |

### payment_logs 表内容

| order_number | payment_method | error_code | status |
|--------------|----------------|------------|--------|
| QO1776847473470153 | stripe | USER_CANCEL | cancelled |
| QO1776847402990332 | alipay | USER_CANCEL | cancelled |
| QO177684737490759 | paypal | USER_CANCEL | cancelled |

---

## 🤔 核心问题分析

### payment_config 的作用是什么？

```
┌─────────────────────────────────────────────────────────┐
│              payment_config 表（配置表）                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  payment_method:    支付通道标识（paypal/alipay/stripe） │
│  display_name:     前端显示名称（PayPal/支付宝/Stripe）  │
│  is_enabled:       是否启用（1/0）                      │
│  is_sandbox:       是否沙箱环境（1/0）                   │
│  config_json:      API 密钥配置（敏感信息！）            │
│  sort_order:       前端显示排序                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 其他表存储了什么？

| 表名 | payment_method | display_name | 多语言 | 说明 |
|------|----------------|--------------|--------|------|
| `payment_error_codes` | ✅ 有 | ❌ 无 | ✅ 有（错误消息） | 错误码和错误消息 |
| `payment_logs` | ✅ 有 | ❌ 无 | ❌ 无 | 支付日志 |
| `order_status_logs` | ❌ 无 | ❌ 无 | ❌ 无 | 状态变更日志 |

---

## 💡 专业建议：分离关注点

### 核心原则

```
payment_error_codes 的职责：存储平台特定错误码和错误消息
payment_config 的职责：存储支付方式配置和显示名称
payment_logs 的职责：记录支付日志
```

### 我的专业建议

#### 1️⃣ payment_error_codes **不需要** 关联 payment_config

**原因**：

```
┌────────────────────────────────────────────────────────┐
│          payment_error_codes 表设计（当前）              │
├────────────────────────────────────────────────────────┤
│                                                          │
│  platform:      'paypal'                               │
│  original_code: 'USER_CANCEL'                          │
│  unified_code:  'USER_CANCEL'                           │
│  message_zh:    '用户取消支付'  ← 已经包含中文错误消息  │
│  message_en:    'User cancelled payment'                │
│  message_ar:    'إلغاء الدفع من قبل المستخدم'          │
│                                                          │
│  ✅ 这些错误消息已经足够了，不需要再关联 display_name    │
│                                                          │
└────────────────────────────────────────────────────────┘
```

**结论**：
- ❌ 不需要 `payment_error_codes.display_name`
- ✅ `payment_error_codes` 是自包含的，查询时通过 `message_zh/en/ar` 显示错误消息
- ✅ `payment_logs.error_code` 直接关联 `payment_error_codes.original_code` 就够了

---

#### 2️⃣ payment_logs **可以** 关联 payment_config（可选）

**两种方案**：

**方案 A：直接存储 display_name（推荐）**

```sql
ALTER TABLE payment_logs ADD COLUMN payment_method_display_name VARCHAR(100);
```

**优点**：
- 查询时不需要 JOIN
- 显示支付方式名称更方便
- 日志表包含完整信息

**缺点**：
- 数据冗余（display_name 存储了两次）
- 如果需要修改显示名称，需要同时更新两个地方

**方案 B：通过 JOIN 获取 display_name**

```sql
SELECT
  pl.*,
  pc.display_name,
  pec.message_zh
FROM payment_logs pl
LEFT JOIN payment_config pc
  ON pl.payment_method = pc.payment_method
LEFT JOIN payment_error_codes pec
  ON pl.error_code = pec.original_code
  AND pl.payment_method = pec.platform
```

**优点**：
- 数据一致性（单一数据源）
- 修改 display_name 时只需要改一处

**缺点**：
- 查询时需要 JOIN
- 如果 payment_config 被删除，日志显示会受影响

**我的建议**：

对于 `payment_logs` 表，推荐 **方案 A（直接存储 display_name）**，因为：
1. 日志表需要快速查询，不需要每次都 JOIN
2. display_name 很少修改，即使修改也不影响业务逻辑
3. 日志记录的是"当时"的显示名称，历史记录应该保持不变

---

#### 3️⃣ 前端支付选择页面 **需要** 关联 payment_config

```typescript
// 前端获取支付方式列表
const paymentMethods = await query(
  'SELECT payment_method, display_name FROM payment_config WHERE is_enabled = 1 ORDER BY sort_order'
);
```

**原因**：
- 需要动态判断哪些支付方式可用
- 需要动态获取显示名称
- 需要判断是否沙箱环境

---

## 🎯 推荐的关联关系

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ┌────────────────────┐                                     │
│   │  payment_config    │                                     │
│   ├────────────────────┤                                     │
│   │ payment_method     │                                     │
│   │ display_name       │                                     │
│   │ is_enabled         │                                     │
│   │ is_sandbox         │                                     │
│   └────────────────────┘                                     │
│           │                                                  │
│           │ payment_method                                    │
│           │                                                  │
│   ┌───────┴─────────────────┐                                │
│   │                         │                                │
│   ▼                         ▼                                │
│ ┌─────────────────┐  ┌────────────────────┐                 │
│ │ payment_logs    │  │ payment_error_codes │                 │
│ ├─────────────────┤  ├────────────────────┤                 │
│ │ payment_method  │  │ platform           │                 │
│ │ error_code ─────┼─►│ original_code      │                 │
│ │                 │  │ message_zh/en/ar  │                 │
│ │ display_name?   │  │ (自包含)           │                 │
│ │ (可选，建议存储) │  └────────────────────┘                 │
│ └─────────────────┘                                        │
│           │                                                  │
│           │ payment_method                                   │
│           │                                                  │
│           ▼                                                  │
│   前端支付选择页面 ← 获取 is_enabled, display_name, sort_order │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 具体实施建议

### 当前状态

✅ `payment_error_codes` **不需要** 关联 `payment_config`
- 已有完整的错误消息（message_zh/en/ar）
- 平台标识已经足够（platform）

⚠️ `payment_logs` **可以** 存储 `display_name`（可选）
- 推荐存储，但不强制
- 如果不存储，查询时 JOIN

✅ `payment_config` 主要用于 **前端支付选择**
- 判断哪些支付方式可用
- 获取显示名称
- 判断沙箱/生产环境

---

## 🔍 查询示例

### 查询 payment_logs（不关联 payment_config）

```sql
SELECT
  pl.id,
  pl.order_number,
  pl.payment_method,
  pl.status,
  pec.message_zh as error_message
FROM payment_logs pl
LEFT JOIN payment_error_codes pec
  ON pl.error_code = pec.original_code
  AND pl.payment_method = pec.platform
WHERE pl.order_id = 1
```

### 查询 payment_logs（关联 payment_config 获取 display_name）

```sql
SELECT
  pl.id,
  pl.order_number,
  pl.payment_method,
  pc.display_name,
  pl.status,
  pec.message_zh as error_message
FROM payment_logs pl
LEFT JOIN payment_config pc
  ON pl.payment_method = pc.payment_method
LEFT JOIN payment_error_codes pec
  ON pl.error_code = pec.original_code
  AND pl.payment_method = pec.platform
WHERE pl.order_id = 1
```

### 前端支付选择页面查询

```sql
SELECT
  payment_method,
  display_name,
  is_enabled,
  is_sandbox
FROM payment_config
WHERE is_enabled = 1
ORDER BY sort_order
```

---

## ✅ 总结

### payment_config 表的作用

| 用途 | 是否关联 | 说明 |
|------|---------|------|
| 支付方式配置 | ✅ 必需 | 存储 API 密钥、启用状态等 |
| 前端支付选择 | ✅ 必需 | 获取 display_name、is_enabled、sort_order |
| 支付日志显示 | ⚠️ 可选 | display_name 可以直接存储在 payment_logs |
| 错误消息显示 | ❌ 不需要 | payment_error_codes 自包含错误消息 |

### 我的建议

1. ✅ **保持现状**：payment_error_codes 不需要关联 payment_config
2. ⚠️ **可选优化**：payment_logs 可以存储 display_name
3. ✅ **前端必需**：支付选择页面必须查询 payment_config
4. ✅ **职责分离**：payment_config 是配置表，其他表是数据表

### 不建议的改动

❌ **不要** 在 payment_error_codes 中添加 display_name
- 错误消息已经足够了
- 添加会导致职责混乱

❌ **不要** 强制 payment_logs 必须 JOIN payment_config
- 日志表应该独立可用
- 可以作为可选优化

---

## 📝 结论

`payment_config` 表主要服务于：
1. ✅ **支付方式配置**（核心）
2. ✅ **前端支付选择**（必需）
3. ⚠️ **支付日志显示名称**（可选）

**不需要** 与 `payment_error_codes` 关联，因为错误消息已经是自包含的。

**可以** 与 `payment_logs` 关联（可选），但不是必需的。
