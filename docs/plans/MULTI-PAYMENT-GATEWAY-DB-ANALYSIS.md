# 多支付通道数据库完整架构分析

## 📊 一、系统整体数据关系图

### 1.1 完整 ER 关系图（支付 + 订单 + 库存）

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              核心订单流程                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│    ┌──────────────┐         ┌──────────────────┐         ┌──────────────────┐   │
│    │   orders     │         │  order_items      │         │ order_payments   │   │
│    ├──────────────┤         ├──────────────────┤         ├──────────────────┤   │
│    │ id           │◄────────│ order_id          │         │ id               │   │
│    │ order_number │         │ product_id       │         │ order_id         │──►│
│    │ user_id      │◄───────►│ id               │         │ payment_method   │   │
│    │ order_status │         │ quantity         │         │ transaction_id   │   │
│    │ payment_status         │ price            │         │ amount           │   │
│    │ final_amount │         └──────────────────┘         │ currency         │   │
│    │ created_at   │                                       │ payment_status   │   │
│    └──────────────┘                                       │ extra_data (JSON)│   │
│           │                                               │ raw_response     │   │
│           │                                               └──────────────────┘   │
│           │                                                       │              │
│           │                                                       │              │
│           ▼                                                       ▼              │
│    ┌──────────────────────────────────────────────────────────────┐             │
│    │              payment_logs (统一支付日志)                       │             │
│    ├──────────────────────────────────────────────────────────────┤             │
│    │ id                                                         │             │
│    │ order_id ───────────────────────────────────────────────────┘             │
│    │ order_number                                                     │             │
│    │ payment_method (paypal/alipay/stripe)                    │             │
│    │ platform_order_id (PayPal Order ID)                       │             │
│    │ transaction_id (支付交易ID)                                 │             │
│    │ amount                                                          │             │
│    │ currency                                                        │             │
│    │ status (success/failed/cancelled)                             │             │
│    │ error_code ──────────────────────────────────────────────────────────┐   │
│    │ raw_response (完整原始响应)                                     │             │   │
│    │ extra_data (JSON平台特定数据)                                   │             │   │
│    │ is_success                                                      │             │   │
│    │ payment_stage (created/approved/captured/cancelled)            │             │   │
│    │ created_at                                                       │             │   │
│    └────────────────────────────────────────────────────────────────│             │
│                                                                          │             │
│          ┌──────────────────────────────────────────────────────────────┘             │
│          │                                                                      │
│          ▼                                                                      │
│    ┌──────────────────────────────────────────────────────────────────────────┐  │
│    │                  payment_error_codes (统一错误码基础表)                      │  │
│    ├──────────────────────────────────────────────────────────────────────────┤  │
│    │ id                                                                         │  │
│    │ platform (paypal/alipay/stripe) ──────────────────────────────────────┐  │
│    │ original_code (平台原始码)                                                │  │
│    │ unified_code (统一码) ◄────────────────────────────────────────────────┘  │
│    │ error_type (success/fail/retry/cancel)                                         │
│    │ priority                                                                    │
│    │ message_zh                                                                   │
│    │ message_en                                                                   │
│    │ message_ar                                                                   │
│    │ is_active                                                                    │
│    │ created_at                                                                   │
│    └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           订单状态流转                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│    ┌──────────────────────────────┐                                              │
│    │ order_status_transitions     │                                              │
│    │ (订单状态转换规则基础表)       │                                              │
│    ├──────────────────────────────┤                                              │
│    │ id                          │                                              │
│    │ from_status (原状态)         │                                              │
│    │ to_status (目标状态)         │                                              │
│    │ event_code (事件码)          │                                              │
│    │ event_name (事件名称)         │                                              │
│    │ event_name_en               │                                              │
│    │ event_name_ar               │                                              │
│    │ is_allowed (是否允许)        │                                              │
│    └──────────────────────────────┘                                              │
│                  │                                                              │
│                  │ 关联                                                          │
│                  ▼                                                              │
│    ┌──────────────────────────────┐                                              │
│    │   order_status_logs          │                                              │
│    │   (订单状态变更日志)           │                                              │
│    ├──────────────────────────────┤                                              │
│    │ id                          │                                              │
│    │ order_id ───────────────────┴──────────► orders.id                        │
│    │ order_number                                                      │          │
│    │ old_status                                                       │          │
│    │ new_status                                                       │          │
│    │ event_code ──────────────────────────────────────────────────────────────┐ │
│    │ operator_type (user/system/admin)                                 │       │ │
│    │ operator_name                                                     │       │ │
│    │ extra_data (JSON)                                                 │       │ │
│    │ created_at                                                        │       │ │
│    └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                            库存变动流程                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│    ┌──────────────────────────────┐                                              │
│    │    transaction_type           │                                              │
│    │    (库存变动类型基础表)         │                                              │
│    ├──────────────────────────────┤                                              │
│    │ id                          │                                              │
│    │ code (sales_creat等)        │                                              │
│    │ name_zh                     │                                              │
│    │ name_en                     │                                              │
│    │ name_ar                     │                                              │
│    │ information (扣除/归还/增加)   │                                              │
│    │ description_zh              │                                              │
│    └──────────────────────────────┘                                              │
│                  │                                                              │
│                  │ 关联                                                          │
│                  ▼                                                              │
│    ┌──────────────────────────────┐                                              │
│    │  inventory_transactions      │                                              │
│    │  (库存变动流水)               │                                              │
│    ├──────────────────────────────┤                                              │
│    │ id                          │                                              │
│    │ product_id ──────────┐       │                                              │
│    │ product_name         │       │                                              │
│    │ quantity_change      │       │                                              │
│    │ quantity_before      │       │                                              │
│    │ quantity_after       │       │                                              │
│    │ reason              │       │                                              │
│    │ reference_type       │       │                                              │
│    │ reference_id         │       │                                              │
│    │ operator_id          │       │                                              │
│    │ operator_name        │       │                                              │
│    │ transaction_type_id ──┴───────┘◄──── transaction_type.id                   │
│    │ created_at                 │                                             │
│    └──────────────────────────────┘                                             │
│                                      │                                          │
│                                      ▼                                          │
│                              ┌──────────────┐                                  │
│                              │  inventory   │                                  │
│                              ├──────────────┤                                  │
│                              │ product_id   │◄── inventory_transactions        │
│                              │ quantity     │                                  │
│                              │ reserved_qty │                                  │
│                              │ updated_at   │                                  │
│                              └──────────────┘                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 二、支付相关表详细说明

