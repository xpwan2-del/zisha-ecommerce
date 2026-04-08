---
name: "zisha-development"
description: "紫砂电商项目开发规范技能。包含服务端逻辑优先、增量开发、标准沟通话术等规范。Invoke when developing features for zisha e-commerce project."
---

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

### 3. 增量开发
**必须遵守**：新功能用新文件或新API实现，不替换或删除现有代码。

**禁止事项**：
- ❌ 直接修改现有API
- ❌ 删除现有数据库字段
- ❌ 替换现有组件
- ❌ 一次性修改多个功能

**正确做法**：
- ✅ 新功能创建新API端点
- ✅ 新功能创建新组件文件
- ✅ 数据库添加新字段（不删除旧的）
- ✅ 一个一个功能开发

## 标准沟通话术

### 用户发起开发时
用户应该说：
> "我要做【功能名称】，要求是：【具体要求】。请确认理解后告诉我你的开发计划。"

AI必须回复：
> "我理解你要做【功能名称】，我的开发计划是：
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
> ```sql
> 【SQL语句】
> ```
> 
> 请确认后执行。"

### API开发时
用户应该说：
> "请开发【API名称】API，要求：所有逻辑在服务端完成，返回完整数据给前端。"

AI必须回复：
> "我将开发【API名称】API，接口定义如下：
> 
> **接口地址：** `【METHOD】/api/【path】`
> 
> **请求参数：**
> - 【参数1】：【类型】，【说明】
> - 【参数2】：【类型】，【说明】
> 
> **返回数据：**
> ```json
> {
>   "success": true,
>   "data": 【数据结构】
> }
> ```
> 
> **服务端逻辑：**
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
> - 服务端组件：获取数据
> - 客户端组件：渲染展示
> 
> **不影响现有代码：**
> - 新功能使用条件渲染
> - 添加 `【条件判断】` 控制显示
> 
> 请确认后开发。"

## 禁止事项清单

当AI要做以下操作时，必须阻止：

| 禁止事项 | 用户应该说 |
|---------|-----------|
| 修改现有页面布局 | "请不要修改现有页面布局，只添加新功能" |
| 删除现有代码 | "请不要删除现有代码，使用增量开发" |
| 前端做业务逻辑 | "请不要在前端做业务逻辑，全部放到服务端" |
| 替换现有组件 | "请不要替换现有组件，新功能用新组件" |
| 修改数据库结构不备份 | "请先备份数据库再修改结构" |
| 一次性修改多个功能 | "请一个一个功能做，不要同时修改多个" |

## 开发前确认清单

每次开发前，AI必须确认：

- [ ] 数据库已备份
- [ ] 代码已提交
- [ ] 需求已理解
- [ ] 明确不修改现有展示
- [ ] 明确服务端逻辑优先

AI回复模板：
> "确认清单：
> - ✅ 数据库已备份到【备份文件名】
> - ✅ 代码已提交，提交信息：【提交信息】
> - ✅ 需求已理解：【需求简述】
> - ✅ 明确不修改现有展示，只添加新功能
> - ✅ 明确所有逻辑在服务端完成
> 
> 可以开始开发。"

## 项目数据结构

### 产品分类映射
| 图片编号 | 分类 | category_id |
|---------|------|-------------|
| 1-15 | 紫砂壶 | 1 |
| 16-24 | 紫砂茶杯 | 2 |
| 25-36 | 茶叶罐 | 3 |
| 37-41 | 茶具套装 | 4 |
| 42-50 | 配件 | 5 |

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
