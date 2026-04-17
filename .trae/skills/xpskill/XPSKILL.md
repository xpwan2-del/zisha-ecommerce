name: "zisha-development"
description: "紫砂电商项目开发规范技能。包含服务端逻辑优先、增量开发、标准沟通话术等规范。Invoke when developing features for zisha e-commerce project."
------------------------------------------------------------------------------------------------------------------

# 紫砂电商项目开发技能

## 核心开发原则

### 1. 服务端逻辑优先

**必须遵守**：所有业务逻辑必须在服务端完成，前端只负责渲染展示。

**禁止事项**：

- ❌ 前端做价格计算
- ❌ 前端做库存判断
- ❌ 前端做活动状态判断
- ❌ 前端做任何业务逻辑

**正确做法**：

- ✅ API返回完整数据（包括计算后的价格、状态等）
- ✅ 前端直接渲染API返回的数据
- ✅ 所有判断逻辑在服务端完成

### 2. 不修改现有页面展示

**必须遵守**：只添加新功能，不修改现有页面布局和展示效果。

**禁止事项**：

- ❌ 修改现有CSS样式
- ❌ 修改现有组件结构
- ❌ 删除现有功能代码
- ❌ 替换现有组件

**正确做法**：

- ✅ 使用条件渲染添加新功能
- ✅ 新功能使用独立组件
- ✅ 保持现有布局不变
- ✅ 向后兼容旧数据

### 3. 先检查现有功能，避免重复开发

**必须遵守**：开发新功能前，先全面检查现有代码，确认没有可复用的功能后再创建新功能。

**检查清单**：

- [ ] 检查现有API列表（`src/app/api/` 目录）
- [ ] 检查现有组件（`src/components/` 目录）
- [ ] 检查现有工具函数（`src/lib/` 目录）
- [ ] 检查数据库表结构（`src/lib/db/` 目录）
- [ ] 检查现有页面（`src/app/` 目录）

**禁止事项**：

- ❌ 不检查现有功能直接创建新功能
- ❌ 重复实现已存在的API逻辑
- ❌ 重复创建相似的组件
- ❌ 忽略现有数据库表结构

**正确做法**：

- ✅ 开发前先列出所有现有相关功能
- ✅ 分析现有功能是否满足需求
- ✅ 如不满足，基于现有功能扩展
- ✅ 如完全不存在，才创建新功能
- ✅ 向用户报告检查结果和复用建议

### 4. 增量开发

**必须遵守**：新功能用新文件或新API实现，不替换或删除现有代码。

**禁止事项**：

- ❌ 直接修改现有API
- ❌ 删除现有数据库字段
- ❌ 替换现有组件
- ❌ 一次性修改多个功能
- ❌ 如果要做数据修改的时候不要直接操作

**正确做法**：

- ✅ 新功能创建新API端点
- ✅ 新功能创建新组件文件
- ✅ 数据库添加新字段（不删除旧的）
- ✅ 一个一个功能开发
- ✅ 需要和用户沟通后确认才可操作

## 标准沟通话术

### 用户发起开发时

用户应该说：

> "我要做【功能名称】，要求是：【具体要求】。请确认理解后告诉我你的开发计划。"

AI必须回复：

> "我理解你要做【功能名称】，我的开发计划是：
>
> 1. 【步骤1】
> 2. 【步骤2】
> 3. 【步骤3】
>
> 请确认这个计划是否正确？"

### 数据库操作时

用户应该说：

> "现在开始数据库操作，请【具体操作】。操作前请先备份数据库。"

AI必须回复：

> "我将进行【具体操作】，操作前会先备份数据库。
>
> 执行的SQL语句：
>
> ```sql
> 【SQL语句】
> ```
>
> 操作影响：
>
> - 【影响1】
> - 【影响2】
>
> 请确认修改方案后执行。"

### API开发时

用户应该说：

> "请开发【API名称】API，要求：所有逻辑在服务端完成，返回完整数据给前端。"

AI必须回复：

> "我将开发【API名称】API，接口定义如下：
>
> **接口地址：** `【METHOD】/api/【path】`
>
> **请求参数：**
>
> - 【参数1】：【类型】，【说明】
> - 【参数2】：【类型】，【说明】
>
> **返回数据：**
>
> ```json
> {
>   "success": true,
>   "data": 【数据结构】
> }
> ```
>
> **服务端逻辑：**
>
> 1. 【逻辑步骤1】
> 2. 【逻辑步骤2】
>
> 请确认后开发。"

### 前端开发时

用户应该说：

> "请开发前端【组件/页面名称】，要求：只负责渲染，不修改现有展示，数据从API获取。"

AI必须回复：

> "我将开发【组件/页面名称】，方案如下：
>
> **数据获取：** 从 `【API地址】` 获取
>
> **组件结构：**
>
> - 服务端组件：获取数据
> - 客户端组件：渲染展示
>
> **不影响现有代码：**
>
> - 新功能使用条件渲染
> - 添加 `【条件判断】` 控制显示
>
> 请确认后开发。"

### 改动前确认原则

**当需要修改涉及现有功能的代码时，AI必须：**

1. **报告影响范围**：列出所有会受影响的文件
2. **说明改动内容**：具体改什么
3. **等待用户确认**：用户说"可以"才执行
4. **严格执行**：只改必要的部分，不多改

---

## 禁止事项清单

当AI要做以下操作时，必须阻止：

| 禁止事项       | 用户应该说                 |
| ---------- | --------------------- |
| 修改现有页面布局   | "请不要修改现有页面布局，只添加新功能"  |
| 删除现有代码     | "请不要删除现有代码，使用增量开发"    |
| 前端做业务逻辑    | "请不要在前端做业务逻辑，全部放到服务端" |
| 替换现有组件     | "请不要替换现有组件，新功能用新组件"   |
| 修改数据库结构不备份 | "请先备份数据库再修改结构"        |
| 一次性修改多个功能  | "请一个一个功能做，不要同时修改多个"   |

## 开发前确认清单

每次开发前，AI必须确认：

- [ ] 已检查现有功能（API、组件、数据库表）
- [ ] 数据库已备份
- [ ] 代码已提交
- [ ] 需求已理解
- [ ] 明确不修改现有展示
- [ ] 明确服务端逻辑优先
- [ ] 数据库修改方案已确认（如涉及数据库操作）

AI回复模板：

> "确认清单：
>
> - ✅ 已检查现有功能，【检查结果：复用/扩展/新建】
> - ✅ 数据库已备份到【备份文件名】
> - ✅ 代码已提交，提交信息：【提交信息】
> - ✅ 需求已理解：【需求简述】
> - ✅ 明确不修改现有展示，只添加新功能
> - ✅ 明确所有逻辑在服务端完成
> - ✅ 数据库修改方案已确认（如涉及数据库操作）
>
> 可以开始开发。"
---

## 优惠券系统设计

### 核心规则

- **只检查 end_time > 当前时间**：促销/优惠券有效性判断的唯一原则
- **不理会 status 字段**：只以时间判断是否有效

### 优惠券类型

| 类型 | 说明 | 示例 |
|------|------|------|
| no_threshold | 无门槛券 | 直接减10元 |
| min_spend | 满减券 | 满100减20 |

**核心规则**：
- **不能叠加**：一个订单只能用一张优惠券
- **互斥**：选了无门槛券就不能选满减券

### 数据库设计

#### coupons 表（优惠券基础信息）

```sql
CREATE TABLE coupons (
  id INTEGER PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,      -- 优惠码（用户输入）
  name VARCHAR(100) NOT NULL,             -- 券名称
  type VARCHAR(20) NOT NULL,              -- no_threshold / min_spend
  discount_value DECIMAL(10,2) NOT NULL,  -- 优惠金额
  min_spend DECIMAL(10,2) DEFAULT 0,     -- 最低消费
  max_discount DECIMAL(10,2),              -- 最高折扣
  start_date TIMESTAMP NOT NULL,           -- 开始时间
  end_date TIMESTAMP NOT NULL,             -- 结束时间
  is_active BOOLEAN DEFAULT TRUE,          -- 是否启用
  total_limit INTEGER,                      -- 优惠券总发放数量
  description TEXT                          -- 说明
);
```

