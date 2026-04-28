# 订单状态系统更新说明

## 一、更新内容总结

### 1. 新增 reviewing 状态

**order_status_configs 表** 新增状态：
```sql
('reviewing', 'order_status_reviewing', 'main', 0, 5)
```

### 2. 新增状态转换规则

**order_status_transitions 表** 新增规则：
```sql
('shipped', 'reviewing', 'user_confirm', '用户确认收货', 1)      -- 用户确认收货
('reviewing', 'completed', 'review_complete', '评价完成', 1)     -- 评价完成后完成
('reviewing', 'completed', 'auto_complete', '超时自动完成', 1)    -- 超时自动完成
('reviewing', 'refunding', 'refund_request', '申请退款', 1)       -- 待评价时可申请退款
('refunding', 'paid', 'refund_reject', '退款被拒绝', 1)           -- 退款被拒绝
```

### 3. 新建 delivery_logs 表（物流轨迹）

**表结构**：
```sql
CREATE TABLE delivery_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  sub_status VARCHAR(20),        -- shipping/delivering/signed
  carrier VARCHAR(50),           -- 快递公司
  tracking_number VARCHAR(100), -- 快递单号
  location VARCHAR(200),         -- 当前位置
  description TEXT,              -- 物流描述
  occurred_at TIMESTAMP,          -- 发生时间
  created_at TIMESTAMP
);
```

### 4. 新增 API

- `/api/delivery-logs` - 物流轨迹查询和更新
- `/api/orders-list` - 订单列表查询

### 5. 更新枚举定义

**order-status-config.ts** 新增：
```typescript
OrderStatus.REVIEWING = 'reviewing'
OrderEvent.MERCHANT_CANCEL = 'merchant_cancel'
OrderEvent.REFUND_REJECT = 'refund_reject'
OrderEvent.REVIEW_COMPLETE = 'review_complete'
DeliverySubStatus = { SHIPPING, DELIVERING, SIGNED }
```

---

## 二、完整状态转换矩阵

```
┌─────────────┬────────────┬─────────────────┬────────────────────┐
│ from_status │ to_status  │ event_code      │ event_name          │
├─────────────┼────────────┼─────────────────┼────────────────────┤
│ pending     │ paid       │ pay_success     │ 支付成功            │
│ pending     │ cancelled  │ user_cancel     │ 用户取消            │
│ pending     │ cancelled  │ timeout_cancel  │ 超时取消            │
│ paid        │ processing │ merchant_confirm│ 商家确认           │
│ paid        │ cancelled  │ admin_cancel    │ 管理员取消          │
│ paid        │ refunding  │ refund_request  │ 申请退款           │
│ processing  │ shipped    │ merchant_ship   │ 商家发货           │
│ processing  │ cancelled  │ merchant_cancel │ 商家取消           │
│ shipped     │ reviewing  │ user_confirm    │ 用户确认收货 ← 新增 │
│ shipped     │ refunding   │ refund_request  │ 申请退款           │
│ reviewing   │ completed  │ review_complete │ 评价完成 ← 新增    │
│ reviewing   │ completed  │ auto_complete   │ 超时自动完成 ← 新增 │
│ reviewing   │ refunding   │ refund_request  │ 申请退款 ← 新增    │
│ delivered   │ completed  │ auto_complete   │ 超时自动完成        │
│ delivered   │ refunding   │ refund_request  │ 申请退款           │
│ refunding   │ refunded   │ refund_success  │ 退款成功           │
│ refunding   │ paid       │ refund_reject   │ 退款被拒绝 ← 新增  │
└─────────────┴────────────┴─────────────────┴────────────────────┘
```

---

## 三、OrderStatusService 工作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                     订单状态变更流程                              │
│                                                                 │
│  1. 调用方触发事件（如支付成功、用户确认收货）                    │
│     └─────────────────────→ OrderStatusService.changeStatus()   │
│                                                                 │
│  2. 查询当前订单状态                                              │
│     └──→ SELECT order_status FROM orders WHERE id = ?           │
│                                                                 │
│  3. 验证状态转换规则                                              │
│     └──→ SELECT to_status FROM order_status_transitions          │
│          WHERE from_status = ? AND event_code = ?              │
│                                                                 │
│  4. 如果规则存在：                                               │
│     ├── INSERT INTO order_status_logs (记录变更)                │
│     └── UPDATE orders SET order_status = ? (更新状态)            │
│                                                                 │
│  5. 如果规则不存在：                                             │
│     └── 返回错误 INVALID_TRANSITION                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、delivery_logs 使用场景

```
订单状态: shipped（已发货）
    │
    ├─────→ 用户查看物流 → SELECT * FROM delivery_logs WHERE order_id = ?
    │       返回：[{sub_status: 'shipping', ...}, {sub_status: 'delivering', ...}]
    │
    └─────→ 快递状态更新 → POST /api/delivery-logs
            新增记录：{order_id: 58, sub_status: 'signed', ...}
```

---

## 五、修改文件清单

| 文件 | 操作 | 说明 |
|-----|------|------|
| `src/lib/order-status-config.ts` | 修改 | 新增 REVIEWING、REVIEW_COMPLETE 等枚举 |
| `src/lib/order-status-service.ts` | 无修改 | 保持不变 |
| `src/app/api/delivery-logs/route.ts` | 新增 | 物流轨迹 API |
| `src/app/api/orders-list/route.ts` | 新增 | 订单列表 API |
| `scripts/update_order_status.sql` | 新增 | 数据库更新脚本 |
| `scripts/init_delivery_logs.sql` | 新增 | 初始化脚本 |

---

## 六、执行数据库更新

运行以下命令更新数据库：

```bash
# 方式1：直接执行 SQL（需要找到正确的数据库文件）
sqlite3 database.sqlite < scripts/update_order_status.sql

# 方式2：通过 API 执行（如果系统支持）
curl -X POST http://localhost:3000/api/db/execute \
  -H "Content-Type: application/json" \
  -d @scripts/update_order_status.sql
```

---

## 七、测试验证清单

- [ ] 支付回调正常（pending → paid）
- [ ] 用户确认收货（shipped → reviewing）
- [ ] 评价完成（reviewing → completed）
- [ ] 超时自动完成（reviewing → completed）
- [ ] 申请退款（shipped/reviewing → refunding）
- [ ] 退款成功（refunding → refunded）
- [ ] 物流轨迹记录（delivery_logs 表）
- [ ] 订单列表正常显示（/account?tab=orders）