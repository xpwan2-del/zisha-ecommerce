import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 模拟翻译数据
const mockTranslations: Record<string, Record<string, string>> = {
  en: {
    'products.filters': 'Filters',
    'products.price_range': 'Price Range',
    'products.materials': 'Materials',
    'products.capacity': 'Capacity',
    'products.apply_filters': 'Apply Filters',
    'products.prev': 'Previous',
    'products.specifications': 'Specifications',
    'products.service_commitments': 'Service Commitments',
    'products.7day_return': '7-day Return',
    'products.free_shipping': 'Free Shipping',
    'products.authentic_guarantee': 'Authentic Guarantee',
    'products.secure_payment': 'Secure Payment',
    'products.shipping_info': 'Shipping Info',
    'products.after_sale': 'After Sale',
    'products.weight': 'Weight',
    'products.size': 'Size',
    'products.color': 'Color',
    'products.other': 'Other',
    'products.leave_review': 'Leave a Review',
    'products.rating': 'Rating',
    'products.comment': 'Comment',
    'products.add_to_cart': 'Add to Cart',
    'products.buy_now': 'Buy Now',
    'products.description': 'Description',
    'products.reviews': 'Reviews'
  },
  zh: {
    'products.filters': '筛选',
    'products.price_range': '价格范围',
    'products.materials': '材质',
    'products.capacity': '容量',
    'products.apply_filters': '应用筛选',
    'products.prev': '上一页',
    'products.specifications': '规格参数',
    'products.service_commitments': '服务承诺',
    'products.7day_return': '7天退换',
    'products.free_shipping': '免费配送',
    'products.authentic_guarantee': '正品保障',
    'products.secure_payment': '安全支付',
    'products.shipping_info': '配送信息',
    'products.after_sale': '售后服务',
    'products.weight': '重量',
    'products.size': '尺寸',
    'products.color': '颜色',
    'products.other': '其他',
    'products.leave_review': '留下评价',
    'products.rating': '评分',
    'products.comment': '评论',
    'products.add_to_cart': '加入购物车',
    'products.buy_now': '立即购买',
    'products.description': '描述',
    'products.reviews': '评价'
  },
  ar: {
    'products.filters': 'مرشحات',
    'products.price_range': 'نطاق السعر',
    'products.materials': 'المواد',
    'products.capacity': 'السعة',
    'products.apply_filters': 'تطبيق المرشحات',
    'products.prev': 'السابق',
    'products.specifications': 'المواصفات',
    'products.service_commitments': 'التعهدات الخدمية',
    'products.7day_return': 'استرداد لمدة 7 أيام',
    'products.free_shipping': 'شحن مجاني',
    'products.authentic_guarantee': 'ضمان أصالة',
    'products.secure_payment': 'دفع آمن',
    'products.shipping_info': 'معلومات الشحن',
    'products.after_sale': 'بعد البيع',
    'products.weight': 'الوزن',
    'products.size': 'الحجم',
    'products.color': 'اللون',
    'products.other': 'آخر',
    'products.leave_review': 'اترك تقييمًا',
    'products.rating': 'التقييم',
    'products.comment': 'التعليق',
    'products.add_to_cart': 'أضف إلى السلة',
    'products.buy_now': 'اشتر الآن',
    'products.description': 'الوصف',
    'products.reviews': 'التقييمات'
  }
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const language = url.searchParams.get('language') || 'en';

    try {
      const result = await query(
        'SELECT key, value FROM translations WHERE language = $1',
        [language]
      );

      const translations: Record<string, string> = {};
      result.rows.forEach((row: any) => {
        translations[row.key] = row.value;
      });

      return NextResponse.json(translations);
    } catch (dbError) {
      console.error('Database error, using mock translations:', dbError);
      // 数据库失败时使用模拟数据
      return NextResponse.json(mockTranslations[language as keyof typeof mockTranslations] || {});
    }
  } catch (error) {
    console.error('Error fetching translations:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
