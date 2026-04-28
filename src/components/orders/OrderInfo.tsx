'use client';

interface OrderInfoProps {
  orderNumber: string;
  createdAt: string;
  paymentMethod?: string;
  paidAt?: string;
}

export function OrderInfo({ orderNumber, createdAt, paymentMethod, paidAt }: OrderInfoProps) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(orderNumber);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4" style={{ borderColor: 'var(--border)' }}>
      <h2 className="text-lg font-semibold mb-4 flex items-center" style={{ color: 'var(--text)' }}>
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        订单信息
      </h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span style={{ color: 'var(--text-muted)' }}>订单编号：</span>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text)' }}>{orderNumber}</span>
            <button
              onClick={copyToClipboard}
              className="p-1 rounded hover:bg-gray-100 cursor-pointer"
              title="复制"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex justify-between">
          <span style={{ color: 'var(--text-muted)' }}>下单时间：</span>
          <span style={{ color: 'var(--text)' }}>{formatDate(createdAt)}</span>
        </div>
        {paymentMethod && (
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>支付方式：</span>
            <span style={{ color: 'var(--text)' }}>{paymentMethod}</span>
          </div>
        )}
        {paidAt && (
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>支付时间：</span>
            <span style={{ color: 'var(--text)' }}>{formatDate(paidAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
