# 紫砂电商 API 开发规范

## 概述

本文档定义紫砂电商项目 API 接口的开发标准、管理规范和监听机制。所有新开发的 API 必须遵循本规范。

***

## 目录

1. [开发前检查清单](#1-开发前检查清单)
2. [API 文件标准模板](#2-api-文件标准模板)
3. [监听框架接入规范](#3-监听框架接入规范)
4. [OpenAPI 注释规范](#4-openapi-注释规范)
5. [错误处理规范](#5-错误处理规范)
6. [多语言支持规范](#6-多语言支持规范)
7. [响应格式规范](#7-响应格式规范)
8. [完整示例](#8-完整示例)

***

## 1. 开发前检查清单

### 1.1 现有功能检查

开发新 API 前，必须检查是否已存在类似功能：

```bash
# 检查清单
- [ ] 检查 src/app/api/ 目录是否有相关 API
- [ ] 检查 src/lib/ 是否有可复用工具函数
- [ ] 检查数据库表结构是否有可复用字段
- [ ] 检查 messages.ts 是否有可复用错误码
```

### 1.2 API 命名规范

| 类型      | 规范       | 示例                         |
| ------- | -------- | -------------------------- |
| HTTP 方法 | 大写       | GET, POST, PUT, DELETE     |
| URL 路径  | 小写+中划线   | /api/inventory/reserve     |
| 文件名     | route.ts | src/app/api/xxx/route.ts   |
| 模块分组    | 按业务模块    | inventory/, cart/, orders/ |

### 1.3 开发流程

```
需求确认 → 现有检查 → 规范制定 → 用户确认 → 开发 → 监听接入 → 文档注释 → 测试验证
```

***

## 2. API 文件标准模板

### 2.1 完整模板

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * API 模块名称
 * ============================================================
 *
 * @api {METHOD} /api/xxx 接口完整路径
 * @apiName 接口名称
 * @apiGroup 模块分组
 * @apiDescription 接口详细描述，包括功能、业务规则、注意事项等
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)，可选，默认 zh
 * @apiHeader {String} [Authorization] Bearer Token，用户认证凭证
 *
 * @apiParam {Type} name 参数名称 参数说明，必需/可选
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": { ... }
 *     }
 *
 * @apiError {String} error_code 错误码
 * @apiError {String} message 错误信息
 * @apiErrorExample {json} Error-Response:
 *     {
 *       "success": false,
 *       "error": "ERROR_CODE",
 *       "message": "错误信息"
 *     }
 */

// ============================================================
// 辅助函数
// ============================================================

/**
 * getLangFromRequest - 从请求获取语言设置
 * @description 优先从请求头 x-lang 获取，其次从 cookie 获取，默认 zh
 */
function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

/**
 * createErrorResponse - 创建统一错误响应
 * @param error 错误码
 * @param lang 语言
 * @param status HTTP 状态码
 */
function createErrorResponse(error: string, lang: string, status: number = 400) {
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

/**
 * createSuccessResponse - 创建统一成功响应
 * @param data 返回数据
 * @param status HTTP 状态码
 */
function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    { success: true, data },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

// ============================================================
// 业务逻辑辅助函数（按需添加）
// ============================================================

/**
 * calculateStockStatus - 计算库存状态
 * @param quantity 库存数量
 * @returns 状态ID：1=有货, 2=库存有限, 3=库存紧张, 4=缺货
 */
function calculateStockStatus(quantity: number): number {
  if (quantity <= 0) return 4;
  if (quantity <= 5) return 3;
  if (quantity <= 10) return 2;
  return 1;
}

// ============================================================
// 接口实现
// ============================================================

/**
 * GET - 获取资源列表/详情
 *
 * @api {GET} /api/xxx
 * @apiDescription 获取xxx的列表或详情
 */
export async function GET(request: NextRequest) {
  // 1. 初始化
  const lang = getLangFromRequest(request);
  logMonitor('API', 'REQUEST', {
    method: 'GET',
    path: '/api/xxx',
    query: Object.fromEntries(request.nextUrl.searchParams)
  });

  try {
    // 2. 权限验证（按需）
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('API', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    // 3. 参数获取
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // 4. 参数校验
    if (!id) {
      logMonitor('API', 'VALIDATION_FAILED', { reason: 'Missing required param: id' });
      return createErrorResponse('MISSING_PARAM', lang, 400);
    }

    // 5. 业务逻辑
    const result = await query(
      'SELECT * FROM table_name WHERE id = ?',
      [id]
    );

    // 6. 结果处理
    if (result.rows.length === 0) {
      logMonitor('API', 'NOT_FOUND', { id });
      return createErrorResponse('NOT_FOUND', lang, 404);
    }

    // 7. 返回成功响应
    logMonitor('API', 'SUCCESS', {
      action: 'GET_xxx',
      id,
      rowsReturned: result.rows.length
    });
    return createSuccessResponse(result.rows[0]);

  } catch (error) {
    // 8. 错误处理
    logMonitor('API', 'ERROR', {
      action: 'GET_xxx',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}

/**
 * POST - 创建资源
 *
 * @api {POST} /api/xxx
 * @apiDescription 创建新的xxx
 */
export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);
  logMonitor('API', 'REQUEST', {
    method: 'POST',
    path: '/api/xxx'
  });

  try {
    // 权限验证
    const authResult = requireAuth(request);
    if (authResult.response) return authResult.response;

    // 获取请求体
    const body = await request.json();
    const { field1, field2 } = body;

    // 参数校验
    if (!field1) {
      logMonitor('API', 'VALIDATION_FAILED', { reason: 'Missing required field: field1' });
      return createErrorResponse('MISSING_PARAM', lang, 400);
    }

    // 业务逻辑...

    logMonitor('API', 'SUCCESS', { action: 'CREATE_xxx' });
    return createSuccessResponse({ id: 1 }, 201);

  } catch (error) {
    logMonitor('API', 'ERROR', {
      action: 'CREATE_xxx',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}

/**
 * PUT - 更新资源
 */
export async function PUT(request: NextRequest) {
  // 类似 POST 结构
}

/**
 * DELETE - 删除资源
 */
export async function DELETE(request: NextRequest) {
  // 类似 GET 结构
}
```

***

## 3. 监听框架接入规范

### 3.1 为什么需要监听

| 作用   | 说明            |
| ---- | ------------- |
| 问题追踪 | 线上问题可通过日志快速定位 |
| 性能监控 | 记录API响应时间     |
| 业务审计 | 记录关键业务操作      |
| 调试开发 | 开发时查看请求详情     |

### 3.2 logMonitor 使用方法

```typescript
import { logMonitor } from '@/lib/utils/logger';

// 模块可选值
// 'API'       - 通用API模块，未分类的API
// 'DB'        - 数据库操作
// 'ROUTER'    - 路由层操作
// 'AUTH'      - 认证模块：/api/auth/* (login, me, logout, register, refresh)
// 'CART'      - 购物车模块：/api/cart/*
// 'ORDERS'    - 订单模块：/api/orders/*, /api/quick-order/ /api/coupons/**, /api/coupons/*
// 'INVENTORY' - 库存模块：/api/inventory/*, /api/inventory-status/*
// 'PAYMENTS'  - 支付模块：/api/payments/*
// 'PRODUCTS'  - 商品模块：/api/products/*, /api/reviews/*

// 操作可选值
// 'REQUEST' | 'SUCCESS' | 'ERROR' | 'VALIDATION_FAILED' | 'AUTH_FAILED' | 'NOT_FOUND'
```

### 3.3 API 模块归类规则

| API 路径前缀                  | 归类模块        | 说明     |
| ------------------------- | ----------- | ------ |
| `/api/auth/*`             | `AUTH`      | 认证登录注册 |
| `/api/cart/*`             | `CART`      | 购物车    |
| `/api/orders/*`           | `ORDERS`    | 订单     |
| `/api/quick-order/*`      | `ORDERS`    | 快速订单   |
| `/api/coupons/*`          | `ORDERS`    | 优惠券    |
| `/api/inventory/*`        | `INVENTORY` | 库存     |
| `/api/inventory-status/*` | `INVENTORY` | 库存状态   |
| `/api/payments/*`         | `PAYMENTS`  | 支付     |
| `/api/products/*`         | `PRODUCTS`  | 商品     |
| `/api/reviews/*`          | `PRODUCTS`  | 商品评价   |
| 其他                        | `API`       | 通用模块   |

| 场景     | 监听操作               | 记录内容                     |
| ------ | ------------------ | ------------------------ |
| 请求进入   | REQUEST            | method, path, query/body |
| 权限验证失败 | AUTH\_FAILED       | reason                   |
| 参数校验失败 | VALIDATION\_FAILED | reason, params           |
| 资源不存在  | NOT\_FOUND         | 查找条件                     |
| 业务操作成功 | SUCCESS            | action, 关键结果             |
| 系统错误   | ERROR              | action, error信息          |

### 3.4 监听记录示例

```typescript
// 请求进入
logMonitor('API', 'REQUEST', {
  method: 'POST',
  path: '/api/inventory/reserve',
  body: { product_id: 2, quantity: 3 }  // 不含敏感信息
});

// 业务成功
logMonitor('API', 'SUCCESS', {
  action: 'RESERVE_INVENTORY',
  product_id: 2,
  quantity: 3,
  stock_before: 10,
  stock_after: 7
});

// 权限失败
logMonitor('API', 'AUTH_FAILED', {
  reason: 'Token expired',
  path: '/api/xxx'
});

// 校验失败
logMonitor('API', 'VALIDATION_FAILED', {
  reason: 'Missing required field: product_id',
  path: '/api/inventory/reserve'
});

// 错误（注意：只记录 String(error)，不记录整个 error 对象）
logMonitor('API', 'ERROR', {
  action: 'RESERVE_INVENTORY',
  error: 'SQLITE_CANTOPEN: unable to open database file'
});
```

### 3.5 监听配置

```typescript
// src/lib/utils/logger.ts 中的 MonitorConfig

export const MonitorConfig = {
  enabled: process.env.NODE_ENV === 'development',  // 生产环境关闭
  db: true,      // 数据库监听
  api: true,     // API监听
  router: true,   // 路由监听
  auth: true,     // 认证监听 (login, me, logout, register, refresh)
  cart: true,     // 购物车监听
  orders: true,   // 订单监听
  inventory: true,// 库存监听
  payments: true, // 支付监听
  products: true, // 商品监听
  level: 'all',   // 日志级别：all=全部，debug=调试，error=仅错误
};
```

### 3.6 已接入 logMonitor 的 API

以下 API 已完成监听接入并验证通过：

#### INVENTORY 模块 (✅ 已完成)

| API    | 方法     | 路径                                    | 状态   | 验证日期       |
| ------ | ------ | ------------------------------------- | ---- | ---------- |
| 获取库存列表 | GET    | `/api/inventory`                      | ✅ 完成 | 2026-04-21 |
| 获取库存流水 | GET    | `/api/inventory/transactions`         | ✅ 完成 | 2026-04-21 |
| 获取库存状态 | GET    | `/api/inventory/status`               | ✅ 完成 | 2026-04-21 |
| 预留库存   | POST   | `/api/inventory/reserve`              | ✅ 完成 | 2026-04-21 |
| 初始化库存  | POST   | `/api/inventory/init`                 | ✅ 完成 | 2026-04-21 |
| 获取参考类型 | GET    | `/api/inventory/reference-types`      | ✅ 完成 | 2026-04-21 |
| 库存检查   | POST   | `/api/inventory/checks`               | ✅ 完成 | 2026-04-21 |
| 获取盘点详情 | GET    | `/api/inventory/checks/[id]`          | ✅ 完成 | 2026-04-21 |
| 删除盘点单  | DELETE | `/api/inventory/checks/[id]`          | ✅ 完成 | 2026-04-21 |
| 录入盘点商品 | POST   | `/api/inventory/checks/[id]/items`    | ✅ 完成 | 2026-04-21 |
| 完成盘点   | POST   | `/api/inventory/checks/[id]/complete` | ✅ 完成 | 2026-04-21 |
| 获取预警列表 | GET    | `/api/inventory/alerts`               | ✅ 完成 | 2026-04-21 |
| 解决预警   | POST   | `/api/inventory/alerts/[id]/resolve`  | ✅ 完成 | 2026-04-21 |

**业务说明**：

- **库存盘点（inventory\_checks）**：人工盘点实际库存，差异调整库存
- **库存预警（inventory\_alerts）**：低库存/过期等预警通知
- **transaction\_type 表**：库存流水分类（18种类型：cat\_creat, cat\_reduce, sales\_creat, order\_cancel 等）

**库存规则**：

- 扣库存场景：加入购物车、立即购买、快速订单点击"+"
- 还库存场景：购物车点击"-"/删除/清空、快速订单点击"-"、订单取消/删除、退货完成

#### AUTH 模块 (✅ 已完成)

| API    | 方法   | 路径                | 状态   | 验证日期       |
| ------ | ---- | ----------------- | ---- | ---------- |
| 登录     | POST | `/api/auth/login` | ✅ 完成 | 2026-04-20 |
| 获取当前用户 | GET  | `/api/auth/me`    | ✅ 完成 | 2026-04-20 |

**验证结果**（Chrome + Firefox 双浏览器测试通过）：

```bash
# 登录成功日志
[AUTH] [REQUEST] { method: 'POST', path: '/api/auth/login', lang: 'zh' }
[AUTH] [SUCCESS] { action: 'LOGIN_SUCCESS', userId: 8, emailPrefix: 'tes' }
POST /api/auth/login 200 in 147ms

# 获取用户成功日志
[AUTH] [REQUEST] { method: 'GET', path: '/api/auth/me', lang: 'zh' }
[AUTH] [SUCCESS] { action: 'GET_CURRENT_USER', userId: 8 }
GET /api/auth/me 200 in 15ms

# 登录失败日志（密码错误）
[AUTH] [AUTH_FAILED] { reason: 'Invalid password', userId: 8 }
POST /api/auth/login 401 in 112ms
```

#### CART 模块 (✅ 已完成)

| API   | 方法     | 路径          | 状态   | 验证日期       |
| ----- | ------ | ----------- | ---- | ---------- |
| 获取购物车 | GET    | `/api/cart` | ✅ 完成 | 2026-04-20 |
| 添加购物车 | POST   | `/api/cart` | ✅ 完成 | 2026-04-20 |
| 更新购物车 | PUT    | `/api/cart` | ✅ 完成 | 2026-04-20 |
| 删除购物车 | DELETE | `/api/cart` | ✅ 完成 | 2026-04-20 |

**验证结果**：

```bash
[CART] [SUCCESS] {
  action: 'GET_CART',
  userId: 8,
  itemsCount: 2,
  total: 12703.25,
  total_items: 11
}
GET /api/cart 200 in 17ms
```

#### PRODUCTS 模块 (✅ 已完成)

| API    | 方法  | 路径                   | 状态   | 验证日期       |
| ------ | --- | -------------------- | ---- | ---------- |
| 获取商品列表 | GET | `/api/products`      | ✅ 完成 | 2026-04-20 |
| 获取商品详情 | GET | `/api/products/[id]` | ✅ 完成 | 2026-04-20 |

**验证结果**：

```bash
[PRODUCTS] [SUCCESS] {
  action: 'GET_PRODUCTS',
  productsCount: 2,
  pagination: { page: 1, limit: 2, total: 60, totalPages: 30 }
}
GET /api/products?limit=2 200 in 19ms

[PRODUCTS] [SUCCESS] {
  action: 'GET_PRODUCT_BY_ID',
  productId: 2,
  productName: '2. 掇球紫砂壶',
  stock: 3
}
GET /api/products/2 200 in 32ms
```

#### CART-ADDRESSES 模块 (✅ 已完成)

| API    | 方法     | 路径               | 状态   | 验证日期       |
| ------ | ------ | ---------------- | ---- | ---------- |
| 获取地址列表 | GET    | `/api/addresses` | ✅ 完成 | 2026-04-20 |
| 创建地址   | POST   | `/api/addresses` | ✅ 完成 | 2026-04-20 |
| 更新地址   | PUT    | `/api/addresses` | ✅ 完成 | 2026-04-20 |
| 删除地址   | DELETE | `/api/addresses` | ✅ 完成 | 2026-04-20 |

**验证结果**：

```bash
[CART] [SUCCESS] { action: 'GET_ADDRESSES', userId: 8, count: 3 }
GET /api/addresses 200 in 37ms
```

#### CART-FEATURES 模块 (⚠️ 前端未实现)

| API    | 方法     | 路径               | 状态       | 备注              |
| ------ | ------ | ---------------- | -------- | --------------- |
| 获取收藏列表 | GET    | `/api/favorites` | ⚠️ 前端未实现 | 页面是静态的，没有调用 API |
| 添加收藏   | POST   | `/api/favorites` | ⚠️ 前端未实现 | 同上              |
| 删除收藏   | DELETE | `/api/favorites` | ⚠️ 前端未实现 | 同上              |

#### PROMOTIONS 模块 (⚠️ 后端API)

| API     | 方法     | 路径                      | 状态    | 备注              |
| ------- | ------ | ----------------------- | ----- | --------------- |
| 获取促销列表  | GET    | `/api/promotions`       | ✅ 已接入 | 前端通过商品API获取促销信息 |
| 创建促销    | POST   | `/api/promotions`       | ✅ 已接入 | 需要管理员权限         |
| 更新促销    | PUT    | `/api/promotions`       | ✅ 已接入 | 需要管理员权限         |
| 删除促销    | DELETE | `/api/promotions`       | ✅ 已接入 | 需要管理员权限         |
| 获取优惠券列表 | GET    | `/api/coupons`          | ✅ 已接入 | 前端未直接调用         |
| 领取优惠券   | POST   | `/api/coupons`          | ✅ 已接入 | 前端未直接调用         |
| 验证优惠券   | POST   | `/api/coupons/validate` | ✅     | 前端未直接调用         |

**验证结果**（curl测试通过）：

```bash
[PROMOTIONS] [SUCCESS] { action: 'GET_PROMOTIONS', count: 7 }
GET /api/promotions 200 in 241ms
```

#### PRODUCTS-USERS 模块 (⚠️ 部分完成)

| API    | 方法     | 路径                           | 状态       | 备注       |
| ------ | ------ | ---------------------------- | -------- | -------- |
| 获取评价列表 | GET    | `/api/reviews`               | ⚠️ 前端未实现 | 页面可能是静态的 |
| 创建评价   | POST   | `/api/reviews`               | ⚠️ 前端未实现 | 同上       |
| 删除所有评价 | DELETE | `/api/reviews`               | ⚠️ 前端未实现 | 同上       |
| 获取用户列表 | GET    | `/api/users`                 | ✅ 已接入    | 需要管理员权限  |
| 创建用户   | POST   | `/api/users`                 | ✅ 已接入    | 需要测试环境   |
| 更新用户   | PUT    | `/api/users`                 | ✅ 已接入    | 需要测试环境   |
| 删除用户   | DELETE | `/api/users`                 | ✅ 已接入    | 需要测试环境   |
| 获取个人资料 | GET    | `/api/user/profile`          | ✅ 已接入    | 数据库结构问题  |
| 更新个人资料 | PUT    | `/api/user/profile`          | ✅ 已接入    | 数据库结构问题  |
| 修改密码   | PUT    | `/api/user/profile/password` | ✅ 已接入    | 需要真实密码测试 |

#### PAYMENTS 模块 (✅ 已完成)

| API    | 方法   | 路径                                    | 状态   | 验证日期       |
| ------ | ---- | ------------------------------------- | ---- | ---------- |
| PayPal 创建支付 | POST | `/api/payments/paypal`               | ✅ 完成 | 2026-04-26 |
| PayPal 支付成功 | GET  | `/api/payments/paypal/success`        | ✅ 完成 | 2026-04-26 |
| PayPal 支付取消 | GET  | `/api/payments/paypal/cancel`         | ✅ 完成 | 2026-04-26 |
| PayPal Webhook | POST | `/api/payments/paypal/notify`          | ✅ 完成 | 2026-04-26 |
| Alipay 创建支付 | POST | `/api/payments/alipay`                 | ✅ 完成 | 2026-04-26 |
| Alipay 支付成功 | POST | `/api/payments/alipay/success`         | ✅ 完成 | 2026-04-26 |
| Alipay 支付取消 | GET  | `/api/payments/alipay/cancel`          | ✅ 完成 | 2026-04-26 |
| Alipay Webhook | POST | `/api/payments/alipay/notify`          | ✅ 完成 | 2026-04-26 |
| Stripe 创建支付 | POST | `/api/payments/stripe`                 | ✅ 完成 | 2026-04-26 |
| Stripe 支付成功 | GET  | `/api/payments/stripe/success`         | ✅ 完成 | 2026-04-26 |
| Stripe 支付取消 | GET  | `/api/payments/stripe/cancel`          | ✅ 完成 | 2026-04-26 |
| Stripe Webhook | POST | `/api/payments/stripe/notify`          | ✅ 完成 | 2026-04-26 |

**业务说明**：

- **支付取消日志**：所有支付通道的取消操作都记录到 `payment_logs` 表
- **统一错误码**：取消操作使用 `error_code = 'USER_CANCEL'`，关联 `payment_error_codes` 表
- **多语言支持**：通过 `payment_error_codes` 表的 `message_zh/en/ar` 字段提供多语言错误消息

**数据库关联**：

```sql
payment_logs.error_code = payment_error_codes.original_code
AND payment_logs.payment_method = payment_error_codes.platform
```

**取消错误码**（6条）：

| platform | original_code | unified_code | message_zh |
|----------|--------------|--------------|------------|
| paypal | USER_CANCEL | USER_CANCEL | 用户取消支付 |
| paypal | TIMEOUT | PAYMENT_TIMEOUT | 支付超时 |
| alipay | USER_CANCEL | USER_CANCEL | 用户取消支付 |
| alipay | TIMEOUT | PAYMENT_TIMEOUT | 支付超时 |
| stripe | USER_CANCEL | USER_CANCEL | 用户取消支付 |
| stripe | TIMEOUT | PAYMENT_TIMEOUT | 支付超时 |

**验证结果**（curl测试通过）：

```bash
[PAYMENTS] [SUCCESS] {
  action: 'PAYPAL_CANCEL_LOGGED',
  orderId: 51,
  orderNumber: 'ORD1777173895390771',
  paymentLogId: 3,
  errorCode: 'USER_CANCEL',
  status: 'cancelled',
  platform: 'paypal'
}
GET /api/payments/paypal/cancel 302 in 45ms
```

### 3.7 待接入 API 规划

按优先级分批接入：

```
第一批次（高优先级 - 核心业务流程）：
├── AUTH: logout, refresh, register ✅ 已完成
├── ORDERS: orders, orders/[id]
└── PAYMENTS: alipay, paypal, stripe ✅ 已完成（含cancel）

第二批次（中优先级 - 购物相关）：
├── CART: cart, cart/merge ✅ 已完成
├── PRODUCTS: products, products/[id] ✅ 已完成
├── ADDRESSES ✅ 已完成
├── FAVORITES ⚠️ 前端未实现
├── REVIEWS ⚠️ 前端未实现
└── USERS ✅ 已完成

第三批次（低优先级 - 后台管理）：
├── PROMOTIONS ✅ 已完成
├── INVENTORY ✅ 已完成
└── ADMIN: home, categories, themes, translations 等
```

***

## 4. OpenAPI 注释规范

### 4.1 注释位置

每个 API 文件头部必须有 OpenAPI 格式注释：

```typescript
/**
 * @api {METHOD} /api/xxx 接口完整路径
 * @apiName 接口名称（唯一标识）
 * @apiGroup 模块分组
 * @apiDescription 接口详细描述
 */
```

### 4.2 完整注释示例

```typescript
/**
 * @api {POST} /api/inventory/reserve 立即购买预留库存
 * @apiName ReserveInventory
 * @apiGroup Inventory
 * @apiDescription 用户在商品详情页点击"立即购买"时，预留库存并跳转支付页面。
 *
 * **业务逻辑：**
 * 1. 验证用户登录状态
 * 2. 检查商品库存是否充足
 * 3. 扣减库存并记录库存流水
 * 4. 返回成功响应，前端跳转支付页面
 *
 * **注意：**
 * - 此接口只预留库存，不创建订单
 * - 订单在用户完成支付后创建
 * - 如果用户放弃支付，库存不会自动释放（需要定时任务清理）
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 * @apiHeader {String} Authorization Bearer Token 用户认证凭证
 *
 * @apiParam {Number} product_id 商品ID，必需
 * @apiParam {Number} quantity 购买数量，必需，必须 > 0
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 * @apiSuccess {Number} data.product_id 商品ID
 * @apiSuccess {Number} data.quantity 购买数量
 * @apiSuccess {Number} data.stock_before 操作前库存
 * @apiSuccess {Number} data.stock_after 操作后库存
 * @apiSuccess {Number} data.transaction_type_id 库存流水类型ID
 *
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "product_id": 2,
 *         "quantity": 3,
 *         "stock_before": 10,
 *         "stock_after": 7,
 *         "transaction_type_id": 1
 *       }
 *     }
 *
 * @apiError {String} UNAUTHORIZED 未登录或Token无效
 * @apiError {String} MISSING_PARAMS 缺少必需参数
 * @apiError {String} INSUFFICIENT_STOCK 库存不足
 * @apiError {String} PRODUCT_NOT_FOUND 商品不存在
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 *
 * @apiErrorExample {json} Error-Response:
 *     {
 *       "success": false,
 *       "error": "INSUFFICIENT_STOCK",
 *       "message": "库存不足，当前库存: 5",
 *       "requested": 10,
 *       "available": 5
 *     }
 */
```

### 4.3 错误码规范

| 错误码                 | 含义      | HTTP状态码 |
| ------------------- | ------- | ------- |
| UNAUTHORIZED        | 未授权     | 401     |
| FORBIDDEN           | 权限不足    | 403     |
| NOT\_FOUND          | 资源不存在   | 404     |
| MISSING\_PARAMS     | 缺少参数    | 400     |
| VALIDATION\_FAILED  | 参数校验失败  | 400     |
| INSUFFICIENT\_STOCK | 库存不足    | 400     |
| OUT\_OF\_STOCK      | 库存耗尽    | 400     |
| INTERNAL\_ERROR     | 服务器内部错误 | 500     |

***

## 5. 错误处理规范

### 5.1 统一错误响应格式

```typescript
// 错误响应格式
{
  success: false,
  error: 'ERROR_CODE',        // 错误码（用于程序判断）
  message: '中文错误信息',      // 可显示的错误信息
  // 以下为可选字段
  message_en: 'English msg',  // 英文
  message_ar: 'Arabic msg',   // 阿拉伯文
  details: { ... }            // 详细信息（用于调试）
}
```

### 5.2 错误码定义位置

错误码集中定义在 `src/lib/messages.ts` 的 `MessageSet` 接口中：

```typescript
export interface MessageSet {
  // ... 现有错误码 ...

  // API 通用错误码
  UNAUTHORIZED: string;
  FORBIDDEN: string;
  NOT_FOUND: string;
  MISSING_PARAMS: string;
  VALIDATION_FAILED: string;
  INTERNAL_ERROR: string;

  // 业务错误码（按模块添加）
  INSUFFICIENT_STOCK: string;
  OUT_OF_STOCK: string;
  // ...
}
```

### 5.3 错误处理模式

```typescript
// 模式1：使用 messages.ts 中的错误码
import { getMessage } from '@/lib/messages';

function handleError(error: string, lang: string) {
  return NextResponse.json({
    success: false,
    error,
    message: getMessage(error as keyof MessageSet, lang)
  }, { status: 400 });
}

// 模式2：带额外信息的错误
function handleErrorWithDetails(error: string, details: any, lang: string) {
  return NextResponse.json({
    success: false,
    error,
    message: getMessage(error as keyof MessageSet, lang),
    ...details  // 展开额外信息
  }, { status: 400 });
}
```

### 5.4 禁止的做法

```typescript
// ❌ 禁止：硬编码错误信息
return NextResponse.json({
  success: false,
  error: '库存不足'
}, { status: 400 });

// ❌ 禁止：使用英文错误信息
return NextResponse.json({
  success: false,
  error: 'Insufficient stock'
}, { status: 400 });

// ❌ 禁止：直接返回 error 对象
return NextResponse.json({
  success: false,
  error: error  // error 是复杂对象，无法序列化
}, { status: 500 });

// ✅ 正确：使用错误码 + 多语言消息
return NextResponse.json({
  success: false,
  error: 'INSUFFICIENT_STOCK',
  message: getMessage('INSUFFICIENT_STOCK', lang)
}, { status: 400 });
```

***

## 6. 多语言支持规范

### 6.1 语言获取优先级

```typescript
function getLangFromRequest(request: NextRequest): string {
  // 1. 请求头 x-lang（最高优先级）
  // 2. Cookie 中的 locale
  // 3. 默认值 zh
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}
```

### 6.2 消息结构

```typescript
// src/lib/messages.ts

export interface Messages {
  zh: MessageSet;
  en: MessageSet;
  ar: MessageSet;
}

export const messages: Messages = {
  zh: {
    INSUFFICIENT_STOCK: '库存不足',
    // ...
  },
  en: {
    INSUFFICIENT_STOCK: 'Insufficient stock',
    // ...
  },
  ar: {
    INSUFFICIENT_STOCK: 'المخزون غير كافٍ',
    // ...
  }
};
```

### 6.3 带参数的消息

```typescript
// 定义带参数的消息
INSUFFICIENT_STOCK: '库存不足，仅剩 {stock} 件'

// 使用
getMessageWithParams('INSUFFICIENT_STOCK', lang, { stock: 5 })
// 中文：库存不足，仅剩 5 件
// 英文：Only 5 available
// 阿拉伯文：المخزون المتاح فقط 5
```

***

## 7. 响应格式规范

### 7.1 成功响应

```typescript
// 标准成功响应
{
  success: true,
  data: { ... }
}

// 带分页的成功响应
{
  success: true,
  data: {
    items: [...],
    pagination: {
      page: 1,
      limit: 20,
      total: 100,
      total_pages: 5
    }
  }
}
```

### 7.2 辅助函数

```typescript
function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    { success: true, data },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
```

### 7.3 HTTP 状态码使用规范

| 状态码 | 场景                |
| --- | ----------------- |
| 200 | GET/PUT/DELETE 成功 |
| 201 | POST 创建成功         |
| 400 | 参数错误、业务错误         |
| 401 | 未登录               |
| 403 | 权限不足              |
| 404 | 资源不存在             |
| 500 | 服务器内部错误           |

***

## 8. 完整示例

### 示例：创建库存预留 API

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

/**
 * @api {POST} /api/inventory/reserve 立即购买预留库存
 * @apiName ReserveInventory
 * @apiGroup Inventory
 * @apiDescription 用户点击"立即购买"时预留库存，跳转支付页面。
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 * @apiHeader {String} Authorization Bearer Token
 *
 * @apiParam {Number} product_id 商品ID，必需
 * @apiParam {Number} quantity 数量，必需，> 0
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 库存预留信息
 * @apiSuccessExample {json} Success-Response:
 *     {"success": true, "data": {"product_id": 1, "quantity": 2, "stock_before": 10, "stock_after": 8}}
 *
 * @apiError {String} UNAUTHORIZED 未登录
 * @apiError {String} MISSING_PARAMS 缺少参数
 * @apiError {String} INSUFFICIENT_STOCK 库存不足
 * @apiErrorExample {json} Error-Response:
 *     {"success": false, "error": "INSUFFICIENT_STOCK", "message": "库存不足，当前库存: 5"}
 */

// ============================================================
// 辅助函数
// ============================================================

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

function createErrorResponse(error: string, lang: string, status: number = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    { success: true, data },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

function calculateStockStatus(quantity: number): number {
  if (quantity <= 0) return 4;
  if (quantity <= 5) return 3;
  if (quantity <= 10) return 2;
  return 1;
}

// ============================================================
// POST - 预留库存
// ============================================================

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  // 监听：请求进入
  logMonitor('API', 'REQUEST', {
    method: 'POST',
    path: '/api/inventory/reserve'
  });

  try {
    // 1. 权限验证
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('API', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    // 2. 获取参数
    const body = await request.json();
    const { product_id, quantity } = body;
    const userId = authResult.user.userId;

    // 3. 参数校验
    if (!product_id || !quantity) {
      logMonitor('API', 'VALIDATION_FAILED', {
        reason: 'Missing required params',
        product_id,
        quantity
      });
      return createErrorResponse('MISSING_PARAMS', lang, 400);
    }

    if (quantity <= 0) {
      logMonitor('API', 'VALIDATION_FAILED', {
        reason: 'Invalid quantity',
        quantity
      });
      return createErrorResponse('INVALID_QUANTITY', lang, 400);
    }

    // 4. 查询商品库存
    const productResult = await query(
      'SELECT p.id, p.name, COALESCE(i.quantity, 0) as stock FROM products p LEFT JOIN inventory i ON p.id = i.product_id WHERE p.id = ?',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      logMonitor('API', 'NOT_FOUND', { product_id });
      return createErrorResponse('PRODUCT_NOT_FOUND', lang, 404);
    }

    const product = productResult.rows[0];
    const currentStock = product.stock || 0;

    // 5. 库存检查
    if (currentStock < quantity) {
      logMonitor('API', 'SUCCESS', {
        action: 'CHECK_STOCK',
        product_id,
        requested: quantity,
        available: currentStock,
        result: 'INSUFFICIENT'
      });
      return NextResponse.json({
        success: false,
        error: 'INSUFFICIENT_STOCK',
        message: `库存不足，当前库存: ${currentStock}`,
        requested: quantity,
        available: currentStock
      }, { status: 400 });
    }

    // 6. 扣减库存
    const stockBefore = currentStock;
    await query(
      'UPDATE inventory SET quantity = quantity - ?, status_id = ? WHERE product_id = ?',
      [quantity, calculateStockStatus(currentStock - quantity), product_id]
    );

    // 7. 记录库存流水
    const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['sales_creat']);
    const transactionTypeId = typeResult.rows[0]?.id || 1;

    await query(
      `INSERT INTO inventory_transactions (
        product_id, product_name, transaction_type_id, quantity_change,
        quantity_before, quantity_after, reason, reference_type,
        operator_id, operator_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        product_id,
        product.name,
        transactionTypeId,
        -quantity,
        stockBefore,
        stockBefore - quantity,
        'Buy Now - 立即购买',
        'buy_now',
        userId,
        authResult.user?.name || 'User'
      ]
    );

    // 8. 返回成功响应
    logMonitor('API', 'SUCCESS', {
      action: 'RESERVE_INVENTORY',
      product_id,
      quantity,
      stock_before: stockBefore,
      stock_after: stockBefore - quantity
    });

    return createSuccessResponse({
      product_id,
      quantity,
      stock_before: stockBefore,
      stock_after: stockBefore - quantity,
      transaction_type_id: transactionTypeId,
      transaction_code: 'sales_creat'
    });

  } catch (error) {
    // 错误处理
    logMonitor('API', 'ERROR', {
      action: 'RESERVE_INVENTORY',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}
```

***

## 附录：错误码速查表

| 错误码                 | 中文    | 英文                 | 阿拉伯文           |
| ------------------- | ----- | ------------------ | -------------- |
| UNAUTHORIZED        | 未登录   | Unauthorized       | غير مصرح       |
| FORBIDDEN           | 权限不足  | Forbidden          | محظور          |
| NOT\_FOUND          | 不存在   | Not Found          | غير موجود      |
| MISSING\_PARAMS     | 缺少参数  | Missing Parameters | معاملات مفقودة |
| VALIDATION\_FAILED  | 验证失败  | Validation Failed  | فشل التحقق     |
| INTERNAL\_ERROR     | 服务器错误 | Internal Error     | خطأ داخلي      |
| INSUFFICIENT\_STOCK | 库存不足  | Insufficient Stock | مخزون غير كافٍ |
| OUT\_OF\_STOCK      | 库存耗尽  | Out of Stock       | نفد المخزون    |

***

## 版本记录

| 版本  | 日期         | 更新内容 |
| --- | ---------- | ---- |
| 1.0 | 2026-04-20 | 初始版本 |

