import { NextResponse } from 'next/server';
import { logMonitor } from '@/lib/utils/logger';

interface Guarantee {
  id: number;
  text: string;
  text_en: string;
  text_ar: string;
  color: string;
  icon: string;
  is_active: boolean;
  order: number;
}

let guarantees: Guarantee[] = [
  {
    id: 1,
    text: 'Free shipping on orders over $50',
    text_en: 'Free shipping on orders over $50',
    text_ar: 'شحن مجاني على الطلبات فوق 50 دولار',
    color: '#CA8A04',
    icon: 'check-circle',
    is_active: true,
    order: 0
  },
  {
    id: 2,
    text: '30-day returns',
    text_en: '30-day returns',
    text_ar: 'إرجاع في غضون 30 يومًا',
    color: '#CA8A04',
    icon: 'check-circle',
    is_active: true,
    order: 1
  },
  {
    id: 3,
    text: 'Authentic guarantee',
    text_en: 'Authentic guarantee',
    text_ar: 'ضمان أصالة',
    color: '#CA8A04',
    icon: 'check-circle',
    is_active: true,
    order: 2
  },
  {
    id: 4,
    text: 'Green product',
    text_en: 'Green product',
    text_ar: 'منتج أخضر',
    color: '#CA8A04',
    icon: 'check-circle',
    is_active: true,
    order: 3
  }
];

export async function GET() {
  try {
    logMonitor('GUARANTEES', 'REQUEST', { method: 'GET', action: 'GET_GUARANTEES' });

    const sortedGuarantees = guarantees.sort((a, b) => a.order - b.order);
    logMonitor('GUARANTEES', 'SUCCESS', { action: 'GET_GUARANTEES', count: sortedGuarantees.length });
    return NextResponse.json(sortedGuarantees);
  } catch (error: any) {
    logMonitor('GUARANTEES', 'ERROR', { action: 'GET_GUARANTEES', error: error?.message || String(error) });
    console.error('Error fetching guarantees:', error);
    return NextResponse.json({ error: 'Failed to fetch guarantees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    logMonitor('GUARANTEES', 'REQUEST', { method: 'POST', action: 'CREATE_GUARANTEE' });

    const body = await request.json();
    
    const newGuarantee: Guarantee = {
      id: Math.max(...guarantees.map(g => g.id), 0) + 1,
      text: body.text,
      text_en: body.text_en,
      text_ar: body.text_ar,
      color: body.color || '#CA8A04',
      icon: body.icon || 'check-circle',
      is_active: body.is_active !== false,
      order: body.order || guarantees.length
    };
    
    guarantees.push(newGuarantee);
    logMonitor('GUARANTEES', 'SUCCESS', { action: 'CREATE_GUARANTEE', id: newGuarantee.id });
    return NextResponse.json(newGuarantee, { status: 201 });
  } catch (error: any) {
    logMonitor('GUARANTEES', 'ERROR', { action: 'CREATE_GUARANTEE', error: error?.message || String(error) });
    console.error('Error adding guarantee:', error);
    return NextResponse.json({ error: 'Failed to add guarantee' }, { status: 500 });
  }
}
