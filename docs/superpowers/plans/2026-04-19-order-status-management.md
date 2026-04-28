# 订单状态管理系统重构方案

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 重构订单状态管理系统，实现高扩展性的状态机模式，支持完整的订单状态流转记录，便于后续功能扩展。

**架构：** 采用"状态配置表 + 状态变更服务 + 状态日志表"三层架构，所有状态变更通过统一服务处理，日志自动记录，支持通过配置扩展新状态和新流转规则。

**技术栈：** Next.js API Routes, SQLite (sql.js), TypeScript

---

## 一、现有系统问题分析

### 1.1 数据库问题

| 问题 | 位置 | 说明 |
|-----|------|------|
| 字段名错误 | orders/route.ts:44 | `o.status` 但表里是 `order_status` |
| 地址表字段错误 | orders/[id]/route.ts:23-25 | `a.name`→`contact_name`, `a.address`→`street_address` |
| 订单状态枚举不完整 | orders 表 | 缺少 processing, delivered, refunding, refunded |
| 缺少支付状态字段 | orders 表已有 `payment_status` | 但查询和更新逻辑未统一 |

### 1.2 代码问题

| 问题 | 位置 | 说明 |
|-----|------|------|
| 状态变更无日志 | quick-order/create | 创建订单后未记录状态日志 |
| 支付回调无日志 | payments/alipay/notify | 支付成功未记录状态变更 |
| 支付回调无日志 | payments/paypal/notify | 支付确认未记录状态变更 |
| 无统一状态变更服务 | 整个系统 | 各模块直接 UPDATE 订单状态 |

### 1.3 现有表结构

**orders 表（已有字段）：**
```sql
- id, user_id, order_number
- total_amount, shipping_fee, discount_amount
- payment_method, payment_status
- order_status (当前状态)
- shipping_address_id
- created_at, updated_at
```

**order_status_logs 表（已有字段）：**
```sql
- id, order_id
- old_status, new_status
- change_reason, changed_by
- created_at
```

---

## 二、目标架构设计

### 2.1 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│                      API 层（调用方）                          │
│  - quick-order/create                                        │
│  - orders/route.ts (PUT)                                     │
│  - payments/alipay/notify                                   │
│  - payments/paypal/notify                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ 调用
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   状态变更服务层                            │
│  OrderStatusService.changeStatus()                         │
│  - 验证状态转换是否合法                                     │
│  - 更新 orders 表                                           │
│  - 记录 order_status_logs                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ 读取配置
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   状态配置层（数据驱动）                      │
│  order_status_configs 表 - 存储所有状态和转换规则             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 数据库表设计

#### 订单状态配置表（NEW）

```sql
-- 存储所有订单状态定义
CREATE TABLE order_status_configs (
  id              INTEGER PRIMARY KEY,
  status_code     VARCHAR(30) NOT NULL UNIQUE,  -- 状态码：pending, paid, shipped, etc.
  status_name     VARCHAR(50) NOT NULL,          -- 状态名称（多语言key）
  status_type     VARCHAR(20) NOT NULL,          -- 类型：main/payment/shipping
  is_final        INTEGER DEFAULT 0,              -- 是否终态
  sort_order      INTEGER DEFAULT 0,              -- 显示顺序
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 存储状态转换规则
CREATE TABLE order_status_transitions (
  id              INTEGER PRIMARY KEY,
  from_status     VARCHAR(30) NOT NULL,          -- 源状态
  to_status       VARCHAR(30) NOT NULL,          -- 目标状态
  event_code      VARCHAR(50) NOT NULL,          -- 触发事件
  event_name      VARCHAR(100),                   -- 事件名称
  is_allowed      INTEGER DEFAULT 1,              -- 是否允许
  condition_sql   TEXT,                            -- 条件SQL（可选）
  remark         TEXT,                            -- 备注
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(from_status, to_status, event_code)
);

-- 索引
CREATE INDEX idx_transitions_from ON order_status_transitions(from_status);
CREATE INDEX idx_transitions_event ON order_status_transitions(event_code);
```

#### order_status_logs 表（扩展）