### 2.1 `payment_config` - 支付配置表

```sql
CREATE TABLE payment_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_method VARCHAR(50) UNIQUE NOT NULL,    -- paypal/alipay/stripe
  display_name VARCHAR(100) NOT NULL,            -- 显示名称
  is_enabled BOOLEAN DEFAULT 1,                 -- 是否启用
  is_sandbox BOOLEAN DEFAULT 1,                 -- 是否沙箱环境
  config_json TEXT,                              -- 平台配置(JSON)
  sort_order INTEGER DEFAULT 0,                  -- 排序
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**当前数据**：

| id | payment_method | display_name | is_enabled | is_sandbox | 说明 |
|----|---------------|--------------|------------|------------|------|
| 1 | paypal | PayPal | 1 | 1 | PayPal 沙箱环境 |
| 2 | alipay | Alipay+ | 1 | 1 | Alipay+ 沙箱环境 |
| 3 | stripe | Stripe | 1 | 1 | Stripe 沙箱环境 |

**关联关系**：

```
payment_config
    │
    │ payment_method
    ▼
┌────────────────────────────────────────────────────┐
│                   支付创建流程                        │
├────────────────────────────────────────────────────┤
│                                                     │
│   用户点击支付 ──► API 创建支付 ──► 返回 payment_url  │
│       │              │                    │         │
│       │              ▼                    │         │
│       │      ┌──────────────┐             │         │
│       │      │payment_config│             │         │
│       │      │ 获取配置      │             │         │
│       │      └──────────────┘             │         │
│       │              │                    │         │
│       └──────────────┴────────────────────┘         │
│                                                     │
└────────────────────────────────────────────────────┘
```

### 2.2 `payment_error_codes` - 统一错误码基础表 ✅ **核心**

```sql
CREATE TABLE payment_error_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform VARCHAR(50) NOT NULL,                   -- paypal/alipay/stripe
  original_code VARCHAR(100) NOT NULL,             -- 平台原始错误码
  unified_code VARCHAR(100) NOT NULL,              -- 统一错误码
  error_type VARCHAR(50) DEFAULT 'fail',           -- success/fail/retry/cancel
  priority INTEGER DEFAULT 0,                      -- 优先级
  message_zh TEXT,                                 -- 中文消息
  message_en TEXT,                                 -- 英文消息
  message_ar TEXT,                                 -- 阿拉伯文消息
  is_active BOOLEAN DEFAULT TRUE,                  -- 是否启用
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, original_code)
);
```

**关联关系**：

```
payment_logs.error_code ──────────────► payment_error_codes.original_code
         │                                      │
         │                                      │ platform
         │                                      ▼
         │                    ┌────────────────────────────────┐
         │                    │ payment_error_codes            │
         │                    ├────────────────────────────────┤
         │                    │ 同一个 unified_code 可以对应     │
         │                    │ 多个平台的 original_code        │
         │                    │                                │
         │                    │ PayPal: COMPLETED ──────────────┼──► SUCCESS
         │                    │ Alipay: TRADE_SUCCESS ─────────┼──► SUCCESS
         │                    │ Stripe: succeeded ───────────────┼──► SUCCESS
         │                    │                                │
         │                    │ PayPal: INSTRUMENT_DECLINED ───┼──► CARD_DECLINED
         │                    │ Stripe: card_declined ─────────┼──► CARD_DECLINED
         │                    └────────────────────────────────┘
         │
         │ unified_code ◄─────────────────────────────┐
         │        │                                    │
         │        │                                    │
         │        ▼                                    │
         │  ┌──────────────────┐                      │
         │  │ 统一状态判断       │                      │
         │  ├──────────────────┤                      │
         │  │ SUCCESS ───► success                    │
         │  │ PAYMENT_CANCELLED ──► cancelled         │
         │  │ 其他 ───► failed                       │
         │  └──────────────────┘                      │
         │
         ▼
