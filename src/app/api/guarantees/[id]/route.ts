import { NextResponse } from 'next/server';

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

// 模拟数据库
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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const idInt = parseInt(id);
    const body = await request.json();
    
    const guaranteeIndex = guarantees.findIndex(g => g.id === idInt);
    if (guaranteeIndex === -1) {
      return NextResponse.json({ error: 'Guarantee not found' }, { status: 404 });
    }
    
    guarantees[guaranteeIndex] = {
      ...guarantees[guaranteeIndex],
      ...body
    };
    
    return NextResponse.json(guarantees[guaranteeIndex]);
  } catch (error) {
    console.error('Error updating guarantee:', error);
    return NextResponse.json({ error: 'Failed to update guarantee' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const idInt = parseInt(id);
    
    const guaranteeIndex = guarantees.findIndex(g => g.id === idInt);
    if (guaranteeIndex === -1) {
      return NextResponse.json({ error: 'Guarantee not found' }, { status: 404 });
    }
    
    guarantees.splice(guaranteeIndex, 1);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting guarantee:', error);
    return NextResponse.json({ error: 'Failed to delete guarantee' }, { status: 500 });
  }
}
