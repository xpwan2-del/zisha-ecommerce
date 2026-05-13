# 重复请求与页面闪现联合优化 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将全局 Provider 初始化链路和高频页面中的重复请求、整页 loading 回退与首屏闪现降到正常范围，同时不破坏现有认证、购物车、翻译、商品与订单业务。

**架构：** 先收敛全局入口的重复初始化，再处理页面级 effect 触发链。全局层优先解决 Theme、Language、Auth、Cart 四条链路；页面层优先解决 Product 与 Account 的整页回退，再谨慎复查 Orders。所有改动都基于现有文件内聚优化，不新增无关抽象，不改动数据库。

**技术栈：** Next.js App Router、React Client Components、TypeScript、react-i18next、现有 Context Provider 体系

---

## 文件结构与职责

### 计划修改文件
- `src/components/ThemeProvider.tsx`
  - 收敛主题初始化请求，减少重复请求和重复 CSS 变量写入，降低首屏闪现。
- `src/components/LanguageProvider.tsx`
  - 避免 i18n 未 ready 时整树 `return null` 导致页面白屏闪现。
- `src/i18n/i18n.ts`
  - 统一数据库翻译加载入口，避免在不适合的运行时触发相对路径请求。
- `src/lib/hooks/useUITranslations.ts`
  - 与 i18n 初始化共享翻译缓存，避免 `/api/translations` 双入口重复请求。
- `src/lib/contexts/AuthContext.tsx`
  - 为认证初始化增加请求去重与状态复用，降低 `/api/auth/me` 与 `/api/auth/refresh` 重复链路。
- `src/lib/contexts/CartContext.tsx`
  - 合并登录态切换与初始化逻辑，减少 `/api/cart` 重复拉取。
- `src/app/products/[id]/page.tsx`
  - 拆分商品数据与评价/收藏刷新，避免局部刷新触发整页 skeleton 回退。
- `src/app/account/page.tsx`
  - 避免页面级额外认证检查与标签页副作用导致重复请求。
- `src/app/orders/[id]/page.tsx`
  - 只做低风险复查与必要的依赖收敛，避免影响订单详情、优惠券、评价链路。

### 验证文件
- `package.json`
  - 只用于确认 lint / build / dev 命令，不修改。

---

### 任务 1：优化 ThemeProvider 全局主题初始化链路

**文件：**
- 修改：`src/components/ThemeProvider.tsx`
- 验证：本地 dev 日志、主题切换手动检查

- [ ] **步骤 1：先写明要保留的行为与允许优化的行为**

```ts
// 必须保留
// 1. 初次进入页面时能拿到数据库主题
// 2. 主题色仍写入 CSS variables
// 3. handleSetTheme 仍可更新服务端主题与本地显示

// 允许优化
// 1. 初始化阶段避免重复请求 /api/themes、/api/theme-colors、/api/inventory-status
// 2. 如果计算出的 colors 未变化，则不重复 setThemeColors
// 3. 尽量先用 fallback 稳定渲染，再进行一次性主题替换
```

- [ ] **步骤 2：将初始化请求收敛为单次可复用流程**

```ts
const themeInitPromiseRef = useRef<Promise<void> | null>(null);
const hasInitializedRef = useRef(false);

const loadThemeData = useCallback(async () => {
  const response = await fetch('/api/themes');
  if (!response.ok) return;

  const data = await response.json();
  const nextTheme = VALID_THEMES.includes(data.theme as ThemeKey)
    ? (data.theme as ThemeKey)
    : 'chinese';

  const colorsResponse = await fetch(`/api/theme-colors?theme=${nextTheme}`);
  const inventoryStatusResponse = await fetch('/api/inventory-status');
  const [colorsData, inventoryStatusData] = await Promise.all([
    colorsResponse.ok ? colorsResponse.json() : Promise.resolve(null),
    inventoryStatusResponse.ok ? inventoryStatusResponse.json() : Promise.resolve(null),
  ]);

  const nextColors = buildThemeColors(nextTheme, colorsData, inventoryStatusData);
  setTheme((prev) => (prev === nextTheme ? prev : nextTheme));
  setThemeColors((prev) => isSameThemeColors(prev, nextColors) ? prev : nextColors);
}, []);
```