┌─────────────────────────────────────────────────────┐
│                 payment_logs 表                     │
├─────────────────────────────────────────────────────┤
│ id, order_id, payment_method, error_code, status  │
│                                                   │
│  通过 error_code 关联 payment_error_codes          │
│  获取多语言消息: message_zh, message_en, message_ar │
│                                                   │
└─────────────────────────────────────────────────────┘
```

**数据示例**：

| platform | original_code | unified_code | error_type | message_zh | 说明 |
|----------|--------------|--------------|------------|------------|------|
| paypal | COMPLETED | SUCCESS | success | 支付成功 | ✅ |
| paypal | ORDER_ALREADY_CAPTURED | SUCCESS | success | 订单已支付 | ✅ |
| paypal | INSTRUMENT_DECLINED | CARD_DECLINED | fail | 支付方式被拒绝，请更换银行卡 | ✅ |
| alipay | TRADE_SUCCESS | SUCCESS | success | 支付成功 | ✅ |
| stripe | succeeded | SUCCESS | success | 支付成功 | ✅ |

### 2.3 `payment_logs` - 统一支付日志表 ✅ **核心**

```sql
CREATE TABLE payment_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,                        -- 订单ID
  order_number VARCHAR(100) NOT NULL,               -- 订单号
  payment_method VARCHAR(50) NOT NULL,              -- 支付方式
  platform_order_id VARCHAR(100),                    -- 平台订单ID
  transaction_id VARCHAR(100),                       -- 支付交易ID
  amount DECIMAL(10,2) NOT NULL,                   -- 支付金额
  currency VARCHAR(10) NOT NULL,                    -- 货币
  status VARCHAR(50) NOT NULL,                      -- 支付状态
  error_code VARCHAR(100),                          -- 错误码 ◄──────┐
  error_message TEXT,                               -- 错误消息(冗余) │    │
  raw_response TEXT,                                -- 原始响应(JSON)  │    │
  extra_data TEXT DEFAULT '{}',                     -- 扩展数据(JSON)  │    │
  is_success BOOLEAN DEFAULT FALSE,                 -- 是否成功        │    │
  payment_stage VARCHAR(50),                        -- 支付阶段        │    │
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,    │                 │    │
);                                                  │                 │    │
                                                     │                 │    │
                                                     │                 │    │
                                                     └─────────────────┼────┘
                                                                       │
                                                                       ▼
                                                    ┌────────────────────────────────┐
                                                    │   payment_error_codes          │
                                                    ├────────────────────────────────┤
                                                    │ error_code ◄── original_code  │
                                                    │ 通过 unified_code 统一状态      │
                                                    │                                │
                                                    │ 获取多语言消息:                 │
                                                    │   message_zh                   │
                                                    │   message_en                   │
                                                    │   message_ar                   │
                                                    └────────────────────────────────┘
