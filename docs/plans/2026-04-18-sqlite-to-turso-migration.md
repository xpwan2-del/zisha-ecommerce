# 从 sql.js 迁移到 Turso 数据库计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将项目从 sql.js 迁移到 Turso，解决 Serverless 环境下的数据库同步和并发问题

**架构：** 使用 @tursodatabase/vercel-experimental 包，在 Vercel Serverless 函数中实现嵌入式 SQLite 副本，本地读取无延迟，远程写入保证一致性

**技术栈：** Turso Cloud, @tursodatabase/vercel-experimental, libSQL

---

## 背景问题

当前使用 sql.js 的问题：
1. 内存数据库在不同 Serverless 函数实例之间不同步
2. 没有 WAL 支持
3. 并发性能差
4. 写入后读取可能得到旧数据

Turso 解决方案：
1. 嵌入式副本 - 本地读取无网络延迟
2. 远程写入 - 保证数据一致性
3. 基于 libSQL - 完全兼容 SQLite
4. Vercel 原生支持

---

## 文件清单

**需要创建的文件：**
- `src/lib/db-turso.ts` - Turso 数据库连接模块（新文件）
- `.env.example` - 环境变量示例（更新）

**需要修改的文件：**
- `src/lib/db.ts` - 保留但添加 Turso 支持
- `package.json` - 添加 Turso 依赖
- `.env` - 添加 Turso 环境变量

**需要保留的文件（暂不删除）：**
- `src/lib/db.ts` - 保留用于本地开发
- `src/lib/db/database.sqlite` - 本地开发数据库

---

## 任务 1：安装 Turso 依赖包

**文件：**
- 修改：`package.json`

- [ ] **步骤 1：安装 @tursodatabase/vercel-experimental 包**

```bash
npm install @tursodatabase/vercel-experimental
```

- [ ] **步骤 2：验证安装**

运行：`npm list @tursodatabase/vercel-experimental`
预期：显示包版本信息

---

## 任务 2：创建 Turso 数据库连接模块

**文件：**
- 创建：`src/lib/db-turso.ts`

- [ ] **步骤 1：创建 db-turso.ts 文件**

```typescript
import { createDb } from "@tursodatabase/vercel-experimental";

let db: ReturnType<typeof createDb> | null = null;

export async function getTursoDB() {
  if (!db) {
    db = await createDb(process.env.TURSO_DATABASE!);
  }
  return db;
}

export async function tursoQuery(sql: string, params: any[] = []) {
  const database = await getTursoDB();
  
  try {
    // 判断是否是写操作
    const sqlUpper = sql.trim().toUpperCase();
    const isWriteOperation = sqlUpper.startsWith('UPDATE') ||
                             sqlUpper.startsWith('DELETE') ||
                             sqlUpper.startsWith('INSERT');
    
    if (isWriteOperation) {
      const result = await database.execute(sql, params);
      return { 
        rows: [], 
        changes: result.rowsAffected || 0, 
        lastInsertRowid: result.lastInsertRowid || 0 
      };
    } else {
      const result = await database.query(sql, params);
      return { rows: result.rows || [] };
    }
  } catch (error) {
    console.error('Turso query error:', error);
    throw error;
  }
}

export async function closeTursoDB() {
  db = null;
}
```

- [ ] **步骤 2：验证文件语法**

运行：`npx tsc --noEmit src/lib/db-turso.ts`
预期：无错误输出

---

## 任务 3：配置环境变量

**文件：**
- 创建：`.env.example`（更新）
- 修改：`.env`

- [ ] **步骤 1：添加 Turso 环境变量到 .env.example**

```
# Turso 数据库配置
TURSO_DATABASE=your-database-name
```

- [ ] **步骤 2：获取 Turso 数据库名称**

在 Turso 控制台创建数据库后，获取数据库名称

- [ ] **步骤 3：本地开发配置**

本地开发可以继续使用 sql.js，Turso 主要用于 Vercel 生产环境

---

## 任务 4：更新现有 API 使用 Turso

**文件：**
- 修改：`src/lib/db.ts`

- [ ] **步骤 1：添加环境检测逻辑**

```typescript
// 在 db.ts 顶部添加
const isVercelProduction = process.env.TURSO_DATABASE && process.env.NODE_ENV === 'production';
```

- [ ] **步骤 2：添加条件导出**

```typescript
// 如果有 Turso 配置且在生产环境，导出 Turso 函数
export const query = isVercelProduction ? tursoQuery : originalSqlJsQuery;
```

**注意：** 具体实现需要根据 API 使用情况决定，可能需要：
1. 直接在 API 中导入 `tursoQuery`
2. 或者修改 `db.ts` 的 query 函数自动选择

---

## 任务 5：本地开发验证

**文件：**
- 修改：无

- [ ] **步骤 1：本地开发仍使用 sql.js**

```bash
npm run dev
```

- [ ] **步骤 2：测试基本功能**

1. 访问商品列表页面
2. 添加商品到购物车
3. 验证数据正确

---

## 任务 6：Vercel 部署配置

**文件：**
- 修改：无

- [ ] **步骤 1：在 Vercel 控制台添加环境变量**

在 Vercel 项目设置中添加：
- `TURSO_DATABASE` = 你的数据库名称

- [ ] **步骤 2：部署到 Vercel**

```bash
vercel deploy
```

- [ ] **步骤 3：生产环境测试**

1. 在 Vercel 部署的 URL 上测试
2. 验证库存同步问题已解决

---

## 任务 7：验证并发问题已解决

**文件：**
- 修改：无

- [ ] **步骤 1：并发测试**

1. 多个浏览器同时添加购物车
2. 验证库存数据一致
3. 验证 API 返回最新数据

- [ ] **步骤 2：验证写入后立即读取**

1. 添加商品到购物车
2. 立即刷新页面
3. 验证库存数量正确更新

---

## 风险和注意事项

1. **Turso 免费额度**：9GB 存储、500 个数据库、每月 10 亿行读取
2. **嵌入式副本限制**：每个 Serverless 函数实例有自己的本地副本
3. **写入延迟**：写入需要网络往返，但读取很快

---

## 下一步

1. 首先在 Turso 创建免费账号：https://turso.tech
2. 创建第一个数据库
3. 按照任务顺序执行

---

## 参考文档

- [Turso Vercel 集成文档](https://docs.turso.tech/integrations/vercel)
- [@tursodatabase/vercel-experimental npm](https://www.npmjs.com/package/@tursodatabase/vercel-experimental)
- [Turso Vercel 市场](https://vercel.com/marketplace/tursocloud)