```sql
ALTER TABLE order_status_logs ADD COLUMN order_number VARCHAR(50);
ALTER TABLE order_status_logs ADD COLUMN operator_type VARCHAR(20);  -- user/system/admin
ALTER TABLE order_status_logs ADD COLUMN operator_name VARCHAR(100);
ALTER TABLE order_status_logs ADD COLUMN event_code VARCHAR(50);
ALTER TABLE order_status_logs ADD COLUMN event_type VARCHAR(20);  -- payment/shipping/refund
ALTER TABLE order_status_logs ADD COLUMN extra_data TEXT;  -- JSON格式，存储额外信息
```

### 2.3 订单状态枚举

| 状态码 | 状态名称 | 类型 | 说明 |
|-------|---------|------|------|
| pending | 待支付 | main | 订单创建，等待付款 |
| paid | 已支付 | main | 付款成功 |
| processing | 处理中 | main | 商家处理中 |
| shipped | 已发货 | main | 已发货 |
| delivered | 已送达 | main | 已收货 |
| completed | 已完成 | main | 订单完成（终态） |
| cancelled | 已取消 | main | 订单取消（终态） |
| refunding | 退款中 | main | 退款处理中 |
| refunded | 已退款 | main | 退款完成（终态） |

### 2.4 事件枚举

| 事件码 | 事件名称 | 触发方 |
|-------|---------|-------|
| order_created | 订单创建 | system |
| pay_success | 支付成功 | payment |
| pay_failed | 支付失败 | payment |
| merchant_confirm | 商家确认 | admin |
| merchant_ship | 商家发货 | admin |
| user_confirm | 用户确认收货 | user |
| user_cancel | 用户取消 | user |
| admin_cancel | 管理员取消 | admin |
| timeout_cancel | 超时取消 | system |
| refund_request | 申请退款 | user |
| refund_success | 退款成功 | payment |
| auto_complete | 自动完成 | system |

### 2.5 状态转换矩阵

```
pending    → paid (pay_success)
pending    → cancelled (user_cancel / timeout_cancel)
paid      → processing (merchant_confirm)
paid      → cancelled (admin_cancel)
paid      → refunding (refund_request)
processing → shipped (merchant_ship)
processing → cancelled (merchant_cancel)
shipped   → delivered (user_confirm)
shipped   → refunding (refund_request)
delivered  → completed (auto_complete / user_confirm)
refunding  → refunded (refund_success)
refunding  → processing (refund_reject)
```

---

## 三、文件修改清单

### 3.1 新建文件

| 文件路径 | 职责 |
|---------|------|
| `src/lib/order-status-service.ts` | 统一的状态变更服务 |
| `src/lib/order-status-config.ts` | 状态配置定义（备用静态配置） |
| `scripts/init-order-status-config.sql` | 初始化状态配置数据 |

### 3.2 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `src/app/api/orders/route.ts` | 修复字段错误，使用状态变更服务 |
| `src/app/api/orders/[id]/route.ts` | 修复地址表字段错误 |
| `src/app/api/quick-order/create/route.ts` | 使用状态变更服务记录日志 |
| `src/app/api/payments/alipay/notify/route.ts` | 使用状态变更服务 |
| `src/app/api/payments/paypal/notify/route.ts` | 使用状态变更服务 |

---

## 四、任务分解

### 任务 1：创建订单状态服务

**文件：**
- 创建：`src/lib/order-status-service.ts`

- [ ] **步骤 1：创建状态服务文件**