#### user_coupons 表（用户拥有的优惠券）

```sql
CREATE TABLE user_coupons (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  coupon_id INTEGER REFERENCES coupons(id),
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',    -- active:可用, used:已使用, expired:已过期
  used_at TIMESTAMP,
  used_order_id INTEGER,
  expires_at TIMESTAMP                      -- 过期时间
);
```

#### order_coupons 表（订单使用的优惠券记录）

```sql
CREATE TABLE order_coupons (
  id INTEGER PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  coupon_id INTEGER REFERENCES coupons(id),
  user_id INTEGER REFERENCES users(id),
  discount_applied DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',     -- active:有效, refunded:已退货
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  refunded_at TIMESTAMP
);
```

### 使用流程

#### 优惠券获取

```
用户领取优惠券 → INSERT user_coupons → status='active'
```

#### 结算时使用优惠券

```
用户选择优惠券 → 验证：
  1. user_coupons.status = 'active'
  2. now > start_date AND now < end_date
  3. now < expires_at
  4. 订单金额 >= min_spend
验证通过 → 计算优惠金额：
  - type='no_threshold': 减 discount_value
  - type='min_spend': 减 discount_value（满min_spend才减）
  - max_discount设置时取 min(计算值, max_discount)
创建订单后：
  UPDATE user_coupons SET status='used'
  INSERT order_coupons
```

#### 退货退款时退回优惠券

```
用户退货 → UPDATE order_coupons SET status='refunded'
  UPDATE user_coupons SET status='active'
  优惠券退回用户账户
```

### 查询用户可用优惠券

```sql
SELECT uc.*, c.*
FROM user_coupons uc
JOIN coupons c ON uc.coupon_id = c.id
WHERE uc.user_id = ?
  AND uc.status = 'active'
  AND datetime('now') < uc.expires_at
  AND datetime('now') > c.start_date
  AND datetime('now') < c.end_date
```

## 购物车促销过期处理

### 场景：商品在购物车中，促销已过期

```
结算时检测到促销已过期
        ↓
提示用户："商品 [X] 的优惠已过期"
        ↓
选项：
├─ [查看新促销] → 跳转到商品详情页
├─ [商品已下架] → 提示并移除商品
└─ [不需要了] → 从购物车删除
```

### 核心原则
- **促销有效性**：只检查 `end_time > 当前时间`
- **不理会 status 字段**
#  购物车促销过期处理 - 完整逻辑
## 一、核心问题
### 问题场景
```
用户加入购物车时 → 商品有促销活动（促销价200元，原价300元）
用户结算时 → 促销活动已结束（end_time < 当前时间）
结算时应该怎么处理？
```
## 二、两种方案对比
### 方案A：结算时重新计算（推荐）
```
结算时：
1. 查询商品的当前促销状态
2. 如果有有效促销 → 使用促销价
3. 如果促销已过期 → 使用商品原价
4. 不需要存储加入时的促销信息
```
优点 ：

- 简单，数据量小
- 始终显示最新价格
缺点 ：

- 用户加入时看到的价格和结算时可能不同
### 方案B：存储加入时的促销信息
```
加入时：存储 price_at_add, promotion_id_at_add
结算时：
1. 检查存储的促销是否仍然有效
2. 如果有效 → 使用当时的促销价
3. 如果过期 → 提示用户选择
```
优点 ：

- 保证用户看到的价格不变
缺点 ：

- 复杂，需要存储多个字段
- 过期处理逻辑复杂
## 三、推荐方案：结算时重新计算 + 过期提示
### 3.1 流程图
```
用户打开购物车/结算页
        ↓
服务端获取购物车商品
        ↓
查询每个商品的促销状态
（检查 product_promotions.end_time > now）
        ↓
         ↓
    ┌────┴────┐
    ↓         ↓
促销有效    促销已过期
    ↓         ↓
显示促销价   显示过期提示
         ↓
    ┌────┴────┐
    ↓         ↓
继续结算    提示用户选择
    ↓         ↓
    ↓    ┌────┼────┐
    ↓    ↓    ↓    ↓
    ↓  去商品页  删除商品  取消
    ↓
结算
```
### 3.2 数据库修改 cart_items 表（不需要修改）
```
-- 不需要添加额外字段
-- 只需要在查询时关联 product_promotions 检查有效期

现有字段：
id, user_id, product_id, quantity, created_at, updated_at
``` product_promotions 表（已有）
```
-- 已有字段：
id, product_id, promotion_id, original_price, promotion_price,
status, start_time, end_time, priority, can_stack, source_type

-- 核心判断：
-- WHERE end_time > datetime('now')
```
## 四、API 设计
### 4.1 获取购物车（带促销状态）
```
// GET /api/cart/detail

Response:
{
  success: true,
  data: {
    items: [
      {
        id: number,
        product_id: number,
        name: string,
        price: number,              // 当前价格
        original_price: number,     // 原价
        quantity: number,
        image: string,

        // 促销信息
        promotion: {
          id: number,
          name: string,
          discount_percent: number,
          end_time: string,
          is_expired: boolean,    // 是否已过期
          promotion_price: number,  // 促销价（过期后不显示）
        } | null,

        // 过期提示（需要用户确认）
        promotion_expired: boolean,
      }
    ],
    summary: {
      subtotal: number,
      total: number
    }
  }
}
```
### 4.2 结算前检查
```
// POST /api/cart/check

Request:
{
  item_ids: number[]  // 要结算的商品ID
}

Response:
{
  success: true,
  data: {
    can_checkout: boolean,
    expired_items: [
      {
        item_id: number,
        product_id: number,
        name: string,
        image: string,
        original_promotion: {
          name: string,
          end_time: string
        }
      }
    ],
    valid_items: [...],
    summary: {...}
  }
}
```
## 五、过期商品处理流程
### 5.1 前端处理
```
// 结算前检查
const checkResult = await fetch('/api/cart/check');

// 如果有过期商品
if (checkResult.expired_items.length > 0) {
  // 弹窗让用户选择
  showExpiredPromotionModal(checkResult.expired_items);
}

// 用户选择后的处理
const handleExpiredItem = (item, action) => {
  switch (action) {
    case 'view_product':
      // 跳转到商品详情页
      router.push(`/products/${item.product_id}`);
      break;
    case 'remove':
      // 从购物车删除
      await removeFromCart(item.id);
      // 重新检查
      await checkCart();
      break;
    case 'continue':
      // 不在乎促销过期，继续结算
      // 商品使用原价
      proceedToCheckout();
      break;
  }
};
```
### 5.2 过期商品显示
```
┌────────────────────────────────────┐
│ ⚠️ 商品 [石瓢紫砂壶] 促销已结束    │
│                                    │
│ 原促销：今日特惠 20%OFF            │
│ 结束时间：2025-01-15 23:59        │
│                                    │
│ [查看新促销] [删除商品] [继续结算]  │
└────────────────────────────────────┘
```
## 六、数据库查询
### 6.1 获取购物车商品及促销状态
```
SELECT
  ci.id,
  ci.product_id,
  ci.quantity,
  p.name,
  p.price as original_price,
  p.image,
  pp.promotion_price,
  pp.end_time,
  pr.name as promotion_name,
  pr.discount_percent,
  CASE
    WHEN pp.end_time > datetime('now') THEN 0
    ELSE 1
  END as is_expired
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
LEFT JOIN product_promotions pp ON p.id = pp.product_id
LEFT JOIN promotions pr ON pp.promotion_id = pr.id
WHERE ci.user_id = ?
ORDER BY ci.created_at DESC
```
### 6.2 查询有效促销
```
-- 检查商品的促销是否有效
SELECT
  p.id,
  p.price as original_price,
  pp.promotion_price,
  pp.end_time,
  pr.name as promotion_name
FROM products p
LEFT JOIN product_promotions pp ON p.id = pp.product_id
LEFT JOIN promotions pr ON pp.promotion_id = pr.id
WHERE p.id = ?
  AND pp.end_time > datetime('now')
```
## 七、总结
### 数据库修改
不需要修改 cart_items 表