```

**关键关联说明**：

```
┌──────────────────────────────────────────────────────────────────┐
│                    payment_logs 与 payment_error_codes 关联       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. payment_logs.error_code = payment_error_codes.original_code │
│                                                                   │
│  2. 关联条件:                                                     │
│     payment_logs.payment_method = payment_error_codes.platform    │
│                                                                   │
│  3. 查询示例:                                                     │
│                                                                   │
│     SELECT                                                       │
│       pl.id,                                                     │
│       pl.order_number,                                           │
│       pl.payment_method,                                         │
│       pl.error_code,                                             │
│       pl.status,                                                 │
│       pec.unified_code,                                          │
│       pec.error_type,                                            │
│       pec.message_zh,                                            │
│       pec.message_en,                                            │
│       pec.message_ar                                             │
│     FROM payment_logs pl                                         │
│     LEFT JOIN payment_error_codes pec                             │
│       ON pl.error_code = pec.original_code                       │
│       AND pl.payment_method = pec.platform                      │
│     WHERE pl.order_id = 123;                                     │
│                                                                   │
│  4. 为什么要这样设计?                                             │
│                                                                   │
│     ┌─────────────────┐     ┌─────────────────┐                   │
│     │ payment_logs    │     │ payment_error   │                   │
│     │ (每次支付记录)   │     │ _codes          │                   │
│     ├─────────────────┤     ├─────────────────┤                   │
│     │ error_code:     │     │ original_code:  │                   │
│     │ "CARD_DECLINED" │────►│ "CARD_DECLINED" │                   │
│     │                 │     │ unified_code:   │                   │
│     │                 │     │ "CARD_DECLINED" │                   │
│     │                 │     │ message_zh:     │                   │
│     │                 │     │ "支付方式被拒绝" │                   │
│     │                 │     │ message_en:     │                   │
│     │                 │     │ "Card declined" │                   │
│     │                 │     │ message_ar:     │                   │
│     │                 │     │ "تم رفض البطاقة"│                   │
│     └─────────────────┘     └─────────────────┘                   │
│                                                                   │
│  5. 统一码的意义:                                                  │
│                                                                   │
│     PayPal:  CARD_DECLINED ──┐                                   │
│     Stripe:   card_declined ──┼──► CARD_DECLINED ──► "银行卡被拒" │
│     Alipay:   CARD_FORBIDDEN ─┘                                   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.4 `order_payments` - 订单支付记录表

