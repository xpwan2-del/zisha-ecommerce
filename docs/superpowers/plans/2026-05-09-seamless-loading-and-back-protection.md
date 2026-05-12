# 无缝加载与后退保护实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 消除支付跳转过程中的“空档期”白屏，并防止浏览器后退导致的数据混乱。

**架构：**
1. **全局离场拦截**：通过 React Context 维护一个 `isNavigating` 状态，当用户点击支付时激活全屏高优先级 Loading。
2. **进场状态锁定**：利用 `pageshow` 劫持 BFCache（往返缓存），确保“后退”回来的页面必须强制刷新数据。
3. **Skeleton 增强**：在受保护路由加载期间使用更美观的骨架屏。

**技术栈：** Next.js, React Context, window.onpageshow, Navigation API.

---

### 任务 1：在 AuthContext 中集成导航加载状态

**文件：**
- 修改：`src/lib/contexts/AuthContext.tsx`

- [ ] **步骤 1：添加全局加载状态**
```typescript
interface AuthContextType {
  // ... 现有属性
  isNavigating: boolean;
  setIsNavigating: (val: boolean) => void;
}

// 在 Provider 中实现
const [isNavigating, setIsNavigating] = useState(false);
```

- [ ] **步骤 2：自动清理机制**
在 `useEffect` 中监听 `pathname` 变化，一旦路径改变（说明进场成功），自动将 `isNavigating` 设为 `false`。

---

### 任务 2：实现全局全屏 Loading 遮罩

**文件：**
- 创建：`src/components/common/GlobalLoadingOverlay.tsx`
- 修改：`src/app/layout.tsx`

- [ ] **步骤 1：编写遮罩组件**
设计一个 `fixed inset-0 z-[9999]` 的遮罩层，使用毛玻璃效果 + 品牌转圈动画。

- [ ] **步骤 2：注入 Root Layout**
确保它在所有页面组件之上。

---

### 任务 3：劫持浏览器后退事件 (BFCache Protection)

**文件：**
- 修改：`src/app/cart/page.tsx`
- 修改：`src/app/orders/[id]/page.tsx`

- [ ] **步骤 1：监听 pageshow 事件**
在页面挂载时监听：
```typescript
useEffect(() => {
  const handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      // 说明是点后退回来的，强制重加载
      window.location.reload();
    }
  };
  window.addEventListener('pageshow', handlePageShow);
  return () => window.removeEventListener('pageshow', handlePageShow);
}, []);
```

---

### 任务 4：实操应用：支付跳转锁定

**文件：**
- 修改：`src/app/cart/page.tsx` (handleSubmit)
- 修改：`src/app/orders/[id]/page.tsx` (handleSubmit)

- [ ] **步骤 1：在跳转前调用 setIsNavigating(true)**
在执行 `window.location.href = redirectUrl` 之前立即触发全局 Loading。

- [ ] **步骤 2：错误处理**
如果 API 报错没有跳转，必须立刻调用 `setIsNavigating(false)` 释放 UI。
