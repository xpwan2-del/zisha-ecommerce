# Cookie认证迁移实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

> **阶段性验证流程：** 每个任务完成后，必须经过以下流程才能进入下一个任务：
> 1. 静态代码检查 → 2. AI后端功能测试 → 3. 提交修改说明+测试报告+前端测试步骤 → 4. 用户前端验证 → 5. 用户确认后进入下一任务

**目标：** 将项目认证方案从 localStorage+Authorization Header 迁移至 HTTP-only Cookie，解决 AddressList 401错误问题

**架构：** 后端登录API在响应时设置 HTTP-only Cookie，前端所有API请求使用 `credentials: 'include'` 自动携带Cookie，后端 auth.ts 已原生支持Cookie提取无需修改

**技术栈：** Next.js API Routes, React Context, JWT

---

## 阶段性验证总流程

```
┌─────────────────────────────────────────────────────────────────┐
│  任务N：修改XXX                                                   │
├─────────────────────────────────────────────────────────────────┤
│  1. 读取当前代码                                                  │
│  2. 执行修改（每次只改一个文件）                                     │
│  3. 静态检查（tsc --noEmit）→ 无编译错误才能继续                      │
│  4. AI后端功能测试 → 验证API行为正确                                │
│  5. 【提交修改说明 + 测试结果报告 + 前端测试步骤】→ 等待用户确认        │
│  6. 用户前端验证 → 用户按步骤测试，反馈结果                           │
│  7. 用户确认通过 → 进入下一个任务                                    │
│  8. 用户不通过 → AI修复 → 返回步骤3重新开始                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 文件清单与职责

### 后端API（Cookie设置/清除）

| 文件 | 职责 | 修改类型 |
|-----|------|---------|
| `src/app/api/auth/login/route.ts` | 登录时设置access_token和refresh_token Cookie | 修改 |
| `src/app/api/auth/refresh/route.ts` | 刷新Token时更新Cookie | 修改 |
| `src/app/api/auth/logout/route.ts` | 登出时清除Cookie | 修改 |

### 前端状态管理（适配Cookie读取）

| 文件 | 职责 | 修改类型 |
|-----|------|---------|
| `src/lib/contexts/AuthContext.tsx` | 用户认证状态管理，login/refresh/logout函数需同步Cookie | 修改 |

### 前端购物车（适配credentials模式）

| 文件 | 职责 | 修改类型 |
|-----|------|---------|
| `src/lib/contexts/CartContext.tsx` | 购物车管理，11处fetch需改用credentials:'include' | 修改 |

### 前端页面（适配credentials模式）

| 文件 | 职责 | 修改类型 |
|-----|------|---------|
| `src/app/cart/page.tsx` | 购物车页面，6处fetch需改用credentials:'include' | 修改 |
| `src/app/checkout/page.tsx` | 结账页面，2处fetch需改用credentials:'include' | 修改 |

### 无需修改的文件

| 文件 | 原因 |
|-----|------|
| `src/lib/auth.ts` | 已原生支持Header+Cookie双模式提取 |
| `src/components/addresses/AddressList.tsx` | 已正确使用 `credentials: 'include'` |
| `src/app/api/addresses/route.ts` | 使用 requireAuth，已支持Cookie |
| `src/app/api/cart/route.ts` | 使用 requireAuth，已支持Cookie |

---

## 任务分解

### 任务1：修改登录API设置Cookie

**文件：**
- 修改：`src/app/api/auth/login/route.ts:1-59`
- 测试：无单体测试，通过后续功能测试验证

- [ ] **步骤1：读取当前login/route.ts代码**

确认当前代码结构，特别是返回响应位置。

- [ ] **步骤2：修改login/route.ts添加Cookie设置**

```typescript
// 位置：第38行后，替换整个return语句

// 修改前：
return NextResponse.json({
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    level: user.level,
    points: user.points,
    total_spent: user.total_spent,
    referral_code: user.referral_code,
    created_at: user.created_at
  },
  access_token: accessToken,
  refresh_token: refreshToken,
  message: 'Login successful'
});