- [ ] **步骤 3：在 effect 中加初始化保护，避免 dev 下重复触发造成二次请求**

```ts
useEffect(() => {
  if (hasInitializedRef.current) {
    return;
  }

  hasInitializedRef.current = true;
  if (!themeInitPromiseRef.current) {
    themeInitPromiseRef.current = loadThemeData().finally(() => {
      themeInitPromiseRef.current = null;
    });
  }
}, [loadThemeData]);
```

- [ ] **步骤 4：仅在主题值真正变化时写 CSS variables**

```ts
const appliedThemeSnapshotRef = useRef<string>('');

useEffect(() => {
  const snapshot = JSON.stringify(themeColors);
  if (appliedThemeSnapshotRef.current === snapshot) {
    return;
  }
  appliedThemeSnapshotRef.current = snapshot;
  updateCSSVariables(themeColors);
}, [themeColors]);
```

- [ ] **步骤 5：手动验证主题首页进入与切换行为**

运行：打开首页、商品页、账号页并观察 Network
预期：首屏仅出现一轮主题初始化请求；刷新时不再明显闪白；切换主题后页面颜色仍正常更新

---

### 任务 2：统一翻译加载入口并移除整树空白渲染

**文件：**
- 修改：`src/components/LanguageProvider.tsx`
- 修改：`src/i18n/i18n.ts`
- 修改：`src/lib/hooks/useUITranslations.ts`
- 验证：本地 dev 日志、翻译切换手动检查

- [ ] **步骤 1：为 i18n 模块加入进程内共享翻译缓存 Promise**

```ts
let translationResourcePromise: Promise<any> | null = null;
let translationResourceCache: any = null;

export async function getTranslationResources() {
  if (translationResourceCache) return translationResourceCache;
  if (!translationResourcePromise) {
    translationResourcePromise = fetch('/api/translations')
      .then((response) => response.ok ? response.json() : null)
      .catch(() => null)
      .then((data) => {
        translationResourceCache = data;
        return data;
      })
      .finally(() => {
        translationResourcePromise = null;
      });
  }
  return translationResourcePromise;
}
```

- [ ] **步骤 2：只在浏览器环境下拉取数据库翻译，避免构建期相对 URL 报错**

```ts
if (typeof window !== 'undefined') {
  getTranslationResources().then((dbTranslations) => {
    if (!dbTranslations) return;
    Object.keys(dbTranslations).forEach((lng) => {
      if (!i18n.hasResourceBundle(lng, 'translation')) return;
      const merged = {
        ...i18n.getResourceBundle(lng, 'translation'),
        ...dbTranslations[lng],
      };
      i18n.addResourceBundle(lng, 'translation', merged, true, true);
    });
  });
}
```

- [ ] **步骤 3：让 useUITranslations 复用共享缓存，不再直接二次 fetch**

```ts
useEffect(() => {
  const loadTranslations = async () => {
    if (Object.keys(cache).length > 0) {
      setTranslations(cache);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getTranslationResources();
      if (!data) return;
      const dbTranslations = normalizeTranslationMap(data);
      Object.assign(cache, dbTranslations);
      setTranslations(dbTranslations);
    } finally {
      setIsLoading(false);
    }
  };

  loadTranslations();
}, []);
```

- [ ] **步骤 4：LanguageProvider 改为持续渲染 children，不再 `return null`**

```tsx
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(i18n.isInitialized);

  useEffect(() => {
    if (isReady) return;
    const handleInit = () => setIsReady(true);
    i18n.on('initialized', handleInit);
    return () => i18n.off('initialized', handleInit);
  }, [isReady]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
```

- [ ] **步骤 5：手动验证语言切换与 `/api/translations` 请求次数**

运行：打开首页与商品页，切换语言一次
预期：初始化阶段 `/api/translations` 只出现一条主请求；页面不再因为语言 provider 未 ready 出现整页空白

---

### 任务 3：为 AuthProvider 增加认证请求去重

