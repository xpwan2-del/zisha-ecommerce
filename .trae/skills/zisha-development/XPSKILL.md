***

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

## 项目数据结构

### 产品分类映射

| 图片编号  | 分类   | category\_id |
| ----- | ---- | ------------ |
| 1-15  | 紫砂壶  | 1            |
| 16-24 | 紫砂茶杯 | 2            |
| 25-36 | 茶叶罐  | 3            |
| 37-41 | 茶具套装 | 4            |
| 42-50 | 配件   | 5            |

### 特惠活动规则

- **今日特惠**：产品ID 1,3,5,7,9,11,13,15，折扣20%
- **特惠商品**：产品ID 2,4,6,8,10,12,14,16,18,20，折扣15%
- **双重特惠**：产品ID 17,19,21,22

## 数据库表结构

### 库存管理表

```sql
CREATE TABLE inventory_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    change_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    before_stock INTEGER NOT NULL,
    after_stock INTEGER NOT NULL,
    reason VARCHAR(255),
    operator_id INTEGER REFERENCES users(id),
    operator_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 特惠活动表

```sql
CREATE TABLE promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    discount_percent INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 产品特惠关联表

```sql
CREATE TABLE product_promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    promotion_id INTEGER NOT NULL REFERENCES promotions(id),
    original_price DECIMAL(10,2) NOT NULL,
    promotion_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, promotion_id)
);
```

### 商品操作日志表

```sql
CREATE TABLE product_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    operator_id INTEGER REFERENCES users(id),
    operator_name VARCHAR(100),
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 活动操作日志表

```sql
CREATE TABLE activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_type VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_id INTEGER NOT NULL,
    target_name VARCHAR(255),
    details TEXT,
    operator_id INTEGER REFERENCES users(id),
    operator_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 开发阶段顺序

### 第一阶段：数据库基础

1. 创建5个新表
2. 添加"配件"分类
3. 添加新活动分类
4. 创建特惠活动记录

### 第二阶段：数据更新

1. 解析图片文件名
2. 更新产品名称和分类
3. 更新产品图片路径
4. 设置价格和库存
5. 关联特惠活动
6. 关联活动图标

### 第三阶段：API开发

1. 特惠活动API
2. 库存管理API
3. 日志中心API

### 第四阶段：前端展示

1. 首页特惠专区
2. 产品列表活动筛选
3. 产品详情活动展示

### 第五阶段：后台管理

1. 特惠活动管理
2. 库存管理
3. 日志中心

## 数据库表结构详细说明



1. users 表
作用：存储用户信息 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 用户ID，自增主键
name：VARCHAR(100) NOT NULL - 用户名
email：VARCHAR(255) UNIQUE NOT NULL - 邮箱，唯一
phone：VARCHAR(20) - 电话号码
password：VARCHAR(255) NOT NULL - 密码
role：VARCHAR(20) DEFAULT 'user' - 角色，默认为普通用户
level：VARCHAR(20) DEFAULT 'regular' - 用户等级，默认为普通
points：INTEGER DEFAULT 0 - 积分
total_spent：DECIMAL(10,2) DEFAULT 0 - 总消费金额
referral_code：VARCHAR(20) UNIQUE - 推荐码，唯一
referred_by：INTEGER REFERENCES users(id) - 被谁推荐，外键关联用户表
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
关联关系：

与 addresses 表：一对多（一个用户可以有多个地址）
与 orders 表：一对多（一个用户可以有多个订单）
与 reviews 表：一对多（一个用户可以有多个评价）
与 user_favorites 表：一对多（一个用户可以有多个收藏）
与 cart_items 表：一对多（一个用户可以有多个购物车商品）
2. products 表
作用：存储商品信息 字段说明：

id：INTEGER PRIMARY KEY - 商品ID，自增主键
name：TEXT - 商品名称（中文）
name_en：TEXT - 商品名称（英文）
name_ar：TEXT - 商品名称（阿拉伯文）
price：NUM - 商品价格（人民币）
price_usd：NUM - 商品价格（美元）
price_ae：NUM - 商品价格（阿联酋迪拉姆）
stock：INT - 商品库存
category_id：INT - 商品分类ID
image：TEXT - 商品主图
images：TEXT - 商品多图，JSON格式
video：TEXT - 商品视频
description：TEXT - 商品描述（中文）
description_en：TEXT - 商品描述（英文）
description_ar：TEXT - 商品描述（阿拉伯文）
specifications：TEXT - 商品规格，JSON格式
shipping：TEXT - 物流信息，JSON格式
after_sale：TEXT - 售后服务，JSON格式
is_limited：NUM - 是否限量
display_mode：TEXT - 显示模式
created_at：NUM - 创建时间
updated_at：NUM - 更新时间
关联关系：