// 修改后：
const response = NextResponse.json({
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    level: user.level,
    points: user.points,
    total_spent: user.total_spent,
    referral_code: user.referral_code,
    created_at: user.created_at
  },
  message: 'Login successful'
});

// 设置HTTP-only Cookie（2小时有效期，与JWT过期时间一致）
response.cookies.set('access_token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 2,
  path: '/'
});

// 设置Refresh Cookie（30天有效期）
response.cookies.set('refresh_token', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 30,
  path: '/'
});

return response;
```

- [ ] **步骤3：静态检查**

运行：`npx tsc --noEmit src/app/api/auth/login/route.ts`
预期：无编译错误

- [ ] **步骤4：AI后端功能测试**

启动开发服务器后，使用curl测试登录API：
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -v
```

验证：
- 响应状态码为200
- 响应头中包含 `set-cookie: access_token=...`
- 响应头中包含 `set-cookie: refresh_token=...`
- 响应body中包含user对象但不包含access_token明文

- [ ] **步骤5：【提交修改说明】**

```markdown
## 【任务1】修改说明

### 修改文件
- `src/app/api/auth/login/route.ts`

### 修改位置
- 位置：第38行后，return语句
- 函数名：POST (login handler)

### 修改内容
- 修改前：在JSON响应中返回 access_token 和 refresh_token 明文
- 修改后：使用 HTTP-only Cookie 存储 Token，响应中不返回明文

### 风险评估
- 风险：Cookie设置失败导致无法登录
- 应对：验证响应头中是否有set-cookie
```

- [ ] **步骤5：【提交测试结果报告】**

```markdown
## 【任务1】测试结果报告

### 测试环境
- Node.js版本：v20.x
- 开发服务器状态：运行中 localhost:3000
- 测试时间：2026-04-19

### 测试用例
| 用例ID | 测试描述 | 输入数据 | 预期结果 | 实际结果 | 状态 |
|-------|---------|---------|---------|---------|------|
| TC-01 | 登录API响应 | 正确邮箱密码 | set-cookie头存在，200响应 | 待测试 | ⏳ |

### 测试结论
- ⏳ 待用户前端验证
```

- [ ] **步骤5：【提交前端测试步骤】**

```markdown
## 【任务1】前端测试步骤

### 测试入口
- URL：http://localhost:3000/login
- 访问方式：浏览器访问登录页面

### 操作路径
1. 输入已注册邮箱 → 预期：邮箱被接受
2. 输入正确密码 → 预期：密码被接受
3. 点击登录按钮 → 预期：登录成功，跳转

### 预期结果
- 登录成功后的跳转行为正常
- 用户信息正确显示
- Cookie被正确设置

### 验证要点
- [ ] 验证点1：浏览器开发者工具 → Application → Cookies → 查看是否存在 access_token 和 refresh_token
- [ ] 验证点2：Cookie的 HttpOnly 属性为 true（无法通过JS访问）
- [ ] 验证点3：登录后localStorage中不应存在 access_token 和 refresh_token
```

- [ ] **步骤6：Commit**

```bash
git add src/app/api/auth/login/route.ts
git commit -m "feat(auth): login API设置HTTP-only Cookie"
```

- [ ] **步骤7：等待用户确认**

> **AI必须等待用户确认前端测试通过后，才能开始任务2。**

---

### 任务2：修改刷新Token API更新Cookie

**文件：**
- 修改：`src/app/api/auth/refresh/route.ts:1-45`
- 测试：通过AuthContext刷新流程测试验证

- [ ] **步骤1：读取当前refresh/route.ts代码**

确认当前返回结构。

- [ ] **步骤2：修改refresh/route.ts更新Cookie**

