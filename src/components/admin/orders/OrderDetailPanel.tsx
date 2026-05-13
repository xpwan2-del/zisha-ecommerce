import { OrderStatusBadge } from './OrderStatusBadge';

interface OrderDetailPanelProps {
  order: any;
  items: any[];
  statusLogs: any[];
  payments: any[];
  logistics: any[];
  coupons: any[];
  inventoryTransactions: any[];
  auditLogs: any[];
  releaseRecords: any[];
  refundRetry?: {
    canRetry?: boolean;
    eventId?: string | null;
    platform?: string | null;
    failureStage?: string | null;
    processingState?: string | null;
    retryCount?: number;
    lastRetryAt?: string | null;
    errorMessage?: string | null;
    updatedAt?: string | null;
  } | null;
}

function formatMoney(value: unknown) {
  const num = Number(value || 0);
  return num.toFixed(2);
}

function EmptyText({ show }: { show: boolean }) {
  if (!show) return null;
  return <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-400">暂无记录</p>;
}

export function OrderDetailPanel({
  order,
  items,
  statusLogs,
  payments,
  logistics,
  coupons,
  inventoryTransactions,
  auditLogs,
  releaseRecords,
  refundRetry,
}: OrderDetailPanelProps) {
  if (!order) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">{order.order_number}</h2>
              <div className="flex flex-wrap gap-2">
                <OrderStatusBadge status={order.order_status} />
                <OrderStatusBadge status={order.payment_status} type="payment" />
              </div>
            </div>
            <p className="text-sm text-slate-500">创建于 {new Date(order.created_at).toLocaleString()} · 支付方式：{order.payment_method || '-'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">实付总额</p>
            <p className="mt-1 text-3xl font-black text-slate-950">¥{formatMoney(order.final_amount)}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 border-t border-slate-100 pt-8 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">用户信息</p>
            <p className="mt-3 text-sm font-semibold text-slate-950">{order.user_name || '-'}</p>
            <p className="mt-1 text-xs text-slate-500">{order.user_email || '-'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">收货信息</p>
            <p className="mt-3 text-sm font-medium text-slate-900">{[order.street_address, order.city, order.state_name, order.country_name].filter(Boolean).join(' ') || '-'}</p>
            <p className="mt-2 text-xs text-slate-500">联系人：{order.address_contact || '-'} · 手机：{order.address_phone || '-'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-900">商品明细</h3>
            </div>
            <div className="divide-y divide-slate-100 px-6">
              <EmptyText show={items.length === 0} />
              {items.map((item) => (
                <div key={item.order_item_id || item.id} className="flex items-center gap-4 py-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-100">
                    {item.product_image ? <img src={item.product_image} alt={item.product_name || 'product'} className="h-full w-full object-cover" /> : <span className="text-xs text-slate-400">无图</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">{item.product_name || item.name || '-'}</p>
                    <p className="mt-1 text-xs text-slate-500">单价 ¥{formatMoney(item.original_price)} · 数量 {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-950">¥{formatMoney((Number(item.original_price || 0) * Number(item.quantity || 0)) - Number(item.total_promotions_discount_amount || 0))}</p>
                    {Number(item.total_promotions_discount_amount || 0) > 0 ? <p className="mt-1 text-[10px] text-rose-500">已优惠 ¥{formatMoney(item.total_promotions_discount_amount)}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-900">价格拆解</h3>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm"><span className="text-slate-500">商品原价</span><span className="font-medium text-slate-950">¥{formatMoney(order.total_original_price)}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-slate-500">促销后金额</span><span className="font-medium text-slate-950">¥{formatMoney(order.total_after_promotions_amount)}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-slate-500">优惠券减免</span><span className="font-medium text-rose-500">-¥{formatMoney(order.total_coupon_discount)}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-slate-500">运费</span><span className="font-medium text-slate-950">+¥{formatMoney(order.shipping_fee)}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-slate-500">最终折扣</span><span className="font-medium text-rose-500">-¥{formatMoney(order.order_final_discount_amount)}</span></div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-base"><span className="font-bold text-slate-950">最终实付</span><span className="text-xl font-black text-slate-950">¥{formatMoney(order.final_amount)}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <RecordCard title="支付记录" empty={payments.length === 0}>
              {payments.map((payment, index) => (
                <div key={payment.id || index} className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  <div className="flex items-center justify-between gap-3 font-semibold text-slate-900"><span>{payment.payment_method || payment.channel || '未知通道'}</span><span>¥{formatMoney(payment.amount || order.final_amount)}</span></div>
                  <div className="mt-1 flex items-center justify-between"><span>{payment.status || payment.payment_status || 'unknown'}</span><span className="font-mono text-[10px] text-slate-500">{payment.reference_id || payment.transaction_id || order.reference_id || '-'}</span></div>
                </div>
              ))}
            </RecordCard>
            <RecordCard title="物流信息" empty={logistics.length === 0}>
              {logistics.map((logistic, index) => (
                <div key={logistic.id || index} className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  <div className="flex items-center justify-between gap-3 font-semibold text-slate-900"><span>{logistic.carrier || '-'}</span><span>{logistic.status || '-'}</span></div>
                  <p className="mt-1 font-mono text-[10px] text-slate-500">单号：{logistic.tracking_number || '-'}</p>
                </div>
              ))}
            </RecordCard>
          </div>

          <RecordCard title="优惠券记录" empty={coupons.length === 0}>
            {coupons.map((coupon, index) => (
              <div key={coupon.order_coupon_id || coupon.id || index} className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <div className="flex items-center justify-between gap-3 font-semibold text-slate-900"><span>{coupon.coupon_code || coupon.coupon_name || '-'}</span><span>{coupon.discount_applied ?? coupon.value ?? 0}</span></div>
              </div>
            ))}
          </RecordCard>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-900">订单时间线</h3>
            <div className="mt-6 space-y-5 border-l border-slate-100 pl-6">
              <EmptyText show={statusLogs.length === 0} />
              {statusLogs.map((log, index) => (
                <div key={log.id || index} className="relative">
                  <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-slate-300 ring-4 ring-white"></span>
                  <p className="text-sm font-semibold text-slate-950">{log.new_status || '-'}</p>
                  <p className="mt-1 text-xs text-slate-500">{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</p>
                  <p className="mt-1 text-[10px] text-slate-400">原状态：{log.old_status || '-'}</p>
                </div>
              ))}
            </div>
          </div>

          <RecordCard title="库存流水" empty={inventoryTransactions.length === 0}>
            {inventoryTransactions.map((transaction, index) => (
              <div key={transaction.id || index} className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <div className="flex items-center justify-between gap-3 font-semibold text-slate-900"><span>{transaction.transaction_name_zh || transaction.transaction_code || '-'}</span><span className={Number(transaction.quantity_change || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}>{Number(transaction.quantity_change || 0) > 0 ? '+' : ''}{transaction.quantity_change}</span></div>
                <p className="mt-1 text-[10px] text-slate-500">{transaction.product_name || '-'}</p>
              </div>
            ))}
          </RecordCard>

          <RecordCard title="后台审计日志" empty={auditLogs.length === 0}>
            {auditLogs.map((log, index) => (
              <div key={log.id || index} className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <div className="flex items-center justify-between gap-3 font-semibold text-slate-900"><span>{log.action}</span><span>{log.risk_level}</span></div>
                <p className="mt-1 text-[10px] text-slate-500">{log.created_at}</p>
              </div>
            ))}
          </RecordCard>

          <RecordCard title="资源释放记录" empty={releaseRecords.length === 0}>
            {releaseRecords.map((record, index) => (
              <div key={record.id || index} className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <div className="flex items-center justify-between gap-3 font-semibold text-slate-900"><span>{record.reference_type}</span><span>{record.transaction_type_code}</span></div>
                <p className="mt-1 text-[10px] text-slate-500">商品：{record.items_released ? '已释放' : '未释放'} · 优惠券：{record.coupons_released ? '已释放' : '未释放'}</p>
              </div>
            ))}
          </RecordCard>

          {refundRetry ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-rose-900">退款重试</h3>
              <div className="mt-4 space-y-3 text-xs text-rose-700">
                <div className="grid grid-cols-2 gap-2"><div className="rounded-lg bg-white/70 p-2">平台：{refundRetry.platform || '-'}</div><div className="rounded-lg bg-white/70 p-2 text-right">次数：{refundRetry.retryCount ?? 0}</div></div>
                <div className="rounded-lg bg-white/70 p-3">错误信息：{refundRetry.errorMessage || '-'}</div>
                <div className="rounded-lg bg-white/70 p-3">可重试：{refundRetry.canRetry ? '是' : '否'}</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RecordCard({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{title}</h3>
      <div className="mt-4 space-y-3">
        <EmptyText show={empty} />
        {children}
      </div>
    </div>
  );
}