### 核心逻辑
1. 结算时重新查询促销状态 （不存储加入时的促销）
2. 检查 end_time > now
3. 过期则提示用户选择
### API
1. /api/cart/detail - 返回商品及促销状态（含is_expired）
2. /api/cart/check - 结算前检查过期商品

结算流程
一、结算完整流程
PlainText

# 登录前后购物车合并
## 一、用户状态
状态 说明 购物车存储 未登录 游客 localStorage (cart_guest) 已登录 注册用户 localStorage (cart_userId) + 数据库 (cart_items)

## 二、合并流程
### 2.1 游客登录时
```
游客登录成功
        ↓
CartContext 检测到登录状态变化
        ↓
1. 获取 localStorage.cart_guest 的商品
        ↓
2. 调用 /api/cart/merge 合并购物车
        ↓
3. 删除 localStorage.cart_guest
        ↓
4. 从服务器刷新购物车数据
        ↓
5. 更新 localStorage.cart_userId
```
### 2.2 合并冲突处理
```
localStorage.cart_guest = [
  { product_id: 1, quantity: 2 },
  { product_id: 3, quantity: 1 }
]

数据库 cart_items (user_id=5):
  { product_id: 1, quantity: 1 }  // 已存在
  { product_id: 2, quantity: 1 }

合并后应该是:
  product_id: 1 → quantity: 2+1=3 (叠加)
  product_id: 2 → quantity: 1 (不变)
  product_id: 3 → quantity: 1 (新增)
```
## 三、合并 API
```
// POST /api/cart/merge

Request:
{
  guest_cart: [
    { product_id: 1, quantity: 2 },
    { product_id: 3, quantity: 1 }
  ]
}

合并逻辑:
1. 遍历 guest_cart
2. 检查商品是否存在
3. 检查库存是否足够
4. 如果已存在 → 数量叠加
5. 如果不存在 → 新增
6. 返回合并后的购物车
```
## 四、数据库操作
```
-- 合并购物车
FOR EACH item IN guest_cart:
  -- 检查商品是否存在且有库存
  SELECT stock FROM products WHERE id = item.product_id

  IF stock >= item.quantity:
    -- 检查是否已在购物车
    SELECT quantity FROM cart_items
    WHERE user_id = ? AND product_id = item.product_id

    IF exists:
      -- 叠加数量
      UPDATE cart_items
      SET quantity = quantity + item.quantity
      WHERE user_id = ? AND product_id = item.product_id
    ELSE:
      -- 新增
      INSERT INTO cart_items (user_id, product_id, quantity)
      VALUES (?, item.product_id, item.quantity)
```
## 五、库存检查
### 5.1 合并时库存不足
```
商品A库存只有5件
游客购物车有10件
        ↓
合并时检查库存
        ↓
库存不足！
        ↓
选项：
1. 只加入5件
2. 不加入（提示库存不足）
```
### 5.2 推荐处理
```
如果叠加后数量 > 库存:
  → 取库存数量
  → 提示用户"库存不足，已调整数量"
```
## 六、总结
### 合并规则
情况 处理方式 商品已存在 数量叠加 商品不存在 新增 叠加后超库存 取库存数量 商品已下架 跳过，提示用户

### API
API 说明 POST /api/cart/merge 合并游客购物车到用户


用户点击"去结算"        ↓1. 检查登录状态（未登录 → 跳转登录）        ↓2. 检查购物车是否有商品        ↓3. 检查促销过期（有过期 → 提示用户选择）        ↓4. 获取用户地址        ↓5. 选择优惠券（可选）        ↓6. 计算价格        ↓7. 选择支付方式        ↓8. 创建订单        ↓9. 库存扣减        ↓10. 优惠券状态更新        ↓11. 支付
二、价格计算
2.1 计算顺序
PlainText




商品总价（原价或促销价）        ↓促销折扣（独占促销优先）        ↓可叠加促销（如果有）        ↓= 促销后小计        ↓运费（根据地址计算）        ↓优惠券折扣（如果有）        ↓= 最终应付金额
2.2 促销计算规则
TypeScript




// 独占促销（can_stack=0）// 只能用一个，其他不能用// 可叠加促销（can_stack=1）// 按 priority 顺序叠加const calculatePrice = (items, promotions, coupon?) => {  let subtotal = 0;    items.forEach(item => {    // 商品原价或促销价    const price = item.promotion_price || item.original_price;    subtotal += price * item.quantity;  });    // 应用独占促销（取最优）  const exclusivePromo = promotions.find(p => p.can_stack === 0);  if (exclusivePromo) {    subtotal *= (1 - exclusivePromo.discount_percent / 100);  }    // 应用可叠加促销  const stackablePromos = promotions    .filter(p => p.can_stack === 1)    .sort((a, b) => a.priority - b.priority);    stackablePromos.forEach(promo => {    subtotal *= (1 - promo.discount_percent / 100);  });    return subtotal;};
三、库存检查与扣减
3.1 下单前库存检查
SQL




-- 检查每个商品的库存SELECT id, stock, name FROM products WHERE id IN (1, 2, 3)
3.2 库存不足处理
PlainText




库存检查结果：商品A：库存5件，要买10件 ❌商品B：库存10件，要买5件 ✅        ↓处理：1. 提示用户"商品A库存不足"2. 只能购买有库存的商品3. 或者取消订单
3.3 下单后扣减库存
SQL




-- 扣减库存（乐观锁）UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?
四、订单创建
4.1 订单表
SQL




CREATE TABLE orders (  id INTEGER PRIMARY KEY,  order_number VARCHAR(50) UNIQUE NOT NULL,  -- 订单号  user_id INTEGER REFERENCES users(id),    -- 金额  total_amount DECIMAL(10,2) NOT NULL,       -- 总金额  shipping_fee DECIMAL(10,2) DEFAULT 0,       -- 运费  discount_amount DECIMAL(10,2) DEFAULT 0,    -- 折扣金额  final_amount DECIMAL(10,2) NOT NULL,       -- 最终金额    -- 地址  shipping_address_id INTEGER REFERENCES addresses(id),    -- 支付  payment_method VARCHAR(50),  payment_status VARCHAR(20) DEFAULT 'pending',    -- 状态  order_status VARCHAR(20) DEFAULT 'pending',    -- 优惠券  coupon_id INTEGER,    created_at TIMESTAMP,  updated_at TIMESTAMP);
4.2 订单商品表
SQL




CREATE TABLE order_items (  id INTEGER PRIMARY KEY,  order_id INTEGER REFERENCES orders(id),  product_id INTEGER REFERENCES products(id),  quantity INTEGER NOT NULL,  price DECIMAL(10,2) NOT NULL,              -- 下单时的价格  promotion_id INTEGER,                      -- 下单时的促销ID  promotion_price DECIMAL(10,2),            -- 促销价（如果用了促销）  specifications TEXT                        -- 规格);
五、完整结算 API
5.1 结算前检查
TypeScript




// POST /api/cart/checkout/validateRequest:{  items: [    { product_id: 1, quantity: 2 },    { product_id: 3, quantity: 1 }  ],  address_id: 5,  coupon_code: "SAVE10"}Response:{  success: true,  data: {    valid: boolean,    errors: [      { type: "stock", product_id: 1, message: "库存不足" },      { type: "promotion", product_id: 2, message: "促销已过期" }    ],    price: {      subtotal: 1000,      promotion_discount: 100,      shipping_fee: 20,      coupon_discount: 50,      final_amount: 870    },    available_coupons: [...]  }}
5.2 创建订单
TypeScript