**文件：**
- 修改：`src/lib/contexts/AuthContext.tsx`
- 验证：认证相关 Network、登录态页面切换

- [ ] **步骤 1：抽出规范化用户赋值函数，减少多处重复 setUser/setIsLoading**

```ts
const applyUserState = (nextUser: User | null) => {
  setUser(nextUser ? {
    id: String(nextUser.id),
    name: nextUser.name,
    email: nextUser.email,
    phone: nextUser.phone,
    role: nextUser.role,
    level: nextUser.level || '普通',
    points: nextUser.points || 0,
    total_spent: nextUser.total_spent || 0,
    referral_code: nextUser.referral_code || '',
  } : null);
};
```

- [ ] **步骤 2：加入 in-flight Promise 去重，避免挂载和页面调用并发重复校验**

```ts
const checkAuthPromiseRef = useRef<Promise<boolean> | null>(null);

const checkAuthStatus = useCallback(async (): Promise<boolean> => {
  if (checkAuthPromiseRef.current) {
    return checkAuthPromiseRef.current;
  }

  checkAuthPromiseRef.current = (async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const nextUser = extractUserFromResponse(data);
        applyUserState(nextUser);
        return Boolean(nextUser);
      }

      if (response.status === 401) {
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshResponse.ok) {
          const meResponse = await fetch('/api/auth/me', { credentials: 'include' });
          const meData = meResponse.ok ? await meResponse.json() : null;
          const nextUser = extractUserFromResponse(meData);
          applyUserState(nextUser);
          return Boolean(nextUser);
        }
      }

      applyUserState(null);
      return false;
    } finally {
      setIsLoading(false);
      checkAuthPromiseRef.current = null;
    }
  })();

  return checkAuthPromiseRef.current;
}, []);
```

- [ ] **步骤 3：checkAuth 优先复用当前状态，不重复触发远程校验**

```ts
const hasResolvedInitialAuthRef = useRef(false);

useEffect(() => {
  checkAuthStatus().finally(() => {
    hasResolvedInitialAuthRef.current = true;
  });
}, [checkAuthStatus]);

const checkAuth = useCallback(async (): Promise<boolean> => {
  if (user) return true;
  if (isLoading && checkAuthPromiseRef.current) {
    return checkAuthPromiseRef.current;
  }
  if (!hasResolvedInitialAuthRef.current) {
    return checkAuthStatus();
  }
  return false;
}, [user, isLoading, checkAuthStatus]);
```

- [ ] **步骤 4：手动验证 `/api/auth/me` / `/api/auth/refresh` 请求链**

运行：未登录进入首页、已登录进入账号页、刷新账号页
预期：同一轮初始化只出现一条认证链，不再出现页面层和 provider 层互相追加重复校验

---

### 任务 4：合并 CartProvider 初始化与登录态切换逻辑

**文件：**
- 修改：`src/lib/contexts/CartContext.tsx`
- 验证：购物车 Network、登录后购物车恢复流程

- [ ] **步骤 1：抽出统一的远程购物车拉取函数**

```ts
const fetchServerCart = useCallback(async () => {
  const response = await fetch('/api/cart', { credentials: 'include' });
  if (!response.ok) return null;
  const data = await response.json();
  return {
    items: data.data?.items || [],
    totalAmount: data.data?.total_usd || 0,
  };
}, []);
```

- [ ] **步骤 2：把“首次挂载拉购物车”和“登录态变化同步购物车”合并成单 effect**

```ts
const previousAuthStateRef = useRef<boolean | null>(null);

useEffect(() => {
  const syncCart = async () => {
    if (!isAuthenticated || !user) {
      previousAuthStateRef.current = false;
      return;
    }

    const guestCart = getGuestCartFromCookie();
    const justLoggedIn = previousAuthStateRef.current === false;
    previousAuthStateRef.current = true;

    if (justLoggedIn && guestCart && guestCart.length > 0) {
      await fetch('/api/cart/merge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_cart: guestCart }),
      });
      clearGuestCartCookie();
    }

    const serverCart = await fetchServerCart();
    if (serverCart) {
      setCart(serverCart.items);
      setTotalAmount(serverCart.totalAmount);
    }
  };

  syncCart();
}, [isAuthenticated, user, fetchServerCart]);
```

