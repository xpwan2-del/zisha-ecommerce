# 订单列表与订单详情页面实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现订单列表页面（移除mock，使用真实API）和订单详情页面（分块展示）

**架构：** 使用 Next.js App Router，订单列表调用 `/api/orders-list`，订单详情调用 `/api/orders/[id]`

**技术栈：** Next.js App Router, Tailwind CSS, TypeScript, Heroicons

---

## 文件清单

### 需要创建的文件

| 文件路径 | 职责 |
|---------|------|
| `src/app/account/orders/page.tsx` | 订单列表主页面（调用 orders-list API） |
| `src/app/account/orders/[id]/page.tsx` | 订单详情页面（调用 orders/[id] API） |
| `src/components/orders/OrderCard.tsx` | 订单卡片组件（列表页使用） |
| `src/components/orders/OrderStatusCard.tsx` | 订单状态卡片组件（详情页使用） |
| `src/components/orders/ProductItem.tsx` | 商品项组件（详情页商品列表） |
| `src/components/orders/OrderSummary.tsx` | 费用明细组件（详情页） |
| `src/components/orders/ShippingInfo.tsx` | 收货信息组件（详情页） |
| `src/components/orders/OrderInfo.tsx` | 订单信息组件（详情页） |

### 需要修改的文件

| 文件路径 | 修改内容 |
|---------|---------|
| `src/app/account/page.tsx` | 移除 mock 数据，调用 orders-list API |
| `src/app/account/page.tsx` | 添加"查看详情"按钮 |

---

## 任务 1：清理订单列表 mock 数据

**文件：**
- 修改：`src/app/account/page.tsx:8-14`（删除 mock 数据）

- [ ] **步骤 1：检查当前 mock 数据位置**

读取 `src/app/account/page.tsx` 第 1-50 行，确认 mock 数据位置

- [ ] **步骤 2：删除 mock 数据声明**

删除第 8-14 行的 mock 数据数组

```typescript
// 删除这段代码
const data = [
  { id: 1, no: 'ORD177718446567514', status: 'pending', price: 1299, currency: 'AED', time: '2026-04-26 14:30', item: '紫砂壶精品', img: 'https://picsum.photos/200' },
  { id: 2, no: 'ORD1777173618630998', status: 'shipped', price: 1591.20, currency: 'AED', time: '2026-04-25 09:15', item: '青花瓷茶具套装', img: 'https://picsum.photos/201' },
  { id: 3, no: 'ORD1777164521234567', status: 'shipped', price: 849, currency: 'AED', time: '2026-04-24 16:20', item: '传统茶杯', img: 'https://picsum.photos/202' },
  { id: 4, no: 'ORD1777153890123456', status: 'reviewing', price: 2399, currency: 'AED', time: '2026-04-23 11:30', item: '高档紫砂壶', img: 'https://picsum.photos/203' },
  { id: 5, no: 'ORD1777145678901234', status: 'refunding', price: 599, currency: 'AED', time: '2026-04-22 08:45', item: '简约茶盘', img: 'https://picsum.photos/204' },
];
```

- [ ] **步骤 3：验证 API 调用正确**

确认 `fetchOrders` 函数调用 `/api/orders-list?user_id=${user.id}`

- [ ] **步骤 4：验证 getOrderTabCount 使用真实数据**

确认使用 `orders` 而非 `mockOrders`

---

## 任务 2：添加"查看详情"按钮

**文件：**
- 修改：`src/app/account/page.tsx`（在订单卡片底部添加查看详情链接）

- [ ] **步骤 1：查找订单卡片操作区域**

读取订单卡片渲染代码，找到操作按钮区域

- [ ] **步骤 2：添加查看详情链接**

在操作按钮右侧添加：
```tsx
<Link
  href={`/account/orders/${order.id}`}
  className="text-accent hover:text-accent/80 text-sm font-medium cursor-pointer"
>
  查看详情 →
</Link>
```

---

## 任务 3：创建订单状态徽章组件

**文件：**
- 创建：`src/components/orders/OrderStatusBadge.tsx`

- [ ] **步骤 1：创建状态徽章组件**