// POST /api/cart/checkoutRequest:{  items: [...],  address_id: 5,  coupon_id: 10,  // 可选  payment_method: "stripe"}Response:{  success: true,  data: {    order_id: 123,    order_number: "ORD202501150001",    final_amount: 870,    payment_url: "https://stripe.com/..."  }}
六、事务处理
6.1 为什么需要事务
PlainText




创建订单 + 扣减库存 + 更新优惠券        ↓如果中途出错：- 订单创建成功，库存扣减失败 → 数据不一致- 需要回滚！
6.2 事务流程
SQL




BEGIN TRANSACTION;-- 1. 创建订单INSERT INTO orders (...) VALUES (...);SET @order_id = last_insert_id();-- 2. 扣减库存UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?;-- 如果失败，ROLLBACK-- 3. 创建订单商品INSERT INTO order_items (...) VALUES (...);-- 4. 更新优惠券状态UPDATE user_coupons SET status = 'used' WHERE id = ?;-- 5. 清空购物车DELETE FROM cart_items WHERE user_id = ?;COMMIT;
七、总结
结算流程
PlainText




1. 验证（登录、库存、促销）2. 计算价格（促销→运费→优惠券）3. 创建订单（事务保证一致性）4. 扣减库存5. 更新优惠券6. 跳转支付
需要新增的 API
API 说明
POST /api/cart/checkout/validate  结算前验证
POST /api/cart/checkout 创建订单
数据库修改
orders 表（已有）
order_items 表（已有）
需要确保事务支持




库存处理
一、库存类型
类型  说明  处理方式
充足  stock > 20  正常销售
有限  5 < stock <= 20 显示库存紧张
紧张  0 < stock <= 5  显示仅剩X件
缺货  stock <= 0  不能加入购物车/结算
二、超卖问题
2.1 问题场景
PlainText




商品A库存：1件用户A和用户B同时下单：各买1件        ↓都通过了库存检查        ↓都创建了订单        ↓库存变成 -1 件 ❌ 超卖！
2.2 解决方案：乐观锁
SQL




-- 扣减库存时加条件UPDATE products SET stock = stock - 1 WHERE id = ?   AND stock >= 1  -- 必须库存足够才能扣减  AND stock - 1 >= 0-- 检查影响行数-- 如果影响行数 = 0，说明库存不足-- 需要回滚订单
2.3 代码实现
TypeScript