与 categories 表：多对一（多个商品属于一个分类）
与 product_features 表：一对多（一个商品可以有多个特性）
与 product_promotions 表：一对多（一个商品可以参与多个促销活动）
与 order_items 表：一对多（一个商品可以出现在多个订单中）
与 reviews 表：一对多（一个商品可以有多个评价）
与 user_favorites 表：一对多（一个商品可以被多个用户收藏）
索引：

idx_products_category：分类ID索引
idx_products_price：价格索引
3. categories 表
作用：存储商品分类信息 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 分类ID，自增主键
name：VARCHAR(100) NOT NULL - 分类名称（中文）
name_en：VARCHAR(100) NOT NULL - 分类名称（英文）
name_ar：VARCHAR(100) NOT NULL - 分类名称（阿拉伯文）
slug：VARCHAR(100) UNIQUE NOT NULL - 分类别名，唯一
description：TEXT - 分类描述
image：VARCHAR(255) DEFAULT '' - 分类图片
priority：INTEGER DEFAULT 0 - 分类优先级
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
关联关系：

与 products 表：一对多（一个分类可以包含多个商品）
4. product_features 表
作用：存储商品特性信息 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 特性ID，自增主键
product_id：INTEGER NOT NULL - 商品ID
template_id：INTEGER NOT NULL - 特性模板ID
value：TEXT NOT NULL - 特性值（中文）
value_en：TEXT NOT NULL - 特性值（英文）
value_ar：TEXT NOT NULL - 特性值（阿拉伯文）
order：INTEGER DEFAULT 0 - 排序
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
updated_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 更新时间
关联关系：

与 products 表：多对一（多个特性属于一个商品）
与 feature_templates 表：多对一（多个特性使用一个模板）
5. feature_templates 表
作用：存储特性模板信息 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 模板ID，自增主键
key：VARCHAR(50) NOT NULL UNIQUE - 模板键，唯一
name：VARCHAR(100) NOT NULL - 模板名称（中文）
name_en：VARCHAR(100) NOT NULL - 模板名称（英文）
name_ar：VARCHAR(100) NOT NULL - 模板名称（阿拉伯文）
type：VARCHAR(20) NOT NULL - 模板类型
unit：VARCHAR(20) - 单位
options：TEXT - 选项
is_required：BOOLEAN DEFAULT 0 - 是否必填
is_searchable：BOOLEAN DEFAULT 1 - 是否可搜索
order：INTEGER DEFAULT 0 - 排序
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
updated_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 更新时间
关联关系：

与 product_features 表：一对多（一个模板可以被多个商品使用）
6. orders 表
作用：存储订单信息 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 订单ID，自增主键
user_id：INTEGER REFERENCES users(id) - 用户ID，外键关联用户表
order_number：VARCHAR(50) UNIQUE NOT NULL - 订单号，唯一
total_amount：DECIMAL(10,2) NOT NULL - 订单总金额
shipping_fee：DECIMAL(10,2) DEFAULT 0 - 运费
discount_amount：DECIMAL(10,2) DEFAULT 0 - 折扣金额
payment_method：VARCHAR(50) NOT NULL - 支付方式
payment_status：VARCHAR(20) DEFAULT 'pending' - 支付状态，默认为待支付
order_status：VARCHAR(20) DEFAULT 'pending' - 订单状态，默认为待处理
shipping_address_id：INTEGER REFERENCES addresses(id) - 收货地址ID，外键关联地址表
coupon_code：VARCHAR(50) - 优惠券代码
notes：TEXT - 订单备注
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
discount_details：TEXT - 折扣详情（JSON格式）
final_amount：DECIMAL DEFAULT 0 - 最终金额
关联关系：

与 users 表：多对一（多个订单属于一个用户）
与 addresses 表：多对一（多个订单使用一个地址）
与 order_items 表：一对多（一个订单可以包含多个商品）
与 order_payments 表：一对多（一个订单可以有多个支付记录）
与 order_status_logs 表：一对多（一个订单可以有多个状态变更记录）
与 reviews 表：一对多（一个订单可以有多个评价）
索引：

idx_orders_user_id：用户ID索引
7. order_items 表
作用：存储订单商品信息 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 订单商品ID，自增主键
order_id：INTEGER REFERENCES orders(id) - 订单ID，外键关联订单表
product_id：INTEGER REFERENCES products(id) - 商品ID，外键关联商品表
quantity：INTEGER NOT NULL - 商品数量
price：DECIMAL(10,2) NOT NULL - 商品价格（成交价）
specifications：TEXT DEFAULT '{}' - 商品规格，JSON格式
original_price：DECIMAL - 商品原价（购买时的原价）
promotion_ids：TEXT - 使用的product_promotions表IDs（JSON数组）
discount_amount：DECIMAL DEFAULT 0 - 折扣金额
关联关系：

