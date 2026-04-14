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
    // 自动更新过期活动状态
    await query(
      `UPDATE product_promotions 
       SET status = 'inactive' 
       WHERE status = 'active' AND end_time < datetime('now')`
    );

    // 按顺序排序
    const sortedModules = [...homeModules].sort((a, b) => a.order - b.order);
    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
    
    // 从数据库获取产品数据（关联促销活动，每个产品只取最大折扣的促销）
    const productsResult = await query(`
      SELECT 
        p.id, p.name, p.name_en, p.name_ar, p.description, 
        p.price, p.original_price, p.stock, p.category_id, p.image,
        pr.id as promotion_id,
        pr.name as promotion_name,
        pr.discount_percent as promotion_discount,
        pr.icon as promotion_icon,
        pr.color as promotion_color,
        pp.priority,
        pp.can_stack
      FROM products p
      LEFT JOIN product_promotions pp ON p.id = pp.product_id
      LEFT JOIN promotions pr ON pp.promotion_id = pr.id
      WHERE (pp.status IS NULL OR (pp.status = 'active' AND pr.status = 'active'))
      GROUP BY p.id
      ORDER BY MAX(COALESCE(pp.priority, 0)) DESC, MAX(pr.discount_percent) DESC, p.id
      LIMIT 9
    `);
    
    // 处理产品数据，添加活动标签和图标（使用嵌套promotion结构，与/api/products一致）
    const calculateFinalPrice = (originalPrice: number, discount: number, priority: number, canStack: number) => {
      // 简单计算：按优先级和折扣计算
      // 独占活动(can_stack=false)直接用该折扣，可叠加活动相乘
      if (canStack === 0) {
        return originalPrice * (1 - discount / 100);
      }
      return originalPrice * (1 - discount / 100);
    };

    const products = productsResult.rows.map((product: any) => {
      const originalPrice = parseFloat(product.price);
      const discount = product.promotion_discount || 0;
      const finalPrice = discount > 0 ? calculateFinalPrice(originalPrice, discount, product.priority || 2, product.can_stack || 1) : originalPrice;
      
      return {
        ...product,
        is_active: true,
        material_id: 1,
        teapot_type_id: 1,
        description_en: product.name_en,
        description_ar: product.name_ar,
        // 使用嵌套promotion结构
        promotion: product.promotion_name ? {
          id: product.promotion_id || null,
          name: product.promotion_name,
          discount_percent: product.promotion_discount || 0,
          icon: product.promotion_icon || 'tag',
          color: product.promotion_color || '#CA8A04',
          priority: product.priority || 2,
          can_stack: product.can_stack || 1,
          promotion_price: finalPrice
        } : null,
        activity_tag: product.promotion_name || null,
        activity_icon: product.promotion_icon || null,
        activity_color: product.promotion_color || null
      };
    });
    
    // 从数据库获取促销活动数据
    const promotionsResult = await query('SELECT id, name, name_en, name_ar, description, type, discount_percent, status FROM promotions ORDER BY id');
    
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch home data', details: errorMessage }, { status: 500 });
  }
}