```typescript
// src/lib/order-status-service.ts

import { query } from './db';

/**
 * 订单状态变更服务
 * 统一处理所有订单状态变更，自动记录状态日志
 */
export class OrderStatusService {
  /**
   * 变更订单状态
   * @param orderId 订单ID
   * @param eventCode 触发事件码
   * @param operatorInfo 操作人信息
   * @param extraData 额外数据
   */
  static async changeStatus(
    orderId: number,
    eventCode: string,
    operatorInfo: {
      type: 'user' | 'system' | 'admin';
      id: number;
      name: string;
    },
    extraData?: Record<string, any>
  ): Promise<{ success: boolean; error?: string; fromStatus?: string; toStatus?: string }> {
    // 1. 获取当前订单状态
    const orderResult = await query(
      'SELECT order_number, order_status FROM orders WHERE id = ?',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return { success: false, error: 'ORDER_NOT_FOUND' };
    }

    const order = orderResult.rows[0];
    const currentStatus = order.order_status;

    // 2. 查询状态转换配置
    const transitionResult = await query(
      `SELECT to_status, is_allowed FROM order_status_transitions
       WHERE from_status = ? AND event_code = ? AND is_allowed = 1`,
      [currentStatus, eventCode]
    );

    if (transitionResult.rows.length === 0) {
      console.error(`[OrderStatus] Invalid transition: ${currentStatus} + ${eventCode}`);
      return { 
        success: false, 
        error: `INVALID_TRANSITION:${currentStatus}:${eventCode}` 
      };
    }

    const targetStatus = transitionResult.rows[0].to_status;

    // 3. 开启事务
    await query('BEGIN TRANSACTION');

    try {
      // 4. 记录状态日志
      await query(
        `INSERT INTO order_status_logs (
          order_id, order_number, old_status, new_status,
          change_reason, changed_by, operator_type, operator_name,
          event_code, extra_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          order.order_number,
          currentStatus,
          targetStatus,
          `Event: ${eventCode}`,
          operatorInfo.id,
          operatorInfo.type,
          operatorInfo.name,
          eventCode,
          extraData ? JSON.stringify(extraData) : null
        ]
      );

      // 5. 更新订单主表状态
      await query(
        `UPDATE orders SET order_status = ?, updated_at = ? WHERE id = ?`,
        [targetStatus, new Date().toISOString(), orderId]
      );

      await query('COMMIT');

      console.log(`[OrderStatus] Changed: order ${orderId} from ${currentStatus} to ${targetStatus} by ${eventCode}`);

      return { success: true, fromStatus: currentStatus, toStatus: targetStatus };
    } catch (error) {
      await query('ROLLBACK');
      console.error('[OrderStatus] Error:', error);
      return { success: false, error: 'STATUS_CHANGE_FAILED' };
    }
  }

  /**
   * 获取订单状态历史
   */
  static async getStatusHistory(orderId: number) {
    const result = await query(
      `SELECT * FROM order_status_logs 
       WHERE order_id = ? 
       ORDER BY created_at ASC`,
      [orderId]
    );
    return result.rows;
  }
}
```

- [ ] **步骤 2：创建状态配置文件**

```typescript
// src/lib/order-status-config.ts

/**
 * 订单状态枚举定义
 */
export const OrderStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDING: 'refunding',
  REFUNDED: 'refunded',
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

/**
 * 订单事件枚举
 */
export const OrderEvent = {
  ORDER_CREATED: 'order_created',
  PAY_SUCCESS: 'pay_success',
  PAY_FAILED: 'pay_failed',
  MERCHANT_CONFIRM: 'merchant_confirm',
  MERCHANT_SHIP: 'merchant_ship',
  USER_CONFIRM: 'user_confirm',
  USER_CANCEL: 'user_cancel',
  ADMIN_CANCEL: 'admin_cancel',
  TIMEOUT_CANCEL: 'timeout_cancel',
  REFUND_REQUEST: 'refund_request',
  REFUND_SUCCESS: 'refund_success',
  AUTO_COMPLETE: 'auto_complete',
} as const;

export type OrderEventType = typeof OrderEvent[keyof typeof OrderEvent];

/**
 * 操作类型
 */
export const OperatorType = {
  USER: 'user',
  SYSTEM: 'system',
  ADMIN: 'admin',
} as const;

/**
 * 默认状态转换规则（静态配置，数据库优先）
 */
export const DefaultTransitions: Array<{
  from: string;
  to: string;
  event: string;
}> = [
  { from: 'pending', to: 'paid', event: 'pay_success' },
  { from: 'pending', to: 'cancelled', event: 'user_cancel' },
  { from: 'pending', to: 'cancelled', event: 'timeout_cancel' },
  { from: 'paid', to: 'processing', event: 'merchant_confirm' },
  { from: 'paid', to: 'cancelled', event: 'admin_cancel' },
  { from: 'paid', to: 'refunding', event: 'refund_request' },
  { from: 'processing', to: 'shipped', event: 'merchant_ship' },
  { from: 'processing', to: 'cancelled', event: 'merchant_cancel' },
  { from: 'shipped', to: 'delivered', event: 'user_confirm' },
  { from: 'shipped', to: 'refunding', event: 'refund_request' },
  { from: 'delivered', to: 'completed', event: 'auto_complete' },
  { from: 'refunding', to: 'refunded', event: 'refund_success' },
];
```

- [ ] **步骤 3：创建数据库初始化脚本**

```sql
-- scripts/init-order-status-config.sql

