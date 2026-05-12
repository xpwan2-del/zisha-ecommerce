import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
import { checkAdminAuth } from '@/lib/admin-helpers';
/**
 * @api {GET} /api/translations/init 初始化翻译表
 * @apiName InitTranslationsTable
 * @apiGroup TRANSLATIONS
 * @apiDescription 创建翻译相关的数据库表结构。
 */


export async function POST(request: NextRequest) {
  const authResult = checkAdminAuth(request);
  if (authResult.response) return authResult.response;

  try {
    logMonitor('TRANSLATIONS', 'REQUEST', { method: 'POST', action: 'INIT_TRANSLATIONS' });
    
    // 创建翻译表
    await query(`
      CREATE TABLE IF NOT EXISTS translations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key VARCHAR(255) NOT NULL,
        language VARCHAR(10) NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(key, language)
      )
    `);

    // 创建索引
    await query(`
      CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(key)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language)
    `);

    // 插入基础翻译数据
    const translations = [
      // 英文翻译
      { key: 'products.filters', language: 'en', value: 'Filters' },
      { key: 'products.price_range', language: 'en', value: 'Price Range' },
      { key: 'products.materials', language: 'en', value: 'Materials' },
      { key: 'products.capacity', language: 'en', value: 'Capacity' },
      { key: 'products.apply_filters', language: 'en', value: 'Apply Filters' },
      { key: 'products.prev', language: 'en', value: 'Previous' },
      { key: 'products.specifications', language: 'en', value: 'Specifications' },
      { key: 'products.service_commitments', language: 'en', value: 'Service Commitments' },
      { key: 'products.7day_return', language: 'en', value: '7-day Return' },
      { key: 'products.free_shipping', language: 'en', value: 'Free Shipping' },
      { key: 'products.authentic_guarantee', language: 'en', value: 'Authentic Guarantee' },
      { key: 'products.secure_payment', language: 'en', value: 'Secure Payment' },
      { key: 'products.shipping_info', language: 'en', value: 'Shipping Info' },
      { key: 'products.after_sale', language: 'en', value: 'After Sale' },
      { key: 'products.weight', language: 'en', value: 'Weight' },
      { key: 'products.size', language: 'en', value: 'Size' },
      { key: 'products.color', language: 'en', value: 'Color' },
      { key: 'products.other', language: 'en', value: 'Other' },
      { key: 'products.leave_review', language: 'en', value: 'Leave a Review' },
      { key: 'products.rating', language: 'en', value: 'Rating' },
      { key: 'products.comment', language: 'en', value: 'Comment' },
      { key: 'products.add_to_cart', language: 'en', value: 'Add to Cart' },
      { key: 'products.buy_now', language: 'en', value: 'Buy Now' },
      { key: 'products.description', language: 'en', value: 'Description' },
      { key: 'products.reviews', language: 'en', value: 'Reviews' },
      { key: 'reviews.feedback.submitted', language: 'en', value: 'Review submitted' },
      { key: 'reviews.feedback.reply_submitted', language: 'en', value: 'Reply submitted' },
      { key: 'reviews.feedback.followup_submitted', language: 'en', value: 'Follow-up review submitted' },
      { key: 'reviews.feedback.success_hint', language: 'en', value: 'Saved to the current product reviews.' },
      { key: 'reviews.feedback.reply_success_hint', language: 'en', value: 'Your reply has been posted under this review.' },
      { key: 'reviews.feedback.followup_success_hint', language: 'en', value: 'Your follow-up review has been added below the original review.' },
      { key: 'reviews.feedback.reviewed', language: 'en', value: 'Reviewed' },
      { key: 'reviews.feedback.replied', language: 'en', value: 'Replied' },
      { key: 'reviews.feedback.followed_up', language: 'en', value: 'Followed up' },
      { key: 'reviews.feedback.image_alt', language: 'en', value: 'Submitted review image' },
      { key: 'reviews.feedback.error_title', language: 'en', value: 'Please check and try again' },
      { key: 'reviews.feedback.comment_required', language: 'en', value: 'Please enter your review content.' },
      { key: 'reviews.feedback.reply_required', language: 'en', value: 'Please enter your reply content.' },
      { key: 'reviews.feedback.followup_required', language: 'en', value: 'Please enter your follow-up review content.' },
      { key: 'reviews.feedback.submitted_content', language: 'en', value: 'Submitted content' },
      { key: 'reviews.feedback.max_images_exceeded', language: 'en', value: 'You can upload up to {maxCount} images.' },
      { key: 'reviews.feedback.upload_failed', language: 'en', value: 'Image upload failed.' },
      
      // 中文翻译
      { key: 'products.filters', language: 'zh', value: '筛选' },
      { key: 'products.price_range', language: 'zh', value: '价格范围' },
      { key: 'products.materials', language: 'zh', value: '材质' },
      { key: 'products.capacity', language: 'zh', value: '容量' },
      { key: 'products.apply_filters', language: 'zh', value: '应用筛选' },
      { key: 'products.prev', language: 'zh', value: '上一页' },
      { key: 'products.specifications', language: 'zh', value: '规格参数' },
      { key: 'products.service_commitments', language: 'zh', value: '服务承诺' },
      { key: 'products.7day_return', language: 'zh', value: '7天退换' },
      { key: 'products.free_shipping', language: 'zh', value: '免费配送' },
      { key: 'products.authentic_guarantee', language: 'zh', value: '正品保障' },
      { key: 'products.secure_payment', language: 'zh', value: '安全支付' },
      { key: 'products.shipping_info', language: 'zh', value: '配送信息' },
      { key: 'products.after_sale', language: 'zh', value: '售后服务' },
      { key: 'products.weight', language: 'zh', value: '重量' },
      { key: 'products.size', language: 'zh', value: '尺寸' },
      { key: 'products.color', language: 'zh', value: '颜色' },
      { key: 'products.other', language: 'zh', value: '其他' },
      { key: 'products.leave_review', language: 'zh', value: '留下评价' },
      { key: 'products.rating', language: 'zh', value: '评分' },
      { key: 'products.comment', language: 'zh', value: '评论' },
      { key: 'products.add_to_cart', language: 'zh', value: '加入购物车' },
      { key: 'products.buy_now', language: 'zh', value: '立即购买' },
      { key: 'products.description', language: 'zh', value: '描述' },
      { key: 'products.reviews', language: 'zh', value: '评价' },
      { key: 'reviews.feedback.submitted', language: 'zh', value: '评价已提交' },
      { key: 'reviews.feedback.reply_submitted', language: 'zh', value: '回复已提交' },
      { key: 'reviews.feedback.followup_submitted', language: 'zh', value: '追评已提交' },
      { key: 'reviews.feedback.success_hint', language: 'zh', value: '已保存到当前商品评价中。' },
      { key: 'reviews.feedback.reply_success_hint', language: 'zh', value: '您的回复已展示在这条评价下方。' },
      { key: 'reviews.feedback.followup_success_hint', language: 'zh', value: '您的追评已追加到原评价下方。' },
      { key: 'reviews.feedback.reviewed', language: 'zh', value: '已评价' },
      { key: 'reviews.feedback.replied', language: 'zh', value: '已回复' },
      { key: 'reviews.feedback.followed_up', language: 'zh', value: '已追评' },
      { key: 'reviews.feedback.image_alt', language: 'zh', value: '已提交的评价图片' },
      { key: 'reviews.feedback.error_title', language: 'zh', value: '请检查后再提交' },
      { key: 'reviews.feedback.comment_required', language: 'zh', value: '请输入评价内容。' },
      { key: 'reviews.feedback.reply_required', language: 'zh', value: '请输入回复内容。' },
      { key: 'reviews.feedback.followup_required', language: 'zh', value: '请输入追评内容。' },
      { key: 'reviews.feedback.submitted_content', language: 'zh', value: '已提交内容' },
      { key: 'reviews.feedback.max_images_exceeded', language: 'zh', value: '最多只能上传 {maxCount} 张图片。' },
      { key: 'reviews.feedback.upload_failed', language: 'zh', value: '上传图片失败。' },
      
      // 阿拉伯文翻译
      { key: 'products.filters', language: 'ar', value: 'مرشحات' },
      { key: 'products.price_range', language: 'ar', value: 'نطاق السعر' },
      { key: 'products.materials', language: 'ar', value: 'المواد' },
      { key: 'products.capacity', language: 'ar', value: 'السعة' },
      { key: 'products.apply_filters', language: 'ar', value: 'تطبيق المرشحات' },
      { key: 'products.prev', language: 'ar', value: 'السابق' },
      { key: 'products.specifications', language: 'ar', value: 'المواصفات' },
      { key: 'products.service_commitments', language: 'ar', value: 'التعهدات الخدمية' },
      { key: 'products.7day_return', language: 'ar', value: 'استرداد لمدة 7 أيام' },
      { key: 'products.free_shipping', language: 'ar', value: 'شحن مجاني' },
      { key: 'products.authentic_guarantee', language: 'ar', value: 'ضمان أصالة' },
      { key: 'products.secure_payment', language: 'ar', value: 'دفع آمن' },
      { key: 'products.shipping_info', language: 'ar', value: 'معلومات الشحن' },
      { key: 'products.after_sale', language: 'ar', value: 'بعد البيع' },
      { key: 'products.weight', language: 'ar', value: 'الوزن' },
      { key: 'products.size', language: 'ar', value: 'الحجم' },
      { key: 'products.color', language: 'ar', value: 'اللون' },
      { key: 'products.other', language: 'ar', value: 'آخر' },
      { key: 'products.leave_review', language: 'ar', value: 'اترك تقييمًا' },
      { key: 'products.rating', language: 'ar', value: 'التقييم' },
      { key: 'products.comment', language: 'ar', value: 'التعليق' },
      { key: 'products.add_to_cart', language: 'ar', value: 'أضف إلى السلة' },
      { key: 'products.buy_now', language: 'ar', value: 'اشتر الآن' },
      { key: 'products.description', language: 'ar', value: 'الوصف' },
      { key: 'products.reviews', language: 'ar', value: 'التقييمات' },
      { key: 'reviews.feedback.submitted', language: 'ar', value: 'تم إرسال التقييم' },
      { key: 'reviews.feedback.reply_submitted', language: 'ar', value: 'تم إرسال الرد' },
      { key: 'reviews.feedback.followup_submitted', language: 'ar', value: 'تم إرسال التقييم الإضافي' },
      { key: 'reviews.feedback.success_hint', language: 'ar', value: 'تم حفظه ضمن تقييمات المنتج الحالية.' },
      { key: 'reviews.feedback.reply_success_hint', language: 'ar', value: 'تم نشر ردك أسفل هذا التقييم.' },
      { key: 'reviews.feedback.followup_success_hint', language: 'ar', value: 'تمت إضافة تقييمك الإضافي أسفل التقييم الأصلي.' },
      { key: 'reviews.feedback.reviewed', language: 'ar', value: 'تم التقييم' },
      { key: 'reviews.feedback.replied', language: 'ar', value: 'تم الرد' },
      { key: 'reviews.feedback.followed_up', language: 'ar', value: 'تمت الإضافة' },
      { key: 'reviews.feedback.image_alt', language: 'ar', value: 'صورة التقييم المرسلة' },
      { key: 'reviews.feedback.error_title', language: 'ar', value: 'يرجى المراجعة والمحاولة مرة أخرى' },
      { key: 'reviews.feedback.comment_required', language: 'ar', value: 'يرجى إدخال محتوى التقييم.' },
      { key: 'reviews.feedback.reply_required', language: 'ar', value: 'يرجى إدخال محتوى الرد.' },
      { key: 'reviews.feedback.followup_required', language: 'ar', value: 'يرجى إدخال محتوى التقييم الإضافي.' },
      { key: 'reviews.feedback.submitted_content', language: 'ar', value: 'المحتوى المرسل' },
    ];

    // 批量插入翻译数据
    for (const translation of translations) {
      try {
        // 先尝试更新
        const updateResult = await query(
          `UPDATE translations SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ? AND language = ?`,
          [translation.value, translation.key, translation.language]
        );

        // 如果没有更新任何行，则插入新记录
        if (!updateResult.changes || updateResult.changes === 0) {
          await query(
            `INSERT INTO translations (key, language, value) VALUES (?, ?, ?)`,
            [translation.key, translation.language, translation.value]
          );
        }
      } catch (error) {
        console.error('Error inserting translation:', error);
      }
    }

    logMonitor('TRANSLATIONS', 'SUCCESS', { action: 'INIT_TRANSLATIONS', status: 'initialized', count: translations.length });
    
    return NextResponse.json({ message: 'Translations table initialized successfully' });
  } catch (error: any) {
    logMonitor('TRANSLATIONS', 'ERROR', { action: 'INIT_TRANSLATIONS', error: error?.message || String(error) });
    console.error('Error initializing translations:', error);
    return NextResponse.json({ error: 'Failed to initialize translations' }, { status: 500 });
  }
}