```typescript
// 位置：第37-40行，替换整个return语句

// 修改前：
return NextResponse.json({
  access_token: accessToken,
  message: 'Token refreshed successfully'
});

// 修改后：
const response = NextResponse.json({
  message: 'Token refreshed successfully'
});

// 更新access_token Cookie
response.cookies.set('access_token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 2,
  path: '/'
});

return response;
```

- [ ] **步骤3：静态检查**

运行：`npx tsc --noEmit src/app/api/auth/refresh/route.ts`
预期：无编译错误

- [ ] **步骤4：AI后端功能测试**

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"your_refresh_token"}' \
  -v
```

验证：
- 响应头中包含更新后的 `set-cookie: access_token=...`

- [ ] **步骤5：【提交修改说明】**

```markdown
## 【任务2】修改说明

### 修改文件
- `src/app/api/auth/refresh/route.ts`

### 修改位置
- 位置：第37-40行，return语句
- 函数名：POST (refresh handler)

### 修改内容
- 修改前：返回新的 access_token 明文
- 修改后：通过Cookie更新Token，响应中不返回明文
```

- [ ] **步骤6：【提交测试结果报告】**

```markdown
## 【任务2】测试结果报告

### 测试环境
- Node.js版本：v20.x
- 开发服务器状态：运行中
- 测试时间：2026-04-19

### 测试用例
| 用例ID | 测试描述 | 输入数据 | 预期结果 | 实际结果 | 状态 |
|-------|---------|---------|---------|---------|------|
| TC-02 | 刷新Token API | 有效refresh_token | set-cookie更新，200响应 | 待测试 | ⏳ |

### 测试结论
- ⏳ 待用户前端验证
```

- [ ] **步骤7：【提交前端测试步骤】**

```markdown
## 【任务2】前端测试步骤

### 测试入口
- URL：http://localhost:3000（需先登录）
- 访问方式：保持登录状态等待Token自动刷新

### 操作路径
1. 登录网站 → 预期：登录成功
2. 等待约2小时或手动触发刷新 → 预期：Token自动刷新

### 预期结果
- Token刷新后Cookie中的access_token被更新
- 用户状态保持不变

### 验证要点
- [ ] 验证点1：刷新前后 Cookie 中的 access_token 值应该不同
- [ ] 验证点2：刷新后用户应保持登录状态
- [ ] 验证点3：刷新后原有功能应继续正常工作
```

- [ ] **步骤8：Commit**

```bash
git add src/app/api/auth/refresh/route.ts
git commit -m "feat(auth): refresh API更新Cookie"
```

- [ ] **步骤9：等待用户确认**

> **AI必须等待用户确认前端测试通过后，才能开始任务3。**

---

### 任务3：修改登出API清除Cookie

**文件：**
- 修改：`src/app/api/auth/logout/route.ts:1-16`
- 测试：通过登出功能测试验证

- [ ] **步骤1：读取当前logout/route.ts代码**

确认当前返回结构。

- [ ] **步骤2：修改logout/route.ts清除Cookie**

```typescript
// 位置：第3-16行，替换整个POST函数

// 修改前：
export async function POST(request: NextRequest) {
  try {
    // 这里可以添加任何登出逻辑，比如清除服务器端的 session 等
    // 由于我们使用的是 JWT，登出主要是在客户端清除令牌

    return NextResponse.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}

// 修改后：
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful'
    });

    // 清除access_token Cookie
    response.cookies.delete('access_token');
    // 清除refresh_token Cookie
    response.cookies.delete('refresh_token');

    return response;
  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}
```

- [ ] **步骤3：静态检查**

运行：`npx tsc --noEmit src/app/api/auth/logout/route.ts`
预期：无编译错误

- [ ] **步骤4：AI后端功能测试**

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -v
```

验证：
- 响应头中包含 `set-cookie: access_token=; ...; Max-Age=0` 或类似的清除指令
- 响应状态码为200

- [ ] **步骤5：【提交修改说明】**

