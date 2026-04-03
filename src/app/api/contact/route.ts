import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/contact - Get contact information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'zh';
    
    const result = await query('SELECT * FROM contact LIMIT 1');
    
    let contact = result.rows[0];
    
    if (!contact) {
      // Create default contact if not exists
      const defaultContact = {
        title: '联系我们',
        title_en: 'Contact Us',
        title_ar: 'اتصل بنا',
        description: '如有任何疑问，请联系我们',
        description_en: 'Get in touch with us for any inquiries',
        description_ar: 'تواصل معنا لأي استفسارات',
        images: [
          'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop'
        ],
        video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        address: '中国江苏省宜兴市紫砂街123号',
        address_en: '123 Zisha Street, Yixing, Jiangsu, China',
        address_ar: '123 شارع زيشا، يشينغ، جيانغسو، الصين',
        email: 'info@zishapottery.com',
        phone: '+86 123 4567 8910',
        opening_hours: '周一至周五：上午9:00 - 下午6:00\n周六：上午10:00 - 下午4:00\n周日：休息',
        opening_hours_en: 'Monday - Friday: 9:00 AM - 6:00 PM\nSaturday: 10:00 AM - 4:00 PM\nSunday: Closed',
        opening_hours_ar: 'الإثنين - الجمعة: 9:00 صباحًا - 6:00 مساءً\nالسبت: 10:00 صباحًا - 4:00 مساءً\nالأحد: مغلق'
      };
      
      const insertResult = await query(
        'INSERT INTO contact (title, title_en, title_ar, description, description_en, description_ar, images, video_url, address, address_en, address_ar, email, phone, opening_hours, opening_hours_en, opening_hours_ar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *',
        [
          defaultContact.title,
          defaultContact.title_en,
          defaultContact.title_ar,
          defaultContact.description,
          defaultContact.description_en,
          defaultContact.description_ar,
          JSON.stringify(defaultContact.images),
          defaultContact.video_url,
          defaultContact.address,
          defaultContact.address_en,
          defaultContact.address_ar,
          defaultContact.email,
          defaultContact.phone,
          defaultContact.opening_hours,
          defaultContact.opening_hours_en,
          defaultContact.opening_hours_ar
        ]
      );
      
      contact = insertResult.rows[0];
    }

    // 根据语言返回对应的内容
    const response = {
      ...contact,
      title: lang === 'en' ? contact.title_en : lang === 'ar' ? contact.title_ar : contact.title,
      description: lang === 'en' ? contact.description_en : lang === 'ar' ? contact.description_ar : contact.description,
      address: lang === 'en' ? contact.address_en : lang === 'ar' ? contact.address_ar : contact.address,
      opening_hours: lang === 'en' ? contact.opening_hours_en : lang === 'ar' ? contact.opening_hours_ar : contact.opening_hours,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting contact information:', error);
    return NextResponse.json({ error: 'Failed to get contact information' }, { status: 500 });
  }
}

// POST /api/contact - Update contact information
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { 
      title, title_en, title_ar,
      description, description_en, description_ar,
      images, 
      videoUrl, 
      address, address_en, address_ar,
      email, 
      phone, 
      openingHours, openingHours_en, openingHours_ar 
    } = data;
    
    // Use UPSERT logic - update if exists, insert if not
    const result = await query(`
      INSERT INTO contact (title, title_en, title_ar, description, description_en, description_ar, images, video_url, address, address_en, address_ar, email, phone, opening_hours, opening_hours_en, opening_hours_ar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        title_en = excluded.title_en,
        title_ar = excluded.title_ar,
        description = excluded.description,
        description_en = excluded.description_en,
        description_ar = excluded.description_ar,
        images = excluded.images,
        video_url = excluded.video_url,
        address = excluded.address,
        address_en = excluded.address_en,
        address_ar = excluded.address_ar,
        email = excluded.email,
        phone = excluded.phone,
        opening_hours = excluded.opening_hours,
        opening_hours_en = excluded.opening_hours_en,
        opening_hours_ar = excluded.opening_hours_ar
      RETURNING *
    `, [
      title,
      title_en,
      title_ar,
      description,
      description_en,
      description_ar,
      JSON.stringify(images),
      videoUrl,
      address,
      address_en,
      address_ar,
      email,
      phone,
      openingHours,
      openingHours_en,
      openingHours_ar
    ]);
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating contact information:', error);
    return NextResponse.json({ error: 'Failed to update contact information' }, { status: 500 });
  }
}
