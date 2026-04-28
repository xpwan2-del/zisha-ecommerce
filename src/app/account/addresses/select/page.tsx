'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

interface Address {
  id: number;
  contact_name: string;
  phone: string;
  country_name: string;
  state_name: string | null;
  city: string;
  street_address: string;
  is_default: boolean;
}

function AddressSelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const orderId = searchParams.get('order_id');

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/addresses', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAddresses(result.data);
          const defaultAddr = result.data.find((a: Address) => a.is_default);
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedAddressId || !orderId) {
      setError('请选择收货地址');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/address`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ address_id: selectedAddressId })
      });

      const result = await response.json();

      if (result.success) {
        router.push('/account?tab=orders');
      } else {
        setError(result.error || '更新地址失败');
      }
    } catch (err) {
      setError('更新地址失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Cormorant, serif' }}>
          选择收货地址
        </h1>
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">暂无收货地址</p>
          <button
            onClick={() => router.push('/addresses/new?redirect=/account/addresses/select')}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            添加新地址
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-6">
            {addresses.map((address) => (
              <div
                key={address.id}
                onClick={() => setSelectedAddressId(address.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedAddressId === address.id
                    ? 'border-2'
                    : 'border'
                }`}
                style={{
                  borderColor: selectedAddressId === address.id ? 'var(--accent)' : 'var(--border)',
                  backgroundColor: selectedAddressId === address.id ? 'var(--background-alt)' : 'var(--card)'
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedAddressId === address.id ? 'border-accent' : 'border-gray-300'
                      }`}
                      style={{
                        borderColor: selectedAddressId === address.id ? 'var(--accent)' : undefined,
                        backgroundColor: selectedAddressId === address.id ? 'var(--accent)' : 'transparent'
                      }}
                    >
                      {selectedAddressId === address.id && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium" style={{ color: 'var(--text)' }}>
                        {address.contact_name}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {address.phone}
                      </span>
                      {address.is_default && (
                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                          默认
                        </span>
                      )}
                    </div>
                    <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>
                      {[address.state_name, address.city, address.street_address].filter(Boolean).join(' ')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/addresses/new?redirect=/account/addresses/select&order_id=${orderId}`)}
              className="flex-1 py-3 rounded-lg border text-sm font-medium cursor-pointer"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              添加新地址
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedAddressId || isSubmitting}
              className="flex-1 py-3 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              {isSubmitting ? '提交中...' : '确认选择'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AddressSelectPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
      </div>
    }>
      <AddressSelectContent />
    </Suspense>
  );
}