与 orders 表：多对一（多个订单商品属于一个订单）
与 products 表：多对一（多个订单商品对应一个商品）
索引：

idx_order_items_order_id：订单ID索引
8. promotions 表
作用：存储促销活动信息 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 促销活动ID，自增主键
name：VARCHAR(255) NOT NULL - 活动名称（中文）
name_en：VARCHAR(255) NOT NULL - 活动名称（英文）
name_ar：VARCHAR(255) NOT NULL - 活动名称（阿拉伯文）
type：VARCHAR(50) NOT NULL - 活动类型
discount_percent：INTEGER NOT NULL - 折扣百分比
status：VARCHAR(20) DEFAULT 'active' - 活动状态，默认为活跃
description：TEXT - 活动描述
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
updated_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 更新时间
min_spend：DECIMAL(10,2) DEFAULT 0 - 最低消费
max_discount：DECIMAL(10,2) - 最大折扣
usage_limit：INTEGER - 使用限制
product_ids：TEXT - 关联商品ID，JSON格式
category_ids：TEXT - 关联分类ID，JSON格式
icon：VARCHAR(255) - 活动图标
color：VARCHAR(50) - 活动颜色
关联关系：

与 product_promotions 表：一对多（一个促销活动可以包含多个商品）
与 promotion_stats 表：一对多（一个促销活动可以有多个统计记录）
9. product_promotions 表
作用：存储商品与促销活动的关联信息 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 关联ID，自增主键
product_id：INTEGER NOT NULL - 商品ID，外键关联商品表
promotion_id：INTEGER NOT NULL - 促销活动ID，外键关联促销活动表
original_price：DECIMAL(10,2) NOT NULL - 商品原价（从products.price初始化）
status：VARCHAR(20) DEFAULT 'active' - 状态，默认为活跃
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
start_time：TIMESTAMP - 促销开始时间
end_time：TIMESTAMP - 促销结束时间
priority：INTEGER DEFAULT 2 - 优先级（1最高，2次之，3最低）
can_stack：BOOLEAN DEFAULT 1 - 是否可叠加（1=可叠加，0=独占）
source_type：VARCHAR DEFAULT 'product' - 来源类型
关联关系：

与 products 表：多对一（多个关联记录对应一个商品）
与 promotions 表：多对一（多个关联记录对应一个促销活动）
10. reviews 表
作用：存储商品评价信息 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 评价ID，自增主键
product_id：INTEGER REFERENCES products(id) - 商品ID，外键关联商品表
user_id：INTEGER REFERENCES users(id) - 用户ID，外键关联用户表
rating：INTEGER NOT NULL - 评分
comment：TEXT - 评价内容（中文）
images：TEXT DEFAULT '[]' - 评价图片，JSON格式
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
comment_en：TEXT - 评价内容（英文）
comment_ar：TEXT - 评价内容（阿拉伯文）
status：VARCHAR(20) DEFAULT 'pending' - 评价状态，默认为待审核
is_anonymous：BOOLEAN DEFAULT false - 是否匿名评价
order_id：INTEGER REFERENCES orders(id) - 订单ID，外键关联订单表
关联关系：

与 products 表：多对一（多个评价属于一个商品）
与 users 表：多对一（多个评价属于一个用户）
与 orders 表：多对一（多个评价对应一个订单）
与 review_replies 表：一对多（一个评价可以有多个回复）
与 review_helpful 表：一对多（一个评价可以有多个有用投票）
索引：

idx_reviews_product_id：商品ID索引
11. addresses 表
作用：存储用户地址信息 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 地址ID，自增主键
user_id：INTEGER REFERENCES users(id) - 用户ID，外键关联用户表
name：VARCHAR(100) NOT NULL - 收货人姓名
phone：VARCHAR(20) NOT NULL - 收货人电话
country：VARCHAR(50) NOT NULL - 国家
city：VARCHAR(50) NOT NULL - 城市
address：TEXT NOT NULL - 详细地址
postal_code：VARCHAR(20) - 邮政编码
is_default：BOOLEAN DEFAULT false - 是否默认地址
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
关联关系：