```markdown
## 【任务3】修改说明

### 修改文件
- `src/app/api/auth/logout/route.ts`

### 修改位置
- 位置：第3-16行，整个POST函数
- 函数名：POST (logout handler)

### 修改内容
- 修改前：仅返回成功消息
- 修改后：清除Cookie后再返回成功消息
```

- [ ] **步骤6：【提交测试结果报告】**

```markdown
## 【任务3】测试结果报告

### 测试环境
- Node.js版本：v20.x
- 开发服务器状态：运行中
- 测试时间：2026-04-19

### 测试用例
| 用例ID | 测试描述 | 输入数据 | 预期结果 | 实际结果 | 状态 |
|-------|---------|---------|---------|---------|------|
| TC-03 | 登出API响应 | 无 | set-cookie清除，200响应 | 待测试 | ⏳ |

### 测试结论
- ⏳ 待用户前端验证
```

- [ ] **步骤7：【提交前端测试步骤】**

```markdown
## 【任务3】前端测试步骤

### 测试入口
- URL：http://localhost:3000（需先登录）
- 访问方式：登录后点击登出按钮

### 操作路径
1. 登录网站 → 预期：登录成功，Cookie存在
2. 点击登出按钮 → 预期：登出成功

### 预期结果
- 登出成功后页面跳转至首页或登录页
- Cookie被完全清除
- 用户状态变为未登录

### 验证要点
- [ ] 验证点1：浏览器开发者工具 → Application → Cookies → access_token 和 refresh_token 都不存在
- [ ] 验证点2：页面显示未登录状态
- [ ] 验证点3：无法访问需要登录的页面（如购物车、结账）
```

- [ ] **步骤8：Commit**

```bash
git add src/app/api/auth/logout/route.ts
git commit -m "feat(auth): logout API清除Cookie"
```

- [ ] **步骤9：等待用户确认**

> **AI必须等待用户确认前端测试通过后，才能开始任务4。**

---

### 任务4：适配AuthContext使用Cookie

**文件：**
- 修改：`src/lib/contexts/AuthContext.tsx:297-354, 415-439`
- 测试：登录/登出流程功能测试

- [ ] **步骤1：读取AuthContext.tsx代码**

重点关注 login 函数（第297-354行）、logout 函数（第415-439行）、refresh 逻辑（第108-155行）。

- [ ] **步骤2：修改login函数（删除localStorage存储Token，保留JSON存储）**

```typescript
// 位置：第297-354行 login函数内

// 修改内容1：第314-315行，删除这2行
// 删除：
localStorage.setItem('access_token', data.access_token);
localStorage.setItem('refresh_token', data.refresh_token);

// 修改内容2：第336-343行，cart merge请求添加credentials
// 修改前：
await fetch('/api/cart/merge', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.access_token}`,
  },
  body: JSON.stringify({ guest_cart: JSON.parse(guestCart) }),
});

// 修改后：
await fetch('/api/cart/merge', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ guest_cart: JSON.parse(guestCart) }),
});
```

- [ ] **步骤3：修改logout函数（清除Cookie）**

```typescript
// 位置：第415-439行 logout函数

// 修改内容1：第416-425行，删除Authorization header
// 修改前：
const logout = async () => {
  try {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // ... 清空购物车相关数据
  }
};

// 修改后：
const logout = async () => {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // ... 清空购物车相关数据
  }
};
```

- [ ] **步骤4：修改refresh逻辑（第108-155行），改用credentials**

```typescript
// 位置：第110-116行 refresh请求
// 修改前：
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ refresh_token: refreshToken }),
});

// 修改后：
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ refresh_token: refreshToken }),
});
```

- [ ] **步骤5：静态检查**

运行：`npx tsc --noEmit src/lib/contexts/AuthContext.tsx`
预期：无编译错误

- [ ] **步骤6：AI后端功能测试**

1. 启动开发服务器：`npm run dev`
2. 访问登录页面，执行登录
3. 检查日志输出，确认无401错误

- [ ] **步骤7：【提交修改说明】**

```markdown
## 【任务4】修改说明