-- 插入状态配置
INSERT INTO order_status_configs (status_code, status_name, status_type, is_final, sort_order) VALUES
('pending', 'order_status_pending', 'main', 0, 1),
('paid', 'order_status_paid', 'main', 0, 2),
('processing', 'order_status_processing', 'main', 0, 3),
('shipped', 'order_status_shipped', 'main', 0, 4),
('delivered', 'order_status_delivered', 'main', 0, 5),
('completed', 'order_status_completed', 'main', 1, 6),
('cancelled', 'order_status_cancelled', 'main', 1, 7),
('refunding', 'order_status_refunding', 'main', 0, 8),
('refunded', 'order_status_refunded', 'main', 1, 9);

-- 插入状态转换规则
INSERT INTO order_status_transitions (from_status, to_status, event_code, event_name, is_allowed) VALUES
('pending', 'paid', 'pay_success', '支付成功', 1),
('pending', 'cancelled', 'user_cancel', '用户取消', 1),
('pending', 'cancelled', 'timeout_cancel', '超时取消', 1),
('paid', 'processing', 'merchant_confirm', '商家确认', 1),
('paid', 'cancelled', 'admin_cancel', '管理员取消', 1),
('paid', 'refunding', 'refund_request', '申请退款', 1),
('processing', 'shipped', 'merchant_ship', '商家发货', 1),
('processing', 'cancelled', 'merchant_cancel', '商家取消', 1),
('shipped', 'delivered', 'user_confirm', '用户确认收货', 1),
('shipped', 'refunding', 'refund_request', '申请退款', 1),
('delivered', 'completed', 'auto_complete', '自动完成', 1),
('refunding', 'refunded', 'refund_success', '退款成功', 1);
```

- [ ] **步骤 4：测试状态服务**

```bash
# 测试命令
curl -s -b /tmp/cookies.txt "http://localhost:3000/api/db/table/order_status_configs?page=1&limit=10"
curl -s -b /tmp/cookies.txt "http://localhost:3000/api/db/table/order_status_transitions?page=1&limit=10"
```

---

### 任务 2：修改 quick-order/create 使用状态服务

**文件：**
- 修改：`src/app/api/quick-order/create/route.ts`

- [ ] **步骤 1：在 quick-order/create 中导入状态服务**

```typescript
import { OrderStatusService, OrderEvent } from '@/lib/order-status-service';
```

- [ ] **步骤 2：在创建订单成功后调用状态变更服务**

```typescript
// 在 "await query('COMMIT');" 之后添加：

// 记录订单创建日志
await OrderStatusService.changeStatus(
  Number(order_id),
  OrderEvent.ORDER_CREATED,
  {
    type: 'system',
    id: userId,
    name: 'System'
  },
  { order_number: order_number }
);
```

- [ ] **步骤 3：测试 quick-order/create**

```bash
curl -s -b /tmp/cookies.txt -X POST http://localhost:3000/api/quick-order/create \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":1,"address_id":14,"coupon_id":null,"payment_method":"paypal"}' | python3 -m json.tool

# 验证状态日志
curl -s "http://localhost:3000/api/db/query?sql=SELECT+*+FROM+order_status_logs+WHERE+order_id=25" | python3 -m json.tool
```

---

### 任务 3：修改 Alipay 回调使用状态服务

**文件：**
- 修改：`src/app/api/payments/alipay/notify/route.ts`

- [ ] **步骤 1：导入状态服务**

```typescript
import { OrderStatusService, OrderEvent } from '@/lib/order-status-service';
```

- [ ] **步骤 2：支付成功时调用状态变更服务**

```typescript
// 在 "await query('UPDATE orders SET payment_status = ?...');" 之后添加：

// 记录支付成功状态变更
await OrderStatusService.changeStatus(
  order.id,
  OrderEvent.PAY_SUCCESS,
  {
    type: 'system',
    id: 0,
    name: 'Alipay'
  },
  { trade_no: tradeNo, trade_status: tradeStatus }
);
```

- [ ] **步骤 3：测试 Alipay 回调**

```bash
# 模拟支付宝回调（需要实际测试环境）
curl -s -X POST http://localhost:3000/api/payments/alipay/notify \
  -d "out_trade_no=QO1776614660118393&trade_status=TRADE_SUCCESS&total_amount=787.95&trade_no=20260419"