```sql
CREATE TABLE order_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),  -- 订单ID
  payment_method VARCHAR(50) NOT NULL,              -- 支付方式
  transaction_id VARCHAR(100) UNIQUE,                -- 交易ID(幂等)
  amount DECIMAL(10,2) NOT NULL,                     -- 支付金额
  payment_status VARCHAR(20) DEFAULT 'pending',      -- paid/pending/failed
  paid_at TIMESTAMP,                                  -- 支付时间
  extra_data TEXT DEFAULT '{}',                       -- 扩展数据(JSON)
  raw_response TEXT,                                 -- 原始响应(JSON)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📊 三、各支付通道需要填充的基础数据

### 3.1 所有支付通道的错误码映射

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        payment_error_codes 表                            │
│                        (需要为所有通道填充数据)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PayPal 错误码 (11条)                                                    │
│  ├── COMPLETED ───────────────────────────────► SUCCESS (支付成功)      │
│  ├── ORDER_ALREADY_CAPTURED ─────────────────► SUCCESS (订单已支付)     │
│  ├── ORDER_NOT_APPROVED ─────────────────────► PAYMENT_NOT_COMPLETED    │
│  ├── INSTRUMENT_DECLINED ───────────────────► CARD_DECLINED (银行卡拒) │
│  ├── PAYER_CANNOT_PAY ───────────────────────► ACCOUNT_ERROR           │
│  ├── TRANSACTION_REFUSED ────────────────────► TRANSACTION_DECLINED    │
│  ├── TRANSACTION_REFUSED_BY_PAYER_RISK ─────► RISK_CONTROL (风险)      │
│  ├── PAYER_ACTION_REQUIRED ─────────────────► RETRY (需操作)           │
│  ├── HTTP_422 ───────────────────────────────► INVALID_REQUEST         │
│  ├── HTTP_500 ───────────────────────────────► SERVER_ERROR           │
│  └── HTTP_401 ───────────────────────────────► CONFIG_ERROR            │
│                                                                          │
│  Alipay 错误码 (6条)                                                     │
│  ├── TRADE_SUCCESS ───────────────────────────► SUCCESS (支付成功)       │
│  ├── ACQ.TRADE_HAS_CLOSED ───────────────────► TRADE_CLOSED (交易关闭)  │
│  ├── ACQ.PAYMENT_FAIL ───────────────────────► PAYMENT_FAILED (失败)   │
│  ├── ACQ.BuyerArrearage ─────────────────────► INSUFFICIENT_FUNDS (余额不足)│
│  ├── ACQ.EXIST_FORBIDDEN_CARD ───────────────► CARD_FORBIDDEN (卡受限)  │
│  └── ACQ.TRADE_BUYER_NOT_MATCHED ───────────► BUYER_MISMATCH (账号不匹配)│
│                                                                          │
│  Stripe 错误码 (9条)                                                     │
│  ├── succeeded ──────────────────────────────► SUCCESS (支付成功)       │
│  ├── card_declined ─────────────────────────► CARD_DECLINED (卡被拒)    │
│  ├── insufficient_funds ─────────────────────► INSUFFICIENT_FUNDS (余额不足)│
│  ├── expired_card ──────────────────────────► CARD_EXPIRED (卡过期)    │
│  ├── incorrect_cvc ─────────────────────────► CVC_ERROR (安全码错误)   │
│  ├── processing_error ─────────────────────► PROCESSING_ERROR (处理错误)│
│  ├── lost_card ─────────────────────────────► CARD_LOST (卡挂失)        │
│  ├── stolen_card ───────────────────────────► CARD_STOLEN (卡被盗)      │
│  └── charge_disputed ──────────────────────► CHARGE_DISPUTED (争议)    │
│                                                                          │
│  ⚠️  还需要新增的取消相关错误码 (6条)                                      │
│  ├── paypal: USER_CANCEL ───────────────────► USER_CANCEL (用户取消)   │
│  ├── alipay: USER_CANCEL ───────────────────► USER_CANCEL (用户取消)    │
│  ├── stripe: USER_CANCEL ───────────────────► USER_CANCEL (用户取消)    │
│  ├── paypal: TIMEOUT ───────────────────────► PAYMENT_TIMEOUT (超时)    │
│  ├── alipay: TIMEOUT ───────────────────────► PAYMENT_TIMEOUT (超时)   │
│  └── stripe: TIMEOUT ───────────────────────► PAYMENT_TIMEOUT (超时)    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 四、支付取消完整流程

### 4.1 PayPal 取消流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PayPal 支付取消完整流程                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. 用户在 PayPal 页面点击"取消"                                         │
│         │                                                                │
│         ▼                                                                │
│  2. PayPal 回调: /api/payments/paypal/cancel?token=ORD123456            │
│         │                                                                │
│         ▼                                                                │
│  3. 查询订单                                                              │
│     SELECT * FROM orders WHERE order_number = 'ORD123456'                │
│         │                                                                │
│         ▼                                                                │
│  4. 记录支付取消日志 ✅                                                   │
│     INSERT INTO payment_logs (                                          │
│       order_id, order_number, payment_method, status,                    │
│       error_code, raw_response, is_success                              │
│     ) VALUES (                                                          │
│       51, 'ORD123456', 'paypal', 'cancelled',                           │
│       'USER_CANCEL', '{"token":"xxx"}', false                          │
│     );                                                                   │
│         │                                                                │
│         ▼                                                                │
│  5. 可选: 记录订单状态变更日志                                            │
│     INSERT INTO order_status_logs (                                     │
│       order_id, old_status, new_status, event_code, extra_data          │
│     ) VALUES (                                                          │
│       51, 'pending', 'pending', 'pay_cancelled',                        │
│       '{"payment_method":"paypal","cancelled_at":"2026-04-26..."}'      │
│     );                                                                   │
│         │                                                                │
│         ▼                                                                │
│  6. 重定向到订单详情页                                                    │
│     /orders/51?cancelled=true                                           │
│         │                                                                │
│         ▼                                                                │
│  7. 前端显示取消消息 (通过关联 payment_error_codes 获取多语言)            │
│                                                                          │
│     ┌──────────────────────────────────────────┐                        │
│     │ 关联查询:                                 │                        │
│     │                                          │                        │
│     │ SELECT pec.message_zh,                   │                        │
│     │        pec.message_en,                   │                        │
│     │        pec.message_ar                    │                        │
│     │ FROM payment_logs pl                     │                        │
│     │ JOIN payment_error_codes pec             │                        │
│     │   ON pl.error_code = pec.original_code   │                        │
│     │   AND pl.payment_method = pec.platform   │                        │
│     │ WHERE pl.order_number = 'ORD123456'     │                        │
│     │   AND pl.status = 'cancelled';           │                        │
│     │                                          │                        │
│     │ 结果:                                     │                        │
│     │   message_zh: "用户取消支付"              │                        │
│     │   message_en: "User cancelled payment"   │                        │
│     │   message_ar: "إلغاء الدفع من قبل المستخدم"│                        │
│     └──────────────────────────────────────────┘                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 支付取消查询示例

```sql
-- 查询某个订单的所有支付日志（包括取消）
SELECT
  pl.id,
  pl.order_number,
  pl.payment_method,
  pl.status,
  pl.created_at,
  pl.error_code,
  pec.unified_code,
  pec.error_type,
  pec.message_zh,
  pec.message_en,
  pec.message_ar
