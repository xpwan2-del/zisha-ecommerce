import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

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

interface Category {
  id: number;
  name: string;
  name_en: string;
  name_ar: string;
  description: string;
  description_en: string;
  description_ar: string;
  icon: string;
  is_active: boolean;
  order: number;
}

// 模拟数据 - 保持模块和分类数据
const homeModules: HomeModule[] = [
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

const categories: Category[] = [
  {
    id: 1,
    name: '紫砂壶',
    name_en: 'Zisha Teapots',
    name_ar: 'فخار زيشا',
    description: '正宗宜兴紫砂壶',
    description_en: 'Authentic Yixing Zisha teapots',
    description_ar: 'فخار زيشا يixing الأصلي',
    icon: 'teapot',
    is_active: true,
    order: 0
  },
  {
    id: 2,
    name: '茶具套装',
    name_en: 'Tea Sets',
    name_ar: 'مجموعات الشاي',
    description: '完整茶具套装',
    description_en: 'Complete tea sets',
    description_ar: 'مجموعات شاي كاملة',
    icon: 'tea-set',
    is_active: true,
    order: 1
  },
  {
    id: 3,
    name: '茶盘',
    name_en: 'Tea Trays',
    name_ar: 'صواني الشاي',
    description: '精美茶盘',
    description_en: 'Elegant tea trays',
    description_ar: 'صواني شاي أنيقة',
    icon: 'tea-tray',
    is_active: true,
    order: 2
  },
  {
    id: 4,
    name: '配件',
    name_en: 'Accessories',
    name_ar: 'مرفق',
    description: '茶道配件',
    description_en: 'Tea ceremony accessories',
    description_ar: 'إكسسوارات تاسيم الشاي',
    icon: 'accessories',
    is_active: true,
    order: 3
  }
];

export async function GET(request: NextRequest) {
  try {
    // 按顺序排序
    const sortedModules = [...homeModules].sort((a, b) => a.order - b.order);
    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
    
    // 从数据库获取产品数据
    const productsResult = await query('SELECT id, name, name_en, name_ar, description, price, original_price, stock, category_id, image, discount, daily_discount FROM products ORDER BY id LIMIT 9');
    
    // 处理产品数据，添加活动标签和图标
    const products = productsResult.rows.map((product: any) => ({
      ...product,
      is_active: true,
      material_id: 1, // 默认值
      teapot_type_id: 1, // 默认值
      description_en: product.name_en, // 使用name_en作为默认描述
      description_ar: product.name_ar, // 使用name_ar作为默认描述
      activity_tag: product.discount > 0 ? '特惠产品' : product.daily_discount > 0 ? '今日特惠' : undefined,
      activity_icon: product.discount > 0 ? 'tag' : product.daily_discount > 0 ? 'fire' : undefined
    }));
    
    // 从数据库获取促销活动数据
    const promotionsResult = await query('SELECT id, name, name_en, name_ar, description, type, discount_percent, start_time, end_time, status FROM promotions ORDER BY id');
    
    // 构建活动数据
    const activities = promotionsResult.rows.map((promotion: any) => ({
      id: promotion.id,
      type: promotion.type || 'activity',
      title: promotion.name,
      title_en: promotion.name_en,
      title_ar: promotion.name_ar,
      description: promotion.description || `折扣 ${promotion.discount_percent}%`,
      description_en: promotion.description || `Discount ${promotion.discount_percent}%`,
      description_ar: promotion.description || `خصم ${promotion.discount_percent}%`,
      image: `/images/promotions/default-promotion.jpg`, // 使用默认活动图片
      link: `/deals?promotion_id=${promotion.id}`,
      is_active: promotion.status === 'active',
      order: promotion.id,
      discount_percent: promotion.discount_percent
    }));
    
    // 构建首页数据
    const homeData = {
      modules: sortedModules,
      categories: sortedCategories,
      products: products,
      activities: activities
    };
    
    return NextResponse.json(homeData);
  } catch (error) {
    console.error('Error fetching home data:', error);
    return NextResponse.json({ error: 'Failed to fetch home data' }, { status: 500 });
  }
}