const result = await db.query(`  UPDATE products   SET stock = stock - ?   WHERE id = ? AND stock >= ?`, [quantity, productId, quantity]);if (result.changes === 0) {  // 库存不足，回滚  throw new Error("库存不足");}
三、库存不足处理
3.1 购物车中添加时检查
PlainText




用户点击"加入购物车"        ↓检查商品库存        ↓库存 >= 购买数量        ↓可以加入        ↓库存 < 购买数量        ↓提示用户"库存不足，仅剩X件"
3.2 结算时检查
PlainText




用户点击"去结算"        ↓再次检查每个商品的库存        ↓发现库存不足        ↓提示用户并阻止结算        ↓用户选择：1. 减少数量2. 取消该商品3. 等待补货（不推荐）
四、库存预警
4.1 库存提醒
SQL




-- 库存低于10件时提醒SELECT id, name, stock FROM products WHERE stock > 0 AND stock <= 10
4.2 自动下架
SQL




-- 库存为0时，自动标记为缺货UPDATE products SET is_active = false WHERE stock <= 0
五、定时同步库存
5.1 问题
PlainText




多端销售（App、小程序、Web）        ↓各端库存独立        ↓可能出现超卖
5.2 解决方案
PlainText




定时任务（每小时）：1. 从外部系统同步库存2. 检查是否有超卖3. 如果超卖，通知客服处理
六、库存相关 API
API 说明
GET /api/products/:id/stock 获取商品库存
POST /api/cart/check  结算前检查库存
后台管理系统  库存管理（增删改）
七、总结
问题  解决方案
超卖  乐观锁（WHERE stock >= ?）
库存不足  结算前检查，提示用户
缺货  不能加入购物车/结算
多端同步  定时同步任务




# 订单状态管理
## 一、订单状态流转
### 1.1 状态列表
状态 说明 可执行操作 pending 待支付 支付/取消 paid 已支付 发货 shipped 已发货 确认收货 delivered 已送达 完成/申请退货 completed 已完成 评价/申请退货 cancelled 已取消 - refund_requested 退货申请中 审核 refund_approved 退货审核通过 退货 refund_completed 退货完成 - refund_rejected 退货被拒绝 -

### 1.2 状态流转图
```
pending (待支付)
    ↓ 支付成功
paid (已支付)
    ↓ 商家发货
shipped (已发货)
    ↓ 确认收货
delivered (已送达)
    ↓ 完成交易
completed (已完成)
    ↓ 申请退货
refund_requested (退货申请中)
    ↓ 审核通过
refund_approved (退货审核通过)
    ↓ 退货完成
refund_completed (退货完成)

──────────────────────────

pending (待支付)
    ↓ 超时/用户取消
cancelled (已取消)
```
## 二、订单状态日志
### 2.1 为什么需要日志
```
订单从创建到完成，可能经历多个状态
        ↓
需要记录每个状态的变化
        ↓
1. 追踪问题
2. 用户查看
3. 数据分析
```
### 2.2 order_status_logs 表
```
CREATE TABLE order_status_logs (
  id INTEGER PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  operator_type VARCHAR(20),  -- system/user/admin
  operator_id INTEGER,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
### 2.3 记录示例
```
-- 用户下单
INSERT INTO order_status_logs (order_id, from_status, to_status, operator_type)
VALUES (1, NULL, 'pending', 'user');

-- 用户支付
INSERT INTO order_status_logs (order_id, from_status, to_status, operator_type)
VALUES (1, 'pending', 'paid', 'system');

-- 商家发货
INSERT INTO order_status_logs (order_id, from_status, to_status, operator_id, reason)
VALUES (1, 'paid', 'shipped', 100, '快递单号：SF123456789');
```
## 三、退货退款流程
### 3.1 退货条件
条件 说明 时间限制 收货后7天内 商品状态 未使用、未损坏 促销活动 部分促销商品不可退

### 3.2 退货流程
```
用户申请退货
        ↓
填写退货原因、上传凭证
        ↓
商家审核
        ↓
    ┌────┴────┐
    ↓         ↓
审核通过    审核拒绝
    ↓         ↓
用户退货    结束
    ↓
商家收货确认
    ↓
退款到用户账户
    ↓
更新订单状态
```
### 3.3 退款金额计算
```
订单总金额：1000元
        ↓
商品A：300元（使用了促销减50元）
商品B：200元
运费：50元
        ↓
如果只退商品A：
  退款金额 = 300元
        ↓
如果全部退货：
  退款金额 = 1000元 - 50元（运费）= 950元
  注意：促销活动已使用的优惠不退回
```
## 四、订单相关 API
API 方法 说明 GET /api/orders GET 获取用户订单列表 GET /api/orders/:id GET 获取订单详情 POST /api/orders/:id/cancel POST 取消订单 POST /api/orders/:id/refund POST 申请退货 GET /api/orders/:id/status GET 获取订单状态日志

## 五、总结
功能 说明 状态流转 pending → paid → shipped → delivered → completed 状态日志 记录每次状态变化 退货流程 申请 → 审核 → 退货 → 退款 退款计算 按商品比例退款

支付流程
一、支付状态
状态  说明
pending 待支付
paid  已支付
failed  支付失败
refunded  已退款
expired 已过期
二、支付流程
2.1 标准支付流程
PlainText




用户选择支付方式        ↓创建支付订单（Stripe/PayPal等）        ↓跳转第三方支付页面        ↓用户完成支付        ↓第三方回调通知        ↓更新订单支付状态        ↓继续后续流程
2.2 支付回调处理
TypeScript




// 支付完成后，第三方会回调我们的接口// POST /api/payments/webhook// 验证签名const isValid = verifyWebhookSignature(body, signature);// 更新支付状态if (isValid) {  UPDATE orders   SET payment_status = 'paid',      order_status = 'paid'  WHERE order_id = ?;    // 扣减库存（如果之前没扣的话）  // 发送通知}
三、支付方式
3.1 常用支付方式
方式  说明  集成难度
Stripe  国际信用卡  中
PayPal  国际支付  中
Alipay  支付宝  高
WeChat Pay  微信支付  高
Bank Transfer 银行转账  低
Cash on Delivery  货到付款  低
3.2 多支付方式支持
TypeScript




interface PaymentMethod {  id: string;  name: string;  enabled: boolean;  fee_percent: number;  // 手续费}// 支付时计算const totalWithFee = finalAmount * (1 + paymentMethod.fee_percent / 100);
四、支付失败处理
4.1 失败原因
原因  处理
余额不足  提示用户
银行卡过期  提示用户更换
风控拦截  联系客服
超时  订单关闭，重新下单
4.2 超时处理
PlainText




订单创建后未支付        ↓等待30分钟        ↓超时未支付        ↓自动取消订单        ↓释放锁定的库存
五、支付相关 API
API 方法  说明
POST /api/payments/create POST  创建支付
POST /api/payments/webhook  POST  支付回调
GET /api/payments/:id GET 查询支付状态
POST /api/payments/:id/cancel POST  取消支付
六、总结
功能  说明
支付流程  创建 → 跳转 → 回调 → 更新
支付方式  Stripe/PayPal/支付宝等
失败处理  提示原因，允许重试
超时处理  自动取消，释放库存



# 地址管理
## 一、地址类型
类型 说明 shipping 收货地址 billing 账单地址

## 二、地址表结构
```
CREATE TABLE addresses (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),

  -- 联系人
  contact_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,

  -- 地址
  country VARCHAR(50) DEFAULT 'China',
  province VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  district VARCHAR(50),
  street VARCHAR(200),
  postal_code VARCHAR(20),

  -- 类型
  type VARCHAR(20) DEFAULT 'shipping',

  -- 默认地址
  is_default BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```
## 三、地址管理流程
### 3.1 设置默认地址
```
-- 设置新默认地址
BEGIN;
UPDATE addresses
SET is_default = FALSE
WHERE user_id = ? AND type = 'shipping';

UPDATE addresses
SET is_default = TRUE
WHERE id = ?;
COMMIT;
```
### 3.2 地址验证
```
const validateAddress = (address) => {
  const errors = [];

  if (!address.contact_name) {
    errors.push("收货人姓名不能为空");
  }

  if (!address.phone || !/^1[3-9]\d{9}$/.test(address.phone)) {
    errors.push("手机号格式不正确");
  }

  if (!address.province || !address.city) {
    errors.push("省市区不能为空");
  }

  return errors;
};
```
## 四、地址相关 API
API 方法 说明 GET /api/addresses GET 获取用户地址列表 GET /api/addresses/:id GET 获取单个地址 POST /api/addresses POST 新增地址 PUT /api/addresses/:id PUT 更新地址 DELETE /api/addresses/:id DELETE 删除地址 PUT /api/addresses/:id/default PUT 设置默认地址

## 五、结算时地址选择
```
用户点击"去结算"
        ↓
检查是否有收货地址
        ↓
    ┌────┴────┐
    ↓         ↓
有地址      无地址
    ↓         ↓
选择地址    新增收货地址
    ↓
选择优惠券
    ↓
选择支付方式
    ↓
创建订单
```
## 六、总结
功能 说明 地址CRUD 增删改查地址 默认地址 结算时自动选中 地址验证 手机号、必填项验证 多地址 用户可管理多个地址



# 运费计算
## 一、运费规则
### 1.1 常见运费模式
模式 说明 示例 固定运费 统一收费 每单10元 按件计费 超过N件加收 首件10元，续件5元 按重量计费 超过N千克加收 首千克10元，续千5元 包邮条件 满N元包邮 满200元包邮 区域计费 不同地区不同价格 偏远地区加收

### 1.2 我们的运费规则
```
包邮条件：
- 订单金额 >= 100元 → 免费
- 订单金额 < 100元 → 运费10元

固定运费模式（简化版）
```
## 二、运费计算
### 2.1 计算流程
```
const calculateShipping = (subtotal, address) => {
  // 1. 检查是否包邮
  if (subtotal >= 100) {
    return 0;  // 包邮
  }

  // 2. 基础运费
  let shippingFee = 10;

  // 3. 偏远地区加收（可选）
  if (isRemoteArea(address)) {
    shippingFee += 10;
  }

  return shippingFee;
};

const isRemoteArea = (address) => {
  // 西藏、新疆、内蒙古等偏远地区
  const remoteProvinces = ['西藏', '新疆', '内蒙古', '青海', '宁夏'];
  return remoteProvinces.includes(address.province);
};
```
### 2.2 运费计算 API
```
// POST /api/shipping/calculate

Request:
{
  address_id: 5,
  items: [
    { product_id: 1, quantity: 2 }
  ]
}

Response:
{
  success: true,
  data: {
    subtotal: 250,
    is_free_shipping: true,  // 已满100元包邮
    shipping_fee: 0,
    free_shipping_threshold: 100,
    amount_to_free_shipping: 0  // 距离包邮还差多少
  }
}
```
## 三、运费相关 API
API 方法 说明 POST /api/shipping/calculate POST 计算运费 GET /api/shipping/rules GET 获取运费规则

## 四、总结
功能 说明 包邮条件 满100元包邮 基础运费 不满100元收10元 偏远地区 可选加收10元



# 购物车页面 UI 设计
## 一、页面布局
```
┌────────────────────────────────────┐
│ [全选] 购物车(3)       [删除]    │ ← 顶部操作栏
├────────────────────────────────────┤
│ ┌────┐ 商品名称                     │
│ │图片│ ¥299  数量: 2             │
│ └────┘ 泥料:紫泥  容量:200ml      │
│        [-][ 2 ][+]  🗑️            │
├────────────────────────────────────┤
│ ┌────┐ 商品名称                     │
│ │图片│ ¥199  数量: 1             │
│ └────┘ ...                         │
├────────────────────────────────────┤
│ ─────── 订单总结 ───────           │
│ 小计: ¥797                         │
│ 运费: ¥0 (免费)                    │
│ ─────────────────────────           │
│ 合计: ¥797                         │
├────────────────────────────────────┤
│ [全选]          [去结算 ¥797]       │ ← 底部固定
└────────────────────────────────────┘
```
## 二、组件结构
组件 说明 CartHeader 顶部操作栏（全选、删除） CartItem 单个商品卡片 CartSummary 订单总结 CartFooter 底部结算栏

## 三、交互逻辑
交互 说明 全选 勾选时所有商品被选中 单选 取消勾选则不全选 数量调整 +/- 按钮调整数量 删除 点击删除按钮移除商品 滑动删除 左滑商品卡片显示删除

## 四、总结
功能 说明 页面布局 顶部+商品列表+底部结算 组件 CartHeader/CartItem/CartSummary/CartFooter 交互 全选、单选、数量、删除



# 用户中心
## 一、用户中心功能
功能 说明 个人信息 头像、昵称、手机、邮箱 订单列表 查看所有订单 收货地址 管理收货地址 我的优惠券 查看已领取/已使用的券 我的收藏 收藏的商品 浏览历史 最近浏览的商品 账户安全 修改密码、绑定手机

## 二、用户中心页面结构
```
┌────────────────────────────────────┐
│ 👤 用户头像                         │
│    昵称 | 会员等级                 │
│    [编辑资料]                       │
├────────────────────────────────────┤
│ 📦 订单                               │
│ [待支付] [待发货] [待收货] [已完成]│
├────────────────────────────────────┤
│ 📍 收货地址                         │
│ [添加新地址]                        │
├────────────────────────────────────┤
│ 🎫 我的优惠券                       │
│ 可用(3) 已用(2) 已过期(1)          │
├────────────────────────────────────┤
│ ❤️ 我的收藏                         │
│ [商品1] [商品2] [商品3]            │
├────────────────────────────────────┤
│ 🔒 账户安全                         │
│ 修改密码 | 绑定手机                  │
└────────────────────────────────────┘
```
## 三、用户中心 API
API 方法 说明 GET /api/users/profile GET 获取用户信息 PUT /api/users/profile PUT 更新用户信息 GET /api/orders GET 获取订单列表 GET /api/addresses GET 获取地址列表 GET /api/user/coupons GET 获取用户优惠券 GET /api/user/favorites GET 获取收藏列表 POST /api/users/change-password POST 修改密码

## 四、订单快捷入口
状态 说明 快捷操作 待支付 待支付订单 去支付 待发货 已支付待发货 催发货 待收货 已发货待收货 查看物流 已完成 已确认收货 评价/退货

## 五、总结
功能 说明 个人信息 查看和编辑 订单入口 快捷进入各状态订单 地址管理 增删改查 优惠券 查看我的优惠券 收藏 我的收藏商品



# 库存管理系统

## 一、核心原则

### 最重要原则：服务端逻辑优先

**禁止事项**：
- ❌ 前端计算库存状态（紧张、缺货等）
- ❌ 前端检查库存是否足够
- ❌ 前端判断是否触发库存预警
- ❌ 硬编码库存状态类型

**正确做法**：
- ✅ API 返回完整的库存数据（包括 status 字段）
- ✅ 前端只渲染后端返回的结果
- ✅ 所有库存状态类型从数据库字典表读取

---

## 二、涉及哪些表？

| 表名 | 作用 | 存什么 |
|------|------|--------|
| `inventory` | **库存主表** | 每个商品当前的库存数量和状态 |
| `inventory_transactions` | **库存流水表** | 每次库存变动的记录 |
| `inventory_alerts` | **库存预警表** | 触发预警的事件记录 |
| `inventory_checks` | **盘点单表** | 盘点批次记录 |
| `inventory_check_items` | **盘点明细表** | 盘点时每个商品的差异 |
| `transaction_types` | **变动类型字典表** | 所有库存变动类型的定义 |
| `reference_types` | **单据类型字典表** | 所有关联单据类型的定义 |

---

## 三、图解：各表关系

┌─────────────────────────────────────────────────────────────────┐ │ inventory 表 │ │ （库存当前状态） │ │ │ │ 字段：product_id, product_name, quantity, │ │ low_stock_threshold, status │ │ │ │ 作用：记录每个商品当前的库存数量和状态 │ └─────────────────────────────────────────────────────────────────┘
  变动时更新
┌─────────────────────────────────────────────────────────────────┐ │ inventory_alerts 表 │ │ （预警事件） │ │ │ │ 字段：product_id, alert_type(code), current_stock, │ │ threshold, status, ... │ │ │ │ 作用：记录触发预警的事件，像报警记录 │ └─────────────────────────────────────────────────────────────────┘
读取
┌─────────────────────────────────────────────────────────────────┐ │ transaction_types 表 │ │ （变动类型字典表） │ │ │ │ 字段：code, name, name_en, direction, description │ │ │ │ 作用：定义所有库存变动类型，不硬编码 │ └─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐ │ reference_types 表 │ │ （单据类型字典表） │ │ │ │ 字段：code, name, name_en, description │ │ │ │ 作用：定义所有关联单据类型，不硬编码 │ └─────────────────────────────────────────────────────────────────┘

---

## 四、现有库存表分析

### 4.1 现有库存相关表

| 表名 | 记录数 | 用途 | 使用状态 |
|------|--------|------|---------|
| `products.stock` | 60个商品 | 商品库存字段 | ⚠️ 待迁移到inventory |
| `inventory_logs` | 50条 | 库存变动日志 | ⚠️ 待迁移到inventory_transactions |
| `inventory_alerts` | 6条 | 库存预警 | ⚠️ 待增强 |

### 4.2 现有表结构详情

#### inventory_logs 表（库存变动日志）

字段:
* id: INTEGER (PK)
* product_id: INTEGER
* change_type: VARCHAR(50) -- 当前只有 'init'
* quantity: INTEGER
* before_stock: INTEGER
* after_stock: INTEGER
* reason: VARCHAR(255)
* operator_id: INTEGER
* operator_name: VARCHAR(100)
	•	created_at: TIMESTAMP
#### inventory_alerts 表（库存预警）
字段:
* id: INTEGER (PK)
* product_id: INTEGER
* alert_type: VARCHAR(50) -- 当前只有 'low_stock'
* current_stock: INTEGER
* threshold: INTEGER
* status: VARCHAR(20) -- pending/resolved
* handled_by: VARCHAR(100)
* handled_at: TIMESTAMP
	•	created_at: TIMESTAMP
#### products.stock 字段
products 表的 stock 字段:
* stock: INT -- 当前库存数量
	•	共60个商品，库存从几十到上百不等
### 4.3 现有API分析


### 4.3 现有API分析

| API | 操作 | 当前库存来源 | 问题 |
|-----|------|------------|------|
| `/api/products` GET | 查库存 | products.stock | ✅ 直接读取 |
| `/api/cart` POST | 扣库存检查 | products.stock | ✅ 直接检查 |
| `/api/orders` POST | 扣库存 | products.stock | ✅ 直接扣减 |
| `/api/inventory` GET | 查统计 | products.stock | ⚠️ 间接读取 |
| `/api/inventory` POST | 调整库存 | products.stock | ⚠️ 只更新products |

### 4.4 核心问题

1. **数据分散**：库存同时存在于 `products.stock` 和 `inventory_logs`
2. **查询不一致**：有些API查products表，有些查inventory_logs
3. **类型不完整**：inventory_logs只有`init`类型，缺少业务场景类型
4. **预警未启用**：inventory_alerts表存在但无代码使用
5. **无实时库存表**：缺少一张`inventory`表来记录当前库存快照

---

## 五、概念解释

### 5.1 预留/锁定库存解释

预留库存（Reserved Quantity）是电商系统中防止超卖的重要机制：

**举例说明**：
场景：某商品库存100个，用户A参加秒杀
1. 用户A下单购买10个（未支付） → 系统锁定10个库存 → 可销售库存：100 - 10 = 90
2. 用户A支付成功 → 锁定转为出库 → 实际库存：90
	3	用户A超时未支付，订单取消 → 释放锁定库存 → 可销售库存：90 + 10 = 100
**适用场景**：
- 秒杀/限时促销：活动期间锁定库存防止超卖
- 预售：先下单后发货的模式
- 多仓库分配：订单确认前预留某仓库的货

**本项目决策**：
- 商品价值较高，通常用户下单后直接支付
- 没有秒杀/预售功能
- 超时订单自动取消即可释放库存
- **结论：本项目不需要预留库存字段**

---

## 六、新表结构设计

### 6.1 【新建】transaction_types 表（变动类型字典表）

```sql
CREATE TABLE transaction_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,      -- 变动类型代码
  name VARCHAR(100) NOT NULL,             -- 中文名称
  name_en VARCHAR(100),                   -- 英文名称
  direction VARCHAR(10) NOT NULL,         -- 'in'(入库) 或 'out'(出库)
  description TEXT,                        -- 说明
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
数据内容：
code	name	name_en	direction	说明
init	初始化	Initialize	in	产品创建时初始化
purchase	采购入库	Purchase In	in	供应商送货入库
return_in	退货入库	Return In	in	客户退货入库
return_out	退货出库	Return Out	out	退货给供应商
profit	盘盈	Profit	in	盘点多出来
loss	盘亏	Loss	out	盘点少了
transfer_in	调拨入库	Transfer In	in	从其他仓库调入
transfer_out	调拨出库	Transfer Out	out	调往其他仓库
gift_in	赠送入库	Gift In	in	赠送、补偿入库
gift_out	赠送出库	Gift Out	out	赠送、样品出库
adjustment_in	调整入库	Adjustment In	in	人工调整增加
adjustment_out	调整出库	Adjustment Out	out	人工调整减少
sale	销售出库	Sale	out	订单销售出库
cancel	订单取消	Cancel	in	订单取消释放库存
damage	损耗	Damage	out	商品损坏报损
missing	遗失	Missing	out	商品丢失
6.2 【新建】reference_types 表（单据类型字典表）
CREATE TABLE reference_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,      -- 单据类型代码
  name VARCHAR(100) NOT NULL,             -- 中文名称
  name_en VARCHAR(100),                   -- 英文名称
  description TEXT,                        -- 说明
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
数据内容：
code	name	name_en	说明
init	初始化	Initialize	初始创建
order	订单	Order	销售订单
return	退货单	Return Order	退货单据
check	盘点单	Check Order	盘点单据
adjustment	调整单	Adjustment	人工调整单
transfer	调拨单	Transfer	仓库调拨单
purchase	采购单	Purchase Order	采购入库单
gift	赠送单	Gift Order	赠送单据
6.3 【新建】inventory 表（当前库存快照表）
CREATE TABLE inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL UNIQUE,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    status VARCHAR(20) DEFAULT 'in_stock',    -- 库存状态
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
status 库存状态枚举：
status 值	中文名	条件
in_stock	充足	quantity > 20
limited	有限	0 < quantity <= 20
low_stock	紧张	0 < quantity <= low_stock_threshold
out_of_stock	缺货	quantity <= 0
6.4 【新建】inventory_transactions 表（库存流水/日志表）
CREATE TABLE inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,      -- 关联 transaction_types.code
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reason TEXT,
    reference_type VARCHAR(50),                  -- 关联 reference_types.code
    reference_id INTEGER,
    operator_id INTEGER,
    operator_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

6.5 【新建】inventory_checks 表（盘点单表）
CREATE TABLE inventory_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    check_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    total_products INTEGER DEFAULT 0,
    profit_count INTEGER DEFAULT 0,
    loss_count INTEGER DEFAULT 0,
    profit_quantity INTEGER DEFAULT 0,
    loss_quantity INTEGER DEFAULT 0,
    operator_id INTEGER,
    operator_name VARCHAR(100),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

6.6 【新建】inventory_check_items 表（盘点明细表）
CREATE TABLE inventory_check_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    check_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    system_quantity INTEGER DEFAULT 0,
    actual_quantity INTEGER,
    difference INTEGER,
    difference_type VARCHAR(20),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    adjusted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (check_id) REFERENCES inventory_checks(id)
);