FROM payment_logs pl
LEFT JOIN payment_error_codes pec
  ON pl.error_code = pec.original_code
  AND pl.payment_method = pec.platform
WHERE pl.order_id = 51
ORDER BY pl.created_at DESC;

-- 查询结果示例:
-- ┌────┬───────────────┬──────────────┬───────────┬─────────────────────┐
-- │ id │ order_number │ status       │ error_code │ message_zh          │
-- ├────┼───────────────┼──────────────┼───────────┼─────────────────────┤
-- │ 3  │ ORD123456    │ cancelled    │ USER_CANCEL│ 用户取消支付         │
-- │ 2  │ ORD123456    │ failed       │ CARD_DECLINED│ 支付方式被拒绝       │
-- │ 1  │ ORD123456    │ success      │ SUCCESS    │ 支付成功             │
-- └────┴───────────────┴──────────────┴───────────┴─────────────────────┘
```

---

## 🔗 五、完整关系图（支付 + 订单）

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  ┌─────────────────┐                                                           │
│  │    users        │                                                           │
│  ├─────────────────┤                                                           │
│  │ id              │◄── orders.user_id                                         │
│  │ email           │     order_status_logs.changed_by                          │
│  │ name            │     inventory_transactions.operator_id                      │
│  └─────────────────┘                                                           │
│          │                                                                     │
│          │ 1:N                                                                 │
│          ▼                                                                     │
│  ┌─────────────────┐         ┌──────────────────────────────────────────────┐  │
│  │    orders       │         │              payment_logs                     │  │
│  ├─────────────────┤         ├──────────────────────────────────────────────┤  │
│  │ id              │◄───────┤ order_id                                       │  │
│  │ user_id ─────────┼───┐    │ order_number                                    │  │
│  │ order_number     │   │    │ payment_method (paypal/alipay/stripe)            │  │
│  │ order_status     │   │    │ platform_order_id                               │  │
│  │ payment_status   │   │    │ transaction_id                                  │  │
│  │ final_amount     │   │    │ amount                                          │  │
│  │ created_at       │   │    │ currency                                        │  │
│  └────────┬─────────┘   │    │ status (success/failed/cancelled)               │  │
│           │             │    │ error_code ──────────────────────────────────┐ │  │
│           │ 1:N         │    │ raw_response                                    │ │  │
│           ▼             │    │ extra_data (JSON)                               │ │  │
│  ┌─────────────────┐     │    │ is_success                                      │ │  │
│  │  order_items    │     │    │ payment_stage                                   │ │  │
│  ├─────────────────┤     │    │ created_at                                      │ │  │
│  │ id              │     │    └──────────────────────────────────────────────┘ │  │
│  │ order_id ───────┼─────┘                              │                        │  │
│  │ product_id      │◄───────────────────────────────────┘                        │  │
│  │ quantity        │                                    │                        │  │
│  │ price           │                                    ▼                        │  │
│  └─────────────────┘      ┌────────────────────────────────────────────────┐   │  │
│           │                │         payment_error_codes                     │   │  │
│           │ 1:1           ├────────────────────────────────────────────────┤   │  │
│           ▼                │ id                                              │   │  │
│  ┌─────────────────┐      │ platform ────────────────────────────────────┘   │  │
│  │   products      │      │ original_code (平台原始码)                           │   │
│  ├─────────────────┤      │ unified_code (统一码) ◄────────────────────────────┼───┘  │
│  │ id              │      │ error_type (success/fail/retry/cancel)            │      │
│  │ name            │      │ priority                                          │      │
│  │ price           │      │ message_zh                                        │      │
│  │ image           │      │ message_en                                        │      │
│  └─────────────────┘      │ message_ar                                        │      │
│                           └────────────────────────────────────────────────┘      │
│                                                                                  │
│                           关联说明:                                              │
│                           payment_logs.error_code = payment_error_codes.original_code
│                           AND payment_logs.payment_method = payment_error_codes.platform
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          订单状态流转关系                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────┐                               │
│  │        order_status_transitions              │                               │
│  │        (订单状态转换规则基础表)                │                               │
│  ├─────────────────────────────────────────────┤                               │
│  │ id                                          │                               │
│  │ from_status                                 │                               │
│  │ to_status                                   │                               │
│  │ event_code ─────────────────────────────────┼─────────────────────────────┐ │
│  │ event_name                                  │                             │ │
│  │ event_name_en                               │                             │ │
│  │ event_name_ar                               │                             │ │
│  │ is_allowed                                  │                             │ │
│  └─────────────────────────────────────────────┘                             │ │
│                              │                                              │ │
│                              │ 关联                                          │ │
│                              ▼                                              │ │
│  ┌─────────────────────────────────────────────┐                            │ │
│  │          order_status_logs                  │                            │ │
│  │          (订单状态变更日志)                   │                            │ │
│  ├─────────────────────────────────────────────┤                            │ │
│  │ id                                          │                            │ │
│  │ order_id ───────────────────────────────────┴─────────────────────┐       │ │
│  │ old_status                                   │                   │       │ │
│  │ new_status                                   │                   │       │ │
│  │ event_code ──────────────────────────────────┴───────────────────┘       │ │
│  │ operator_type (user/system/admin)             │                          │ │
│  │ operator_name                                │                          │ │
│  │ extra_data (JSON)                           │                          │ │
│  │ created_at                                   │                          │ │
│  └─────────────────────────────────────────────┘                          │ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          库存变动关系                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────┐                               │
│  │           transaction_type                  │                               │
│  │           (库存变动类型基础表)                 │                               │
│  ├─────────────────────────────────────────────┤                               │
│  │ id                                          │                               │
│  │ code (sales_creat/sales_cancel等)           │                               │
│  │ name_zh                                     │                               │
│  │ name_en                                     │                               │
│  │ name_ar                                     │                               │
│  │ information (扣除/归还/增加)                 │                               │
│  └─────────────────────────────────────────────┘                               │
│                              │                                              │
│                              │ 关联                                          │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────┐                               │
│  │        inventory_transactions                │                               │
│  │        (库存变动流水)                         │                               │
│  ├─────────────────────────────────────────────┤                               │
│  │ id                                          │                               │
│  │ product_id                                  │                               │
│  │ quantity_change (+/-)                       │                               │
│  │ quantity_before                             │                               │
│  │ quantity_after                             │                               │
│  │ reason                                      │                               │
│  │ reference_type (order/cart/adjustment)      │                               │
│  │ reference_id                               │                               │
│  │ operator_id                                │                               │
│  │ transaction_type_id ────────────────────────┴──────────────────────────►  │
│  │ created_at                                 │                                  │
│  └─────────────────────────────────────────────┘                                  │
│                              │                                              │
│                              │ 关联                                          │
│                              ▼                                              │
│  ┌───────────────────────────┐                                              │
│  │        inventory          │                                              │
│  ├───────────────────────────┤                                              │
│  │ product_id ───────────────┴─────► inventory_transactions.product_id    │
│  │ quantity                                                       │          │
│  │ reserved_qty                                                 │          │
│  └───────────────────────────────────────────────────────────────┘          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 六、核心表总结

### 6.1 支付相关表（必须保留）

| 表名 | 类型 | 用途 | 关联 |
|------|------|------|------|
| `payment_config` | 配置表 | 支付方式配置 | 通过 `payment_method` 关联支付创建 |
| `payment_error_codes` | ✅ **基础表** | 统一错误码 | `error_code` = `original_code`, 关联 `payment_logs` |
| `payment_logs` | ✅ **日志表** | 统一支付日志 | `error_code` ◄──── `payment_error_codes.original_code` |
| `order_payments` | 记录表 | 订单支付记录 | 关联 `orders` |

### 6.2 订单相关表（必须保留）

| 表名 | 类型 | 用途 | 关联 |
|------|------|------|------|
| `orders` | 主表 | 订单信息 | `user_id` ◄── `users.id` |
| `order_items` | 明细表 | 订单商品 | `order_id` ◄── `orders.id` |
| `order_status_transitions` | ✅ **基础表** | 状态转换规则 | `event_code` ◄── `order_status_logs.event_code` |
| `order_status_logs` | ✅ **日志表** | 状态变更日志 | `order_id` ◄── `orders.id` |

### 6.3 库存相关表（必须保留）

| 表名 | 类型 | 用途 | 关联 |
|------|------|------|------|
| `transaction_type` | ✅ **基础表** | 变动类型定义 | `id` ◄── `inventory_transactions.transaction_type_id` |
| `inventory_transactions` | ✅ **日志表** | 库存变动流水 | `product_id` ◄── `products.id` |
| `inventory` | 主表 | 库存当前量 | `product_id` ◄── `products.id` |

### 6.4 可以删除的表

| 表名 | 原因 | 替代方案 |
|------|------|----------|
| `translations` | ❌ **空表，未使用** | ✅ 使用基础表的多语言字段 |
| `paypal_payment_logs` | ❌ **PayPal专用** | ✅ 合并到 `payment_logs` |
| `paypal_error_codes` | ❌ **PayPal专用** | ✅ 合并到 `payment_error_codes` |
| `payment_transactions` | ⚠️ **与 `order_payments` 重复** | ✅ 使用 `order_payments` |

---

## ✅ 七、实施步骤

### Phase 1: 新增取消错误码

```sql
-- 在 payment_error_codes 表中新增取消相关的错误码
INSERT INTO payment_error_codes (
  platform, original_code, unified_code, error_type,
  priority, message_zh, message_en, message_ar, is_active
) VALUES
('paypal', 'USER_CANCEL', 'USER_CANCEL', 'cancel', 100, 
 '用户取消支付', 'User cancelled payment', 'إلغاء الدفع من قبل المستخدم', 1),