- [ ] **步骤 3：本地访客购物车逻辑保持不变，但登出时重置 totalAmount**

```ts
if (!isAuthenticated) {
  setCart([]);
  setTotalAmount(0);
}
```

- [ ] **步骤 4：让 `refreshCart`、`addToCart` 复用统一拉取函数**

```ts
const refreshCart = async () => {
  if (!isAuthenticated || !user) return;
  const serverCart = await fetchServerCart();
  if (!serverCart) return;
  setCart(serverCart.items);
  setTotalAmount(serverCart.totalAmount);
};
```

- [ ] **步骤 5：手动验证 `/api/cart` 请求次数和登录后合并行为**

运行：未登录进入首页、登录、加入购物车、刷新购物车页
预期：初始化时 `/api/cart` 不再双发；登录后有访客购物车时只触发一次 merge + 一次 refresh

---

### 任务 5：优化商品详情页，避免局部刷新触发整页回退

**文件：**
- 修改：`src/app/products/[id]/page.tsx`
- 验证：商品详情页加载、评价操作、收藏状态

- [ ] **步骤 1：区分“首屏加载”与“局部数据刷新”状态**

```ts
const [isLoadingProduct, setIsLoadingProduct] = useState(true);
const [isRefreshingReviews, setIsRefreshingReviews] = useState(false);
const [isRefreshingFavorite, setIsRefreshingFavorite] = useState(false);
```

- [ ] **步骤 2：让 fetchProduct 仅在首屏或切换商品时触发整页 loading**

```ts
const fetchProduct = useCallback(async (options?: { silent?: boolean }) => {
  if (!options?.silent) {
    setIsLoadingProduct(true);
  }
  try {
    const response = await fetch(`/api/products/${id}`);
    if (!response.ok) {
      setProduct(null);
      return;
    }
    const data = await response.json();
    setProduct(data.data || data);
  } finally {
    if (!options?.silent) {
      setIsLoadingProduct(false);
    }
  }
}, [id]);
```

- [ ] **步骤 3：评价刷新与收藏刷新单独 effect，不再连带重置整页**

```ts
useEffect(() => {
  fetchProduct();
  fetchRelatedProducts();
}, [fetchProduct, fetchRelatedProducts]);

useEffect(() => {
  fetchReviews();
}, [fetchReviews]);

useEffect(() => {
  if (!isAuthenticated || !user) {
    setIsFavorited(false);
    return;
  }
  fetchFavoriteStatus();
}, [id, isAuthenticated, user, fetchFavoriteStatus]);
```

- [ ] **步骤 4：把页面渲染判断从 `isLoading` 切到 `isLoadingProduct`**

```ts
if (isLoadingProduct) {
  return <ProductDetailSkeleton />;
}
```

- [ ] **步骤 5：手动验证商品页闪现与重复请求**

运行：打开商品详情页、切换语言、发表 helpful、提交留言/跟评
预期：评价刷新时只更新评价区；整页不再反复回 skeleton；商品主请求不因评价操作重复触发

---

### 任务 6：优化账号页，避免页面级重复认证与标签页重复拉取

**文件：**
- 修改：`src/app/account/page.tsx`
- 验证：账号页切 tab、登录态切换、订单与优惠券请求

- [ ] **步骤 1：页面不再在挂载时额外强制 `checkAuth()`，优先依赖全局 AuthProvider 状态**

```ts
useEffect(() => {
  if (isLoading) return;
  if (!user) {
    router.push('/login');
  }
}, [isLoading, user, router]);
```

- [ ] **步骤 2：为 tab 数据拉取增加一次性防重标记**

```ts
const fetchedTabsRef = useRef<{ coupons: boolean; orders: boolean }>({
  coupons: false,
  orders: false,
});
```

- [ ] **步骤 3：只在首次进入某 tab 或显式刷新时拉数据**