```

---

### 任务 4：修改 PayPal 回调使用状态服务

**文件：**
- 修改：`src/app/api/payments/paypal/notify/route.ts`

- [ ] **步骤 1：导入状态服务**

```typescript
import { OrderStatusService, OrderEvent } from '@/lib/order-status-service';
```

- [ ] **步骤 2：支付成功时调用状态变更服务**

```typescript
// 在支付成功后调用：
await OrderStatusService.changeStatus(
  order.id,
  OrderEvent.PAY_SUCCESS,
  {
    type: 'system',
    id: 0,
    name: 'PayPal'
  },
  { paypal_order_id: orderId }
);
```

---

### 任务 5：修复 orders/route.ts 字段错误

**文件：**
- 修改：`src/app/api/orders/route.ts`

- [ ] **步骤 1：修复 GET 请求中的字段名**

```typescript
// 修改前 (第44行)：
SELECT
  ...
  o.status,  -- 错误：应该是 order_status

// 修改后：
SELECT
  ...
  o.order_status,
```

- [ ] **步骤 2：修复 PUT 请求中的状态更新**

```typescript
// 修改前 (第419-421行)：
await query(
  'UPDATE orders SET status = ? WHERE id = ?',
  [status, orderId]
);

// 修改后：
await query(
  'UPDATE orders SET order_status = ?, updated_at = ? WHERE id = ?',
  [status, new Date().toISOString(), orderId]
);
```

- [ ] **步骤 3：测试 orders API**

```bash
# 测试获取订单列表
curl -s -b /tmp/cookies.txt "http://localhost:3000/api/orders" | python3 -m json.tool
```

---

### 任务 6：修复 orders/[id]/route.ts 地址表字段错误

**文件：**
- 修改：`src/app/api/orders/[id]/route.ts`

- [ ] **步骤 1：修复地址表字段名**

```typescript
// 修改前 (第23-25行)：
a.name as address_name,
a.phone as address_phone,
a.address as address_detail

// 修改后：
a.contact_name as address_name,
a.phone as address_phone,
a.street_address as address_detail
```

- [ ] **步骤 2：测试订单详情 API**

```bash
curl -s -b /tmp/cookies.txt "http://localhost:3000/api/orders/25" | python3 -m json.tool
```

---

### 任务 7：执行数据库扩展

**数据库操作**

- [ ] **步骤 1：备份数据库**

```bash
cp /Users/davis/zisha-ecommerce/data/zisha.db /Users/davis/zisha-ecommerce/data/zisha.db.backup.20260419
```

- [ ] **步骤 2：扩展 order_status_logs 表**

```sql
-- 执行以下 SQL 扩展表字段：

ALTER TABLE order_status_logs ADD COLUMN order_number VARCHAR(50);
ALTER TABLE order_status_logs ADD COLUMN operator_type VARCHAR(20);
ALTER TABLE order_status_logs ADD COLUMN operator_name VARCHAR(100);
ALTER TABLE order_status_logs ADD COLUMN event_code VARCHAR(50);
ALTER TABLE order_status_logs ADD COLUMN event_type VARCHAR(20);
ALTER TABLE order_status_logs ADD COLUMN extra_data TEXT;
```

- [ ] **步骤 3：初始化状态配置数据**

```sql
-- 插入状态配置和转换规则（参考任务1的SQL）
```

---

## 五、扩展性设计说明

### 5.1 如何添加新状态

1. 在 `order_status_configs` 表插入新状态
2. 在 `order_status_transitions` 表添加转换规则
3. 代码无需修改！

### 5.2 如何添加新事件

1. 在 `OrderEvent` 枚举添加新事件码
2. 在 `order_status_transitions` 表添加转换规则
3. 调用时传入新事件码即可

### 5.3 如何添加新字段

只需要：
1. ALTER TABLE 添加字段
2. 状态服务已支持 `extra_data` JSON 字段存储额外信息

---

## 六、风险评估

| 风险 | 应对措施 |
|-----|---------|
| 修改 orders 表字段影响现有功能 | 先备份，测试环境验证后再生产 |
| 状态转换规则配置错误 | 数据库优先，代码有默认值 |
| 并发状态更新冲突 | 使用事务 + 行锁 |

---

## 七、验收标准

- [ ] 所有订单状态变更都记录到 order_status_logs
- [ ] 可以查询任意订单的状态变更历史
- [ ] 新增状态只需配置，不需代码修改
- [ ] quick-order 创建订单自动记录状态日志
- [ ] 支付回调自动记录状态日志
- [ ] orders API 字段错误已修复