### 修改文件
- `src/lib/contexts/AuthContext.tsx`

### 修改位置
- login函数：第297-354行
- logout函数：第415-439行
- refresh逻辑：第108-155行

### 修改内容
1. login函数：删除 localStorage.setItem Token，改为Cookie自动携带
2. logout函数：删除 Authorization header，改为 credentials: 'include'
3. refresh逻辑：删除 Authorization header，改为 credentials: 'include'
4. cart merge请求：改为 credentials: 'include'
```

- [ ] **步骤8：【提交测试结果报告】**

```markdown
## 【任务4】测试结果报告

### 测试环境
- Node.js版本：v20.x
- 开发服务器状态：运行中
- 测试时间：2026-04-19

### 测试用例
| 用例ID | 测试描述 | 输入数据 | 预期结果 | 实际结果 | 状态 |
|-------|---------|---------|---------|---------|------|
| TC-04 | 登录后Token获取 | 正确邮箱密码 | 登录成功，无401 | 待测试 | ⏳ |
| TC-05 | 登出功能 | 点击登出 | Cookie清除 | 待测试 | ⏳ |

### 测试结论
- ⏳ 待用户前端验证
```

- [ ] **步骤9：【提交前端测试步骤】**

```markdown
## 【任务4】前端测试步骤

### 测试入口
- URL：http://localhost:3000/login
- 访问方式：浏览器访问

### 操作路径
**登录测试：**
1. 输入邮箱和密码 → 预期：输入被接受
2. 点击登录 → 预期：登录成功，跳转

**登出测试：**
3. 登录成功后，点击登出 → 预期：登出成功

### 预期结果
- 登录后localStorage不应有 access_token 和 refresh_token
- 登出后Cookie被清除
- 登录状态正确反映在UI上