```ts
useEffect(() => {
  if (!user) return;

  if (activeTab === 'coupons' && !fetchedTabsRef.current.coupons) {
    fetchedTabsRef.current.coupons = true;
    fetchCoupons();
    fetchAvailableCoupons();
  }

  if (activeTab === 'orders' && !fetchedTabsRef.current.orders) {
    fetchedTabsRef.current.orders = true;
    fetchOrders();
  }
}, [activeTab, user, fetchCoupons, fetchAvailableCoupons, fetchOrders]);
```

- [ ] **步骤 4：保留现有全页 loading，但避免认证完成后“未登录/已登录”来回闪切**

```ts
if (isLoading) {
  return <AccountLoadingState />;
}

if (!user) {
  return null;
}
```

- [ ] **步骤 5：手动验证账号页切 tab 请求模式**

运行：登录后进入账号页，切换订单/优惠券 tab，再来回切换
预期：首次进入 tab 拉一次；回切不重复拉；页面不再先闪“未登录”再恢复正常

---

### 任务 7：低风险复查订单详情页 effect 依赖

**文件：**
- 修改：`src/app/orders/[id]/page.tsx`
- 验证：订单详情页加载、优惠券估算、评价操作

- [ ] **步骤 1：识别只应在首屏执行一次的数据请求**

```ts
// 首屏请求：订单详情、地址、优惠券基础列表
// 不应因为 selectedCouponIds、局部 review state、countdown 变化而重跑
```

- [ ] **步骤 2：如果需要，增加显式“首屏已取数”保护**

```ts
const hasLoadedInitialDataRef = useRef(false);

useEffect(() => {
  if (authLoading || !user || hasLoadedInitialDataRef.current) return;
  hasLoadedInitialDataRef.current = true;
  fetchOrder();
  fetchAddresses();
  fetchCoupons();
}, [authLoading, user, fetchOrder, fetchAddresses, fetchCoupons]);
```

- [ ] **步骤 3：避免把与订单主请求无关的状态放进高频依赖**

```ts
const fetchCoupons = useCallback(async () => {
  const uid = Number(user?.id) || 0;
  if (!uid) return;
  // 不依赖 order?.coupons 与 selectedCouponIds.length
}, [user?.id]);
```

- [ ] **步骤 4：手动验证订单详情敏感链路**

运行：打开待支付订单、切换优惠券、打开已完成订单评价区
预期：订单主请求不重复；地址/优惠券请求不因无关状态连带重发；倒计时仍正常

---

### 任务 8：运行验证并复查日志/请求模式

**文件：**
- 验证：`package.json` 中已有脚本
- 运行：开发环境日志、lint、build

- [ ] **步骤 1：确认项目脚本**

运行：`cat package.json | head -n 120`
预期：确认 `dev`、`lint`、`build` 等脚本名称

- [ ] **步骤 2：运行 lint**

运行：`npm run lint`
预期：exit code 0；如失败，逐项修复后重跑

- [ ] **步骤 3：运行 build**

运行：`npm run build`
预期：exit code 0；不出现新的类型或运行时构建错误

- [ ] **步骤 4：启动 dev 并观察关键请求链**

运行：`npm run dev`
预期：
- 首页首次进入主题相关请求明显减少
- `/api/translations` 初始化只保留一条主请求
- `/api/auth/me` 与 `/api/cart` 不再成对重复
- 商品页与账号页减少整页闪现

- [ ] **步骤 5：整理最终人工复查结论**

```txt
检查项：
1. 首页首屏是否还白闪
2. 商品详情页评价操作是否触发整页 skeleton
3. 账号页是否先出现未登录再恢复
4. 订单详情是否保持稳定
5. 开发日志是否仍有可接受范围内的 StrictMode 双痕迹
```

---

## 自检结果

- 已覆盖规格中的两个层面：全局 Provider 链路、页面级重复请求/闪现。
- 已避免数据库变更、支付链路改造、无关重构。
- 已为高风险订单页单独降级为“低风险复查”，避免影响现有业务。
- 计划内没有 `TODO`、`待定`、`后续实现` 这类占位符。
