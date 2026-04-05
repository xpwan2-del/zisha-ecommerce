import { NextRequest, NextResponse } from 'next/server';

interface HomeModule {
  id: number;
  type: 'hero' | 'activity';
  title: string;
  title_en: string;
  title_ar: string;
  description: string;
  description_en: string;
  description_ar: string;
  image: string;
  link?: string;
  is_active: boolean;
  order: number;
  button_text?: string;
  button_text_en?: string;
  button_text_ar?: string;
  button_link?: string;
  secondary_button_text?: string;
  secondary_button_text_en?: string;
  secondary_button_text_ar?: string;
  secondary_button_link?: string;
}

// 模拟数据库
let homeModules: HomeModule[] = [
  {
    id: 1,
    type: 'hero',
    title: '正宗紫砂陶艺',
    title_en: 'Authentic Zisha Pottery',
    title_ar: 'فخار زيشا الأصلي',
    description: '体验传统中国茶文化的艺术，我们的正宗紫砂陶艺由拥有数百年传承的大师工匠手工制作。',
    description_en: 'Experience the art of traditional Chinese tea culture. Our authentic Zisha pottery is handcrafted by master artisans with centuries of heritage.',
    description_ar: 'استمتع بفن ثقافة الشاي الصينية التقليدية. فخار زيشا الأصلي لدينا مصنوع يدويًا بواسطة حرفيين منقطعين ذوي تراث قرون.',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20zisha%20teapot%20collection%20on%20wooden%20table%20with%20traditional%20chinese%20tea%20set%20elegant%20professional%20photography%20dark%20wood%20background&image_size=landscape_16_9',
    is_active: true,
    order: 0,
    button_text: '立即购买',
    button_text_en: 'Shop Now',
    button_text_ar: 'تسوق الآن',
    button_link: '/products',
    secondary_button_text: '探索系列',
    secondary_button_text_en: 'Explore Collection',
    secondary_button_text_ar: 'استكشف المجموعة',
    secondary_button_link: '/customize'
  },
  {
    id: 2,
    type: 'activity',
    title: '1元购活动',
    title_en: '1 Yuan Sale',
    title_ar: 'بيع 1 يوان',
    description: '精选紫砂壶，限时1元购',
    description_en: 'Selected Zisha teapots, limited time 1 Yuan sale',
    description_ar: 'فخار زيشا مختار، بيع 1 يوان لفترة محدودة',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20promotion%20banner%201%20yuan%20sale%20chinese%20style%20elegant%20design&image_size=landscape_16_9',
    link: '/deals?type=1yuan',
    is_active: true,
    order: 1
  },
  {
    id: 3,
    type: 'activity',
    title: '今日特价',
    title_en: 'Daily Special',
    title_ar: 'عرض يومي',
    description: '每日精选，限时折扣',
    description_en: 'Daily selection, limited time discount',
    description_ar: 'اختيار يومي، خصم لفترة محدودة',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20daily%20special%20offer%20banner%20chinese%20style%20elegant%20design&image_size=landscape_16_9',
    link: '/deals?type=daily',
    is_active: true,
    order: 2
  }
];

export async function GET(request: NextRequest) {
  try {
    // 按顺序排序
    const sortedModules = [...homeModules].sort((a, b) => a.order - b.order);
    return NextResponse.json(sortedModules);
  } catch (error) {
    console.error('Error fetching home modules:', error);
    return NextResponse.json({ error: 'Failed to fetch home modules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newModule: HomeModule = {
      id: Date.now(),
      type: body.type,
      title: body.title,
      title_en: body.title_en,
      title_ar: body.title_ar,
      description: body.description,
      description_en: body.description_en,
      description_ar: body.description_ar,
      image: body.image,
      link: body.link,
      is_active: body.is_active,
      order: body.order,
      button_text: body.button_text,
      button_text_en: body.button_text_en,
      button_text_ar: body.button_text_ar,
      button_link: body.button_link,
      secondary_button_text: body.secondary_button_text,
      secondary_button_text_en: body.secondary_button_text_en,
      secondary_button_text_ar: body.secondary_button_text_ar,
      secondary_button_link: body.secondary_button_link
    };
    
    homeModules.push(newModule);
    return NextResponse.json(newModule, { status: 201 });
  } catch (error) {
    console.error('Error creating home module:', error);
    return NextResponse.json({ error: 'Failed to create home module' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    const moduleIndex = homeModules.findIndex(module => module.id === id);
    if (moduleIndex === -1) {
      return NextResponse.json({ error: 'Home module not found' }, { status: 404 });
    }
    
    homeModules[moduleIndex] = { ...homeModules[moduleIndex], ...updateData };
    return NextResponse.json(homeModules[moduleIndex]);
  } catch (error) {
    console.error('Error updating home module:', error);
    return NextResponse.json({ error: 'Failed to update home module' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
    }
    
    const moduleId = parseInt(id);
    const moduleIndex = homeModules.findIndex(module => module.id === moduleId);
    if (moduleIndex === -1) {
      return NextResponse.json({ error: 'Home module not found' }, { status: 404 });
    }
    
    homeModules.splice(moduleIndex, 1);
    return NextResponse.json({ message: 'Home module deleted successfully' });
  } catch (error) {
    console.error('Error deleting home module:', error);
    return NextResponse.json({ error: 'Failed to delete home module' }, { status: 500 });
  }
}