6.7 【保留并增强】inventory_alerts 表（库存预警表）
CREATE TABLE inventory_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    alert_type VARCHAR(50) NOT NULL,           -- low_stock/out_of_stock
    current_stock INTEGER NOT NULL,
    threshold INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',      -- pending/resolved
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    is_resolved INTEGER DEFAULT 0,
    resolved_at TIMESTAMP,
    resolution_note TEXT,
    handled_by VARCHAR(100),
    handled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

6.8 【保留但废弃】products.stock 字段
保留原因: 向后兼容，现有数据迁移后不再使用
注意: 所有代码不再读取此字段，库存唯一来源是 inventory 表

七、业务场景与类型对应关系
业务场景	transaction_type	reference_type	reference_id
产品初始化	init	init	NULL
销售订单	sale	order	订单号
订单取消	cancel	order	订单号
客户退货	return_in	return	退货单号
退货给供应商	return_out	return	退货单号
盘点-盘盈	profit	check	盘点单号
盘点-盘亏	loss	check	盘点单号
人工调整增加	adjustment_in	adjustment	调整单号
人工调整减少	adjustment_out	adjustment	调整单号
仓库调入	transfer_in	transfer	调拨单号
仓库调出	transfer_out	transfer	调拨单号
采购入库	purchase	purchase	采购单号
赠送入库	gift_in	gift	赠送单号
赠送出库	gift_out	gift	赠送单号
商品损耗	damage	adjustment	调整单号
商品遗失	missing	adjustment	调整单号
八、不同业务场景下的数据变化
场景1：销售出库（用户下单购买）
1. 查询 inventory 表
   → 检查 quantity >= 购买数量