```tsx
'use client';

interface OrderStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  pending: { label: '待付款', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  paid: { label: '已支付', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  processing: { label: '处理中', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  shipped: { label: '已发货', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' },
  reviewing: { label: '待评价', bgColor: 'bg-amber-100', textColor: 'text-amber-800' },
  completed: { label: '已完成', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  cancelled: { label: '已取消', bgColor: 'bg-gray-100', textColor: 'text-gray-600' },
  refunding: { label: '退款中', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  refunded: { label: '已退款', bgColor: 'bg-red-100', textColor: 'text-red-800' },
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, bgColor: 'bg-gray-100', textColor: 'text-gray-600' };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      {config.label}
    </span>
  );
}
```

- [ ] **步骤 2：导出组件**

在 `src/components/orders/index.ts` 导出组件

---

## 任务 4：创建订单卡片组件

**文件：**
- 创建：`src/components/orders/OrderCard.tsx`

- [ ] **步骤 1：创建订单卡片组件**

```tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { OrderStatusBadge } from './OrderStatusBadge';

interface OrderItem {
  id: number;
  product_id: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

interface Order {
  id: number;
  order_number: string;
  order_status: string;
  payment_status: string;
  final_amount: number;
  currency: string;
  created_at: string;
  items: OrderItem[];
}

interface OrderCardProps {
  order: Order;
  onAction?: (action: string, orderId: number) => void;
}

export function OrderCard({ order, onAction }: OrderCardProps) {
  const firstItem = order.items?.[0];
  const itemCount = order.items?.length || 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionButtons = () => {
    switch (order.order_status) {
      case 'pending':
        return (
          <>
            <button className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 cursor-pointer">
              立即支付
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer">
              再次购买
            </button>
          </>
        );
      case 'paid':
      case 'processing':
        return (
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer">
            再次购买
          </button>
        );
      case 'shipped':
        return (
          <>
            <button className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 cursor-pointer">
              确认收货
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer">
              再次购买
            </button>
          </>
        );
      case 'reviewing':
        return (
          <>
            <button className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 cursor-pointer">
              去评价
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer">
              再次购买
            </button>
          </>
        );
      case 'completed':
        return (
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer">
            再次购买
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      {/* 订单头部 */}
      <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="text-sm text-gray-500">{formatDate(order.created_at)}</div>
        <div className="text-sm text-gray-400">订单号：{order.order_number}</div>
        <OrderStatusBadge status={order.order_status} />
      </div>

      {/* 商品信息 */}
      <div className="p-4">
        <Link href={`/account/orders/${order.id}`} className="flex gap-4 cursor-pointer">
          {firstItem && (
            <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={firstItem.image || '/placeholder.png'}
                alt={firstItem.name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {firstItem?.name || '商品'}
              {itemCount > 1 && <span className="text-gray-400 font-normal"> (+{itemCount - 1}件)</span>}
            </h3>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">
              ¥{order.final_amount.toFixed(2)}
            </div>
            <div className="text-sm text-gray-400">{order.currency || 'AED'}</div>
          </div>
        </Link>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end items-center gap-3 px-4 py-3 border-t border-gray-100">
        {getActionButtons()}
        <Link
          href={`/account/orders/${order.id}`}
          className="text-accent hover:text-accent/80 text-sm font-medium cursor-pointer"
        >
          查看详情 →
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：导出组件**

---

## 任务 5：创建订单详情页面

**文件：**
- 创建：`src/app/account/orders/[id]/page.tsx`

- [ ] **步骤 1：创建订单详情页面主结构**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { OrderStatusCard } from '@/components/orders/OrderStatusCard';
import { ShippingInfo } from '@/components/orders/ShippingInfo';
import { ProductItem } from '@/components/orders/ProductItem';
import { OrderSummary } from '@/components/orders/OrderSummary';
import { OrderInfo } from '@/components/orders/OrderInfo';

interface OrderDetail {
  id: number;
  order_number: string;
  order_status: string;
  payment_status: string;
  total_amount: number;
  shipping_fee: number;
  discount_amount: number;
  final_amount: number;
  currency: string;
  created_at: string;
  paid_at?: string;
  payment_method?: string;
  shipping_name?: string;
  shipping_phone?: string;
  shipping_address?: string;
  items: Array<{
    id: number;
    product_id: number;
    name: string;
    image: string;
    price: number;
    quantity: number;
    specs?: string;
  }>;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${params.id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) {
          setOrder(data.data);
        } else {
          setError(data.error || '获取订单失败');
        }
      } catch (err) {
        setError('网络错误');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="h-48 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">加载失败</h2>
          <p className="text-gray-500 mb-4">{error || '订单不存在'}</p>
          <Link href="/account" className="text-accent hover:underline">
            返回订单列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* 返回链接 */}
        <Link
          href="/account?tab=orders"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回订单列表
        </Link>

        {/* 状态卡片 */}
        <OrderStatusCard order={order} />

        {/* 收货信息 */}
        <ShippingInfo
          name={order.shipping_name}
          phone={order.shipping_phone}
          address={order.shipping_address}
        />

        {/* 商品清单 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            商品清单
          </h2>
          <div className="space-y-4">
            {order.items?.map((item) => (
              <ProductItem key={item.id} item={item} currency={order.currency} />
            ))}
          </div>
        </div>

        {/* 费用明细 */}
        <OrderSummary
          subtotal={order.total_amount}
          shippingFee={order.shipping_fee}
          discount={order.discount_amount}
          total={order.final_amount}
          currency={order.currency}
        />

        {/* 订单信息 */}
        <OrderInfo
          orderNumber={order.order_number}
          createdAt={order.created_at}
          paymentMethod={order.payment_method}
          paidAt={order.paid_at}
        />

        {/* 底部操作 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-center">
            <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 cursor-pointer">
              再次购买
            </button>
            <button className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 cursor-pointer">
              联系客服
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：创建 OrderStatusCard 组件**

```tsx
// src/components/orders/OrderStatusCard.tsx
interface OrderStatusCardProps {
  order: {
    order_status: string;
    order_number: string;
    final_amount: number;
    currency: string;
  };
}

