'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CartSuccessRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('source', 'cart');
    router.replace(`/payment-result?${params.toString()}`);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
    </div>
  );
}

export default function CartSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div></div>}>
      <CartSuccessRedirect />
    </Suspense>
  );
}