与 users 表：多对一（多个地址属于一个用户）
与 orders 表：多对一（多个订单使用一个地址）
12. order_payments 表
作用：存储订单支付信息 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 支付记录ID，自增主键
order_id：INTEGER NOT NULL REFERENCES orders(id) - 订单ID，外键关联订单表
payment_method：VARCHAR(50) NOT NULL - 支付方式
transaction_id：VARCHAR(100) UNIQUE - 交易ID，唯一
amount：DECIMAL(10,2) NOT NULL - 支付金额
payment_status：VARCHAR(20) DEFAULT 'pending' - 支付状态，默认为待支付
paid_at：TIMESTAMP - 支付时间
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
updated_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 更新时间
关联关系：

与 orders 表：多对一（多个支付记录属于一个订单）
索引：

idx_order_payments_order_id：订单ID索引
13. order_status_logs 表
作用：存储订单状态变更日志 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 日志ID，自增主键
order_id：INTEGER REFERENCES orders(id) - 订单ID，外键关联订单表
old_status：VARCHAR(20) - 旧状态
new_status：VARCHAR(20) - 新状态
change_reason：TEXT - 变更原因
changed_by：INTEGER - 变更人
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
关联关系：

与 orders 表：多对一（多个状态变更日志属于一个订单）
14. promotion_stats 表
作用：存储促销活动统计数据 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 统计ID，自增主键
promotion_id：INTEGER REFERENCES promotions(id) - 促销活动ID，外键关联促销活动表
total_orders：INTEGER - 总订单数
total_revenue：DECIMAL(10,2) - 总收入
total_discount：DECIMAL(10,2) - 总折扣
start_date：TIMESTAMP - 开始日期
end_date：TIMESTAMP - 结束日期
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
关联关系：

与 promotions 表：多对一（多个统计记录属于一个促销活动）
15. review_replies 表
作用：存储评价回复 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 回复ID，自增主键
review_id：INTEGER REFERENCES reviews(id) - 评价ID，外键关联评价表
user_id：INTEGER REFERENCES users(id) - 用户ID，外键关联用户表
content：TEXT - 回复内容（中文）
content_en：TEXT - 回复内容（英文）
content_ar：TEXT - 回复内容（阿拉伯文）
is_admin：BOOLEAN - 是否管理员回复
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
关联关系：

与 reviews 表：多对一（多个回复属于一个评价）
与 users 表：多对一（多个回复属于一个用户）
16. review_helpful 表
作用：存储评价有用投票 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 投票ID，自增主键
review_id：INTEGER REFERENCES reviews(id) - 评价ID，外键关联评价表
user_id：INTEGER REFERENCES users(id) - 用户ID，外键关联用户表
is_helpful：BOOLEAN - 是否有用
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
关联关系：

与 reviews 表：多对一（多个投票属于一个评价）
与 users 表：多对一（多个投票属于一个用户）
17. coupons 表
作用：存储优惠券信息 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 优惠券ID，自增主键
code：VARCHAR(50) UNIQUE NOT NULL - 优惠券代码，唯一
name：VARCHAR(255) NOT NULL - 优惠券名称
type：VARCHAR(20) NOT NULL - 优惠券类型
value：DECIMAL(10,2) NOT NULL - 优惠券价值
min_spend：DECIMAL(10,2) DEFAULT 0 - 最低消费
max_discount：DECIMAL(10,2) - 最大折扣
start_date：TIMESTAMP - 开始日期
end_date：TIMESTAMP - 结束日期
usage_limit：INTEGER - 使用限制
usage_count：INTEGER DEFAULT 0 - 已使用次数
user_limit：INTEGER DEFAULT 1 - 每个用户限制使用次数
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
关联关系：

与 user_coupons 表：一对多（一个优惠券可以被多个用户使用）
18. user_favorites 表
作用：存储用户收藏 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 收藏ID，自增主键
user_id：INTEGER REFERENCES users(id) - 用户ID，外键关联用户表
product_id：INTEGER REFERENCES products(id) - 商品ID，外键关联商品表
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
关联关系：

与 users 表：多对一（多个收藏属于一个用户）
与 products 表：多对一（多个收藏对应一个商品）
19. cart_items 表
作用：存储购物车商品 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 购物车项ID，自增主键
user_id：INTEGER REFERENCES users(id) - 用户ID，外键关联用户表
product_id：INTEGER REFERENCES products(id) - 商品ID，外键关联商品表
quantity：INTEGER NOT NULL - 商品数量
specifications：TEXT DEFAULT '{}' - 商品规格，JSON格式
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
updated_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 更新时间
关联关系：

