'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AddressForm from '@/components/addresses/AddressForm';

function NewAddressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account/addresses';
  const orderId = searchParams.get('order_id');

  const handleSubmit = async (formData: any) => {
    try {
      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        const addressId = result.data?.id || result.data;
        
        if (orderId && addressId) {
          const updateResponse = await fetch(`/api/orders/${orderId}/address`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ address_id: addressId })
          });
          
          if (updateResponse.ok) {
            router.push('/account?tab=orders');
          } else {
            router.push(redirect);
          }
        } else {
          router.push(redirect);
        }
      } else {
        alert(result.error || '添加地址失败');
      }
    } catch (err) {
      alert('添加地址失败，请重试');
    }
  };

  const handleCancel = () => {
    if (orderId && redirect.includes('account/addresses/select')) {
      router.push(`${redirect}?order_id=${orderId}`);
    } else {
      router.push(redirect);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Cormorant, serif' }}>
          添加新地址
        </h1>
        <button
          onClick={handleCancel}
          className="text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-6 rounded-lg border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <AddressForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={false}
        />
      </div>
    </div>
  );
}

export default function NewAddressPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
      </div>
    }>
      <NewAddressContent />
    </Suspense>
  );
}