const statusConfig: Record<string, { icon: string; title: string; description: string; color: string }> = {
  pending: {
    icon: '⏳',
    title: '待支付订单',
    description: '请在 23:59:59 前完成支付',
    color: 'bg-yellow-50 border-yellow-200',
  },
  paid: {
    icon: '✅',
    title: '支付成功',
    description: '商品正在准备中',
    color: 'bg-blue-50 border-blue-200',
  },
  shipped: {
    icon: '🚚',
    title: '商品已发货',
    description: '预计3-5天送达',
    color: 'bg-indigo-50 border-indigo-200',
  },
  reviewing: {
    icon: '⭐',
    title: '等待评价',
    description: '确认收货后可评价商品',
    color: 'bg-amber-50 border-amber-200',
  },
  completed: {
    icon: '🎉',
    title: '订单完成',
    description: '感谢您的购买',
    color: 'bg-green-50 border-green-200',
  },
  cancelled: {
    icon: '❌',
    title: '订单已取消',
    description: '订单已取消',
    color: 'bg-gray-50 border-gray-200',
  },
};

export function OrderStatusCard({ order }: OrderStatusCardProps) {
  const config = statusConfig[order.order_status] || statusConfig.pending;

  return (
    <div className={`rounded-lg border p-4 ${config.color}`}>
      <div className="flex items-center">
        <div className="text-3xl mr-3">{config.icon}</div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{config.title}</h2>
          <p className="text-sm text-gray-500">{config.description}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 3：创建其他子组件（ShippingInfo, ProductItem, OrderSummary, OrderInfo）**

---

## 任务 6：测试验证

**文件：**
- 测试：`src/app/account/orders/[id]/page.tsx`

- [ ] **步骤 1：启动开发服务器**

```bash
cd /Users/davis/zisha-ecommerce && npm run dev
```

- [ ] **步骤 2：测试订单列表页面**

访问 `http://localhost:3000/account?tab=orders`
- [ ] 确认显示真实订单数据
- [ ] 确认显示商品图片和名称
- [ ] 确认点击"查看详情"跳转

- [ ] **步骤 3：测试订单详情页面**

点击任意订单的"查看详情"
- [ ] 确认显示完整订单信息
- [ ] 确认状态卡片正确显示
- [ ] 确认商品列表正确显示

---

## 自检清单

- [ ] 所有 mock 数据已删除
- [ ] 订单列表使用 `/api/orders-list` API
- [ ] 订单详情使用 `/api/orders/[id]` API
- [ ] "查看详情"按钮正确跳转
- [ ] 状态徽章正确显示
- [ ] 加载状态使用 Skeleton
- [ ] 无 emoji 图标（使用 SVG）
- [ ] 响应式布局正常