与 users 表：多对一（多个购物车项属于一个用户）
与 products 表：多对一（多个购物车项对应一个商品）
20. user_coupons 表
作用：存储用户优惠券 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 用户优惠券ID，自增主键
user_id：INTEGER REFERENCES users(id) - 用户ID，外键关联用户表
coupon_id：INTEGER REFERENCES coupons(id) - 优惠券ID，外键关联优惠券表
is_used：BOOLEAN DEFAULT false - 是否已使用
used_at：TIMESTAMP - 使用时间
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
关联关系：

与 users 表：多对一（多个用户优惠券属于一个用户）
与 coupons 表：多对一（多个用户优惠券对应一个优惠券）
21. user_browse_history 表
作用：存储用户浏览历史 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 浏览历史ID，自增主键
user_id：INTEGER REFERENCES users(id) - 用户ID，外键关联用户表
product_id：INTEGER REFERENCES products(id) - 商品ID，外键关联商品表
view_count：INTEGER DEFAULT 1 - 浏览次数
last_viewed_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 最后浏览时间
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
关联关系：

与 users 表：多对一（多个浏览历史属于一个用户）
与 products 表：多对一（多个浏览历史对应一个商品）
22. activity_logs 表
作用：存储活动日志 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 日志ID，自增主键
user_id：INTEGER REFERENCES users(id) - 用户ID，外键关联用户表
activity_type：VARCHAR(50) - 活动类型
activity_data：TEXT - 活动数据，JSON格式
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
关联关系：

与 users 表：多对一（多个活动日志属于一个用户）
23. audit_logs 表
作用：存储审计日志 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 日志ID，自增主键
user_id：INTEGER REFERENCES users(id) - 用户ID，外键关联用户表
action：VARCHAR(100) - 操作
target_type：VARCHAR(50) - 目标类型
target_id：INTEGER - 目标ID
details：TEXT - 详细信息
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
关联关系：

与 users 表：多对一（多个审计日志属于一个用户）
24. inventory_logs 表
作用：存储库存日志 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 日志ID，自增主键
product_id：INTEGER REFERENCES products(id) - 商品ID，外键关联商品表
change_type：VARCHAR(20) - 变更类型
quantity_change：INTEGER - 数量变更
before_quantity：INTEGER - 变更前数量
after_quantity：INTEGER - 变更后数量
reason：TEXT - 变更原因
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
关联关系：

与 products 表：多对一（多个库存日志属于一个商品）
25. system_configs 表
作用：存储系统配置 字段说明：

id：INTEGER PRIMARY KEY AUTOINCREMENT - 配置ID，自增主键
key：VARCHAR(100) UNIQUE NOT NULL - 配置键，唯一
value：TEXT - 配置值
description：TEXT - 配置描述
created_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 创建时间
updated_at：TIMESTAMP DEFAULT CURRENT_TIMESTAMP - 更新时间
关联关系：无

数据库关联关系图
PlainText



products (1) --- (N) product_features
products (1) --- (N) product_promotions
products (1) --- (N) order_items
products (1) --- (N) reviews
products (1) --- (N) user_favorites
products (1) --- (N) cart_items
products (1) --- (N) user_browse_history
products (1) --- (N) inventory_logs

users (1) --- (N) addressesusers (1) --- (N) ordersusers (1) --- (N) reviewsusers (1) --- (N) cart_itemsusers (1) --- (N) user_favoritesusers (1) --- (N) user_couponsusers (1) --- (N) user_browse_historyusers (1) --- (N) activity_logsusers (1) --- (N) audit_logsproducts (1) --- (N) product_featuresproducts (1) --- (N) product_promotionsproducts (1) --- (N) order_itemsproducts (1) --- (N) reviewsproducts (1) --- (N) user_favoritesproducts (1) --- (N) cart_itemsproducts (1) --- (N) user_browse_historyproducts (1) --- (N) inventory_logscategories (1) --- (N) productsorders (1) --- (N) order_itemsorders (1) --- (N) order_paymentsorders (1) --- (N) order_status_logsorders (1) --- (N) reviewspromotions (1) --- (N) product_promotionspromotions (1) --- (N) promotion_statsfeature_templates (1) --- (N) product_featuresreviews (1) --- (N) review_repliesreviews (1) --- (N) review_helpfulcoupons (1) --- (N) user_coupons
总结
该数据库设计覆盖了电商系统的核心功能，包括用户管理、商品管理、订单管理、促销管理、评价管理等。通过合理的表结构设计和关联关系，实现了系统的各项功能需求。特别是在商品特性、促销活动和评价系统方面，设计了详细的表结构来支持复杂的业务逻辑。

数据库使用了SQLite，适合中小型应用，结构清晰，字段定义合理，索引设置恰当，能够满足系统的性能需求。