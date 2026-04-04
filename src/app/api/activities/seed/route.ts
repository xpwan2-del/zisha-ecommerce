import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST() {
  try {
    await query('DELETE FROM product_activities');
    await query('DELETE FROM activity_categories');
    
    const activities = [
      {
        name: '新品上市',
        name_en: 'New Arrival',
        name_ar: 'وصول جديد',
        icon: '🎉',
        color: '#FF6B6B',
        status: 'active'
      },
      {
        name: '限时特惠',
        name_en: 'Limited Time Offer',
        name_ar: 'عرض لفترة محدودة',
        icon: '⏰',
        color: '#4ECDC4',
        status: 'active'
      },
      {
        name: '热销推荐',
        name_en: 'Hot Sale',
        name_ar: 'بيع ساخن',
        icon: '🔥',
        color: '#FF9F43',
        status: 'active'
      },
      {
        name: '精品推荐',
        name_en: 'Premium Selection',
        name_ar: 'اختيار ممتاز',
        icon: '⭐',
        color: '#A55EEA',
        status: 'active'
      },
      {
        name: '限量发售',
        name_en: 'Limited Edition',
        name_ar: 'إصدار محدود',
        icon: '💎',
        color: '#26DE81',
        status: 'active'
      },
      {
        name: '节日特惠',
        name_en: 'Holiday Special',
        name_ar: 'عرض العطلات',
        icon: '🎁',
        color: '#FD79A8',
        status: 'active'
      }
    ];

    const activityIds: (number | string)[] = [];
    for (const activity of activities) {
      const result = await query(
        'INSERT INTO activity_categories (name, name_en, name_ar, icon, color, status) VALUES (?, ?, ?, ?, ?, ?)',
        [activity.name, activity.name_en, activity.name_ar, activity.icon, activity.color, activity.status]
      );
      if (result.rows && result.rows[0] && result.rows[0].id) {
        activityIds.push(String(result.rows[0].id));
      } else {
        const lastIdResult = await query('SELECT last_insert_rowid() as id');
        if (lastIdResult.rows && lastIdResult.rows[0]) {
          activityIds.push(String(lastIdResult.rows[0].id));
        }
      }
    }

    const productActivityMappings = [
      { product_id: 1, activity_index: 0 },
      { product_id: 1, activity_index: 2 },
      { product_id: 2, activity_index: 1 },
      { product_id: 2, activity_index: 3 },
      { product_id: 3, activity_index: 2 },
      { product_id: 3, activity_index: 4 },
      { product_id: 4, activity_index: 3 },
      { product_id: 4, activity_index: 5 },
      { product_id: 5, activity_index: 4 },
      { product_id: 5, activity_index: 0 },
      { product_id: 6, activity_index: 5 },
      { product_id: 6, activity_index: 1 },
      { product_id: 7, activity_index: 0 },
      { product_id: 7, activity_index: 2 },
      { product_id: 7, activity_index: 4 },
      { product_id: 8, activity_index: 1 },
      { product_id: 8, activity_index: 3 },
      { product_id: 8, activity_index: 5 },
      { product_id: 9, activity_index: 2 },
      { product_id: 9, activity_index: 0 },
      { product_id: 10, activity_index: 3 },
      { product_id: 10, activity_index: 1 },
      { product_id: 11, activity_index: 4 },
      { product_id: 11, activity_index: 2 },
      { product_id: 12, activity_index: 5 },
      { product_id: 12, activity_index: 3 },
      { product_id: 13, activity_index: 0 },
      { product_id: 13, activity_index: 1 },
      { product_id: 13, activity_index: 2 },
      { product_id: 14, activity_index: 1 },
      { product_id: 14, activity_index: 2 },
      { product_id: 14, activity_index: 3 },
      { product_id: 15, activity_index: 2 },
      { product_id: 15, activity_index: 3 },
      { product_id: 15, activity_index: 4 },
      { product_id: 16, activity_index: 3 },
      { product_id: 16, activity_index: 4 },
      { product_id: 16, activity_index: 5 },
      { product_id: 17, activity_index: 4 },
      { product_id: 17, activity_index: 5 },
      { product_id: 17, activity_index: 0 },
      { product_id: 18, activity_index: 5 },
      { product_id: 18, activity_index: 0 },
      { product_id: 18, activity_index: 1 },
    ];

    for (const mapping of productActivityMappings) {
      const activityId = activityIds[mapping.activity_index];
      if (activityId) {
        await query(
          'INSERT INTO product_activities (product_id, activity_category_id) VALUES (?, ?)',
          [mapping.product_id, activityId]
        );
      }
    }

    return NextResponse.json({ 
      message: 'Activity data seeded successfully',
      activities: activities.length,
      productMappings: productActivityMappings.length
    });
  } catch (error) {
    console.error('Error seeding activity data:', error);
    return NextResponse.json({ error: 'Failed to seed activity data' }, { status: 500 });
  }
}