2. 扣减库存
   UPDATE inventory SET quantity = quantity - 10 WHERE product_id = 1
   同时计算新的 status 并更新

3. 写入流水
   INSERT INTO inventory_transactions (
     product_id: 1,
     transaction_type: 'sale',        -- 从 transaction_types 表读取
     quantity_change: -10,
     quantity_before: 100,
     quantity_after: 90,
     reference_type: 'order',         -- 从 reference_types 表读取
     reference_id: 123
   )

4. 检查是否触发预警
   如果新的 quantity <= low_stock_threshold
   且没有未解决的 low_stock 预警
   → 创建 inventory_alerts 记录
场景2：退货入库（用户退货）
1. 增加库存
   UPDATE inventory SET quantity = quantity + 10 WHERE product_id = 1
   同时计算新的 status 并更新

2. 写入流水
   INSERT INTO inventory_transactions (
     transaction_type: 'return_in',
     quantity_change: +10,
     quantity_before: 90,
     quantity_after: 100,
     reference_type: 'return',
     reference_id: 45
   )

3. 如果之前有未解决的 low_stock 预警
   现在库存充足了，预警可以标记为已解决或自动消失
场景3：盘点（手动调整库存）
1. 创建盘点单
   INSERT INTO inventory_checks (check_number, status: 'pending')

2. 录入实际库存
   INSERT INTO inventory_check_items (每个商品)

3. 确认盘点后，调整库存
   对于每个有差异的商品：
   - UPDATE inventory SET quantity = 实际数量
   - 写入 inventory_transactions (type: 'profit' 或 'loss')

九、查询库存时怎么用
前端展示库存状态
SELECT product_name, quantity, status FROM inventory WHERE product_id = 1
→ 返回：石瓢紫砂壶, 15, 'limited'
前端直接显示 limited 对应的中文名称 有限，不需要自己判断。
查看库存流水（后台管理）
SELECT * FROM inventory_transactions WHERE product_id = 1 ORDER BY created_at DESC
查看预警列表
SELECT * FROM inventory_alerts WHERE status = 'pending'

十、盘点功能实现
10.1 盘点业务流程（简单模式：无审核）
1. 创建盘点单 (inventory_checks)
   └── 状态: pending

2. 选择要盘点的商品
   └── 逐个录入实际库存

3. 差异分析 (系统 vs 实际)
   └── 生成盘点差异明细 (inventory_check_items)

4. 确认盘点结果
   └── 状态: completed
   └── 直接执行库存调整

5. 执行库存调整
   └── quantity_before → quantity_after
   └── 记录 inventory_transactions (profit/loss)
10.2 盘点详细流程
Step 1: 创建盘点单
POST /api/inventory/checks
{
  product_ids: [1, 2, 3]  // 要盘点的商品ID，不传则全选
}
返回: check_id, check_number

