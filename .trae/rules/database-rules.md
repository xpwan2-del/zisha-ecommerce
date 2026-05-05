# 数据库操作规则

## 核心规则

**修改数据库前必须通知用户：**

1. 说明要做什么操作
2. 说明会影响哪些表和数据
3. 等待用户确认后才能执行
4. 执行后报告修改结果

## 禁止事项

- 不通知就修改数据库 ❌
- 修改前不说明影响范围 ❌
- 修改后不报告结果 ❌

## 风险操作示例

| 操作          | 必须通知 |
| ----------- | ---- |
| ALTER TABLE | 必须   |
| DROP TABLE  | 必须   |
| DELETE 数据   | 必须   |
| INSERT 数据   | 必须   |
| UPDATE 数据   | 必须   |

## 通知模板

```
我需要：[操作描述]
会影响：[表名/数据]
请确认是否继续？
```

TABLE "orders"字段说明

id INTEGER PRIMARY KEY AUTOINCREMENT,
user\_id INTEGER,
order\_number TEXT UNIQUE,这个是传递的订单号，传给支付平台的订单号
total\_after\_promotions\_amount NUMERIC,这个是扣除了促销之后的订单的总金额
total\_original\_price REAL,这个是订单的商品原始价格的总金额
shipping\_fee NUMERIC,这个是订单的运费
order\_final\_discount\_amount NUMERIC,这个是订单的最终折扣金额
payment\_method TEXT,这个是订单的支付方式
payment\_status TEXT,这个是订单的支付状态
order\_status TEXT,这个是订单的状态
shipping\_address\_id INTEGER,这个是订单的发货地址的id
coupon\_ids TEXT,这个是订单的优惠券id的列表
total\_coupon\_discount REAL,这个是订单的优惠券折扣金额
final\_amount NUMERIC,这个是订单的最终金额
notes TEXT,这个是订单的备注
created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,这个是订单的创建时间
updated\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,这个是订单的更新时间
reference\_id VARCHAR(100), 这个是订单的支付平台的订单号
paid\_at TEXT,这个是订单的支付时间\
FOREIGN KEY (user\_id) REFERENCES users(id) ON DELETE SET NULL,
FOREIGN KEY (shipping\_address\_id) REFERENCES addresses(id) ON DELETE SET NULL

TABLE order\_items 字段说明

id INTEGER PRIMARY KEY AUTOINCREMENT,
order\_id INTEGER REFERENCES orders(id),
product\_id INTEGER REFERENCES products(id),
quantity INTEGER NOT NULL,  这个是订单商品的数量
productspecifications TEXT DEFAULT '{}',！
orde\_ritems.original\_price DECIMAL,这个是订单商品的原始价格，这个保存的原因是如果product\_price.price有变化，订单商品的价格也会有变化
promotion\_ids TEXT,
total\_promotions\_discount\_amount DECIMAL DEFAULT 0

## 订单状态扭转链路表

### 状态定义

| 状态 | 业务含义 | 类型 |
|------|---------|------|
| `pending` | 待付款 | 进行中 |
| `paid` | 待发货（已支付） | 进行中 |
| `shipped` | 待收货（已发货） | 进行中 |
| `refunding-payment` | 待处理退款（管理员审核中） | 进行中 |
| `refunding` | 退款中（已发起支付平台退款，监听回调） | 进行中 |
| `delivered` | 待评价（已收货） | 进行中 |
| `cancelled` | 已取消 | 终态 |
| `refunded` | 已退款 | 终态 |
| `completed` | 已完成 | 终态 |

### 状态扭转链路

```
                   ┌─ 用户取消/超时 ─→ cancelled (归还库存+优惠券)
                   │
  POST /api/orders │  支付成功
  ─────────────────┼───────→ paid ──→ shipped ──→ delivered ──→ completed
                   │          │          │
                   │          │          ├─ 申请退款 ──→ refunding-payment
                   │          │          │                  │
                   │          │          │         ┌─ 拒绝 ─┘
                   │          │          │         │   ↓
                   │          │          │         │ shipped
                   │          │          │         │
                   │          │          │   同意 ─┘
                   │          │          │   ↓
                   │          │          │ refunding (发起支付平台退款)
                   │          │          │   ↓
                   │          │          │ 支付平台退款成功
                   │          │          │   ↓
                   │          │          │ refunded (归还库存+优惠券)
                   │          │          │
                   │          │          └─ 确认收货 ──→ delivered
                   │          │
                   │          └─ 管理员同意退款 ──→ refunding ──→ refunded
                   │                                          (归还库存+优惠券)
                   │
                   └── pending (初始)
```

### 链路明细表

| # | 角色 | 事件 | 状态变更 | 附加动作 | API 路由 | 触发条件 |
|---|------|------|----------|---------|---------|---------|
| ① | 系统 | 订单创建 | → pending | — | `POST /api/orders` | 购物车/快速下单提交 |
| ② | 支付回调 | 支付成功 | pending → paid | 记录 paid\_at | `GET /api/payments/result` / `POST /api/payments/*/notify` | PayPal/Stripe/Alipay 返回成功 |
| ③ | 用户 | 手动取消 | pending → cancelled | 归还库存+优惠券 | `PATCH /api/orders/[id]?action=cancel` | 订单状态 = pending |
| ④ | 系统 | 超时取消 | pending → cancelled | 归还库存+优惠券 | `POST /api/inventory/release-expired` | pending 且 created\_at + 30分钟 < now |
| ⑤ | 管理员 | 商家发货 | paid → shipped | — | `POST /api/admin/orders/[id]/ship` | 管理员权限，状态 = paid |
| ⑥ | 管理员 | 同意退款（待发货） | paid → refunding | 发起支付平台退款 | `POST /api/admin/orders/[id]/refund/approve` | 管理员权限，状态 = paid |
| ⑦ | 用户 | 申请退款（待收货） | shipped → refunding-payment | — | `POST /api/orders/[id]/refund` | 订单状态 = shipped |
| ⑧ | 管理员 | 同意退款（待收货） | refunding-payment → refunding | 发起支付平台退款 | `POST /api/admin/orders/[id]/refund/approve` | 状态 = refunding-payment |
| ⑨ | 管理员 | 拒绝退款 | refunding-payment → shipped | — | `POST /api/admin/orders/[id]/refund/reject` | 状态 = refunding-payment |
| ⑩ | 支付回调 | 退款成功 | refunding → refunded | 归还库存+优惠券 | 支付平台退款回调 | 支付平台确认退款成功 |
| ⑪ | 用户 | 确认收货 | shipped → delivered | — | ⚠️ 未接入 | 用户点击确认收货 |
| ⑫ | 系统 | 自动完成 | delivered → completed | — | ⚠️ 未接入 | 收货后自动 |
| ⑬ | 管理员 | 手动改状态 | 任意 → 任意 | — | `PUT /api/admin/orders/[id]` | 管理员权限 |

### 关键规则

1. **退款必须经过两步**：先管理员审批 → 再发起支付平台退款 → 监听回调 → refunded
2. **refunded 是唯一归还资源的退款终态**：库存和优惠券在此状态变更时归还
3. **待发货直接退款**：paid → refunding（跳过 refunding-payment，因为货未发）
4. **待收货退款需审核**：shipped → refunding-payment → refunding（货已发，需管理员判断）

