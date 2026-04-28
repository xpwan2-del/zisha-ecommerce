'use client';

import Image from 'next/image';

interface ProductItemProps {
  item: {
    id: number;
    product_id: number;
    name: string;
    name_en?: string;
    image: string;
    price: number;
    quantity: number;
    specs?: string;
  };
  currency: string;
}

export function ProductItem({ item, currency }: ProductItemProps) {
  return (
    <div className="flex gap-4 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
        <Image
          src={item.image || '/placeholder.png'}
          alt={item.name}
          width={80}
          height={80}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate" style={{ color: 'var(--text)' }}>
          {item.name}
        </h3>
        {item.specs && (
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {item.specs}
          </p>
        )}
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          数量：{item.quantity}
        </p>
      </div>
      <div className="text-right">
        <div className="font-semibold" style={{ color: 'var(--text)' }}>
          ¥{item.price.toFixed(2)}
        </div>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {currency}
        </div>
      </div>
    </div>
  );
}