Step 2: 录入实际库存
POST /api/inventory/checks/:id/items
{
  items: [
    { product_id: 1, actual_quantity: 95 },
    { product_id: 2, actual_quantity: 48 },
    { product_id: 3, actual_quantity: 30 }
  ]
}
系统自动计算差异:
  product_id: 1 → system: 100, actual: 95 → difference: -5, type: loss
  product_id: 2 → system: 50, actual: 48 → difference: -2, type: loss
  product_id: 3 → system: 30, actual: 30 → difference: 0, type: ok

Step 3: 确认盘点并调整库存
POST /api/inventory/checks/:id/complete
直接调整库存，无需审核

库存调整记录:
  product_id: 1 → inventory_transactions (type: loss, quantity_change: -5)
  product_id: 2 → inventory_transactions (type: loss, quantity_change: -2)
  product_id: 3 → 无变动
10.3 盘点API清单
API	方法	说明
/api/inventory/checks	GET	获取盘点单列表
/api/inventory/checks	POST	创建盘点单
/api/inventory/checks/:id	GET	获取盘点单详情
/api/inventory/checks/:id/items	POST	录入实际库存
/api/inventory/checks/:id/complete	POST	确认盘点并调整库存
/api/inventory/checks/:id	DELETE	删除/取消盘点单
十一、数据库操作汇总
11.1 表操作清单
操作	表名	SQL类型	详细说明
新建	transaction_types	CREATE TABLE	变动类型字典表
新建	reference_types	CREATE TABLE	单据类型字典表
新建	inventory	CREATE TABLE	当前库存快照表（需增加status字段）
新建	inventory_transactions	CREATE TABLE	库存流水日志
新建	inventory_checks	CREATE TABLE	盘点单表
新建	inventory_check_items	CREATE TABLE	盘点明细表
增强	inventory_alerts	ALTER TABLE	增加字段，保留预警功能
废弃	products.stock	无修改	保留字段但代码不再访问
11.2 需要执行的SQL
给 inventory 表增加 status 字段
ALTER TABLE inventory ADD COLUMN status VARCHAR(20) DEFAULT 'in_stock';
创建 transaction_types 表
CREATE TABLE transaction_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  direction VARCHAR(10) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
创建 reference_types 表
CREATE TABLE reference_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
11.3 数据迁移SQL
从 products.stock 迁移到 inventory
INSERT INTO inventory (product_id, product_name, quantity, created_at, updated_at)
SELECT id, name, COALESCE(stock, 0), datetime('now'), datetime('now') FROM products;
从 inventory_logs 迁移到 inventory_transactions
INSERT INTO inventory_transactions (product_id, product_name, transaction_type, quantity_change, quantity_before, quantity_after, reason, operator_id, operator_name, created_at)
SELECT il.product_id, COALESCE(p.name, 'Product #' || il.product_id), il.change_type, il.quantity, il.before_stock, il.after_stock, il.reason, il.operator_id, il.operator_name, il.created_at
FROM inventory_logs il
LEFT JOIN products p ON il.product_id = p.id;
删除旧的 inventory_logs 表
DROP TABLE inventory_logs;

十二、API改造清单
12.1 需要修改的API
API	修改内容	优先级
/api/products GET	返回 inventory.quantity 和 inventory.status	P0
/api/products/[id] GET	返回 inventory.quantity 和 inventory.status	P0
/api/products/[id] PUT	库存变化时写入 inventory 和 inventory_transactions	P0
/api/cart POST	检查 inventory.quantity	P0
/api/cart/merge POST	检查 inventory.quantity	P0
/api/orders POST	写入 inventory_transactions + 更新 inventory	P0
/api/products/deals GET	JOIN inventory 表	P1
/api/promotions GET	JOIN inventory 表	P1
/api/home GET	JOIN inventory 表	P1
/api/products/seed POST	种子数据写入 inventory 表	P1
/api/inventory GET	改为查询 inventory 和 inventory_transactions	P1
/api/inventory POST	支持更多 transaction_type	P1
12.2 需要新建的API
API	方法	说明
/api/inventory/init	POST	初始化产品库存
/api/inventory/transactions	GET	库存流水查询
/api/inventory/alerts	GET	库存预警列表
/api/inventory/alerts/:id/resolve	POST	处理预警
/api/inventory/checks	GET	盘点单列表
/api/inventory/checks	POST	创建盘点单
/api/inventory/checks/:id	GET	盘点单详情
/api/inventory/checks/:id/items	POST	录入实际库存
/api/inventory/checks/:id/complete	POST	确认盘点并调整
/api/inventory/checks/:id	DELETE	取消盘点单
/api/inventory/types	GET	获取所有变动类型
/api/inventory/reference-types	GET	获取所有单据类型
十三、实施步骤
阶段一：数据库结构重建
1. ⏳ 给 inventory 表增加 status 字段
2. ⏳ 创建 transaction_types 字典表并插入数据
3. ⏳ 创建 reference_types 字典表并插入数据
4. ⏳ 删除 inventory_logs 表
阶段二：API改造
1. ⏳ 修改 /api/products GET - 读inventory表
2. ⏳ 修改 /api/products/[id] GET - 读inventory表
3. ⏳ 修改 /api/products/[id] PUT - 写inventory表
4. ⏳ 修改 /api/cart - 检查inventory表
5. ⏳ 修改 /api/cart/merge - 检查inventory表
6. ⏳ 修改 /api/orders POST - 写inventory_transactions
7. ⏳ 修改 /api/products/deals - JOIN inventory表
8. ⏳ 修改 /api/promotions - JOIN inventory表
9. ⏳ 修改 /api/home - JOIN inventory表
10. ⏳ 修改 /api/products/seed - 写inventory表
11. ⏳ 修改 /api/inventory - 支持新表和新类型
阶段三：新功能开发
1. ⏳ 开发 /api/inventory/init - 初始化API
2. ⏳ 开发 /api/inventory/transactions - 流水查询
3. ⏳ 开发 /api/inventory/alerts - 预警管理
4. ⏳ 开发盘点相关API
5. ⏳ 开发库存管理后台页面
阶段四：前端修改
1. ⏳ 修改 /src/components/FeaturedProducts.tsx - 删除前端库存判断逻辑，使用API返回的status

十四、库存预警功能
14.1 预警触发条件
当 inventory.quantity <= inventory.low_stock_threshold 时:
  → 创建/更新 inventory_alerts 记录
  → alert_type = 'low_stock'
  → status = 'pending'
14.2 预警处理流程
1. 系统自动检测库存低于阈值
   ↓
2. 创建预警记录
   ↓
3. 管理员在后台看到预警列表
   ↓
4. 管理员处理预警（调整库存/忽略）
   ↓
5. 标记预警为已解决
   ↓
6. 如果库存继续低于阈值，再次触发预警
14.3 预警相关API
API	方法	说明
/api/inventory/alerts	GET	获取预警列表
/api/inventory/alerts/:id/resolve	POST	处理预警
十五、总结
设计决策
问题	决策
transaction_type	✅ 存数据库字典表 transaction_types
reference_type	✅ 存数据库字典表 reference_types
库存状态 status	✅ 存在 inventory.status 字段
是否需要预留库存	❌ 不需要，简化设计
盘点是否需要审核	❌ 不需要，盘点后直接调整
库存预警阈值	✅ 每个商品单独设置 (low_stock_threshold)
products.stock	✅ 保留字段但废弃代码访问
核心原则
单一数据源：inventory 表是库存的唯一真实来源 后端计算：所有库存状态、预警判断都在后端完成 前端渲染：前端只负责展示后端返回的数据 字典表管理：类型定义不硬编码，存数据库字典表
表结构汇总
1. transaction_types - 变动类型字典表（新建）
2. reference_types - 单据类型字典表（新建）
3. inventory - 当前库存快照（需增加status字段）
4. inventory_transactions - 库存流水日志
5. inventory_checks - 盘点单
6. inventory_check_items - 盘点明细
7. inventory_alerts - 预警记录（增强）