('alipay', 'USER_CANCEL', 'USER_CANCEL', 'cancel', 100, 
 '用户取消支付', 'User cancelled payment', 'إلغاء الدفع من قبل المستخدم', 1),
('stripe', 'USER_CANCEL', 'USER_CANCEL', 'cancel', 100, 
 '用户取消支付', 'User cancelled payment', 'إلغاء الدفع من قبل المستخدم', 1),
('paypal', 'TIMEOUT', 'PAYMENT_TIMEOUT', 'cancel', 90, 
 '支付超时', 'Payment timeout', 'انتهاء مهلة الدفع', 1),
('alipay', 'TIMEOUT', 'PAYMENT_TIMEOUT', 'cancel', 90, 
 '支付超时', 'Payment timeout', 'انتهاء مهلة الدفع', 1),
('stripe', 'TIMEOUT', 'PAYMENT_TIMEOUT', 'cancel', 90, 
 '支付超时', 'Payment timeout', 'انتهاء مهلة الدفع', 1);
```

### Phase 2: 扩展 payment_logs 表

```sql
-- 添加缺少的字段
ALTER TABLE payment_logs ADD COLUMN platform_order_id VARCHAR(100);
ALTER TABLE payment_logs ADD COLUMN payment_stage VARCHAR(50);
ALTER TABLE payment_logs ADD COLUMN extra_data TEXT DEFAULT '{}';
```

### Phase 3: 修改取消处理接口

```typescript
// paypal_cancel 接口
async function handlePaymentCancel(orderNumber: string, paymentMethod: string, params: Record<string, any>) {
  // 1. 查询订单
  const order = await query('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);
  
  // 2. 记录支付取消日志
  await query(
    `INSERT INTO payment_logs (
      order_id, order_number, payment_method, status,
      error_code, raw_response, is_success, platform_order_id,
      payment_stage, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      order.id,
      orderNumber,
      paymentMethod,
      'cancelled',
      'USER_CANCEL',                          // 关联 payment_error_codes
      JSON.stringify(params),
      false,
      params.token || null,
      'cancelled'
    ]
  );
  
  // 3. 重定向
  return NextResponse.redirect(new URL(`/orders/${order.id}?cancelled=true`, request.url));
}
```

### Phase 4: 查询取消日志（多语言）

```sql
-- 查询订单的支付历史（包括取消），获取多语言消息
SELECT
  pl.id,
  pl.order_number,
  pl.payment_method,
  pl.status,
  pl.created_at,
  pec.message_zh,
  pec.message_en,
  pec.message_ar
FROM payment_logs pl
LEFT JOIN payment_error_codes pec
  ON pl.error_code = pec.original_code
  AND pl.payment_method = pec.platform
WHERE pl.order_id = 51
ORDER BY pl.created_at DESC;
```

---

## 🎯 八、关键要点

### 8.1 payment_logs 和 payment_error_codes 的关联方式

```
payment_logs.error_code = payment_error_codes.original_code
AND payment_logs.payment_method = payment_error_codes.platform
```

### 8.2 所有支付通道需要填充 payment_error_codes

- PayPal: 11 条错误码 + 2 条取消码 = 13 条
- Alipay: 6 条错误码 + 2 条取消码 = 8 条
- Stripe: 9 条错误码 + 2 条取消码 = 11 条

### 8.3 统一错误码的优势

同一个 `unified_code` 可以对应多个平台的原始码：
- PayPal: `CARD_DECLINED` ─┐
- Stripe: `card_declined` ──┼──► `CARD_DECLINED` ──► "银行卡被拒绝"
- Alipay: `CARD_FORBIDDEN` ─┘

这样前端只需要处理统一的错误码，不需要针对每个平台单独处理！