### 验证要点
- [ ] 验证点1：登录后 localStorage 中不存在 access_token 和 refresh_token
- [ ] 验证点2：登录后 Application → Cookies 中存在 access_token 和 refresh_token
- [ ] 验证点3：登出后 Cookies 被清除
- [ ] 验证点4：登出后页面显示未登录状态
```

- [ ] **步骤10：Commit**

```bash
git add src/lib/contexts/AuthContext.tsx
git commit -m "feat(auth): AuthContext适配Cookie认证"
```

- [ ] **步骤11：等待用户确认**

> **AI必须等待用户确认前端测试通过后，才能开始任务5。**

---

### 任务5：适配CartContext使用credentials

**文件：**
- 修改：`src/lib/contexts/CartContext.tsx`（11处fetch）
- 测试：购物车增删改查功能测试

- [ ] **步骤1：读取CartContext.tsx所有fetch调用**

使用Grep定位所有 `fetch(` 位置，确认11处需要修改的位置。

- [ ] **步骤2：批量修改CartContext.tsx所有fetch**

详细修改内容：删除所有 `Authorization: Bearer ${accessToken}` header，改为 `credentials: 'include'`

- [ ] **步骤3：静态检查**

运行：`npx tsc --noEmit src/lib/contexts/CartContext.tsx`
预期：无编译错误

- [ ] **步骤4：AI后端功能测试**

1. 登录用户
2. 添加商品到购物车
3. 验证操作成功，无401错误

- [ ] **步骤5：【提交修改说明】**

```markdown
## 【任务5】修改说明

### 修改文件
- `src/lib/contexts/CartContext.tsx`

### 修改位置
- 11处fetch调用（详细行号待定位）

### 修改内容
- 删除所有 Authorization header
- 添加 credentials: 'include'
```

- [ ] **步骤6：【提交测试结果报告】**

```markdown
## 【任务5】测试结果报告

### 测试环境
- Node.js版本：v20.x
- 开发服务器状态：运行中
- 测试时间：2026-04-19

### 测试用例
| 用例ID | 测试描述 | 输入数据 | 预期结果 | 实际结果 | 状态 |
|-------|---------|---------|---------|---------|------|
| TC-06 | 添加购物车 | 商品ID | 添加成功，无401 | 待测试 | ⏳ |
| TC-07 | 更新数量 | 商品ID, 新数量 | 更新成功，无401 | 待测试 | ⏳ |
| TC-08 | 删除商品 | 商品ID | 删除成功，无401 | 待测试 | ⏳ |

### 测试结论
- ⏳ 待用户前端验证
```

- [ ] **步骤7：【提交前端测试步骤】**

```markdown
## 【任务5】前端测试步骤

### 测试入口
- URL：http://localhost:3000/products/1（商品详情页）
- 访问方式：登录后访问

### 操作路径
1. 登录网站 → 预期：登录成功
2. 进入商品详情页 → 预期：页面正常加载
3. 点击"加入购物车" → 预期：添加成功提示
4. 进入购物车页面 → 预期：显示已添加的商品
5. 修改商品数量 → 预期：数量更新成功
6. 删除商品 → 预期：商品从列表移除

### 预期结果
- 所有购物车操作成功
- 无401未授权错误
- 购物车数据正确同步

### 验证要点
- [ ] 验证点1：添加商品后，购物车数量正确更新
- [ ] 验证点2：修改数量后，小计价格正确计算
- [ ] 验证点3：删除商品后，列表正确更新
- [ ] 验证点4：所有操作无401错误（检查浏览器控制台）
```

- [ ] **步骤8：Commit**

```bash
git add src/lib/contexts/CartContext.tsx
git commit -m "feat(cart): CartContext改用credentials模式"
```

- [ ] **步骤9：等待用户确认**

> **AI必须等待用户确认前端测试通过后，才能开始任务6。**

---

### 任务6：适配cart/page.tsx使用credentials

**文件：**
- 修改：`src/app/cart/page.tsx`（6处fetch）
- 测试：购物车页面加载和操作测试

- [ ] **步骤1-4：执行修改和测试**

参考任务5的流程

- [ ] **步骤5：【提交修改说明】**

```markdown
## 【任务6】修改说明

### 修改文件
- `src/app/cart/page.tsx`

### 修改位置
- 6处fetch调用

### 修改内容
- 删除所有 Authorization header
- 添加 credentials: 'include'
```

- [ ] **步骤6：【提交测试结果报告】**

```markdown
## 【任务6】测试结果报告

### 测试环境
- Node.js版本：v20.x
- 开发服务器状态：运行中
- 测试时间：2026-04-19

### 测试用例
| 用例ID | 测试描述 | 输入数据 | 预期结果 | 实际结果 | 状态 |
|-------|---------|---------|---------|---------|------|
| TC-09 | 购物车页面加载 | 已登录 | 页面正常加载，数据正确 | 待测试 | ⏳ |

### 测试结论
- ⏳ 待用户前端验证
```

- [ ] **步骤7：【提交前端测试步骤】**

```markdown
## 【任务6】前端测试步骤

### 测试入口
- URL：http://localhost:3000/cart
- 访问方式：登录后访问

### 操作路径
1. 登录网站 → 预期：登录成功
2. 访问购物车页面 → 预期：页面正常加载，显示购物车商品

### 预期结果
- 购物车商品列表正确显示
- 价格计算正确
- 无401错误

### 验证要点
- [ ] 验证点1：购物车页面加载时无401错误
- [ ] 验证点2：商品列表正确显示
- [ ] 验证点3：价格和小计计算正确
```

- [ ] **步骤8：Commit**

```bash
git add src/app/cart/page.tsx
git commit -m "feat(cart): cart页面改用credentials模式"
```

- [ ] **步骤9：等待用户确认**

> **AI必须等待用户确认前端测试通过后，才能开始任务7。**

---

### 任务7：适配checkout/page.tsx使用credentials

**文件：**
- 修改：`src/app/checkout/page.tsx`（2处fetch）
- 测试：结账流程测试

- [ ] **步骤1-4：执行修改和测试**

- [ ] **步骤5：【提交修改说明】**

```markdown
## 【任务7】修改说明

### 修改文件
- `src/app/checkout/page.tsx`

### 修改位置
- 2处fetch调用

### 修改内容
- 删除 Authorization header
- 添加 credentials: 'include'
```

- [ ] **步骤6：【提交测试结果报告】**

```markdown
## 【任务7】测试结果报告

### 测试环境
- Node.js版本：v20.x
- 开发服务器状态：运行中
- 测试时间：2026-04-19

### 测试用例
| 用例ID | 测试描述 | 输入数据 | 预期结果 | 实际结果 | 状态 |
|-------|---------|---------|---------|---------|------|
| TC-10 | 结账页面加载 | 已登录 | 页面正常加载，用户信息正确 | 待测试 | ⏳ |

### 测试结论
- ⏳ 待用户前端验证
```

- [ ] **步骤7：【提交前端测试步骤】**

```markdown
## 【任务7】前端测试步骤

### 测试入口
- URL：http://localhost:3000/checkout
- 访问方式：登录后访问（需先有购物车商品）

### 操作路径
1. 登录网站 → 预期：登录成功
2. 添加商品到购物车 → 预期：添加成功
3. 进入结账页面 → 预期：页面正常加载

### 预期结果
- 用户信息正确显示
- 无401错误

### 验证要点
- [ ] 验证点1：结账页面加载时无401错误
- [ ] 验证点2：用户信息（姓名、邮箱）正确显示
- [ ] 验证点3：商品列表和价格正确显示
```

- [ ] **步骤8：Commit**

```bash
git add src/app/checkout/page.tsx
git commit -m "feat(checkout): checkout页面改用credentials模式"
```

- [ ] **步骤9：等待用户确认**

> **AI必须等待用户确认前端测试通过后，才能开始任务8。**

---

### 任务8：验证AddressList功能

**文件：**
- 无需修改（已使用credentials）
- 测试：地址管理CRUD测试

- [ ] **步骤1：AI后端功能测试**

确认地址相关API在Cookie认证下正常工作

- [ ] **步骤2：【提交修改说明】**

```markdown
## 【任务8】修改说明

### 修改文件
- 无（AddressList已正确使用credentials）

### 说明
AddressList组件在问题分析阶段已确认使用 `credentials: 'include'`，本次任务仅验证其功能是否正常
```

- [ ] **步骤3：【提交测试结果报告】**

```markdown
## 【任务8】测试结果报告

### 测试环境
- Node.js版本：v20.x
- 开发服务器状态：运行中
- 测试时间：2026-04-19

### 测试用例
| 用例ID | 测试描述 | 输入数据 | 预期结果 | 实际结果 | 状态 |
|-------|---------|---------|---------|---------|------|
| TC-11 | 地址列表加载 | 已登录 | 显示地址列表，无401 | 待测试 | ⏳ |
| TC-12 | 添加地址 | 地址信息 | 添加成功，无401 | 待测试 | ⏳ |
| TC-13 | 编辑地址 | 地址ID，新信息 | 编辑成功，无401 | 待测试 | ⏳ |
| TC-14 | 删除地址 | 地址ID | 删除成功，无401 | 待测试 | ⏳ |

### 测试结论
- ⏳ 待用户前端验证
```

- [ ] **步骤4：【提交前端测试步骤】**

```markdown
## 【任务8】前端测试步骤

### 测试入口
- URL：http://localhost:3000/addresses（或相关地址管理页面）
- 访问方式：登录后访问

### 操作路径
1. 登录网站 → 预期：登录成功
2. 进入地址管理页面 → 预期：页面正常加载
3. 点击"添加新地址" → 预期：显示地址表单
4. 填写地址信息并保存 → 预期：保存成功，列表更新
5. 点击编辑按钮 → 预期：显示编辑表单
6. 修改地址信息并保存 → 预期：更新成功
7. 点击删除按钮 → 预期：删除成功，列表更新
8. 测试设置默认地址 → 预期：默认地址正确标记

### 预期结果
- 地址CRUD操作全部成功
- 无401未授权错误
- 这是本次Cookie迁移的核心验证点

### 验证要点（重点关注）
- [ ] 验证点1：地址列表加载时**无401错误** ← 核心验证
- [ ] 验证点2：添加地址成功，无401错误 ← 核心验证
- [ ] 验证点3：编辑地址成功，无401错误 ← 核心验证
- [ ] 验证点4：删除地址成功，无401错误 ← 核心验证
- [ ] 验证点5：设置默认地址成功 ← 核心验证
- [ ] 验证点6：所有操作后页面状态正确更新
```

- [ ] **步骤5：Commit**

```bash
git commit --allow-empty -m "test: AddressList功能验证通过"
```

- [ ] **步骤6：等待用户确认**

> **任务8是核心验证点，必须确保AddressList完全正常。**

---

## 质量保证措施

### 修改-检查-测试闭环流程

```
┌─────────────────────────────────────────────────────────┐
│  任务N：修改XXX                                           │
├─────────────────────────────────────────────────────────┤
│  1. 读取当前代码                                          │
│  2. 执行修改（每次只改一个文件）                              │
│  3. 静态检查（tsc --noEmit）                               │
│  4. AI后端功能测试                                        │
│  5. 提交修改说明 + 测试报告 + 前端测试步骤（等待用户）           │
│  6. 用户前端验证 → 用户确认通过                             │
│  7. Commit → 进入下一个任务                               │
└─────────────────────────────────────────────────────────┘
```

### 检查清单

- [ ] 任务1（login API）→ 用户确认通过
- [ ] 任务2（refresh API）→ 用户确认通过
- [ ] 任务3（logout API）→ 用户确认通过
- [ ] 任务4（AuthContext）→ 用户确认通过
- [ ] 任务5（CartContext）→ 用户确认通过
- [ ] 任务6（cart/page）→ 用户确认通过
- [ ] 任务7（checkout/page）→ 用户确认通过
- [ ] 任务8（AddressList验证）→ **用户确认通过 ← 核心验证**

### 回滚方案

如遇问题，使用以下命令回滚：

```bash
# 回滚最近一次commit
git revert HEAD

# 查看修改历史
git log --oneline -10

# 回滚到特定版本
git reset --hard <commit-hash>
```

---

## 总结

| 任务 | 文件 | 修改点数 | 阶段性验证 | 预计时间 |
|-----|------|---------|-----------|---------|
| 1 | login/route.ts | 1处Cookie设置 | ✅ 需用户确认 | 10分钟 |
| 2 | refresh/route.ts | 1处Cookie更新 | ✅ 需用户确认 | 10分钟 |
| 3 | logout/route.ts | 1处Cookie清除 | ✅ 需用户确认 | 10分钟 |
| 4 | AuthContext.tsx | 3处 | ✅ 需用户确认 | 15分钟 |
| 5 | CartContext.tsx | 11处credentials | ✅ 需用户确认 | 20分钟 |
| 6 | cart/page.tsx | 6处credentials | ✅ 需用户确认 | 15分钟 |
| 7 | checkout/page.tsx | 2处credentials | ✅ 需用户确认 | 10分钟 |
| 8 | AddressList验证 | 无代码修改 | ✅ 需用户确认 | 15分钟 |
| **总计** | | **25处修改** | **8轮验证** | **约105分钟** |

---

**计划创建时间：** 2026-04-19
**计划版本：** v2.0（阶段性验证版）

**阶段性验证承诺：**

> 我已完成Cookie认证迁移实现计划的更新。根据新流程，每个任务完成后，我将：
> 1. 提交详细的**修改说明**
> 2. 提交完整的**测试结果报告**
> 3. 提交详细的**前端测试步骤**
>
> 只有在您确认前端测试通过并明确通知我后，我才开始下一个任务。
