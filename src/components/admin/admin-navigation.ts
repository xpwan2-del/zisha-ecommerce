export interface AdminNavigationItem {
  label: string;
  href: string;
  icon: string;
}

export interface AdminNavigationGroup {
  label: string;
  items: AdminNavigationItem[];
}

export const adminNavigationGroups: AdminNavigationGroup[] = [
  {
    label: '数据看板',
    items: [
      { label: '今日概览', href: '/admin/dashboard', icon: '📊' },
    ],
  },
  {
    label: '订单中心',
    items: [
      { label: '全部订单', href: '/admin/orders', icon: '🧾' },
    ],
  },
  {
    label: '商品中心',
    items: [
      { label: '商品列表', href: '/admin/products', icon: '📦' },
      { label: '商品分类', href: '/admin/categories', icon: '🏷️' },
    ],
  },
  {
    label: '库存中心',
    items: [
      { label: '库存总览', href: '/admin/inventory', icon: '🏬' },
      { label: '库存预警', href: '/admin/inventory/alerts', icon: '🔔' },
      { label: '盘点任务', href: '/admin/inventory/checks', icon: '✅' },
    ],
  },
  {
    label: '营销中心',
    items: [
      { label: '促销规则', href: '/admin/promotions', icon: '🎯' },
      { label: '优惠券管理', href: '/admin/coupons', icon: '🎟️' },
    ],
  },
  {
    label: '支付中心',
    items: [
      { label: '支付配置', href: '/admin/payments', icon: '💳' },
      { label: '支付流水', href: '/admin/payments/orders', icon: '💸' },
      { label: '退款流水', href: '/admin/payments/refunds', icon: '↩️' },
      { label: '回调日志', href: '/admin/payments/logs', icon: '📜' },
    ],
  },
  {
    label: '用户中心',
    items: [
      { label: '用户列表', href: '/admin/users', icon: '👥' },
    ],
  },
  {
    label: '评价中心',
    items: [
      { label: '商品评价', href: '/admin/reviews', icon: '⭐' },
    ],
  },
  {
    label: '内容与风格',
    items: [
      { label: '首页模块', href: '/admin/home-modules', icon: '🏠' },
      { label: '关于我们', href: '/admin/about', icon: 'ℹ️' },
      { label: '联系方式', href: '/admin/contact', icon: '📞' },
      { label: '服务保障', href: '/admin/guarantees', icon: '🛡️' },
      { label: '主题风格', href: '/admin/themes', icon: '🎨' },
      { label: '多语言配置', href: '/admin/translations', icon: '🌐' },
    ],
  },
  {
    label: '系统设置',
    items: [
      { label: '管理员权限', href: '/admin/users', icon: '🔐' },
      { label: '汇率设置', href: '/admin/settings/exchange-rates', icon: '💱' },
      { label: '审计日志', href: '/admin/settings/audit-logs', icon: '🗂️' },
      { label: '数据库检查', href: '/admin/database', icon: '🗃️' },
      { label: '系统配置', href: '/admin/settings/general', icon: '⚙️' },
    ],
  },
];
