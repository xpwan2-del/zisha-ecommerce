'use client';

interface OrderSummaryProps {
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  currency: string;
}

export function OrderSummary({ subtotal, shippingFee, discount, total, currency }: OrderSummaryProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4" style={{ borderColor: 'var(--border)' }}>
      <h2 className="text-lg font-semibold mb-4 flex items-center" style={{ color: 'var(--text)' }}>
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        费用明细
      </h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span style={{ color: 'var(--text-muted)' }}>商品总价：</span>
          <span style={{ color: 'var(--text)' }}>¥{subtotal.toFixed(2)} {currency}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: 'var(--text-muted)' }}>运费：</span>
          <span style={{ color: 'var(--text)' }}>¥{shippingFee.toFixed(2)} {currency}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: 'var(--text-muted)' }}>优惠券：</span>
          <span style={{ color: 'var(--accent)' }}>-¥{discount.toFixed(2)} {currency}</span>
        </div>
        <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
          <span style={{ color: 'var(--text)' }}>应付总额：</span>
          <span className="text-lg" style={{ color: 'var(--accent)' }}>¥{total.toFixed(2)} {currency}</span>
        </div>
      </div>
    </div>
  );
}
